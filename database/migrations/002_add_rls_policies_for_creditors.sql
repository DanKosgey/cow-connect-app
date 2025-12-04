-- Add RLS policies for staff with role 'creditor' on product_packaging table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow creditors to view packaging" ON product_packaging;
DROP POLICY IF EXISTS "Allow creditors to insert packaging" ON product_packaging;
DROP POLICY IF EXISTS "Allow creditors to update packaging" ON product_packaging;
DROP POLICY IF EXISTS "Allow creditors to delete packaging" ON product_packaging;

-- Create policy for SELECT (viewing packaging)
CREATE POLICY "Allow creditors to view packaging" 
ON product_packaging FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'creditor'
    AND user_roles.active = true
  )
);

-- Create policy for INSERT (creating packaging)
CREATE POLICY "Allow creditors to insert packaging" 
ON product_packaging FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'creditor'
    AND user_roles.active = true
  )
);

-- Create policy for UPDATE (modifying packaging)
CREATE POLICY "Allow creditors to update packaging" 
ON product_packaging FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'creditor'
    AND user_roles.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'creditor'
    AND user_roles.active = true
  )
);

-- Create policy for DELETE (removing packaging)
CREATE POLICY "Allow creditors to delete packaging" 
ON product_packaging FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'creditor'
    AND user_roles.active = true
  )
);

-- Grant necessary permissions to authenticated users
GRANT ALL ON product_packaging TO authenticated;