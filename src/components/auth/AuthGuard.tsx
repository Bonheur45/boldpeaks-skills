import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

function isAuthDebugEnabledNow() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('authDebug') === '1') return true;
    return localStorage.getItem('authDebug') === '1';
  } catch {
    return false;
  }
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, userRole, isLoading, refreshSession } = useAuth();
  const location = useLocation();

  const [isRehydrating, setIsRehydrating] = useState(false);
  const [didRehydrate, setDidRehydrate] = useState(false);

  const needsRehydrate = !isLoading && !user && !didRehydrate;

  // Desktop browsers can briefly drop in-memory auth state (tab lifecycle, refresh, multi-tab token rotation).
  // Before redirecting to landing, do a one-time session re-sync from persisted storage.
  useEffect(() => {
    if (!needsRehydrate) return;

    setDidRehydrate(true);
    setIsRehydrating(true);
    refreshSession().finally(() => setIsRehydrating(false));
  }, [needsRehydrate, refreshSession]);

  // Debug-only: expose guard state so the AuthDebugPanel can show whether redirects are due to a transient null.
  useEffect(() => {
    if (!isAuthDebugEnabledNow()) return;
    (window as any).__authGuardDebugState = {
      at: Date.now(),
      isRehydrating,
      didRehydrate,
      needsRehydrate,
      route: location.pathname + location.search,
    };
  }, [isRehydrating, didRehydrate, needsRehydrate, location.pathname, location.search]);

  if (isLoading || isRehydrating || needsRehydrate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
