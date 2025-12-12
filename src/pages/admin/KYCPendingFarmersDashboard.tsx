import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Home, 
  Users, 
  Milk, 
  Loader2, 
  Filter,
  Calendar,
  UserCheck,
  UserX,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useAuth } from '@/hooks/useAuth';
import { checkPendingFarmerDocuments, fixDocumentTypes } from '@/utils/kycDocumentChecker';
import { verifyDocumentIntegrity } from '@/utils/kycStorageTest';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const KYCPendingFarmersDashboard = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const { user } = useAuth();
  const [pendingFarmers, setPendingFarmers] = useState<any[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedFarmers, setSelectedFarmers] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    emailVerified: 0,
    pendingVerification: 0,
    today: 0
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [farmerToReject, setFarmerToReject] = useState<string | null>(null); // For single rejection
  const [viewingDocument, setViewingDocument] = useState<string | null>(null); // URL of document being viewed

  useEffect(() => {
    fetchPendingFarmers();
  }, []);

  useEffect(() => {
    // Filter farmers based on search term and status
    let result = [...pendingFarmers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(farmer => 
        farmer.full_name.toLowerCase().includes(term) ||
        farmer.email.toLowerCase().includes(term) ||
        farmer.phone_number.toLowerCase().includes(term) ||
        farmer.national_id?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(farmer => farmer.status === statusFilter);
    }
    
    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredFarmers(result);
  }, [searchTerm, statusFilter, pendingFarmers, sortConfig]);

  const fetchPendingFarmers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_farmers')
        .select('*')
        .in('status', ['pending_verification', 'email_verified'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPendingFarmers(data || []);
      calculateStats(data || []);
      setFilteredFarmers(data || []);
    } catch (error) {
      console.error('Error fetching pending farmers:', error);
      toast.error('Error', 'Failed to load pending farmers');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (farmers: any[]) => {
    const today = new Date().toDateString();
    setStats({
      total: farmers.length,
      emailVerified: farmers.filter(f => f.status === 'email_verified').length,
      pendingVerification: farmers.filter(f => f.status === 'pending_verification').length,
      today: farmers.filter(f => new Date(f.created_at).toDateString() === today).length
    });
  };

  const handleViewDetails = (farmerId: string) => {
    navigate(`/admin/kyc-pending-farmers/${farmerId}`);
  };

  const handleApprove = async (farmerId: string) => {
    if (!user) {
      toast.error('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      // Check documents before approval
      const docCheck = await checkPendingFarmerDocuments(farmerId);
      console.log('Document check before approval:', docCheck);
      
      // If documents have issues, try to fix them
      if (!docCheck.hasRequiredDocuments || !docCheck.allPending) {
        console.log('Attempting to fix document issues...');
        await fixDocumentTypes(farmerId);
        
        // Re-check after fix
        const docCheckAfterFix = await checkPendingFarmerDocuments(farmerId);
        console.log('Document check after fix:', docCheckAfterFix);
        
        if (!docCheckAfterFix.hasRequiredDocuments) {
          toast.error('Error', 'Missing required documents. Please ensure ID front, ID back, and selfie are uploaded.');
          return;
        }
      }
      
      // Verify document integrity (check if files actually exist in storage)
      const integrityCheck = await verifyDocumentIntegrity(farmerId);
      if (!integrityCheck.success || !integrityCheck.allFilesExist) {
        toast.error('Error', 'Some documents are missing from storage. Please ask the farmer to re-upload them.');
        return;
      }
      
      // Call the Supabase function to approve the farmer
      const { data, error } = await supabase.rpc('approve_pending_farmer', {
        p_pending_farmer_id: farmerId,
        p_admin_id: user.id
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Farmer Approved', 'Farmer has been approved successfully');
        // Refresh the list
        fetchPendingFarmers();
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error approving farmer:', error);
      toast.error('Error', error.message || 'Failed to approve farmer');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !farmerToReject || !rejectionReason.trim()) {
      toast.error('Error', 'User not authenticated or rejection reason missing');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('reject_pending_farmer', {
        p_pending_farmer_id: farmerToReject,
        p_rejection_reason: rejectionReason,
        p_admin_id: user.id
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Farmer Rejected', 'Farmer registration has been rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setFarmerToReject(null);
        fetchPendingFarmers();
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error rejecting farmer:', error);
      toast.error('Error', error.message || 'Failed to reject farmer');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!user || selectedFarmers.length === 0) return;

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      
      for (const farmerId of selectedFarmers) {
        try {
          // Check documents before approval
          const docCheck = await checkPendingFarmerDocuments(farmerId);
          console.log(`Document check for farmer ${farmerId}:`, docCheck);
          
          // If documents have issues, try to fix them
          if (!docCheck.hasRequiredDocuments || !docCheck.allPending) {
            console.log(`Attempting to fix document issues for farmer ${farmerId}...`);
            await fixDocumentTypes(farmerId);
            
            // Re-check after fix
            const docCheckAfterFix = await checkPendingFarmerDocuments(farmerId);
            console.log(`Document check after fix for farmer ${farmerId}:`, docCheckAfterFix);
            
            if (!docCheckAfterFix.hasRequiredDocuments) {
              console.error(`Missing required documents for farmer ${farmerId}`);
              errorCount++;
              continue;
            }
          }
          
          // Verify document integrity (check if files actually exist in storage)
          const integrityCheck = await verifyDocumentIntegrity(farmerId);
          if (!integrityCheck.success || !integrityCheck.allFilesExist) {
            console.error(`Documents missing from storage for farmer ${farmerId}`);
            errorCount++;
            continue;
          }
          
          const { data, error } = await supabase.rpc('approve_pending_farmer', {
            p_pending_farmer_id: farmerId,
            p_admin_id: user.id
          });
          
          if (data?.success) {
            successCount++;
          } else {
            console.error(`Error approving farmer ${farmerId}:`, data?.message || 'Unknown error');
            errorCount++;
          }
        } catch (farmerError: any) {
          console.error(`Error processing farmer ${farmerId}:`, farmerError);
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        toast.success('Bulk Approval Complete', `${successCount} farmers approved successfully`);
      } else {
        toast.success('Bulk Approval Complete', `${successCount} farmers approved, ${errorCount} failed`);
      }
      
      setSelectedFarmers([]);
      fetchPendingFarmers();
    } catch (error: any) {
      console.error('Error in bulk approval:', error);
      toast.error('Error', error.message || 'Failed to approve selected farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user || selectedFarmers.length === 0 || !rejectionReason.trim()) {
      toast.error('Error', 'User not authenticated or rejection reason missing');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      
      for (const farmerId of selectedFarmers) {
        const { data, error } = await supabase.rpc('reject_pending_farmer', {
          p_pending_farmer_id: farmerId,
          p_rejection_reason: rejectionReason,
          p_admin_id: user.id
        });
        
        if (data?.success) {
          successCount++;
        }
      }
      
      toast.success('Bulk Rejection Complete', `${successCount} farmers rejected successfully`);
      setSelectedFarmers([]);
      setShowRejectModal(false);
      setRejectionReason('');
      fetchPendingFarmers();
    } catch (error: any) {
      console.error('Error in bulk rejection:', error);
      toast.error('Error', error.message || 'Failed to reject selected farmers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return <Badge variant="default">Pending Verification</Badge>;
      case 'email_verified':
        return <Badge variant="secondary">Email Verified</Badge>;
      case 'approved':
        return <Badge variant="secondary">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([]);
    } else {
      setSelectedFarmers(filteredFarmers.map(farmer => farmer.id));
    }
  };

  const handleSelectFarmer = (farmerId: string) => {
    if (selectedFarmers.includes(farmerId)) {
      setSelectedFarmers(selectedFarmers.filter(id => id !== farmerId));
    } else {
      setSelectedFarmers([...selectedFarmers, farmerId]);
    }
  };

  const getSortIcon = (columnName: string) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return <ChevronDown className="ml-1 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="ml-1 h-4 w-4" /> : 
      <ChevronDown className="ml-1 h-4 w-4" />;
  };

  const getDocumentPreview = async (doc: any) => {
    try {
      // Try to get the public URL for the document first
      const { data: publicData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(doc.file_path);
      
      if (publicData?.publicUrl) {
        window.open(publicData.publicUrl, '_blank');
        return;
      }
      
      // If public URL fails, try signed URL for admin access
      const { data: signedData, error: signedError } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(doc.file_path, 60); // 60 seconds expiry
      
      if (signedError) throw signedError;
      
      if (signedData?.signedUrl) {
        window.open(signedData.signedUrl, '_blank');
      } else {
        toast.error('Error', 'Failed to get document preview');
      }
    } catch (error) {
      console.error('Error getting document preview:', error);
      toast.error('Error', 'Failed to get document preview');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header matching landing page style */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Milk className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Admin Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">KYC Approvals</h1>
            <p className="text-muted-foreground">
              Review and approve pending farmer registrations
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pending</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Email Verified</p>
                    <p className="text-2xl font-bold text-green-500">{stats.emailVerified}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Verification</p>
                    <p className="text-2xl font-bold">{stats.pendingVerification}</p>
                  </div>
                  <UserX className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Applications</p>
                    <p className="text-2xl font-bold">{stats.today}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-border">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending Approvals
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search farmers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="all">All Status</option>
                      <option value="pending_verification">Pending Verification</option>
                      <option value="email_verified">Email Verified</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedFarmers.length > 0 && (
                <div className="mb-4 flex items-center justify-between bg-muted p-3 rounded-md">
                  <span>{selectedFarmers.length} farmer(s) selected</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleBulkApprove}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve Selected
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setShowRejectModal(true)} // Open modal for bulk reject reason
                      disabled={loading}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject Selected
                    </Button>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredFarmers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending farmers</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No farmers match your search criteria' 
                      : 'There are currently no farmers pending approval'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('full_name')}>
                          <div className="flex items-center">
                            Name {getSortIcon('full_name')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('email')}>
                          <div className="flex items-center">
                            Email {getSortIcon('email')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('phone_number')}>
                          <div className="flex items-center">
                            Phone {getSortIcon('phone_number')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('number_of_cows')}>
                          <div className="flex items-center">
                            Cows {getSortIcon('number_of_cows')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>
                          <div className="flex items-center">
                            Status {getSortIcon('status')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('created_at')}>
                          <div className="flex items-center">
                            Registration Date {getSortIcon('created_at')}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.map((farmer) => (
                        <TableRow key={farmer.id} className={selectedFarmers.includes(farmer.id) ? "bg-muted" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedFarmers.includes(farmer.id)}
                              onChange={() => handleSelectFarmer(farmer.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{farmer.full_name}</TableCell>
                          <TableCell>{farmer.email}</TableCell>
                          <TableCell>{farmer.phone_number}</TableCell>
                          <TableCell>{farmer.number_of_cows}</TableCell>
                          <TableCell>{getStatusBadge(farmer.status)}</TableCell>
                          <TableCell>
                            {new Date(farmer.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(farmer.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(farmer.id)}
                                disabled={farmer.status !== 'email_verified' || loading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setFarmerToReject(farmer.id);
                                  setShowRejectModal(true);
                                }}
                                disabled={loading}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rejection Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application(s)</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection for the selected farmer(s):
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 mt-2"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
                setFarmerToReject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={farmerToReject ? () => handleReject() : handleBulkReject}
              disabled={loading || !rejectionReason.trim()}
              variant="destructive"
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
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
  );
};

export default KYCPendingFarmersDashboard;
