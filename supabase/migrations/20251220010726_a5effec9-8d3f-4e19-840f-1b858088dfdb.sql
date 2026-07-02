-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path for generate_certificate_number function
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.certificate_number = 'BP-' || to_char(NEW.issued_at, 'YYYY') || '-' || LPAD(nextval('certificate_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;