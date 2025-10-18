import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentService } from '@/services/payment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  Wallet, 
  Calendar, 
  Filter,
  Download,
  Eye,
  AlertCircle,
  FileText,
  UserCheck,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UserRole } from '@/types/auth.types';

// Define interfaces at the top of the file
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  quality_grade: string;
  approved_for_payment: boolean;
  approved_at: string | null;
  verification_code: string;
  farmers: {
    full_name: string;
    id: string;
    phone_number: string;
  } | null;
}

interface FarmerPayment {
  id: string;
  farmer_id: string;
  collection_ids: string[];
  total_amount: number;
  approval_status: string;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  farmers: {
    full_name: string;
    id: string;
    phone_number: string;
  } | null;
}

interface FarmerPaymentWithFarmers extends FarmerPayment {
  farmers: {
    full_name: string;
    id: string;
    phone_number: string;
  };
}

interface PaymentStats {
  pending_count: number;
  approved_count: number;
  paid_count: number;
  total_pending_amount: number;
  total_approved_amount: number;
  total_paid_amount: number;
}

const EnhancedPaymentApproval: React.FC = () => {
  const { user, userRole } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<FarmerPaymentWithFarmers[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingCollection, setViewingCollection] = useState<Collection | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // Redirect or show error if user is not admin
  useEffect(() => {
    if (userRole && userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can access the payment approval system');
    }
  }, [userRole, showError]);

  // Refs to prevent state closure issues
  const collectionsRef = useRef(collections);
  const farmerPaymentsRef = useRef(farmerPayments);
  const loadingRef = useRef(loadingData);
  const showErrorRef = useRef(showError);

  // Update refs when state changes
  useEffect(() => {
    collectionsRef.current = collections;
    farmerPaymentsRef.current = farmerPayments;
    loadingRef.current = loadingData;
    showErrorRef.current = showError;
  }, [collections, farmerPayments, loadingData, showError]);

  // Memoize filtered collections to prevent unnecessary re-renders
  const filteredCollections = React.useMemo(() => {
    return collections.filter(collection => {
      const matchesSearch = 
        collection.farmers?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.collection_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.farmers?.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.farmers?.phone_number?.includes(searchTerm);
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && !collection.approved_for_payment) ||
        (statusFilter === 'approved' && collection.approved_for_payment);
      
      return matchesSearch && matchesStatus;
    });
  }, [collections, searchTerm, statusFilter]);

  // Fetch data function with proper error handling
  const fetchData = useCallback(async () => {
    if (!user?.id || userRole !== UserRole.ADMIN) return;

    try {
      setLoadingData(true);
      
      // Fetch collections that are not yet approved for payment
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          quality_grade,
          approved_for_payment,
          approved_at,
          verification_code,
          farmers!fk_collections_farmer_id (
            full_name,
            id,
            phone_number
          )
        `)
        .eq('approved_for_payment', false)
        .order('collection_date', { ascending: false })
        .limit(1000);

      if (collectionsError) throw collectionsError;

      // Fetch farmer payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (paymentsError) throw paymentsError;

      // Fetch payment statistics
      const { data: statsData, error: statsError } = await supabase
        .from('farmer_payments')
        .select(`
          approval_status,
          total_amount
        `);

      if (statsError) throw statsError;

      // Calculate payment statistics
      const pendingPayments = statsData.filter(p => p.approval_status === 'pending');
      const approvedPayments = statsData.filter(p => p.approval_status === 'approved');
      const paidPayments = statsData.filter(p => p.approval_status === 'paid');

      const stats: PaymentStats = {
        pending_count: pendingPayments.length,
        approved_count: approvedPayments.length,
        paid_count: paidPayments.length,
        total_pending_amount: pendingPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        total_approved_amount: approvedPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        total_paid_amount: paidPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0)
      };

      // Only update state if component is still mounted
      setCollections(collectionsData || []);
      setFarmerPayments(paymentsData || []);
      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showErrorRef.current('Error', String(error?.message || 'Failed to fetch data'));
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, userRole]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.id || userRole !== UserRole.ADMIN) return;

    let isSubscribed = true;

    // Setup real-time subscription for collections
    const collectionsSubscription = supabase
      .channel('collections-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collections'
        },
        (payload) => {
          // Only update if not currently loading to prevent flashing
          if (!loadingRef.current && isSubscribed) {
            fetchData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections'
        },
        (payload) => {
          // Only update if not currently loading to prevent flashing
          if (!loadingRef.current && isSubscribed) {
            fetchData();
          }
        }
      )
      .subscribe();

    // Setup real-time subscription for farmer payments
    const paymentsSubscription = supabase
      .channel('farmer-payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'farmer_payments'
        },
        (payload) => {
          // Only update if not currently loading to prevent flashing
          if (!loadingRef.current && isSubscribed) {
            fetchData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'farmer_payments'
        },
        (payload) => {
          // Only update if not currently loading to prevent flashing
          if (!loadingRef.current && isSubscribed) {
            fetchData();
          }
        }
      )
      .subscribe();

    // Store subscriptions for cleanup
    setSubscription({
      collections: collectionsSubscription,
      payments: paymentsSubscription
    });

    // Fetch initial data
    fetchData();

    // Cleanup subscriptions
    return () => {
      isSubscribed = false;
      if (collectionsSubscription) {
        supabase.removeChannel(collectionsSubscription);
      }
      if (paymentsSubscription) {
        supabase.removeChannel(paymentsSubscription);
      }
    };
  }, [user?.id, fetchData, userRole]);

  // Add a manual refresh function for when subscriptions fail
  const handleManualRefresh = useCallback(async () => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can refresh payment data');
      return;
    }

    try {
      show({
        title: 'Refreshing Data',
        description: 'Updating collections and payment information...'
      });
      
      await fetchData();
      
      show({
        title: 'Data Refreshed',
        description: 'Collections and payment information updated successfully'
      });
    } catch (error) {
      console.error('Error during manual refresh:', error);
      showError('Refresh Failed', 'Failed to refresh data. Please try again.');
    }
  }, [fetchData, show, showError, userRole]);

  const handleCollectionSelect = useCallback((collectionId: string) => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can select collections for payment');
      return;
    }

    setSelectedCollections(prev => 
      prev.includes(collectionId) 
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  }, [userRole, showError]);

  const handleSelectAll = useCallback(() => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can select collections for payment');
      return;
    }

    if (selectedCollections.length === filteredCollections.length) {
      // Deselect all
      setSelectedCollections([]);
    } else {
      // Select all visible collections
      setSelectedCollections(filteredCollections.map(c => c.id));
    }
  }, [filteredCollections, selectedCollections.length, userRole, showError]);

  const handleApproveForPayment = useCallback(async () => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can approve payments');
      return;
    }

    if (selectedCollections.length === 0) {
      showError('No collections selected', 'Please select at least one collection to approve');
      return;
    }

    if (!user?.id) {
      showError('Authentication Error', 'User not authenticated');
      return;
    }

    try {
      // Group collections by farmer
      const selectedCollectionData = collections.filter(c => 
        selectedCollections.includes(c.id)
      );
      
      // Group collections by farmer
      const collectionsByFarmer: { [key: string]: Collection[] } = {};
      selectedCollectionData.forEach(collection => {
        const farmerId = collection.farmer_id;
        if (!collectionsByFarmer[farmerId]) {
          collectionsByFarmer[farmerId] = [];
        }
        collectionsByFarmer[farmerId].push(collection);
      });
      
      // Create payment records for each farmer using the unified payment service
      for (const farmerId in collectionsByFarmer) {
        const farmerCollections = collectionsByFarmer[farmerId];
        const collectionIds = farmerCollections.map(c => c.id);
        const totalAmount = farmerCollections.reduce(
          (sum, collection) => sum + (collection.total_amount || 0), 0
        );

        const result = await PaymentService.createPaymentForApproval(
          farmerId,
          collectionIds,
          totalAmount,
          notes || undefined,
          user?.id // Pass the user ID, the service will resolve the staff ID
        );

        if (!result.success) {
          throw result.error;
        }
      }

      // Refresh data
      await fetchData();

      // Reset form
      setSelectedCollections([]);
      setNotes('');

      show({
        title: 'Success',
        description: `${selectedCollections.length} collections approved for payment successfully`
      });
    } catch (error: any) {
      console.error('Error approving collections:', error);
      showError('Error', String(error?.message || 'Failed to approve collections for payment'));
    }
  }, [collections, notes, selectedCollections, show, showError, user?.id, fetchData, userRole]);

  const handleMarkAsPaid = useCallback(async (paymentId: string) => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can mark payments as paid');
      return;
    }

    if (!user?.id) {
      showError('Authentication Error', 'User not authenticated');
      return;
    }

    try {
      const result = await PaymentService.markPaymentAsPaid(paymentId, user?.id);
      
      if (!result.success) {
        throw result.error;
      }

      // Refresh data
      await fetchData();

      show({
        title: 'Success',
        description: 'Payment marked as paid successfully'
      });
    } catch (error: any) {
      console.error('Error marking payment as paid:', error);
      showError('Error', String(error?.message || 'Failed to mark payment as paid'));
    }
  }, [show, showError, user?.id, fetchData, userRole]);

  const exportToCSV = useCallback(() => {
    if (userRole !== UserRole.ADMIN) {
      showError('Access Denied', 'Only administrators can export payment data');
      return;
    }

    // Create CSV content
    const headers = [
      'Collection ID',
      'Farmer Name',
      'Farmer ID',
      'Date',
      'Liters',
      'Rate',
      'Amount',
      'Quality Grade',
      'Status'
    ].join(',');

    const rows = filteredCollections.map(collection => [
      collection.collection_id,
      collection.farmers?.full_name || '',
      collection.farmers?.id || '',
      format(new Date(collection.collection_date), 'yyyy-MM-dd'),
      collection.liters,
      collection.rate_per_liter?.toFixed(2) || '',
      collection.total_amount?.toFixed(2) || '',
      collection.quality_grade || '',
      collection.approved_for_payment ? 'Approved' : 'Pending'
    ].map(field => `"${field}"`).join(','));

    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredCollections, userRole, showError]);

  const totalSelectedAmount = React.useMemo(() => {
    return collections
      .filter(c => selectedCollections.includes(c.id))
      .reduce((sum, collection) => sum + (collection.total_amount || 0), 0);
  }, [collections, selectedCollections]);

  const getApprovalStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getQualityGradeColor = useCallback((grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  if (userRole !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">Only administrators can access the payment approval system.</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Approve collections and manage farmer payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleManualRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                KSh {stats?.total_pending_amount?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approved_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                KSh {stats?.total_approved_amount?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CreditCard className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paid_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                KSh {stats?.total_paid_amount?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Approval Section */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Collections for Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by farmer name, ID, or collection ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collections Table */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedCollections.length === filteredCollections.length && filteredCollections.length > 0}
                          onChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Collection ID</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.length > 0 ? (
                      filteredCollections.map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedCollections.includes(collection.id)}
                              onChange={() => handleCollectionSelect(collection.id)}
                              disabled={collection.approved_for_payment}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {collection.collection_id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {collection.farmers?.full_name || 'Unknown Farmer'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {collection.farmers?.id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(collection.collection_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{collection.liters} L</TableCell>
                          <TableCell>
                            <Badge className={getQualityGradeColor(collection.quality_grade || '')}>
                              {collection.quality_grade || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>KSh {collection.rate_per_liter?.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            KSh {collection.total_amount?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={getApprovalStatusColor(
                                collection.approved_for_payment ? 'approved' : 'pending'
                              )}
                            >
                              {collection.approved_for_payment ? "Approved" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setViewingCollection(collection)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Collection Details</DialogTitle>
                                </DialogHeader>
                                {viewingCollection && viewingCollection.id === collection.id && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Collection ID</Label>
                                        <div className="font-medium">{viewingCollection.collection_id}</div>
                                      </div>
                                      <div>
                                        <Label>Verification Code</Label>
                                        <div className="font-mono">{viewingCollection.verification_code}</div>
                                      </div>
                                      <div>
                                        <Label>Farmer</Label>
                                        <div className="font-medium">{viewingCollection.farmers?.full_name}</div>
                                      </div>
                                      <div>
                                        <Label>Farmer ID</Label>
                                        <div>{viewingCollection.farmers?.id}</div>
                                      </div>
                                      <div>
                                        <Label>Date</Label>
                                        <div>{format(new Date(viewingCollection.collection_date), 'MMM dd, yyyy HH:mm')}</div>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Badge 
                                          className={getApprovalStatusColor(
                                            viewingCollection.approved_for_payment ? 'approved' : 'pending'
                                          )}
                                        >
                                          {viewingCollection.approved_for_payment ? "Approved" : "Pending"}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                      <Card>
                                        <CardContent className="p-4">
                                          <div className="text-sm text-muted-foreground">Quantity</div>
                                          <div className="text-2xl font-bold">{viewingCollection.liters}L</div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardContent className="p-4">
                                          <div className="text-sm text-muted-foreground">Quality</div>
                                          <div className="text-2xl font-bold">
                                            <Badge className={getQualityGradeColor(viewingCollection.quality_grade || '')}>
                                              {viewingCollection.quality_grade || 'N/A'}
                                            </Badge>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardContent className="p-4">
                                          <div className="text-sm text-muted-foreground">Amount</div>
                                          <div className="text-2xl font-bold">KSh {viewingCollection.total_amount?.toFixed(2)}</div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No collections found matching your criteria</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Approval Form */}
              {selectedCollections.length > 0 && (
                <div className="border rounded-md p-4 space-y-4 bg-muted">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Approve Selected Collections</h3>
                    <div className="text-lg font-bold">
                      Total Amount: KSh {totalSelectedAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about this payment..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        onClick={handleApproveForPayment}
                        className="w-full"
                        size="lg"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve {selectedCollections.length} Collections
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmerPayments.length > 0 ? (
                    farmerPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {payment.farmers?.full_name || 'Unknown Farmer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.farmers?.id || 'No ID'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{payment.collection_ids.length} collections</TableCell>
                        <TableCell className="font-medium">
                          KSh {payment.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getApprovalStatusColor(payment.approval_status)}
                          >
                            {payment.approval_status.charAt(0).toUpperCase() + 
                             payment.approval_status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.approval_status === 'approved' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleMarkAsPaid(payment.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No payment history available</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedPaymentApproval;