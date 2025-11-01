import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database.types';
import { DashboardLayout } from '@/components/DashboardLayout';
import useToastNotifications from '@/hooks/useToastNotifications';
import { CheckCircle, XCircle, Eye, FileText, Download, Search, Filter, Camera, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon to avoid conflict
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import RefreshButton from '@/components/ui/RefreshButton';
import { useKYCAdminData } from '@/hooks/useKYCAdminData';

type Farmer = Database['public']['Tables']['farmers']['Row'] & {
  profiles?: {
    email?: string | null;
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

type KYCDocument = Database['public']['Tables']['kyc_documents']['Row'];

const KYCAdminDashboard = () => {
  const toast = useToastNotifications();
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null); // URL of document being viewed

  const { data: kycData, isLoading, isError, error, refetch } = useKYCAdminData(searchTerm, statusFilter);
  
  const farmers = kycData?.farmers || [];
  const stats = kycData?.stats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };
  const filteredFarmers = farmers;
  const loading = isLoading;

  useEffect(() => {
    // Set up real-time subscription for farmers
    const farmersSubscription = supabase
      .channel('farmers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'farmers',
        },
        (payload) => {
          refetch();
          toast.success('New Registration', 'A new farmer has completed registration');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'farmers',
        },
        (payload) => {
          refetch();
        }
      )
      .subscribe();

    // Set up real-time subscription for kyc_documents
    const documentsSubscription = supabase
      .channel('kyc-documents-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kyc_documents',
        },
        (payload) => {
          // If we're viewing a farmer's details, refresh their documents
          if (selectedFarmer) {
            fetchDocuments(selectedFarmer.id);
          }
          toast.success('New Document', 'A farmer has uploaded a new KYC document');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(farmersSubscription);
      supabase.removeChannel(documentsSubscription);
    };
  }, [selectedFarmer, refetch]);

  const fetchDocuments = async (farmerId: string) => {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Error', error.message);
    }
  };

  const viewFarmerDetails = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    fetchDocuments(farmer.id);
  };

  const approveFarmer = async () => {
    if (!selectedFarmer) return;

    try {
      setActionLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update farmer status using RPC function
      const { error } = await supabase.rpc('approve_kyc', {
        farmer_id: selectedFarmer.id,
        admin_id: user.id,
      });

      if (error) throw error;

      toast.success('Success', 'Farmer approved successfully!');
      setSelectedFarmer(null);
      refetch();
    } catch (error: any) {
      console.error('Error approving farmer:', error);
      toast.error('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectFarmer = async () => {
    if (!selectedFarmer || !rejectionReason.trim()) {
      toast.error('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update farmer status using RPC function
      const { error } = await supabase.rpc('reject_kyc', {
        farmer_id: selectedFarmer.id,
        reason: rejectionReason,
        admin_id: user.id,
      });

      if (error) throw error;

      toast.success('Success', 'Farmer rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedFarmer(null);
      refetch();
    } catch (error: any) {
      console.error('Error rejecting farmer:', error);
      toast.error('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      console.log('Attempting to view document:', filePath);
      
      // Try to get the public URL for the document first
      const { data: publicData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);
      
      if (publicData?.publicUrl) {
        console.log('Opening public URL:', publicData.publicUrl);
        setViewingDocument(publicData.publicUrl);
        return;
      }
      
      // If public URL fails, try signed URL for admin access
      const { data: signedData, error: signedError } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(filePath, 600); // 10 minutes expiry for admin view
      
      if (signedError) {
        console.error('Signed URL error:', signedError);
        throw signedError;
      }
      
      if (signedData?.signedUrl) {
        console.log('Opening signed URL:', signedData.signedUrl);
        setViewingDocument(signedData.signedUrl);
      } else {
        toast.error('Error', 'Failed to generate document URL');
      }
    } catch (error: any) {
      console.error('Error getting document URL:', error);
      toast.error('Error', `Failed to access document: ${error.message || 'Unknown error'}`);
    }
  };

  const getDocumentLabel = (docType: string) => {
    const labels: Record<string, string> = {
      'id_front': 'ID (Front)',
      'id_back': 'ID (Back)',
      'selfie': 'Selfie',
    };
    return labels[docType] || docType;
  };

  const getDocumentIcon = (docType: string) => {
    if (docType.includes('id_')) return <FileText className="h-5 w-5 text-red-500" />;
    if (docType.includes('selfie')) return <UserIcon className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const exportToCSV = () => {
    try {
      const csvData = farmers.map(f => ({
        'Registration Number': f.registration_number || 'N/A',
        'Full Name': f.full_name || 'N/A',
        'National ID': f.national_id || 'N/A',
        'Phone': f.phone_number || 'N/A',
        'Email': f.profiles?.email || 'N/A',
        'Status': f.kyc_status || 'N/A',
        'Farm Location': f.farm_location || 'N/A',
        'Registered': f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'
      }));

      if (csvData.length === 0) {
        toast.error('Error', 'No data to export');
        return;
      }

      const headers = Object.keys(csvData[0]);
      const csv = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${(row as any)[h]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyc-farmers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Success', 'CSV exported successfully');
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error('Error', error.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading KYC data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Approved Farmers</h1>
              <p className="text-gray-600 mt-2">View and manage approved farmer profiles</p>
            </div>
            <div className="mt-4 md:mt-0">
              <RefreshButton 
                isRefreshing={loading} 
                onRefresh={refetch} 
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Applications</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Eye className="h-10 w-10 text-orange-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400 h-5 w-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <Button
                onClick={exportToCSV}
                className="flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Farmers Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg. Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">National ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No farmers found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredFarmers.map((farmer) => (
                      <tr key={farmer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {farmer.registration_number || 'Pending'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {farmer.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{farmer.phone_number || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{farmer.profiles?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {farmer.national_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={
                              farmer.kyc_status === 'approved' ? 'secondary' :
                              farmer.kyc_status === 'rejected' ? 'destructive' :
                              'default'
                            }
                          >
                            {farmer.kyc_status || 'pending'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewFarmerDetails(farmer)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Farmer Details Modal */}
        {selectedFarmer && (
          <Dialog open={!!selectedFarmer} onOpenChange={() => setSelectedFarmer(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Farmer Details</DialogTitle>
                <DialogDescription>
                  Review KYC information for {selectedFarmer.full_name || 'this farmer'}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6">
                {/* Personal Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Full Name</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">National ID</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.national_id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone Number</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.profiles?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Address</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Farm Location</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.farm_location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Registration Number</label>
                      <p className="text-gray-900 font-medium">{selectedFarmer.registration_number || 'Pending'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">KYC Status</label>
                      <Badge 
                        variant={
                          selectedFarmer.kyc_status === 'approved' ? 'secondary' :
                          selectedFarmer.kyc_status === 'rejected' ? 'destructive' :
                          'default'
                        }
                      >
                        {selectedFarmer.kyc_status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC Documents</h3>
                  {documents.length === 0 ? (
                    <p className="text-gray-500">No documents uploaded</p>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(doc.document_type || '')}
                              <div>
                                <p className="font-medium text-gray-900">{getDocumentLabel(doc.document_type || '')}</p>
                                <p className="text-sm text-gray-500">{doc.file_name || 'Unnamed file'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  doc.status === 'approved' ? 'secondary' :
                                  doc.status === 'rejected' ? 'destructive' :
                                  'default'
                                }
                              >
                                {doc.status || 'pending'}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc.file_path)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {doc.mime_type?.startsWith('image/') && doc.file_path && (
                            // Removed direct image display, now handled by the viewer dialog
                            null
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedFarmer.kyc_status === 'pending' && (
                  <div className="flex gap-4">
                    <Button
                      onClick={approveFarmer}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {actionLoading ? 'Processing...' : 'Approve Application'}
                    </Button>
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject Application
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Rejection Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection:
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full h-32"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={rejectFarmer}
                disabled={actionLoading || !rejectionReason.trim()}
                variant="destructive"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>View Document</DialogTitle>
            </DialogHeader>
            <div className="flex-grow flex items-center justify-center bg-muted p-2 rounded-md">
              {viewingDocument && (
                viewingDocument.includes('.pdf') ? (
                  <iframe src={viewingDocument} className="w-full h-full rounded-md" title="Document Viewer"></iframe>
                ) : (
                  <img src={viewingDocument} alt="Document Preview" className="max-w-full max-h-full object-contain rounded-md" />
                )
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setViewingDocument(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default KYCAdminDashboard;
