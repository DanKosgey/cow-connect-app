-- Verify user role and test RLS for product categories

-- 1. Check the role of the current user (replace 'e94acba7-78a5-425b-b5b4-a787e84d05c8' with the actual user ID from the logs if different)
-- Note: In the tool output, we saw user ID 'e94acba7-78a5-425b-b5b4-a787e84d05c8'
SELECT * FROM public.user_roles 
WHERE user_id = 'e94acba7-78a5-425b-b5b4-a787e84d05c8';

-- 2. Verify RLS policy definition again (just to be sure)
SELECT * FROM pg_policy WHERE polname = 'Creditors can manage product categories';

-- 3. Check if there are any other conflicting policies
SELECT * FROM pg_policy WHERE tablename = 'product_categories';

-- 4. Try to simulate a categorization insert (this won't work in this script as auth.uid() won't be set, but it's good for reference)
-- INSERT INTO public.product_categories (name, description) VALUES ('Test Category', 'Test Description');
