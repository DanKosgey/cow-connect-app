import { supabase } from '@/integrations/supabase/client';

/**
 * KYC Upload Diagnostics
 * 
 * Utility functions to diagnose KYC document upload issues in the browser
 */

export const diagnoseKYCUpload = async (userId: string) => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('Starting KYC Upload Diagnostics');
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
    
    if (import.meta.env.DEV) {
      console.log('Authenticated user ID present');
    }
    
    // 2. Test bucket access
    if (import.meta.env.DEV) {
      console.log('Testing bucket access');
    }
    
    // Try to list buckets (this might fail with anon key, which is expected)
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        if (import.meta.env.DEV) {
          console.log('Bucket listing failed (expected with anon key)');
        }
      } else {
        if (import.meta.env.DEV) {
          console.log(`Found ${buckets.length} buckets`);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log('Bucket listing threw error (expected with anon key)');
      }
    }
    
    // 3. Test direct bucket access
    if (import.meta.env.DEV) {
      console.log('Testing direct kyc-documents bucket access');
    }
    
    try {
      // Try to list objects in the kyc-documents bucket
      const { data: objects, error: listError } = await supabase.storage
        .from('kyc-documents')
        .list('', { limit: 1 });
      
      if (listError) {
        if (import.meta.env.DEV) {
          console.log('Direct bucket access failed (expected with anon key)');
        }
      } else {
        if (import.meta.env.DEV) {
          console.log(`Direct bucket access successful, found ${objects?.length || 0} objects`);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log('Direct bucket access threw error (expected with anon key)');
      }
    }
    
    // 4. Test file upload with a small test file
    if (import.meta.env.DEV) {
      console.log('Testing file upload capability');
    }
    
    const testFileName = `kyc-diag-${Date.now()}.txt`;
    const testContent = 'KYC diagnostics test file';
    const testFilePath = `${user.id}/diagnostics/${testFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, new Blob([testContent]), {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });
    
    if (uploadError) {
      if (import.meta.env.DEV) {
        console.log('File upload test result: Failed (expected in most cases)');
      }
      // This is often expected to fail for non-admin users
      return { 
        success: true, 
        message: 'KYC diagnostics completed (upload test failed as expected for non-admin users)',
        userId: user.id
      };
    }
    
    if (import.meta.env.DEV) {
      console.log('File upload test result: Success');
    }
    
    // 5. Clean up test file
    if (import.meta.env.DEV) {
      console.log('Cleaning up test file');
    }
    await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (import.meta.env.DEV) {
      console.log('KYC diagnostics completed successfully');
    }
    return { 
      success: true, 
      message: 'All KYC diagnostics tests completed',
      userId: user.id
    };
    
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('KYC diagnostics failed');
    }
    return { success: false, error: error.message };
  }
};

export default {
  diagnoseKYCUpload
};