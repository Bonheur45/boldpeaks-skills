import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Session,
  User,
  AuthChangeEvent,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// TODO: Rebuild authentication - this is a stub after cleanup

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TODO: Implement actual auth state management
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });
  }, []);

  // TODO: Implement signIn with supabase.auth.signInWithPassword
  const signIn = async (_email: string, _password: string) => {
    console.warn('Auth disabled - signIn is a stub');
    return { error: new Error('Authentication is disabled for rebuild') };
  };

  // TODO: Implement signUp with supabase.auth.signUp
  const signUp = async (_email: string, _password: string, _fullName: string) => {
    console.warn('Auth disabled - signUp is a stub');
    return { error: new Error('Authentication is disabled for rebuild') };
  };

  // TODO: Implement signOut with supabase.auth.signOut
  const signOut = async () => {
    console.warn('Auth disabled - signOut is a stub');
  };

  // TODO: Implement resetPassword with supabase.auth.resetPasswordForEmail
  const resetPassword = async (_email: string) => {
    console.warn('Auth disabled - resetPassword is a stub');
    return { error: new Error('Authentication is disabled for rebuild') };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
