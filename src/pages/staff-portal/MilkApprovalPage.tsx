import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { MilkApprovalService } from '@/services/milk-approval-service';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Milk, 
  Scale, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  collection_date: string;
  status: string;
  approved_for_company: boolean;
  farmers: {
    full_name: string;
    id: string;
  } | null;
}

interface ApprovalFormData {
  collectionId: string;
  companyReceivedLiters: number;
  approvalNotes: string;
}

const MilkApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [pendingCollections, setPendingCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalFormData, setApprovalFormData] = useState<ApprovalFormData>({
    collectionId: '',
    companyReceivedLiters: 0,
    approvalNotes: ''
  });
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  useEffect(() => {
    fetchPendingCollections();
  }, []);

  const fetchPendingCollections = async () => {
    setIsLoading(true);
    try {
      const result = await MilkApprovalService.getPendingCollections();
      
      if (!result.success) {
        throw result.error;
      }

      setPendingCollections(result.data || []);
    } catch (error: any) {
      console.error('Error fetching pending collections:', error);
      showError('Error', String(error?.message || 'Failed to fetch pending collections'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCollection = async (collectionId: string, receivedLiters: number, notes: string) => {
    if (!user?.id) {
      showError('Error', 'User not authenticated');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await MilkApprovalService.approveMilkCollection({
        collectionId,
        staffId: user.id, // In a real implementation, we'd get the staff ID from the staff table
        companyReceivedLiters: receivedLiters,
        approvalNotes: notes
      });
      
      if (!result.success) {
        throw result.error;
      }

      show({
        title: 'Success',
        description: 'Milk collection approved successfully'
      });

      // Reset form and refresh data
      setApprovalFormData({
        collectionId: '',
        companyReceivedLiters: 0,
        approvalNotes: ''
      });
      setShowApprovalForm(false);
      fetchPendingCollections();
    } catch (error: any) {
      console.error('Error approving collection:', error);
      showError('Error', String(error?.message || 'Failed to approve collection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (approvalFormData.collectionId && approvalFormData.companyReceivedLiters > 0) {
      handleApproveCollection(
        approvalFormData.collectionId,
        approvalFormData.companyReceivedLiters,
        approvalFormData.approvalNotes
      );
    }
  };

  const openApprovalForm = (collection: Collection) => {
    setApprovalFormData({
      collectionId: collection.id,
      companyReceivedLiters: collection.liters, // Default to collected amount
      approvalNotes: ''
    });
    setShowApprovalForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Milk Approval</h1>
          <p className="text-muted-foreground">Approve milk collections and track variances</p>
        </div>
        <div className="mt-4 md:mt-0">
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchPendingCollections} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Approval Form Modal */}
      {showApprovalForm && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Approve Milk Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collectedLiters">Collected Liters</Label>
                  <Input
                    id="collectedLiters"
                    type="number"
                    step="0.01"
                    value={approvalFormData.companyReceivedLiters}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivedLiters">Company Received Liters *</Label>
                  <Input
                    id="receivedLiters"
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvalFormData.companyReceivedLiters}
                    onChange={(e) => setApprovalFormData({
                      ...approvalFormData,
                      companyReceivedLiters: parseFloat(e.target.value) || 0
                    })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approvalNotes">Approval Notes</Label>
                <Textarea
                  id="approvalNotes"
                  value={approvalFormData.approvalNotes}
                  onChange={(e) => setApprovalFormData({
                    ...approvalFormData,
                    approvalNotes: e.target.value
                  })}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApprovalForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || approvalFormData.companyReceivedLiters <= 0}
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Collection
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Collections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Pending Collections for Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection ID</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Collected (L)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingCollections.length > 0 ? (
                  pendingCollections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">
                        {collection.collection_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {collection.farmers?.full_name || 'Unknown Farmer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {collection.farmers?.id || 'No ID'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(collection.collection_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {collection.liters.toFixed(2)} L
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(collection.status)}>
                          {collection.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openApprovalForm(collection)}
                        >
                          <Scale className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No pending collections for approval</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Variance Analytics Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Variance Analytics Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Avg. Variance</div>
                    <div className="text-xl font-bold">+0.45%</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Positive Variances</div>
                    <div className="text-xl font-bold">24</div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-800 font-bold">+2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Negative Variances</div>
                    <div className="text-xl font-bold">18</div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-800 font-bold">-1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MilkApprovalPage;