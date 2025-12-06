// Script to help set up the collection-photos storage bucket and policies
console.log('🔧 Collection Photos Storage Bucket Setup Helper');
console.log('\n📋 Follow these steps to set up the collection-photos storage bucket:');

console.log('\n1. ✅ Create the collection-photos Bucket');
console.log('   - Log into your Supabase dashboard');
console.log('   - Navigate to Storage → Buckets');
console.log('   - Click "New Bucket"');
console.log('   - Enter "collection-photos" as the bucket name');
console.log('   - Set the bucket to public so that collection photos can be viewed');
console.log('   - Click "Create"');

console.log('\n2. ✅ Enable RLS and Apply Storage Policies');
console.log('   - Navigate to SQL Editor in your Supabase dashboard');
console.log('   - Copy and paste the following SQL commands:');
console.log('\n```sql');
console.log('-- Enable RLS on the storage.objects table');
console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
console.log('');
console.log('-- Make the bucket public');
console.log('UPDATE storage.buckets SET public = true WHERE id = \'collection-photos\';');
console.log('');
console.log('-- Create policies for collection-photos bucket');
console.log('CREATE POLICY "Public Access to Collection Photos"');
console.log('ON storage.objects FOR SELECT');
console.log('TO public');
console.log('USING (bucket_id = \'collection-photos\');');
console.log('');
console.log('CREATE POLICY "Authenticated Collectors Can Upload Photos"');
console.log('ON storage.objects FOR INSERT');
console.log('TO authenticated');
console.log('WITH CHECK (bucket_id = \'collection-photos\');');
console.log('');
console.log('CREATE POLICY "Collectors Can Update Their Photos"');
console.log('ON storage.objects FOR UPDATE');
console.log('TO authenticated');
console.log('USING (bucket_id = \'collection-photos\' AND auth.uid() = owner_id);');
console.log('');
console.log('CREATE POLICY "Collectors Can Delete Their Photos"');
console.log('ON storage.objects FOR DELETE');
console.log('TO authenticated');
console.log('USING (bucket_id = \'collection-photos\' AND auth.uid() = owner_id);');
console.log('```');

console.log('\n3. ✅ Alternative Dashboard Approach (if SQL approach fails)');
console.log('   - Go to your Supabase project dashboard');
console.log('   - Navigate to Storage → Buckets');
console.log('   - Find the `collection-photos` bucket');
console.log('   - Click on the bucket name to open its settings');
console.log('   - Toggle the "Public" switch to enable public access');
console.log('   - Go to Authentication → Policies');
console.log('   - Create the policies manually using the dashboard interface');

console.log('\n4. ✅ Verify the Setup');
console.log('   - After running the SQL commands, verify that:');
console.log('     - The collection-photos bucket exists and is public');
console.log('     - RLS is enabled on storage.objects');
console.log('     - All 4 policies are applied');

console.log('\n5. ✅ Test Photo Upload');
console.log('   - Log in to your application as a collector');
console.log('   - Navigate to the New Milk Collection page');
console.log('   - Try to upload a photo');
console.log('   - Check the browser console for any errors');
console.log('   - Verify the photo appears in the Supabase storage dashboard');

console.log('\n⚠️  Common Issues and Solutions:');
console.log('   - If you get "new row violates row-level security policy":');
console.log('     - Double-check that all policies are applied correctly');
console.log('     - Ensure the bucket name is exactly "collection-photos"');
console.log('   - If you get "Bucket not found":');
console.log('     - Verify the bucket exists in your Supabase storage');
console.log('   - If you get "Permission denied":');
console.log('     - Ensure the user is properly authenticated');
console.log('     - Check that the user has the correct permissions');
console.log('   - If photos upload but don\'t display:');
console.log('     - Ensure the bucket is set to public');
console.log('     - Check that the public URL generation is working');

console.log('\n✅ Once you\'ve completed these steps, photo uploads should work correctly!');