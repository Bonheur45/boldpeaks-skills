import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { startRefresh, endRefresh, canRefresh } from '@/lib/authThrottle';
import { patchSupabaseAuthRefreshSession } from '@/lib/supabaseAuthRefreshPatch';
type UserRole = 'admin' | 'student' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent multiple simultaneous role fetches
  const fetchingRoleRef = useRef<string | null>(null);
  // Avoid stale initial getSession() overwriting a fresh SIGNED_IN event
  const hasAuthEventRef = useRef(false);

  const fetchUserRole = async (userId: string) => {
    // Prevent duplicate fetches for same user
    if (fetchingRoleRef.current === userId) return;
    fetchingRoleRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        fetchingRoleRef.current = null;
        return null;
      }

      fetchingRoleRef.current = null;
      return data?.role as UserRole;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      fetchingRoleRef.current = null;
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      hasAuthEventRef.current = true;

      // Update state synchronously
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Always stop loading on any auth state change
      setIsLoading(false);

      // Defer role fetch to avoid deadlocks (per Supabase best practices)
      if (currentSession?.user) {
        setTimeout(() => {
          if (isMounted) {
            fetchUserRole(currentSession.user.id).then((role) => {
              if (isMounted) setUserRole(role);
            });
          }
        }, 0);
      } else {
        setUserRole(null);
      }
    });

    // Check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        if (!isMounted) return;

        // If we already received an auth event (e.g. SIGNED_IN) and this initial
        // getSession resolves to null, don't overwrite a valid in-memory session.
        if (hasAuthEventRef.current && !existingSession) {
          setIsLoading(false);
          return;
        }

        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setIsLoading(false);

        if (existingSession?.user) {
          setTimeout(() => {
            if (isMounted) {
              fetchUserRole(existingSession.user.id).then((role) => {
                if (isMounted) setUserRole(role);
              });
            }
          }, 0);
        }
      })
      .catch((err) => {
        console.error('Error getting session:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Hard stop built-in auto refresh and patch refreshSession() to avoid refresh-token storms.
    // (We still schedule a single refresh ourselves near expiry.)
    patchSupabaseAuthRefreshSession({ minIntervalMs: 30_000 });

    const authAny = supabase.auth as any;
    const stop = () => authAny?.stopAutoRefresh?.();

    stop();
    window.addEventListener('focus', stop);
    document.addEventListener('visibilitychange', stop);

    return () => {
      window.removeEventListener('focus', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, []);

  useEffect(() => {
    // Schedule exactly one refresh shortly before the token expires.
    if (!session?.expires_at || !session?.user) return;

    let cancelled = false;

    const expiresMs = session.expires_at * 1000;
    const now = Date.now();
    const REFRESH_BEFORE_EXPIRY_MS = 60_000; // 1 minute
    const delay = Math.max(0, expiresMs - now - REFRESH_BEFORE_EXPIRY_MS);

    const timer = window.setTimeout(async () => {
      if (cancelled) return;

      const check = canRefresh();
      if (!check.allowed) return;
      if (!startRefresh()) return;

      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (error || !data.session) return;

        setSession(data.session);
        setUser(data.session.user);

        setTimeout(() => {
          if (!cancelled) {
            fetchUserRole(data.session!.user.id).then((role) => {
              if (!cancelled) setUserRole(role);
            });
          }
        }, 0);
      } finally {
        endRefresh();
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session?.expires_at, session?.user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const refreshSession = async () => {
    // If we already have a valid session, skip refresh entirely
    if (session?.user) return;

    // Use global throttle to prevent refresh storms
    const check = canRefresh();
    if (!check.allowed) {
      console.debug('[AuthContext] Refresh blocked:', check.reason);
      return;
    }

    if (!startRefresh()) {
      console.debug('[AuthContext] Could not acquire refresh lock');
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // Don't log rate limit errors as they're expected during storms
        if (!error.message?.includes('rate')) {
          console.error('Error refreshing session:', error);
        }
        return;
      }

      // Important: never clear an in-memory session based on a null getSession() result.
      // Actual sign-out should only happen via auth events (SIGNED_OUT) or an explicit signOut().
      if (!data.session) return;

      setSession(data.session);
      setUser(data.session.user);

      setTimeout(() => {
        fetchUserRole(data.session!.user.id).then((role) => setUserRole(role));
      }, 0);
    } finally {
      endRefresh();
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}