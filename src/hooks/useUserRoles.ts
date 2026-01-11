// TODO: Rebuild useUserRoles hook to fetch roles from database

export type AppRole = "admin" | "moderator" | "user";

export function useUserRoles() {
  // TODO: Re-implement role fetching from user_roles table
  return {
    data: [] as AppRole[],
    isLoading: false,
    error: null,
  };
}

export function useIsAdmin() {
  // TODO: Re-implement admin check
  return {
    roles: [] as AppRole[],
    isAdmin: false,
    isLoading: false,
    error: null,
  };
}
