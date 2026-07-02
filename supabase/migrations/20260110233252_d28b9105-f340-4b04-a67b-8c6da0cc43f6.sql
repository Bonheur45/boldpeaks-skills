-- Make signup trigger resilient so auth user creation never fails due to profile/role inserts
-- (Idempotent upserts + defensive exception handling)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create/update profile (idempotent)
  BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    ON CONFLICT (id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = now();
  EXCEPTION WHEN others THEN
    -- Never block signup if profile write fails for any reason
    NULL;
  END;

  -- Ensure default role exists (idempotent)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN others THEN
    -- Never block signup if role write fails for any reason
    NULL;
  END;

  RETURN NEW;
END;
$$;