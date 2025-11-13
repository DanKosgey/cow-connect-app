import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, AlertCircle, User, Package, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CreditRequestCard from '@/components/agrovet/CreditRequestCard';
import { useCreditService } from '@/hooks/useCreditService';

const AgrovetPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [creditRequests, setCreditRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { calculateFarmerCredit } = useCreditService();

  useEffect(() => {
    checkSession();
    if (isLoggedIn) {
      loadCreditRequests();
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

  const loadCreditRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('agrovet_credit_requests')
        .select(\`
          *,
          farmers:farmer_id (
            full_name,
            phone_number
          ),
          products:product_id (
            name,
            unit
          )
        \`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditRequests(data || []);
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

      // Check farmer's credit eligibility
      const creditInfo = await calculateFarmerCredit(request.farmer_id);
      if (!creditInfo.isEligible) {
        throw new Error('Farmer is not eligible for credit');
      }

      // Process the credit request
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
                  {creditRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600" />
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

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </Button>
          <Button
            variant={activeTab === 'disbursed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('disbursed')}
          >
            Disbursed
          </Button>
          <Button
            variant={activeTab === 'rejected' ? 'default' : 'outline'}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Requests
          </Button>
        </div>

        {/* Credit Requests List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center">
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