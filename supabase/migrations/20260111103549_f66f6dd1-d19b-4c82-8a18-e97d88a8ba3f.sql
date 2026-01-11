-- Drop triggers that run on auth.users insert (signup blockers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

-- Drop the functions that were attached to those triggers
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.auto_assign_admin_role();