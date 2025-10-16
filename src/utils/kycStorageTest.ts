import { supabase } from '@/integrations/supabase/client';

export const testKYCStorage = async () => {
  console.log('🧪 Testing KYC Document Storage and Retrieval...');
  
  try {
    // 1. Check if kyc-documents bucket exists
    console.log('1. Checking kyc-documents bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError.message);
      return { success: false, error: bucketError.message };
    }
    
    const kycBucket = buckets?.find(bucket => bucket.name === 'kyc-documents');
    if (!kycBucket) {
      console.error('❌ kyc-documents bucket not found');
      return { success: false, error: 'kyc-documents bucket not found' };
    }
    
    console.log('✅ kyc-documents bucket exists:', {
      id: kycBucket.id,
      name: kycBucket.name,
      public: kycBucket.public
    });
    
    // 2. Check if there are any documents in the bucket
    console.log('2. Checking for documents in kyc-documents bucket...');
    const { data: objects, error: objectError } = await supabase.storage
      .from('kyc-documents')
      .list('', { limit: 10 });
    
    if (objectError) {
      console.error('❌ Error listing objects:', objectError.message);
      return { success: false, error: objectError.message };
    }
    
    console.log(`✅ Found ${objects?.length || 0} objects in bucket`);
    if (objects && objects.length > 0) {
      console.log('Sample objects:', objects.slice(0, 3));
    }
    
    // 3. Check kyc_documents table for records
    console.log('3. Checking kyc_documents table...');
    const { data: documents, error: docError } = await supabase
      .from('kyc_documents')
      .select('*')
      .limit(5);
    
    if (docError) {
      console.error('❌ Error fetching kyc_documents:', docError.message);
      return { success: false, error: docError.message };
    }
    
    console.log(`✅ Found ${documents?.length || 0} kyc_documents records`);
    if (documents && documents.length > 0) {
      console.log('Sample documents:', documents.slice(0, 2).map(doc => ({
        id: doc.id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_path: doc.file_path,
        status: doc.status,
        pending_farmer_id: doc.pending_farmer_id
      })));
      
      // 4. Test retrieving a document URL
      console.log('4. Testing document URL retrieval...');
      const testDoc = documents[0];
      if (testDoc.file_path) {
        // Try public URL first
        const { data: publicData } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(testDoc.file_path);
        
        if (publicData?.publicUrl) {
          console.log('✅ Public URL generated successfully:', publicData.publicUrl);
        } else {
          // Try signed URL
          const { data: signedData, error: signedError } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(testDoc.file_path, 60);
          
          if (signedError) {
            console.warn('⚠️ Error creating signed URL:', signedError.message);
          } else if (signedData?.signedUrl) {
            console.log('✅ Signed URL generated successfully:', signedData.signedUrl);
          }
        }
      }
    }
    
    console.log('✅ KYC Storage Test Completed Successfully');
    return { success: true, message: 'All tests passed' };
    
  } catch (error: any) {
    console.error('❌ KYC Storage Test Failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const verifyDocumentIntegrity = async (pendingFarmerId: string) => {
  console.log(`🔍 Verifying document integrity for pending farmer: ${pendingFarmerId}`);
  
  try {
    // Fetch documents for this farmer
    const { data: documents, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('pending_farmer_id', pendingFarmerId);
    
    if (error) {
      console.error('❌ Error fetching documents:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Found ${documents?.length || 0} documents for farmer`);
    
    // Check each document
    const results = [];
    for (const doc of documents || []) {
      console.log(`📄 Checking document: ${doc.file_name} (${doc.document_type})`);
      
      // Check if file exists in storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('kyc-documents')
        .download(doc.file_path);
      
      const fileExists = !fileError && fileData !== null;
      console.log(`   ${fileExists ? '✅' : '❌'} File exists in storage: ${fileExists}`);
      
      results.push({
        document_id: doc.id,
        file_name: doc.file_name,
        document_type: doc.document_type,
        file_exists: fileExists,
        status: doc.status
      });
    }
    
    const allFilesExist = results.every(r => r.file_exists);
    console.log(`${allFilesExist ? '✅' : '❌'} All documents verified: ${allFilesExist}`);
    
    return {
      success: true,
      allFilesExist,
      documents: results
    };
    
  } catch (error: any) {
    console.error('❌ Document integrity verification failed:', error.message);
    return { success: false, error: error.message };
  }
};