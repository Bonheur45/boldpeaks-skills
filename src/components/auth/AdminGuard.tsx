import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin, isLoading, error } = useIsAdmin();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Access check failed",
        description: "Please refresh and try again.",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!loading && user && !isLoading && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Admin access required",
        description: "This area is only available to administrators.",
      });
    }
  }, [loading, user, isLoading, isAdmin, toast]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
