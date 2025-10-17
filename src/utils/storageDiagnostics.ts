import { supabase } from '@/integrations/supabase/client';

export const diagnoseStorageIssues = async () => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('Starting Storage Diagnostics');
  }
  
  try {
    // 1. Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (import.meta.env.DEV) {
      console.log('User authentication status:', !!user);
    }
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // 2. Check if kyc-documents bucket exists
    if (import.meta.env.DEV) {
      console.log('Checking kyc-documents bucket');
    }
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    const kycBucket = buckets?.find(bucket => bucket.name === 'kyc-documents');
    if (import.meta.env.DEV) {
      console.log('kyc-documents bucket exists:', !!kycBucket);
    }
    
    if (!kycBucket) {
      return { success: false, error: 'kyc-documents bucket not found. Please create it in Supabase dashboard.' };
    }

    // 3. Test upload capability with a small test file
    if (import.meta.env.DEV) {
      console.log('Testing upload capability');
    }
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = 'Test file for storage diagnostics';
    const testFilePath = `${user.id}/diagnostics/${testFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, new Blob([testContent]), {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      return { 
        success: false, 
        error: `Upload test failed: ${uploadError.message}`,
        details: {
          bucket: kycBucket,
          filePath: testFilePath,
          userId: user.id
        }
      };
    }
    
    if (import.meta.env.DEV) {
      console.log('Upload test successful');
    }
    
    // 4. Verify the file was actually uploaded
    if (import.meta.env.DEV) {
      console.log('Verifying file existence...');
    }
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('kyc-documents')
      .download(testFilePath);
    
    if (downloadError) {
      console.error('❌ File verification failed:', downloadError.message);
      return { 
        success: false, 
        error: `File verification failed: ${downloadError.message}`,
        details: {
          filePath: testFilePath
        }
      };
    }
    
    if (import.meta.env.DEV) {
      console.log('File exists in storage');
    }
    
    // 5. Test public URL generation
    if (import.meta.env.DEV) {
      console.log('Testing public URL generation...');
    }
    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(testFilePath);
    
    if (import.meta.env.DEV) {
      console.log('Public URL:', urlData?.publicUrl || 'Not available');
    }
    
    // 6. Clean up test file
    if (import.meta.env.DEV) {
      console.log('Cleaning up test file...');
    }
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (deleteError) {
      console.warn('⚠️  Failed to clean up test file:', deleteError.message);
    } else {
      if (import.meta.env.DEV) {
        console.log('Test file cleaned up');
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('Storage diagnostics completed successfully');
    }
    return { 
      success: true, 
      message: 'All storage tests passed',
      bucket: kycBucket,
      publicUrl: urlData?.publicUrl
    };
    
  } catch (error: any) {
    console.error('❌ Storage diagnostics failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const checkStoragePolicies = async () => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('Checking Storage Policies');
  }
  
  try {
    // This would typically require admin access to check policies directly
    // For now, we'll check if we can perform basic operations
    
    // Check if we can list objects (requires SELECT policy)
    const { data: objects, error: listError } = await supabase.storage
      .from('kyc-documents')
      .list('', { limit: 1 });
    
    const canList = !listError;
    if (import.meta.env.DEV) {
      console.log('Can list objects:', canList);
    }
    
    // Check if we can upload (requires INSERT policy)
    const testFileName = `policy-test-${Date.now()}.txt`;
    const testFilePath = `policy-test/${testFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, new Blob(['test']), {
        upsert: true
      });
    
    const canUpload = !uploadError;
    if (import.meta.env.DEV) {
      console.log('Can upload objects:', canUpload);
    }
    
    // Clean up test file if uploaded
    if (canUpload) {
      await supabase.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    return {
      canList,
      canUpload,
      listError: listError?.message,
      uploadError: uploadError?.message
    };
    
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error checking storage policies');
    }
    return { error: error.message };
  }
};

export const verifyDocumentRecords = async (pendingFarmerId: string) => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('Verifying document records for farmer');
  }
  
  try {
    // Fetch documents for this farmer
    const { data: documents, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('pending_farmer_id', pendingFarmerId);
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching documents');
      }
      return { success: false, error: error.message };
    }
    
    if (import.meta.env.DEV) {
      console.log(`Found ${documents?.length || 0} document records`);
    }
    
    // Check each document
    const results = [];
    for (const doc of documents || []) {
      if (import.meta.env.DEV) {
        console.log(`Checking document: ${doc.document_type}`);
      }
      
      // Check if file exists in storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('kyc-documents')
        .download(doc.file_path);
      
      const fileExists = !fileError && fileData !== null;
      if (import.meta.env.DEV) {
        console.log(`File exists in storage: ${fileExists}`);
      }
      
      // Check public URL
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(doc.file_path);
      
      if (import.meta.env.DEV) {
        console.log(`Public URL available: ${!!urlData?.publicUrl}`);
      }
      
      results.push({
        document_id: doc.id,
        file_name: doc.file_name,
        document_type: doc.document_type,
        file_path: doc.file_path,
        file_exists: fileExists,
        public_url: urlData?.publicUrl,
        status: doc.status
      });
    }
    
    return {
      success: true,
      documents: results
    };
    
  } catch (error: any) {
    console.error('❌ Document verification failed:', error.message);
    return { success: false, error: error.message };
  }
};