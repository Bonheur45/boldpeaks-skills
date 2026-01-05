-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view published programs" ON programs;

-- Create as PERMISSIVE (default) so it works as OR with admin policy
CREATE POLICY "Anyone can view published programs" 
ON programs 
FOR SELECT 
TO public
USING (is_published = true);

-- Also fix the admin policy to be permissive
DROP POLICY IF EXISTS "Admins can view all programs" ON programs;

CREATE POLICY "Admins can view all programs" 
ON programs 
FOR SELECT 
TO authenticated
USING (is_admin());