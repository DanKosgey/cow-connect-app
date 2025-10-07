// Script to help set up the kyc-documents storage bucket and policies
console.log('🔧 Storage Bucket Setup Helper');
console.log('\n📋 Follow these steps to set up the kyc-documents storage bucket:');

console.log('\n1. ✅ Create the kyc-documents Bucket');
console.log('   - Log into your Supabase dashboard');
console.log('   - Navigate to Storage → Buckets');
console.log('   - Click "New Bucket"');
console.log('   - Enter "kyc-documents" as the bucket name');
console.log('   - Set the bucket to public if needed for document previews');
console.log('   - Click "Create"');

console.log('\n2. ✅ Apply Storage Policies');
console.log('   - Navigate to SQL Editor in your Supabase dashboard');
console.log('   - Copy and paste the following SQL commands:');
console.log('\n```sql');
console.log('-- Enable RLS on the storage.objects table');
console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
console.log('');
console.log('-- Create policies for kyc-documents bucket');
console.log('CREATE POLICY "Public Access"');
console.log('ON storage.objects FOR SELECT');
console.log('TO public');
console.log('USING (bucket_id = \'kyc-documents\');');
console.log('');
console.log('CREATE POLICY "Authenticated Users Can Upload"');
console.log('ON storage.objects FOR INSERT');
console.log('TO authenticated');
console.log('WITH CHECK (bucket_id = \'kyc-documents\');');
console.log('');
console.log('CREATE POLICY "Users Can Update Their Documents"');
console.log('ON storage.objects FOR UPDATE');
console.log('TO authenticated');
console.log('USING (bucket_id = \'kyc-documents\' AND auth.uid() = owner_id);');
console.log('');
console.log('CREATE POLICY "Users Can Delete Their Documents"');
console.log('ON storage.objects FOR DELETE');
console.log('TO authenticated');
console.log('USING (bucket_id = \'kyc-documents\' AND auth.uid() = owner_id);');
console.log('```');

console.log('\n3. ✅ Verify the Setup');
console.log('   - After running the SQL commands, verify that:');
console.log('     - The kyc-documents bucket exists');
console.log('     - All 4 policies are applied to storage.objects');
console.log('     - RLS is enabled on storage.objects');

console.log('\n4. ✅ Test Document Upload');
console.log('   - Log in to your application as a farmer');
console.log('   - Navigate to the farmer registration page');
console.log('   - Try to upload a document');
console.log('   - Check the browser console for any errors');
console.log('   - Verify the document appears in the Supabase storage dashboard');

console.log('\n⚠️  Common Issues and Solutions:');
console.log('   - If you get "new row violates row-level security policy":');
console.log('     - Double-check that all policies are applied correctly');
console.log('     - Ensure the bucket name is exactly "kyc-documents"');
console.log('   - If you get "Bucket not found":');
console.log('     - Verify the bucket exists in your Supabase storage');
console.log('   - If you get "Permission denied":');
console.log('     - Ensure the user is properly authenticated');
console.log('     - Check that the user has the correct permissions');

console.log('\n✅ Once you\'ve completed these steps, document uploads should work correctly!');