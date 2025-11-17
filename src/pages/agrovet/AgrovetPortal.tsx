import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, AlertCircle, User, Package, DollarSign, Calendar, RefreshCw, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreditRequestCard from '@/components/agrovet/CreditRequestCard';
import { CreditService } from '@/services/credit-service';

const AgrovetPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [creditRequests, setCreditRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [farmerId, setFarmerId] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    checkSession();
    if (isLoggedIn) {
      loadCreditRequests();
      loadInventory();
    }
  }, [isLoggedIn, activeTab]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: staffData, error } = await supabase
        .from('agrovet_staff')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (staffData) {
        setStaff(staffData);
        setIsLoggedIn(true);
      }
    }
  };

  const loadInventory = async () => {
    try {
      const inventoryItems = await CreditService.getAgrovetInventory();
      setInventory(inventoryItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive'
      });
    }
  };

  const loadCreditRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('agrovet_credit_requests')
        .select(`
          *,
          farmers:farmer_id (
            full_name,
            phone_number
          ),
          products:product_id (
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditRequests(data || []);
      
      // Update pending requests count
      const pendingCount = data?.filter(r => r.status === 'pending').length || 0;
      setPendingRequestsCount(pendingCount);
    } catch (error) {
      console.error('Error loading credit requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async (requestId: string) => {
    try {
      setLoading(true);
      
      // Get request details
      const request = creditRequests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Process the credit request using the stored procedure
      const { error } = await supabase.rpc('process_agrovet_credit_request', {
        request_id: requestId,
        staff_id: staff.id,
        action: 'disbursed'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product successfully disbursed to farmer',
      });

      // Reload credit requests
      loadCreditRequests();
    } catch (error) {
      console.error('Error disbursing product:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disburse product',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('process_agrovet_credit_request', {
        request_id: requestId,
        staff_id: staff.id,
        action: 'rejected'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Credit request rejected',
      });

      loadCreditRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualPurchase = async () => {
    try {
      if (!farmerId || !selectedProduct || quantity <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // Get farmer credit status
      const creditStatus = await CreditService.getCreditStatus(farmerId);
      if (!creditStatus) {
        toast({
          title: 'Error',
          description: 'Farmer does not have a credit profile',
          variant: 'destructive'
        });
        return;
      }

      // Get product details
      const product = inventory.find(item => item.id === selectedProduct);
      if (!product) {
        toast({
          title: 'Error',
          description: 'Selected product not found',
          variant: 'destructive'
        });
        return;
      }

      // Calculate total amount
      const totalAmount = quantity * product.selling_price;

      // Create agrovet purchase with credit payment
      await CreditService.createAgrovetPurchase(
        farmerId,
        selectedProduct,
        quantity,
        'credit',
        staff.id
      );

      toast({
        title: 'Success',
        description: `Purchase completed successfully for KES ${totalAmount.toFixed(2)}`,
      });

      // Reset form
      setFarmerId('');
      setSelectedProduct('');
      setQuantity(1);
      setShowManualEntry(false);
      
      // Reload data
      loadCreditRequests();
    } catch (error) {
      console.error('Error processing manual purchase:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process manual purchase',
        variant: 'destructive'
      });
    }
  };

  const getFilteredRequests = () => {
    return creditRequests.filter(req => {
      if (activeTab === 'pending') return req.status === 'pending';
      if (activeTab === 'disbursed') return req.status === 'disbursed';
      if (activeTab === 'rejected') return req.status === 'rejected';
      return true;
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Agrovet Portal</h1>
            <p className="text-gray-600 mt-2">Please log in to continue</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Agrovet Credit Portal</h1>
                <p className="text-green-100 text-sm">Manage farmer credit requests</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold">{staff?.full_name}</p>
                <p className="text-sm text-green-100">{staff?.role}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  supabase.auth.signOut();
                  setIsLoggedIn(false);
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Requests</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {pendingRequestsCount}
                </p>
              </div>
              <div className="relative">
                <Bell className="w-10 h-10 text-yellow-600" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Disbursed Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {creditRequests.filter(r => 
                    r.status === 'disbursed' && 
                    new Date(r.processed_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Amount (Today)</p>
                <p className="text-3xl font-bold text-blue-600">
                  KES {creditRequests
                    .filter(r => 
                      r.status === 'disbursed' && 
                      new Date(r.processed_at).toDateString() === new Date().toDateString()
                    )
                    .reduce((sum, r) => sum + r.total_amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Farmers</p>
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(creditRequests.map(r => r.farmer_id)).size}
                </p>
              </div>
              <User className="w-10 h-10 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Manual Entry Section */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Manual Credit Purchase</h2>
              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(!showManualEntry)}
              >
                {showManualEntry ? 'Hide' : 'Show'} Manual Entry
              </Button>
            </div>
            
            {showManualEntry && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <Label htmlFor="farmerId">Farmer ID</Label>
                  <Input
                    id="farmerId"
                    value={farmerId}
                    onChange={(e) => setFarmerId(e.target.value)}
                    placeholder="Enter farmer ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory
                        .filter(item => item.is_credit_eligible)
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} (KES {item.selling_price})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleManualPurchase}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Process Purchase
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingRequestsCount})
          </Button>
          <Button
            variant={activeTab === 'disbursed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('disbursed')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Disbursed
          </Button>
          <Button
            variant={activeTab === 'rejected' ? 'default' : 'outline'}
            onClick={() => setActiveTab('rejected')}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Rejected
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Requests
          </Button>
          <Button
            variant="outline"
            onClick={loadCreditRequests}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Credit Requests List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p>Loading requests...</p>
            </Card>
          ) : getFilteredRequests().length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No {activeTab !== 'all' ? activeTab : ''} requests found
              </h3>
              <p className="text-gray-600">
                {activeTab === 'pending' 
                  ? 'When farmers request credit, their requests will appear here.'
                  : 'No requests in this category yet.'}
              </p>
            </Card>
          ) : (
            getFilteredRequests().map((request) => (
              <CreditRequestCard
                key={request.id}
                request={request}
                onDisburse={handleDisburse}
                onReject={handleReject}
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgrovetPortal;