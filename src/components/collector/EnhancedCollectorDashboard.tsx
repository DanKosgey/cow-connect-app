import { useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { useStaffInfo } from '@/hooks/useStaffData';
import { useCollectorCollections } from '@/hooks/useCollectorCollections';
import { formatCurrency } from '@/utils/formatters';
import PersonalAIAssistant from './PersonalAIAssistant';
import CollectorAISettings from './CollectorAISettings';
import AIAgentButton from './AIAgentButton';
import AISettingsPanel from './AISettingsPanel';

const EnhancedCollectorDashboard = () => {
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollectorCollections(staffInfo?.id || '');
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAISettingsPanel, setShowAISettingsPanel] = useState(false);

  // Calculate dashboard stats
  const stats = {
    totalCollections: collectionsData?.length || 0,
    totalLiters: collectionsData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0,
    totalEarnings: collectionsData?.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) || 0,
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
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                  </div>
                </div>
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