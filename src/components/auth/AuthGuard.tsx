import React from 'react';

// TODO: Rebuild AuthGuard to check user authentication state

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  // TODO: Re-implement authentication check
  // For now, allow all access since auth is disabled
  return <>{children}</>;
};

export default AuthGuard;
