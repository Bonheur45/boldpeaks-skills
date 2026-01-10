-- Fix the handle_new_user function to handle leaderboard initialization properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Also create a default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize leaderboard entry (use ON CONFLICT to handle duplicates)
  INSERT INTO public.leaderboard (user_id, program_id)
  VALUES (NEW.id, NULL)
  ON CONFLICT (user_id, program_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;