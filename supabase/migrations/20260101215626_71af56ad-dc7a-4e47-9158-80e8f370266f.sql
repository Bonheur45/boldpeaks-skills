-- Create a function to check and assign admin role based on invites
CREATE OR REPLACE FUNCTION public.handle_admin_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check if there's a pending invite for this email
  SELECT * INTO invite_record
  FROM public.invites
  WHERE email = LOWER(new.email)
    AND status = 'pending'
    AND accepted_at IS NULL
  LIMIT 1;

  -- If an invite exists, assign admin role and mark invite as accepted
  IF FOUND THEN
    -- Insert admin role for the new user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Mark the invite as accepted
    UPDATE public.invites
    SET accepted_at = now(), status = 'accepted'
    WHERE id = invite_record.id;
  END IF;

  RETURN new;
END;
$$;

-- Create trigger that runs after a new user is created
CREATE TRIGGER on_auth_user_created_check_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_invite();