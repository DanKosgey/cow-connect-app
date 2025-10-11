import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Home, 
  Users, 
  Milk, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  FileText,
  User,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

const KYCPendingFarmerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<any>(null);
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchFarmerDetails();
    }
  }, [id]);

  const fetchFarmerDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch farmer details
      const { data: farmerData, error: farmerError } = await supabase
        .from('pending_farmers')
        .select('*')
        .eq('id', id)
        .single();

      if (farmerError) throw farmerError;
      setFarmer(farmerData);

      // Fetch KYC documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('pending_farmer_id', id);

      if (documentsError) throw documentsError;
      setKycDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching farmer details:', error);
      toast.error('Error', 'Failed to load farmer details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!user) {
      toast.error('Error', 'User not authenticated');
      return;
    }

    try {
      setApproving(true);
      
      // Call the Supabase function to approve the farmer
      const { data, error } = await supabase.rpc('approve_pending_farmer', {
        pending_farmer_id: id,
        approved_by_user_id: user.id
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Farmer Approved', 'Farmer has been approved successfully');
        navigate('/admin/kyc-pending-farmers');
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error approving farmer:', error);
      toast.error('Error', error.message || 'Failed to approve farmer');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!user) {
      toast.error('Error', 'User not authenticated');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setRejecting(true);
      
      // Call the Supabase function to reject the farmer
      const { data, error } = await supabase.rpc('reject_pending_farmer', {
        pending_farmer_id: id,
        rejection_reason: rejectionReason,
        rejected_by_user_id: user.id
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Farmer Rejected', 'Farmer registration has been rejected');
        navigate('/admin/kyc-pending-farmers');
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error rejecting farmer:', error);
      toast.error('Error', error.message || 'Failed to reject farmer');
    } finally {
      setRejecting(false);
    }
  };

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'national_id_front': 'National ID (Front)',
      'national_id_back': 'National ID (Back)',
      'selfie_1': 'Selfie 1',
      'selfie_2': 'Selfie 2',
      'selfie_3': 'Selfie 3'
    };
    return labels[type] || type;
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('national_id')) return <FileText className="h-5 w-5 text-red-500" />;
    return <User className="h-5 w-5 text-blue-500" />;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading farmer details...</p>
        </div>
      </div>
    );
  }

  // Show error state if no farmer
  if (!farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Farmer not found</p>
          <Button onClick={() => navigate('/admin/kyc-pending-farmers')}>
            Back to Pending Farmers
          </Button>
        </div>
      </div>
    );
  }

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
              onClick={() => navigate('/admin/kyc-pending-farmers')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Pending Farmers
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Farmer Details</h1>
            <p className="text-muted-foreground">
              Review farmer registration details and KYC documents
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Personal Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{farmer.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{farmer.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{farmer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{farmer.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">National ID</p>
                      <p className="font-medium">{farmer.national_id || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{farmer.address || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Farm Information */}
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Milk className="h-5 w-5" />
                    Farm Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Number of Cows</p>
                      <p className="font-medium">{farmer.number_of_cows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Feeding Type</p>
                      <p className="font-medium">
                        <Badge variant="outline">{farmer.feeding_type}</Badge>
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Farm Location</p>
                      <p className="font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        {farmer.farm_location}
                      </p>
                    </div>
                    {farmer.gps_coordinates && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                        <p className="font-medium">
                          {typeof farmer.gps_coordinates === 'string' 
                            ? farmer.gps_coordinates 
                            : JSON.stringify(farmer.gps_coordinates)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* KYC Documents */}
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    KYC Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {kycDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No KYC documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kycDocuments.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {getDocumentIcon(doc.document_type)}
                              <span className="ml-2 font-medium">
                                {getDocumentLabel(doc.document_type)}
                              </span>
                            </div>
                            <Badge variant="outline">{doc.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {doc.file_name}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={async () => {
                              try {
                                // Get the public URL for the document
                                const { data } = supabase.storage
                                  .from('kyc-documents')
                                  .getPublicUrl(doc.file_path);
                                
                                if (data?.publicUrl) {
                                  window.open(data.publicUrl, '_blank');
                                } else {
                                  toast.error('Error', 'Failed to get document URL');
                                }
                              } catch (error) {
                                console.error('Error getting document URL:', error);
                                toast.error('Error', 'Failed to get document URL');
                              }
                            }}
                          >
                            View Document
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions Panel */}
            <div className="space-y-6">
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle>Registration Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge>
                        {farmer.status === 'pending_verification' && 'Pending Verification'}
                        {farmer.status === 'email_verified' && 'Email Verified'}
                        {farmer.status === 'approved' && 'Approved'}
                        {farmer.status === 'rejected' && 'Rejected'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email Verified</span>
                      <Badge variant={farmer.email_verified ? 'default' : 'secondary'}>
                        {farmer.email_verified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Registration Date</span>
                      <span className="font-medium">
                        {new Date(farmer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {farmer.registration_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Registration Number</span>
                        <span className="font-medium">
                          {farmer.registration_number}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Review all information and documents before making a decision.
                  </p>
                  <Separator />
                  
                  {/* Rejection Reason (only shown when rejecting) */}
                  {rejecting && (
                    <div className="space-y-2">
                      <Label htmlFor="rejectionReason">Rejection Reason</Label>
                      <Textarea
                        id="rejectionReason"
                        placeholder="Enter reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      onClick={handleApprove}
                      disabled={approving || farmer.status !== 'email_verified'}
                    >
                      {approving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Registration
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => {
                        if (rejecting) {
                          handleReject();
                        } else {
                          setRejecting(true);
                        }
                      }}
                      disabled={approving}
                    >
                      {rejecting ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Confirm Rejection
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Registration
                        </>
                      )}
                    </Button>
                    
                    {rejecting && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setRejecting(false);
                          setRejectionReason('');
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCPendingFarmerDetails;