import { supabase } from '@/integrations/supabase/client';

export const checkPendingFarmerDocuments = async (pendingFarmerId: string) => {
  try {
    // Fetch all documents for this pending farmer
    const { data: documents, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('pending_farmer_id', pendingFarmerId);

    if (error) throw error;

    // Count documents by type
    const idFrontCount = documents?.filter(doc => doc.document_type === 'id_front').length || 0;
    const idBackCount = documents?.filter(doc => doc.document_type === 'id_back').length || 0;
    const selfieCount = documents?.filter(doc => doc.document_type === 'selfie').length || 0;
    const pendingCount = documents?.filter(doc => doc.status === 'pending').length || 0;

    console.log('Document check results:', {
      totalDocuments: documents?.length || 0,
      idFrontCount,
      idBackCount,
      selfieCount,
      pendingCount,
      documents
    });

    return {
      totalDocuments: documents?.length || 0,
      idFrontCount,
      idBackCount,
      selfieCount,
      pendingCount,
      hasRequiredDocuments: idFrontCount > 0 && idBackCount > 0 && selfieCount > 0,
      allPending: pendingCount === (documents?.length || 0),
      documents
    };
  } catch (error) {
    console.error('Error checking pending farmer documents:', error);
    throw error;
  }
};

export const fixDocumentTypes = async (pendingFarmerId: string) => {
  try {
    // Fix document types
    const updates = [
      supabase
        .from('kyc_documents')
        .update({ document_type: 'id_front' })
        .in('document_type', ['national_id_front', 'id front', 'id-front', 'front'])
        .eq('pending_farmer_id', pendingFarmerId),
      
      supabase
        .from('kyc_documents')
        .update({ document_type: 'id_back' })
        .in('document_type', ['national_id_back', 'id back', 'id-back', 'back'])
        .eq('pending_farmer_id', pendingFarmerId),
      
      supabase
        .from('kyc_documents')
        .update({ document_type: 'selfie' })
        .in('document_type', ['selfie_1', 'selfie1', 'photo', 'picture'])
        .eq('pending_farmer_id', pendingFarmerId)
    ];

    const results = await Promise.all(updates);
    
    // Set all documents to pending status
    const { error: statusError } = await supabase
      .from('kyc_documents')
      .update({ status: 'pending' })
      .eq('pending_farmer_id', pendingFarmerId)
      .not('status', 'in', '(approved,rejected)');

    if (statusError) throw statusError;

    console.log('Document types fixed for pending farmer:', pendingFarmerId);
    return true;
  } catch (error) {
    console.error('Error fixing document types:', error);
    throw error;
  }
};