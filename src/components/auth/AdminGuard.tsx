import React from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  // For now, allow all access since auth is disabled
  return <>{children}</>;
};

export default AdminGuard;
