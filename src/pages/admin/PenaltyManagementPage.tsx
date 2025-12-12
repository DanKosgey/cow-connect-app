import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Save, 
  X,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RefreshButton from '@/components/ui/RefreshButton';
import { format } from 'date-fns';

interface PenaltyConfig {
  id: number;
  variance_type: 'positive' | 'negative';
  min_variance_percentage: number;
  max_variance_percentage: number;
  penalty_rate_per_liter: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VarianceRecord {
  id: string;
  collection_id: string;
  collection_details: {
    collection_id: string;
    liters: number;
    collection_date: string;
    staff_id?: string;
    staff?: {
      profiles: {
        full_name: string;
      } | null;
    } | null;
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
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approval_notes: string | null;
  approved_at: string;
}

const PenaltyManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [penaltyConfigs, setPenaltyConfigs] = useState<PenaltyConfig[]>([]);
  const [variances, setVariances] = useState<VarianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [variancesLoading, setVariancesLoading] = useState(true);
  
  const [newConfig, setNewConfig] = useState({
    variance_type: 'positive' as 'positive' | 'negative',
    min_variance_percentage: 0,
    max_variance_percentage: 5,
    penalty_rate_per_liter: 2.0,
    is_active: true
  });
  
  const [editingConfig, setEditingConfig] = useState<PenaltyConfig | null>(null);

  useEffect(() => {
    fetchPenaltyConfigs();
    fetchRecentVariances();
  }, []);

  const fetchPenaltyConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('variance_penalty_config')
        .select('*')
        .order('variance_type')
        .order('min_variance_percentage');

      if (error) {
        throw error;
      }

      setPenaltyConfigs(data || []);
    } catch (error: any) {
      console.error('Error fetching penalty configs:', error);
      showError('Error', String(error?.message || 'Failed to fetch penalty configurations'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentVariances = async () => {
    setVariancesLoading(true);
    try {
      const { data, error } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          staff_id,
          company_received_liters,
          variance_liters,
          variance_percentage,
          variance_type,
          penalty_amount,
          approval_notes,
          approved_at,
          collections!milk_approvals_collection_id_fkey (
            collection_id,
            liters,
            collection_date,
            staff_id,
            staff!collections_staff_id_fkey (
              profiles (
                full_name
              )
            ),
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
        .order('approved_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      setVariances(transformedData);
    } catch (error: any) {
      console.error('Error fetching recent variances:', error);
      showError('Error', String(error?.message || 'Failed to fetch recent variances'));
    } finally {
      setVariancesLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('variance_penalty_config')
        .insert({
          variance_type: newConfig.variance_type,
          min_variance_percentage: newConfig.min_variance_percentage,
          max_variance_percentage: newConfig.max_variance_percentage,
          penalty_rate_per_liter: newConfig.penalty_rate_per_liter,
          is_active: newConfig.is_active
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPenaltyConfigs([...penaltyConfigs, data]);
      setNewConfig({
        variance_type: 'positive',
        min_variance_percentage: 0,
        max_variance_percentage: 5,
        penalty_rate_per_liter: 2.0,
        is_active: true
      });
      
      show({
        title: 'Success',
        description: 'Penalty configuration added successfully'
      });
    } catch (error: any) {
      console.error('Error adding penalty config:', error);
      showError('Error', String(error?.message || 'Failed to add penalty configuration'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig || !user?.id) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('variance_penalty_config')
        .update({
          variance_type: editingConfig.variance_type,
          min_variance_percentage: editingConfig.min_variance_percentage,
          max_variance_percentage: editingConfig.max_variance_percentage,
          penalty_rate_per_liter: editingConfig.penalty_rate_per_liter,
          is_active: editingConfig.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingConfig.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPenaltyConfigs(penaltyConfigs.map(config => 
        config.id === editingConfig.id ? data : config
      ));
      setEditingConfig(null);
      
      show({
        title: 'Success',
        description: 'Penalty configuration updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating penalty config:', error);
      showError('Error', String(error?.message || 'Failed to update penalty configuration'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('variance_penalty_config')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setPenaltyConfigs(penaltyConfigs.filter(config => config.id !== id));
      
      show({
        title: 'Success',
        description: 'Penalty configuration deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting penalty config:', error);
      showError('Error', String(error?.message || 'Failed to delete penalty configuration'));
    }
  };

  const getVarianceTypeColor = (varianceType: string) => {
    return varianceType === 'positive' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getVarianceSeverity = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 10) return 'High';
    if (absPercentage >= 5) return 'Medium';
    if (absPercentage > 0) return 'Low';
    return 'None';
  };

  const getVarianceSeverityColor = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 10) return 'bg-red-500 text-white';
    if (absPercentage >= 5) return 'bg-orange-500 text-white';
    if (absPercentage > 0) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Penalty & Variance Management</h1>
          <p className="text-muted-foreground">Configure penalty rates for negative variances only (positive variances do not incur penalties)</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <RefreshButton 
            isRefreshing={isLoading || variancesLoading} 
            onRefresh={() => {
              fetchPenaltyConfigs();
              fetchRecentVariances();
            }} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalty Configs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{penaltyConfigs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Configs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {penaltyConfigs.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{variances.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {variances.reduce((sum, v) => sum + (v.penalty_amount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Penalty Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only negative variances will incur penalties. Positive variances will not be penalized.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="varianceType">Variance Type</Label>
              <select
                id="varianceType"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newConfig.variance_type}
                onChange={(e) => setNewConfig({
                  ...newConfig,
                  variance_type: e.target.value as 'positive' | 'negative'
                })}
              >
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="minVariance">Min Variance (%)</Label>
              <Input
                id="minVariance"
                type="number"
                step="0.1"
                min="0"
                value={newConfig.min_variance_percentage}
                onChange={(e) => setNewConfig({
                  ...newConfig,
                  min_variance_percentage: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="maxVariance">Max Variance (%)</Label>
              <Input
                id="maxVariance"
                type="number"
                step="0.1"
                min="0"
                value={newConfig.max_variance_percentage}
                onChange={(e) => setNewConfig({
                  ...newConfig,
                  max_variance_percentage: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="penaltyRate">Penalty Rate (KSh/L)</Label>
              <Input
                id="penaltyRate"
                type="number"
                step="0.1"
                min="0"
                value={newConfig.penalty_rate_per_liter}
                onChange={(e) => setNewConfig({
                  ...newConfig,
                  penalty_rate_per_liter: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="md:col-span-1 flex items-end">
              <div className="flex items-center space-x-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={newConfig.is_active}
                  onChange={(e) => setNewConfig({
                    ...newConfig,
                    is_active: e.target.checked
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            
            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleAddConfig} disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                Add Config
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penalty Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Penalty Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only configurations for negative variances will be applied. Positive variances do not incur penalties.
            </p>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variance Type</TableHead>
                  <TableHead>Min Variance (%)</TableHead>
                  <TableHead>Max Variance (%)</TableHead>
                  <TableHead>Penalty Rate (KSh/L)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : penaltyConfigs.length > 0 ? (
                  penaltyConfigs.map((config) => (
                    editingConfig && editingConfig.id === config.id ? (
                      // Edit row
                      <TableRow key={config.id}>
                        <TableCell>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editingConfig.variance_type}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              variance_type: e.target.value as 'positive' | 'negative'
                            })}
                          >
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editingConfig.min_variance_percentage}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              min_variance_percentage: parseFloat(e.target.value) || 0
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editingConfig.max_variance_percentage}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              max_variance_percentage: parseFloat(e.target.value) || 0
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editingConfig.penalty_rate_per_liter}
                            onChange={(e) => setEditingConfig({
                              ...editingConfig,
                              penalty_rate_per_liter: parseFloat(e.target.value) || 0
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editingConfig.is_active}
                              onChange={(e) => setEditingConfig({
                                ...editingConfig,
                                is_active: e.target.checked
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span>Active</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleUpdateConfig}
                              disabled={isSaving}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingConfig(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Display row
                      <TableRow key={config.id}>
                        <TableCell>
                          <Badge className={getVarianceTypeColor(config.variance_type)}>
                            {config.variance_type.charAt(0).toUpperCase() + config.variance_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{config.min_variance_percentage.toFixed(1)}%</TableCell>
                        <TableCell>{config.max_variance_percentage.toFixed(1)}%</TableCell>
                        <TableCell>KSh {config.penalty_rate_per_liter.toFixed(2)}/L</TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? 'default' : 'secondary'}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingConfig(config)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No penalty configurations found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Variances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Collection Variances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only negative variances result in penalties. Positive variances show $0.00 penalty.
            </p>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection ID</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Collected (L)</TableHead>
                  <TableHead>Received (L)</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Penalty (KSh)</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variancesLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : variances.length > 0 ? (
                  variances.map((variance) => (
                    <TableRow key={variance.id}>
                      <TableCell className="font-mono">
                        {variance.collection_details?.collection_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.farmers?.full_name || 'Unknown Farmer'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.collection_date 
                          ? format(new Date(variance.collection_details.collection_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.staff?.profiles?.full_name || 'Unknown Collector'}
                      </TableCell>
                      <TableCell>
                        {variance.staff_details?.profiles?.full_name || 'Unknown Staff'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {variance.company_received_liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getVarianceIcon(variance.variance_type || 'none')}
                          <span className={variance.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {variance.variance_liters?.toFixed(2) || '0.00'}L
                          </span>
                          <Badge className={getVarianceSeverityColor(variance.variance_percentage || 0)}>
                            {variance.variance_percentage?.toFixed(2) || '0.00'}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVarianceTypeColor(variance.variance_type || 'none')}>
                          {variance.variance_type 
                            ? variance.variance_type.charAt(0).toUpperCase() + variance.variance_type.slice(1)
                            : 'None'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {variance.penalty_amount > 0 ? (
                          <span className="font-medium text-red-600">
                            {variance.penalty_amount?.toFixed(2) || '0.00'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {variance.approved_at 
                          ? format(new Date(variance.approved_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No recent variances found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Penalty Calculation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Penalty Calculation Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Positive Variance Example</h3>
              <p className="text-sm text-green-700">
                If a collector reports 100L but 105L is received (5% positive variance), 
                <strong>NO PENALTY IS APPLIED</strong> as per policy.
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Negative Variance Example</h3>
              <p className="text-sm text-red-700">
                If a collector reports 100L but only 95L is received (5% negative variance), 
                and the penalty rate is KSh 3.00/L, the penalty would be:
                <br />
                <strong>5L × KSh 3.00 = KSh 15.00</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Positive Variances</h3>
              <p className="text-sm text-green-700">
                Occur when the company receives more milk than was collected by the collector. 
                <strong>No penalties are applied for positive variances.</strong>
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Negative Variances</h3>
              <p className="text-sm text-red-700">
                Occur when the company receives less milk than was collected by the collector. 
                Penalties are automatically calculated based on variance percentages and applied 
                according to the configured penalty rates.
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Penalty System</h3>
              <p className="text-sm text-blue-700">
                <strong>Only negative variances incur penalties.</strong> 
                Penalties are calculated as: |variance_liters| × penalty_rate_per_liter
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PenaltyManagementPage;