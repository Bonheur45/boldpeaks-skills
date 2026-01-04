import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user";

export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_roles", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function useIsAdmin() {
  const query = useUserRoles();
  const roles = query.data ?? [];
  return {
    ...query,
    roles,
    isAdmin: roles.includes("admin"),
  };
}
