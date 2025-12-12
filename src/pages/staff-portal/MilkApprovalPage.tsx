import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MilkApprovalService } from '@/services/milk-approval-service';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import RefreshButton from '@/components/ui/RefreshButton';
import { useVarianceStats } from '@/hooks/useDashboardStats';
import {
  Scale,
  Users,
  Calendar,
  Milk,
  User,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface Collection {
  id: string;
  collection_id?: string;
  liters: number;
  collection_date: string;
  status: string;
  approved_for_company: boolean;
  staff_id?: string | null;
  farmer_id?: string | null;
  // New enriched fields from service
  farmer?: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    registrationNumber?: string;
  };
  collector?: {
    staffId: string;
    userId: string;
    fullName: string;
    email: string;
    roles: string[];
  };
}

interface BatchFormData {
  totalReceived: string;
  notes: string;
}

interface CollectionGroup {
  collectorId: string;
  collectorName: string;
  collectionDate: string;
  collections: Collection[];
  totalCollections: number;
}

const MilkApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: varianceStats, isLoading: isVarianceLoading, refetch: refetchVarianceStats } = useVarianceStats();

  const [pendingCollections, setPendingCollections] = useState<Collection[]>([]);
  const [groupedCollections, setGroupedCollections] = useState<CollectionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchGroup, setBatchGroup] = useState<CollectionGroup | null>(null);
  const [batchFormData, setBatchFormData] = useState<BatchFormData>({
    totalReceived: '',
    notes: ''
  });

  useEffect(() => {
    fetchPendingCollections();
  }, []);

  const fetchPendingCollections = async () => {
    setIsLoading(true);
    try {
      const result = await MilkApprovalService.getPendingCollections();
      if (result.success && result.data) {
        console.log('Fetched pending collections count:', result.data.length);
        
        // Log detailed information about the first few collections
        result.data.slice(0, 2).forEach((collection: any, index: number) => {
          console.log(`Sample collection ${index}:`, {
            id: collection.id,
            collectorName: collection.collector?.fullName,
            farmerName: collection.farmer?.fullName,
            hasCollector: !!collection.collector,
            hasFarmer: !!collection.farmer
          });
        });
        
        setPendingCollections(result.data);
        groupCollections(result.data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending collections",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupCollections = (collections: Collection[]) => {
    console.log('Grouping collections count:', collections.length);
    const groups: { [key: string]: CollectionGroup } = {};

    // First pass: Create initial groups with collector names from individual collections
    collections.forEach((collection, index) => {
      // Use collector data from enriched service
      const collectorId = collection.collector?.staffId || collection.staff_id || 'unassigned';
      const collectorName = collection.collector?.fullName || 'Unknown Collector';
      
      // Log detailed information about what we're using (only first 2)
      if (index < 2) {
        console.log(`Processing collection ${index}:`, {
          collectionId: collection.id,
          collectorId,
          collectorName,
          hasCollectorInfo: !!(collection.collector?.fullName)
        });
      }

      const date = collection.collection_date.split('T')[0];
      const key = `${collectorId}-${date}`;

      if (!groups[key]) {
        groups[key] = {
          collectorId,
          collectorName,
          collectionDate: date,
          collections: [],
          totalCollections: 0
        };
      }
      groups[key].collections.push(collection);
      groups[key].totalCollections++;
    });

    console.log('Initial groups created:', Object.keys(groups).length);

    // Second pass: Improve collector names by finding the best name for each group
    Object.values(groups).forEach(group => {
      // Only try to improve names for groups that have a valid collector ID and are currently showing "Unknown Collector"
      if (group.collectorId !== 'unassigned' && group.collectorName === 'Unknown Collector') {
        // Look for a collection in this group with a valid collector name
        const collectionWithValidName = group.collections.find(
          collection => {
            const name = collection.collector?.fullName;
            return name && name !== 'Unknown Collector';
          }
        );
        
        if (collectionWithValidName) {
          const betterName = collectionWithValidName.collector?.fullName || 'Unknown Collector';
          group.collectorName = betterName;
        }
      }
    });

    const finalGroups = Object.values(groups);
    console.log('Final grouped collections count:', finalGroups.length);
    setGroupedCollections(finalGroups);
  };

  const formatDateSafely = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'collected': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const openBatchFormDialog = (group: CollectionGroup) => {
    setBatchFormData({
      totalReceived: '',
      notes: ''
    });
    setBatchGroup(group);
    setShowBatchForm(true);
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBatchFormData(prev => ({
      ...prev,
      [name]: name === 'totalReceived' ? value : value
    }));
  };


  const handleBatchApprove = async () => {
    if (!batchGroup || !user) return;
    const received = parseFloat(batchFormData.totalReceived);
    if (isNaN(received) || received < 0) {
      toast({ title: "Error", description: "Please enter a valid positive number for received liters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const totalExpected = batchGroup.collections.reduce((sum, col) => sum + col.liters, 0);
      const promises = batchGroup.collections.map(async (col) => {
        const factor = totalExpected > 0 ? col.liters / totalExpected : 0;
        const receivedLiters = factor * received;
        return MilkApprovalService.approveMilkCollection({
          collectionId: col.id,
          staffId: user.id,
          companyReceivedLiters: receivedLiters,
          approvalNotes: batchFormData.notes
        });
      });
      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.success);
      if (allSuccessful) {
        toast({ title: "Success", description: "Batch approved successfully" });
        fetchPendingCollections();
        refetchVarianceStats();
        setShowBatchForm(false);
      } else {
        // Check if any errors are related to staff validation
        const staffError = results.find(res => !res.success && res.error && 
          (res.error as Error).message?.includes('staff record'));
        
        if (staffError) {
          toast({ 
            title: "Permission Error", 
            description: (staffError.error as Error).message || "Only staff members can approve collections",
            variant: "destructive" 
          });
        } else {
          toast({ title: "Error", description: "Some collections failed to approve", variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to batch approve", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCollectorAssigned = (collection: Collection): boolean => {
    const collectorName = collection.collector?.fullName;
    return !!(collectorName && collectorName !== 'Unknown Collector');
  };

  const isFarmerAssigned = (collection: Collection): boolean => {
    const farmerName = collection.farmer?.fullName;
    return !!(farmerName && farmerName !== 'Unknown Farmer');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milk Approval</h1>
          <p className="text-muted-foreground">Approve milk collections and track variances</p>
        </div>
        <RefreshButton onRefresh={fetchPendingCollections} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collections by Collector and Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : groupedCollections.length > 0 ? (
                  groupedCollections.map((group) => (
                    <TableRow key={`${group.collectorId}-${group.collectionDate}`}>
                      <TableCell className="font-medium">
                        {group.collectorName}
                        {group.collectorId === 'unassigned' && (
                          <Badge variant="destructive" className="ml-2" title="These collections have missing collector information and cannot be batch approved">Unassigned</Badge>
                       )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateSafely(group.collectionDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Milk className="h-4 w-4 text-muted-foreground" />
                          <span>{group.totalCollections} collections</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.collectorId === 'unassigned' ? (
                          <Button size="sm" variant="secondary" disabled title="Cannot batch approve unassigned collections">
                            Batch Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => openBatchFormDialog(group)}
                          >
                            <Scale className="h-4 w-4 mr-1" />
                            Batch Approve
                          </Button>
                       )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
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

      {/* Individual Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Individual Collections (Detailed View)
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
                  <TableHead>Collector</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingCollections.length > 0 ? (
                  pendingCollections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium text-sm">
                        {collection.id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {collection.farmer?.fullName || 'Unknown Farmer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {collection.farmer?.registrationNumber || 'No ID'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateSafely(collection.collection_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {collection.collector?.fullName || 'Unassigned Collector'}
                          {!isCollectorAssigned(collection) && (
                            <Badge variant="destructive" title="This collection has missing collector information">Unassigned</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(collection.status)}>
                          {collection.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
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
                    <div className="text-xl font-bold">
                      {isVarianceLoading ? (
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        `${varianceStats?.avgVariance >= 0 ? '+' : ''}${varianceStats?.avgVariance || 0}%`
                     )}
                    </div>
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
                    <div className="text-xl font-bold">
                      {isVarianceLoading ? (
                        <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        varianceStats?.positiveVariances || 0
                     )}
                    </div>
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
                    <div className="text-xl font-bold">
                      {isVarianceLoading ? (
                        <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        varianceStats?.negativeVariances || 0
                     )}
                    </div>
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

      {/* Batch Approval Dialog */}
      <Dialog open={showBatchForm} onOpenChange={setShowBatchForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Approve for {batchGroup?.collectorName} - {batchGroup?.collectionDate ? formatDateSafely(batchGroup.collectionDate) : ''}</DialogTitle>
            <DialogDescription>
              Approve {batchGroup?.totalCollections} collections. Enter the total weighed milk received at the company. It will be distributed proportionally based on individual collection amounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="totalReceived">Received Total Liters</Label>
              <Input
                id="totalReceived"
                type="number"
                name="totalReceived"
                value={batchFormData.totalReceived}
                onChange={handleBatchChange}
                placeholder="Enter total liters received"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Approval Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={batchFormData.notes}
                onChange={handleBatchChange}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowBatchForm(false)}>Cancel</Button>
            <Button onClick={handleBatchApprove} disabled={isSubmitting || !batchFormData.totalReceived}>
              {isSubmitting ? 'Approving...' : 'Approve Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MilkApprovalPage;