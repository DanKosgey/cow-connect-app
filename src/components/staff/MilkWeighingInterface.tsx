import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Eye,
  EyeOff,
  Shield,
  Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import BiometricVerificationModal from './BiometricVerificationModal';
import { BiometricVerificationService } from '@/services/biometric-verification-service';
import { EnhancedAuditService } from '@/services/enhanced-audit-service';

interface PendingCollection {
  id: string;
  collection_id: string;
  liters: number;
  collection_date: string;
  status: string;
  approved_for_company: boolean;
  // Farmer information is intentionally omitted for isolation
}

interface WeighingFormData {
  collectionId: string;
  companyReceivedLiters: number;
  approvalNotes: string;
}

const MilkWeighingInterface: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weighingFormData, setWeighingFormData] = useState<WeighingFormData>({
    collectionId: '',
    companyReceivedLiters: 0,
    approvalNotes: ''
  });
  const [showWeighingForm, setShowWeighingForm] = useState(false);
  const [showCollectorInfo, setShowCollectorInfo] = useState(false); // Initially hide collector info
  const [showBiometricVerification, setShowBiometricVerification] = useState(false);
  const [hasBiometricData, setHasBiometricData] = useState(false);

  useEffect(() => {
    fetchPendingCollections();
    checkBiometricRegistration();
  }, []);

  const checkBiometricRegistration = async () => {
    if (user?.id) {
      const hasData = await BiometricVerificationService.hasBiometricData(user.id);
      setHasBiometricData(hasData);
    }
  };

  const fetchPendingCollections = async () => {
    setIsLoading(true);
    try {
      // Fetch only basic collection data without farmer information for isolation
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          collection_date,
          status,
          approved_for_company
        `)
        .eq('status', 'Collected')
        .eq('approved_for_company', false)
        .order('collection_date', { ascending: false });

      if (error) throw error;

      setPendingCollections(collectionsData || []);
    } catch (error: any) {
      console.error('Error fetching pending collections:', error);
      showError('Error', String(error?.message || 'Failed to fetch pending collections'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeighCollection = async (collectionId: string, receivedLiters: number, notes: string) => {
    if (!user?.id) {
      showError('Error', 'User not authenticated');
      return;
    }

    // Check if biometric verification is required
    if (hasBiometricData) {
      setWeighingFormData({
        collectionId,
        companyReceivedLiters: receivedLiters,
        approvalNotes: notes
      });
      setShowBiometricVerification(true);
      return;
    }

    // If no biometric data is registered, proceed with regular approval
    await processWeighing(collectionId, receivedLiters, notes);
  };

  const handleBiometricVerificationComplete = async (success: boolean) => {
    setShowBiometricVerification(false);
    
    if (success) {
      // Proceed with the weighing process
      await processWeighing(
        weighingFormData.collectionId,
        weighingFormData.companyReceivedLiters,
        weighingFormData.approvalNotes
      );
    } else {
      showError('Error', 'Biometric verification failed. Approval cannot be processed.');
    }
  };

  const processWeighing = async (collectionId: string, receivedLiters: number, notes: string) => {
    if (!user?.id) {
      showError('Error', 'User not authenticated');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate a unique session ID for this weighing session
      const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log the weighing session
      await EnhancedAuditService.logWeighingSession(
        collectionId,
        user.id,
        receivedLiters,
        sessionId,
        hasBiometricData ? 'biometric' : 'password',
        {
          ipAddress: '', // In a real implementation, you would get this from the request
          userAgent: navigator.userAgent,
          deviceInfo: `${window.screen.width}x${window.screen.height}`,
        }
      );

      // First get the full collection details including farmer info for processing
      const { data: fullCollection, error: collectionError } = await supabase
        .from('collections')
        .select(`
          id,
          liters,
          farmer_id,
          staff_id,
          farmers (
            full_name,
            id
          )
        `)
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!fullCollection) throw new Error('Collection not found');

      // Calculate variance
      const collectedLiters = fullCollection.liters;
      const varianceLiters = receivedLiters - collectedLiters;
      const variancePercentage = collectedLiters > 0 
        ? (varianceLiters / collectedLiters) * 100 
        : 0;
      
      let varianceType: 'positive' | 'negative' | 'none' = 'none';
      if (varianceLiters > 0) {
        varianceType = 'positive';
      } else if (varianceLiters < 0) {
        varianceType = 'negative';
      }

      // Calculate penalty based on variance
      let penaltyAmount = 0;
      if (varianceType !== 'none') {
        // Get active penalty configuration for the variance type and percentage
        const { data: penaltyConfig, error: penaltyError } = await supabase
          .from('variance_penalty_config')
          .select('penalty_rate_per_liter')
          .eq('is_active', true)
          .eq('variance_type', varianceType)
          .gte('max_variance_percentage', Math.abs(variancePercentage))
          .lte('min_variance_percentage', Math.abs(variancePercentage))
          .limit(1)
          .maybeSingle();

        if (penaltyError) throw penaltyError;

        if (penaltyConfig) {
          // Calculate penalty: |variance_liters| * penalty_rate_per_liter
          penaltyAmount = Math.abs(varianceLiters) * penaltyConfig.penalty_rate_per_liter;
        }
      }

      // Get the staff ID from the staff table using the user ID
      let staffId = user.id;
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (staffError) {
        console.error('Error fetching staff data:', staffError);
        throw staffError;
      }
      
      if (staffData?.id) {
        staffId = staffData.id;
      } else {
        console.warn('Staff record not found for user ID, using user ID directly', user.id);
      }

      // Create milk approval record
      const { data: approval, error: approvalError } = await supabase
        .from('milk_approvals')
        .insert({
          collection_id: collectionId,
          staff_id: staffId, // Use the converted staff ID
          company_received_liters: receivedLiters,
          variance_liters: varianceLiters,
          variance_percentage: variancePercentage,
          variance_type: varianceType,
          penalty_amount: penaltyAmount,
          approval_notes: notes
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Update collection to mark as approved
      const { error: updateError } = await supabase
        .from('collections')
        .update({
          approved_for_company: true,
          company_approval_id: approval.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateError) throw updateError;

      show({
        title: 'Success',
        description: 'Milk collection weighed and approved successfully'
      });

      // Reset form and refresh data
      setWeighingFormData({
        collectionId: '',
        companyReceivedLiters: 0,
        approvalNotes: ''
      });
      setShowWeighingForm(false);
      fetchPendingCollections();
    } catch (error: any) {
      console.error('Error weighing collection:', error);
      showError('Error', String(error?.message || 'Failed to weigh collection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weighingFormData.collectionId && weighingFormData.companyReceivedLiters > 0) {
      handleWeighCollection(
        weighingFormData.collectionId,
        weighingFormData.companyReceivedLiters,
        weighingFormData.approvalNotes
      );
    }
  };

  const openWeighingForm = (collection: PendingCollection) => {
    setWeighingFormData({
      collectionId: collection.id,
      companyReceivedLiters: collection.liters, // Default to collected amount
      approvalNotes: ''
    });
    setShowWeighingForm(true);
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
          <h1 className="text-3xl font-bold">Milk Weighing</h1>
          <p className="text-muted-foreground">Weigh milk collections and process approvals</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCollectorInfo(!showCollectorInfo)}
            className="flex items-center gap-2"
          >
            {showCollectorInfo ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Collector Info
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Collector Info
              </>
            )}
          </Button>
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchPendingCollections} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Weighing Form Modal */}
      {showWeighingForm && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weigh Milk Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collectedLiters">Collected Liters (Hidden from Collector)</Label>
                  <Input
                    id="collectedLiters"
                    type="number"
                    step="0.01"
                    value={weighingFormData.companyReceivedLiters}
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
                    value={weighingFormData.companyReceivedLiters}
                    onChange={(e) => setWeighingFormData({
                      ...weighingFormData,
                      companyReceivedLiters: parseFloat(e.target.value) || 0
                    })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approvalNotes">Weighing Notes</Label>
                <Textarea
                  id="approvalNotes"
                  value={weighingFormData.approvalNotes}
                  onChange={(e) => setWeighingFormData({
                    ...weighingFormData,
                    approvalNotes: e.target.value
                  })}
                  placeholder="Add any notes about this weighing..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWeighingForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || weighingFormData.companyReceivedLiters <= 0}
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Weigh & Approve
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Biometric Verification Modal */}
      {showBiometricVerification && user?.id && (
        <BiometricVerificationModal
          staffId={user.id}
          biometricType="fingerprint"
          onVerificationComplete={handleBiometricVerificationComplete}
          onCancel={() => setShowBiometricVerification(false)}
        />
      )}

      {/* Pending Collections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Pending Collections for Weighing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection ID</TableHead>
                  {showCollectorInfo && <TableHead>Farmer</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Collected (L)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={showCollectorInfo ? 6 : 5} className="text-center py-8">
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
                      {showCollectorInfo && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Click "Show Collector Info" to view</span>
                          </div>
                        </TableCell>
                      )}
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
                          onClick={() => openWeighingForm(collection)}
                        >
                          <Scale className="h-4 w-4 mr-1" />
                          Weigh
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showCollectorInfo ? 6 : 5} className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No pending collections for weighing</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Shield className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-yellow-700">
              This interface is designed to prevent fraud by isolating collector and staff information. 
              Collector information is hidden by default and can only be revealed with explicit permission.
            </p>
            {hasBiometricData ? (
              <div className="flex items-center gap-2 text-green-700">
                <Fingerprint className="h-4 w-4" />
                <span>Biometric verification is enabled for enhanced security</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-700">
                <Fingerprint className="h-4 w-4" />
                <span>Biometric verification is not yet configured. Please register your biometric data for enhanced security.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MilkWeighingInterface;