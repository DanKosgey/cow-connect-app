import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, BarChart3, Eye, AlertTriangle, CheckCircle, Clock, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminAIInstructionsPage from './AdminAIInstructionsPage';

const AdminAIMonitoringDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    flagged: 0,
    pending: 0,
    needsReview: 0
  });
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' or 'instructions'
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === 'monitoring') {
      fetchVerificationResults();
    }
  }, [filterStatus, activeTab]);

  const fetchVerificationResults = async () => {
    try {
      setLoading(true);
      
      // Build query based on filter
      let query = supabase
        .from('ai_verification_results')
        .select(`
          id,
          collection_id,
          estimated_liters,
          recorded_liters,
          matches_recorded,
          confidence_score,
          explanation,
          verification_passed,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch collection details separately to avoid ambiguous relationships
      const collectionIds = data?.map(item => item.collection_id) || [];
      let collectionsData = [];
      
      if (collectionIds.length > 0) {
        const { data: collections, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            farmer_id,
            farmers (full_name)
          `)
          .in('id', collectionIds);

        if (!collectionsError) {
          collectionsData = collections || [];
        }
      }

      // Merge verification results with collection data
      const mergedData = data?.map(verification => {
        const collection = collectionsData.find(c => c.id === verification.collection_id);
        return {
          ...verification,
          collections: collection
        };
      }) || [];

      setVerificationResults(mergedData);

      // Calculate stats
      const total = mergedData?.length || 0;
      const verified = mergedData?.filter(item => item.status === 'verified').length || 0;
      const flagged = mergedData?.filter(item => item.status === 'flagged').length || 0;
      const pending = mergedData?.filter(item => item.status === 'pending').length || 0;
      const needsReview = mergedData?.filter(item => item.status === 'needs_review').length || 0;

      setStats({
        total,
        verified,
        flagged,
        pending,
        needsReview
      });
    } catch (error) {
      console.error('Error fetching AI verification results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI verification results: ' + (error as Error).message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'flagged':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Flagged</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'needs_review':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Needs Review</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && activeTab === 'monitoring') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI verification results and configure AI instructions
          </p>
        </div>
        <Button onClick={fetchVerificationResults}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'monitoring'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Monitoring Dashboard
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'instructions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bot className="h-4 w-4 inline mr-2" />
              AI Instructions
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'monitoring' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-2 mr-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Verifications</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-2 mr-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold">{stats.verified}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-red-100 p-2 mr-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Flagged</p>
                    <p className="text-2xl font-bold">{stats.flagged}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-yellow-100 p-2 mr-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-2 mr-3">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Review</p>
                    <p className="text-2xl font-bold">{stats.needsReview}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold">Verification Results</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filter by status:</span>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Recorded/Estimated</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verificationResults.length > 0 ? (
                    verificationResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.collections?.collection_id || result.collection_id}
                        </TableCell>
                        <TableCell>
                          {result.collections?.farmers?.full_name || 
                           result.collections?.farmer_id || 
                           'Unknown Farmer'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{result.recorded_liters}L → </span>
                            <span className={result.matches_recorded ? 'text-green-600' : 'text-red-600'}>
                              {result.estimated_liters}L
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={getConfidenceColor(result.confidence_score || 0)}>
                            {((result.confidence_score || 0) * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(result.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(result.created_at), 'MMM dd, yyyy')}
                            <br />
                            {format(new Date(result.created_at), 'HH:mm')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No verification results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <AdminAIInstructionsPage />
      )}
    </div>
  );
};

export default AdminAIMonitoringDashboard;