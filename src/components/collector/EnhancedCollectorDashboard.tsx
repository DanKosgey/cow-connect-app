import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  Users, 
  MapPin, 
  Camera, 
  BarChart3, 
  Wallet, 
  Bot, 
  Settings as SettingsIcon,
  Plus,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useStaffInfo } from '@/hooks/useStaffData';
import { useCollectorCollections } from '@/hooks/useCollectorCollections';
import { formatCurrency, formatAmount } from '@/utils/formatters';
import PersonalAIAssistant from './PersonalAIAssistant';
import CollectorAISettings from './CollectorAISettings';
import AIAgentButton from './AIAgentButton';
import AISettingsPanel from './AISettingsPanel';
import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';

const EnhancedCollectorDashboard = () => {
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollectorCollections(staffInfo?.id || '');
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAISettingsPanel, setShowAISettingsPanel] = useState(false);
  const [earningsData, setEarningsData] = useState({
    allTime: {
      totalEarnings: 0,
      totalCollections: 0,
      totalLiters: 0,
      ratePerLiter: 0,
      totalPenalties: 0
    },
    pendingPayments: 0,
    paidPayments: 0
  });
  const [loadingEarnings, setLoadingEarnings] = useState(true);

  // Fetch actual earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!staffInfo?.id) return;
      
      try {
        setLoadingEarnings(true);
        
        // Get all-time earnings
        const allTime = await collectorEarningsService.getAllTimeEarnings(staffInfo.id);
        
        // Get collector data with penalties
        const collectorsData = await collectorEarningsService.getCollectorsWithEarningsAndPenalties();
        const collectorData = collectorsData.find(c => c.id === staffInfo.id);
        
        // Combine earnings data with penalty information
        const allTimeEarningsData = {
          ...allTime,
          totalPenalties: collectorData?.totalPenalties || 0,
          pendingPayments: collectorData?.pendingPayments || 0,
          paidPayments: collectorData?.paidPayments || 0
        };
        
        setEarningsData({
          allTime: allTimeEarningsData,
          pendingPayments: collectorData?.pendingPayments || 0,
          paidPayments: collectorData?.paidPayments || 0
        });
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setLoadingEarnings(false);
      }
    };
    
    fetchEarnings();
  }, [staffInfo?.id]);

  // Calculate dashboard stats
  const stats = {
    totalCollections: collectionsData?.length || 0,
    totalLiters: collectionsData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0,
    todayCollections: collectionsData?.filter(collection => {
      const today = new Date();
      const collectionDate = new Date(collection.collection_date);
      return collectionDate.toDateString() === today.toDateString();
    }).length || 0
  };

  if (staffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Collector Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {staffInfo ? 'Collector' : 'Collector'}
          </p>
        </div>
        <div className="flex gap-2">
          <AIAgentButton 
            onClick={() => setShowAISettings(!showAISettings)}
            isActive={showAISettings}
          />
          <Button 
            onClick={() => setShowAISettingsPanel(!showAISettingsPanel)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <SettingsIcon className="h-4 w-4" />
            AI Settings
          </Button>
          <Button 
            onClick={() => navigate('/collector-only/collections/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        </div>
      </div>

      {showAISettings ? (
        <CollectorAISettings />
      ) : showAISettingsPanel ? (
        <AISettingsPanel />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-2 mr-3">
                    <Milk className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Collections</p>
                    <p className="text-2xl font-bold">{stats.todayCollections}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-2 mr-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Collections</p>
                    <p className="text-2xl font-bold">{stats.totalCollections}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-amber-100 p-2 mr-3">
                    <Milk className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Liters</p>
                    <p className="text-2xl font-bold">{stats.totalLiters.toFixed(1)}L</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-2 mr-3">
                    <Wallet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Earnings</p>
                    {loadingEarnings ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    ) : (
                      <p className="text-2xl font-bold">
                        {formatAmount(earningsData.allTime.totalEarnings - earningsData.allTime.totalPenalties)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Summary Cards - Simplified version without Current Month and Penalties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Rate Per Liter */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Per Liter</CardTitle>
                <Milk className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEarnings ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {earningsData.allTime.ratePerLiter > 0 ? formatAmount(earningsData.allTime.ratePerLiter) : '3.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">Payment rate</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* All-Time Collections */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All-Time Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEarnings ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {earningsData.allTime.totalCollections || 0}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {earningsData.allTime.totalLiters?.toFixed(2) || '0.00'}L collected
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* All-Time Earnings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All-Time Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEarnings ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {earningsData.allTime.totalEarnings > 0 ? formatAmount(earningsData.allTime.totalEarnings) : '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {earningsData.allTime.totalCollections || 0} collections, {earningsData.allTime.totalLiters?.toFixed(2) || '0.00'}L
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEarnings ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {Math.round(earningsData.pendingPayments)}
                    </div>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Milk className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => navigate('/collector-only/collections/new')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Plus className="h-6 w-6" />
                  <span>New Collection</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/collector-only/collections')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Milk className="h-6 w-6" />
                  <span>All Collections</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/collector-only/farmers')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Users className="h-6 w-6" />
                  <span>Farmers</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/collector-only/performance')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Performance</span>
                </Button>
              </CardContent>
            </Card>

            {/* Personal AI Assistant */}
            <PersonalAIAssistant />
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedCollectorDashboard;