import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Bell, 
  Eye,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

interface VarianceAlert {
  id: string;
  collection_id: string;
  collection_details: {
    collection_id: string;
    liters: number;
    collection_date: string;
    farmers: {
      full_name: string;
    } | null;
  } | null;
  staff_id: string;
  staff_details: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approved_at: string;
  is_acknowledged: boolean;
}

interface AlertThreshold {
  id: number;
  variance_type: 'positive' | 'negative';
  threshold_percentage: number;
  is_active: boolean;
}

const VarianceAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<VarianceAlert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAlertThresholds();
    fetchVarianceAlerts();
  }, []);

  const fetchAlertThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('variance_alert_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('variance_type');

      if (error) throw error;

      setThresholds(data || []);
    } catch (error) {
      console.error('Error fetching alert thresholds:', error);
    }
  };

  const fetchVarianceAlerts = async () => {
    try {
      // Get unacknowledged alerts or recent alerts
      const { data, error } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          staff_id,
          variance_percentage,
          variance_type,
          penalty_amount,
          approved_at,
          is_acknowledged,
          collections!milk_approvals_collection_id_fkey (
            collection_id,
            liters,
            collection_date,
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `)
        .eq('is_acknowledged', false)
        .order('approved_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform the data
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      setAlerts(transformedData);
    } catch (error) {
      console.error('Error fetching variance alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('milk_approvals')
        .update({ is_acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, is_acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getVarianceSeverity = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 15) return 'critical';
    if (absPercentage >= 10) return 'high';
    if (absPercentage >= 5) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filter alerts based on thresholds
  const filteredAlerts = alerts.filter(alert => {
    if (alert.is_acknowledged && !showAll) return false;
    
    const threshold = thresholds.find(t => t.variance_type === alert.variance_type);
    if (!threshold) return false;
    
    return Math.abs(alert.variance_percentage || 0) >= threshold.threshold_percentage;
  });

  if (filteredAlerts.length === 0 && !isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-yellow-500" />
          Variance Alerts
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Hide Acknowledged' : 'Show All'}
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const severity = getVarianceSeverity(alert.variance_percentage || 0);
            return (
              <Alert 
                key={alert.id} 
                className={`${alert.is_acknowledged ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getVarianceIcon(alert.variance_type || 'none')}
                    <div>
                      <AlertTitle className="flex items-center gap-2">
                        <span>
                          {alert.variance_type === 'positive' ? 'Positive' : 'Negative'} Variance Alert
                        </span>
                        <Badge className={getSeverityColor(severity)}>
                          {Math.abs(alert.variance_percentage || 0).toFixed(2)}%
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-1">
                        <div className="text-sm">
                          <p>
                            <span className="font-medium">
                              {alert.collection_details?.farmers?.full_name || 'Unknown Farmer'}
                            </span> - Collection {alert.collection_details?.collection_id}
                          </p>
                          <p className="text-muted-foreground">
                            Collector: {alert.staff_details?.profiles?.full_name || 'Unknown Staff'} | 
                            Date: {alert.collection_details?.collection_date 
                              ? format(new Date(alert.collection_details.collection_date), 'MMM dd, yyyy')
                              : 'N/A'} | 
                            Penalty: KSh {alert.penalty_amount?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                  {!alert.is_acknowledged && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Alert>
            );
          })
        ) : (
          <Alert>
            <AlertTitle>No active alerts</AlertTitle>
            <AlertDescription>
              All variance alerts have been acknowledged or no significant variances detected.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default VarianceAlerts;