import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  List,
  PieChart
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

interface Collection {
  id: string;
  farmer_id: string;
  collection_id: string;
  collection_date: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  approved_for_payment?: boolean;
  approved_at?: string;
  approved_by?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  farmers: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

const MilkCollectionApprovalPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]); // Add this state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [processingAll, setProcessingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [activeTab, setActiveTab] = useState('collections');

  // Fetch collections that need approval
  const fetchCollections = async () => {
    try {
      setLoading(true);
      
      // Fetch filtered collections based on current filter
      let query = supabase
        .from('collections')
        .select(`
          *,
          farmers (
            id,
            user_id,
            profiles (
              full_name,
              phone
            )
          )
        `)
        .eq('approved_for_company', true)
        .in('status', ['Collected', 'Paid']);
      
      // Apply filters
      if (filterStatus === 'approved') {
        query = query.eq('approved_for_payment', true);
      } else if (filterStatus === 'pending') {
        query = query.eq('approved_for_payment', false);
      }
      
      const { data: filteredData, error: filteredError } = await query
        .order('collection_date', { ascending: false })
        .limit(100);
      
      if (filteredError) throw filteredError;
      
      // Fetch all collections for analytics (without filters)
      const { data: allData, error: allError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers (
            id,
            user_id,
            profiles (
              full_name,
              phone
            )
          )
        `)
        .eq('approved_for_company', true)
        .in('status', ['Collected', 'Paid'])
        .order('collection_date', { ascending: false });
      
      if (allError) throw allError;
      
      setCollections(filteredData || []);
      setAllCollections(allData || []); // Store all collections for analytics
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch collections for approval',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [filterStatus]);

  const handleApprove = async (collectionId: string, farmerId: string) => {
    try {
      setProcessing(prev => ({ ...prev, [collectionId]: true }));
      
      const { error } = await supabase
        .from('collections')
        .update({
          approved_for_payment: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', collectionId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Collection approved for payment successfully'
      });
      
      // Refresh the data
      fetchCollections();
    } catch (error) {
      console.error('Error approving collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve collection for payment',
        variant: 'destructive'
      });
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[collectionId];
        return newState;
      });
    }
  };

  // Add the approve all function
  const handleApproveAll = async () => {
    try {
      setProcessingAll(true);
      
      // Get all pending collections
      const pendingCollections = collections.filter(
        collection => !collection.approved_for_payment
      );
      
      if (pendingCollections.length === 0) {
        toast({
          title: 'Info',
          description: 'No pending collections to approve'
        });
        return;
      }
      
      // Update all pending collections
      const { error } = await supabase
        .from('collections')
        .update({
          approved_for_payment: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .in('id', pendingCollections.map(c => c.id));
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Approved ${pendingCollections.length} collections successfully`
      });
      
      // Refresh the data
      fetchCollections();
    } catch (error) {
      console.error('Error approving all collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve all collections',
        variant: 'destructive'
      });
    } finally {
      setProcessingAll(false);
    }
  };

  const handleReject = async (collectionId: string) => {
    try {
      setProcessing(prev => ({ ...prev, [collectionId]: true }));
      
      const { error } = await supabase
        .from('collections')
        .update({
          approved_for_payment: false,
          approved_at: null,
          approved_by: null
        })
        .eq('id', collectionId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Collection approval rejected'
      });
      
      // Refresh the data
      fetchCollections();
    } catch (error) {
      console.error('Error rejecting collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject collection approval',
        variant: 'destructive'
      });
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[collectionId];
        return newState;
      });
    }
  };

  // Filter collections based on search term
  const filteredCollections = collections.filter(collection => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      collection.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
      collection.collection_id?.toLowerCase().includes(term)
    );
  });

  // Calculate analytics data (use all collections, not filtered ones)
  const analyticsData = {
    totalCollections: allCollections.length,
    pendingCollections: allCollections.filter(c => !c.approved_for_payment).length,
    approvedCollections: allCollections.filter(c => c.approved_for_payment).length,
    totalLiters: allCollections.reduce((sum, c) => sum + (c.liters || 0), 0),
    pendingLiters: allCollections
      .filter(c => !c.approved_for_payment)
      .reduce((sum, c) => sum + (c.liters || 0), 0),
    collectedCount: allCollections.filter(c => c.status === 'Collected').length,
    paidCount: allCollections.filter(c => c.status === 'Paid').length,
    // Calculate daily averages
    dailyAverage: allCollections.length > 0 ? 
      allCollections.reduce((sum, c) => sum + (c.liters || 0), 0) / allCollections.length : 0
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Milk Collection Approval</h1>
        <p className="mt-2 text-gray-600">
          Review and approve farmer milk collections for payment processing
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px">
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'collections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Collections
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'collections' ? (
        <>
          {/* Search and Filter Controls */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                Search and Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Collections
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by farmer name or collection ID"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Already Approved</option>
                    <option value="all">All Statuses</option>
                  </select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button
                    onClick={fetchCollections}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  
                  {/* Approve All Button */}
                  <Button
                    onClick={handleApproveAll}
                    disabled={processingAll || collections.filter(c => !c.approved_for_payment).length === 0}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    {processingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve All
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collections Table */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Collections for Approval
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {filteredCollections.length} collections found
              </p>
            </CardHeader>
            <CardContent>
              {filteredCollections.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCollections.map((collection) => (
                        <tr key={collection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium">
                              {collection.farmers?.profiles?.full_name || 'Unknown Farmer'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {collection.farmers?.profiles?.phone || 'No phone'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                            {collection.collection_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(collection.collection_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {collection.liters.toFixed(2)}L
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {formatCurrency(collection.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              collection.status === 'Paid' ? 'bg-blue-100 text-blue-800' :
                              collection.status === 'Collected' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {collection.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {collection.approved_for_payment ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              {!collection.approved_for_payment ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(collection.id, collection.farmer_id)}
                                  disabled={processing[collection.id]}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processing[collection.id] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleReject(collection.id)}
                                  disabled={processing[collection.id]}
                                  variant="destructive"
                                >
                                  {processing[collection.id] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No collections found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Analytics Tab */
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Approval Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              {/* Total Collections Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Total Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analyticsData.totalCollections}</div>
                  <p className="text-sm text-gray-500">All collections in system</p>
                </CardContent>
              </Card>
              
              {/* Pending Collections Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {analyticsData.pendingCollections}
                  </div>
                  <p className="text-sm text-gray-500">Awaiting approval</p>
                </CardContent>
              </Card>
              
              {/* Approved Collections Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {analyticsData.approvedCollections}
                  </div>
                  <p className="text-sm text-gray-500">Ready for payment</p>
                </CardContent>
              </Card>
              
              {/* Total Liters Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Total Liters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {analyticsData.totalLiters.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">Liters collected</p>
                </CardContent>
              </Card>
              
              {/* Pending Liters Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Liters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {analyticsData.pendingLiters.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">Liters pending approval</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* By Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">By Collection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Collected</span>
                        <span className="text-sm text-gray-500">
                          {analyticsData.collectedCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: analyticsData.totalCollections > 0 
                              ? `${(analyticsData.collectedCount / analyticsData.totalCollections) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Paid</span>
                        <span className="text-sm text-gray-500">
                          {analyticsData.paidCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: analyticsData.totalCollections > 0 
                              ? `${(analyticsData.paidCount / analyticsData.totalCollections) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* By Approval Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">By Approval Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Pending</span>
                        <span className="text-sm text-gray-500">
                          {analyticsData.pendingCollections}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ 
                            width: analyticsData.totalCollections > 0 
                              ? `${(analyticsData.pendingCollections / analyticsData.totalCollections) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Approved</span>
                        <span className="text-sm text-gray-500">
                          {analyticsData.approvedCollections}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: analyticsData.totalCollections > 0 
                              ? `${(analyticsData.approvedCollections / analyticsData.totalCollections) * 100}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Daily Average Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Daily Collection Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end h-32 gap-2 border-b border-l border-gray-200 pb-4 pl-4">
                  <div className="flex flex-col items-center h-full justify-end flex-1">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: '80%' }}
                    ></div>
                    <span className="text-xs mt-2 text-gray-500">Daily Avg</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {analyticsData.dailyAverage.toFixed(2)}L
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Average liters collected per collection: {analyticsData.dailyAverage.toFixed(2)}L
                </p>
              </CardContent>
            </Card>
            
            {/* Approve All Section */}
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Bulk Approval</h3>
              <p className="text-gray-600 mb-4">
                You are about to approve {analyticsData.pendingCollections} collections for payment processing.
                This action cannot be undone.
              </p>
              <Button
                onClick={handleApproveAll}
                disabled={processingAll || analyticsData.pendingCollections === 0}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                {processingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve All Pending Collections
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MilkCollectionApprovalPage;