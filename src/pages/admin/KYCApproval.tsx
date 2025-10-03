import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Filter,
  SortAsc,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface FarmerProfile {
  id: string;
  farmer_id: string;
  national_id: string;
  address: string;
  farm_location: string;
  kyc_status: string;
  registration_completed: boolean;
  documents_uploaded: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    phone: string;
    email: string;
  };
  kyc_documents: KYCDocument[];
}

interface KYCDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  status: string;
  rejection_reason?: string;
}

interface AuditLog {
  action: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

const KYCApproval = () => {
  const toast = useToastNotifications();
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerProfile | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false );
  const [processingApproval, setProcessingApproval] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [comments, setComments] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  useEffect(() => {
    fetchFarmersData();
  }, []);

  const fetchFarmersData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          *,
          profiles!inner (
            full_name,
            phone,
            email
          ),
          kyc_documents (
            id,
            document_type,
            file_name,
            file_path,
            file_size,
            mime_type,
            uploaded_at,
            status,
            rejection_reason
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarmers((data as FarmerProfile[]) || []);
    } catch (error: any) {
      toast.error('Error fetching farmers data', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (farmerId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', farmerId)
        .eq('table_name', 'farmers')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs((data as AuditLog[]) || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleApproveKYC = async (farmerId: string, status: string) => {
    setProcessingApproval(true);
    try {
      // Update farmer KYC status
      const { error: farmerError } = await supabase
        .from('farmers')
        .update({
          kyc_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', farmerId);

      if (farmerError) throw farmerError;

      // Update document statuses
      const { error: docsError } = await supabase
        .from('kyc_documents')
        .update({
          status: status === 'approved' ? 'verified' : 'rejected',
          rejection_reason: status === 'rejected' ? comments : null,
          verified_at: new Date().toISOString()
        })
        .eq('farmer_id', farmerId);

      if (docsError) throw docsError;

      // Send notification to farmer
      const { data: farmer } = await supabase
        .from('farmers')
        .select('user_id')
        .eq('id', farmerId)
        .single();

      if (farmer) {
        await supabase
          .from('notifications')
          .insert({
            user_id: farmer.user_id,
            title: `KYC ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            message: status === 'approved' 
              ? 'Your KYC verification has been approved. You can now start milk collection.'
              : `Your KYC verification was rejected. Reason: ${comments}`,
            type: status === 'approved' ? 'success' : 'error',
            category: 'kyc'
          });
      }

      toast({
        title: `KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
        description: `Farmer account has been ${status === 'approved' ? 'activated' : 'deactivated'}`
      });

      setComments('');
      setSelectedFarmer(null);
      fetchFarmersData();

    } catch (error: any) {
      toast.error('Error processing KYC', error.message);
    } finally {
      setProcessingApproval(false);
    }
  };

  const openFarmerDetails = (farmer: FarmerProfile) => {
    setSelectedFarmer(farmer);
    setDocuments(farmer.kyc_documents || []);
    fetchAuditLogs(farmer.id);
    setComments('');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = farmer.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farmer.national_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farmer.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === 'all' || farmer.kyc_status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const renderFarmerList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KYC Applications</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer Info</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFarmers.map((farmer) => (
              <TableRow key={farmer.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{farmer.profiles.full_name}</div>
                    <div className="text-sm text-gray-500">ID: {farmer.farmer_id}</div>
                    <div className="text-sm text-gray-500">National ID: {farmer.national_id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <Phone className="h-3 w-3 mr-1" />
                      {farmer.profiles.phone}
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="h-3 w-3 mr-1" />
                      {farmer.profiles.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <div className="flex items-start text-sm">
                      <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{farmer.address}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    Uploaded: {(farmer.kyc_documents || []).length}/5
                    <div className="text-xs text-gray-500">
                      {farmer.documents_uploaded ? 'Complete' : 'Incomplete'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(farmer.kyc_status)}>
                    {farmer.kyc_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(farmer.created_at), 'MMM dd, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openFarmerDetails(farmer)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredFarmers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No farmers found matching your criteria
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderFarmerDetails = () => {
    if (!selectedFarmer) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Farmer Details - {selectedFarmer.profiles.full_name}</CardTitle>
            <Button variant="outline" onClick={() => setSelectedFarmer(null)}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Farmer Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="font-medium">Full Name:</Label> {selectedFarmer.profiles.full_name}</div>
                <div><Label className="font-medium">Email:</Label> {selectedFarmer.profiles.email}</div>
                <div><Label className="font-medium">Phone:</Label> {selectedFarmer.profiles.phone}</div>
                <div><Label className="font-medium">National ID:</Label> {selectedFarmer.national_id}</div>
                <div><Label className="font-medium">Farmer ID:</Label> {selectedFarmer.farmer_id}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="font-medium">Address:</Label>
                  <div className="text-sm text-gray-600 mt-1">{selectedFarmer.address}</div>
                </div>
                <div>
                  <Label className="font-medium">Farm Location:</Label>
                  <div className="text-sm text-gray-600 mt-1">{selectedFarmer.farm_location}</div>
                </div>
                <div>
                  <Label className="font-medium">Registration Completed:</Label>
                  <Badge className={selectedFarmer.registration_completed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedFarmer.registration_completed ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KYC Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{doc.file_name}</div>
                        <div className="text-sm text-gray-500">
                          {(doc.file_size / 1024).toFixed(1)} KB • {doc.mime_type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {doc.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_path, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Review Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comments">Review Comments</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments for approval or rejection..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleApproveKYC(selectedFarmer.id, 'approved')}
                  disabled={processingApproval}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve KYC
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproveKYC(selectedFarmer.id, 'rejected')}
                  disabled={processingApproval}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject KYC
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          {auditLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-gray-500">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">KYC Approval Management</h1>
          <p className="text-gray-600 mt-2">Review and approve farmer registrations</p>
        </div>

        {selectedFarmer ? renderFarmerDetails() : renderFarmerList()}
      </div>
    </DashboardLayout>
  );
};

export default KYCApproval;



