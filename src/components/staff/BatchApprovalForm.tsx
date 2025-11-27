import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import useToastNotifications from '@/hooks/useToastNotifications';
import { MilkApprovalService } from '@/services/milk-approval-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CheckCircle, Calendar, Milk, Users } from 'lucide-react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { validateAndRefreshSession } from '@/utils/sessionValidator';

interface Collector {
  id: string;
  full_name: string;
}

interface BatchApprovalSummary {
  approved_count: number;
  total_liters_collected: number;
  total_liters_received: number;
  total_variance: number;
  total_penalty_amount: number;
}

const BatchApprovalForm = () => {
  const { show, error: showError } = useToastNotifications();
  const { user, refreshSession } = useAuth();
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<Date>(new Date());
  const [defaultReceivedLiters, setDefaultReceivedLiters] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<BatchApprovalSummary | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalCollected: number;
    totalReceived: number;
    variance: number;
    variancePercentage: number;
    estimatedPenalty: number;
    collectionCount: number;
    collectionIds: string[];
  } | null>(null);

  useEffect(() => {
    console.log('🔍 BatchApprovalForm component mounted');
    fetchCollectors();
  }, []);

  const fetchCollectors = async () => {
    console.log('🔄 Starting to fetch collectors...');
    try {
      // Validate session before making requests
      const isSessionValid = await validateAndRefreshSession();
      if (!isSessionValid) {
        showError('Session Expired', 'Your session has expired. Please log in again.');
        return;
      }

      // Fetch staff members with collector role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);

      if (rolesError) {
        console.error('❌ Error fetching collector roles from Supabase:', rolesError);
        throw rolesError;
      }

      const collectorUserIds = userRoles?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        console.warn('⚠️ No collector roles found in the system');
        setCollectors([]);
        return;
      }

      // Fetch staff records for these user IDs
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, profiles (full_name)')
        .in('user_id', collectorUserIds)
        .order('profiles.full_name');

      if (staffError) {
        console.error('❌ Error fetching staff data from Supabase:', staffError);
        throw staffError;
      }

      console.log('📊 Raw staff data from Supabase:', staffData);

      const collectorData = staffData?.map((staff: any) => ({
        id: staff.id,
        full_name: staff.profiles?.full_name || 'Unknown Collector'
      })) || [];

      console.log('✅ Processed collectors:', collectorData);
      setCollectors(collectorData);
      
      if (collectorData.length === 0) {
        console.warn('⚠️ No collectors found in the system');
      }
    } catch (error: any) {
      console.error('❌ Error in fetchCollectors:', error);
      showError('Error', String(error?.message || 'Failed to fetch collectors'));
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Review button clicked - starting review process');

    if (!selectedCollector) {
      console.warn('⚠️ No collector selected');
      showError('Error', 'Please select a collector');
      return;
    }

    if (!defaultReceivedLiters) {
      console.warn('⚠️ No received liters entered');
      showError('Error', 'Please enter the total weighed liters');
      return;
    }

    const receivedLiters = parseFloat(defaultReceivedLiters);
    if (isNaN(receivedLiters) || receivedLiters <= 0) {
      console.warn('⚠️ Invalid received liters:', defaultReceivedLiters);
      showError('Error', 'Please enter a valid positive number for weighed liters');
      return;
    }

    console.log('📋 Starting review with parameters:', {
      selectedCollector,
      collectionDate: format(collectionDate, 'yyyy-MM-dd'),
      defaultReceivedLiters: receivedLiters
    });

    setIsSubmitting(true);
    setSummary(null);
    setPreviewData(null);

    try {
      // Validate session before making requests
      const isSessionValid = await validateAndRefreshSession();
      if (!isSessionValid) {
        showError('Session Expired', 'Your session has expired. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Fetch pending collections to calculate totals
      console.log('📥 Fetching pending collections...');
      const result = await MilkApprovalService.getPendingCollections();

      if (!result.success) {
        console.error('❌ Failed to fetch pending collections:', result.error);
        throw result.error;
      }

      const collections = result.data || [];
      console.log('📊 All pending collections:', collections);

      // Filter for selected collector and date
      const selectedDateStr = format(collectionDate, 'yyyy-MM-dd');
      console.log('🔍 Looking for collections for:', {
        collectorId: selectedCollector,
        date: selectedDateStr
      });

      const targetCollections = collections.filter(c => {
        const cDate = c.collection_date ? format(new Date(c.collection_date), 'yyyy-MM-dd') : '';
        const matchesCollector = c.staff_id === selectedCollector;
        const matchesDate = cDate === selectedDateStr;
        
        console.log(`📝 Collection ${c.id}:`, {
          staff_id: c.staff_id,
          collection_date: cDate,
          liters: c.liters,
          matchesCollector,
          matchesDate
        });
        
        return matchesCollector && matchesDate;
      });

      console.log('✅ Filtered target collections:', targetCollections);

      if (targetCollections.length === 0) {
        console.warn('⚠️ No pending collections found for filter criteria');
        showError('Info', 'No pending collections found for this collector and date.');
        setIsSubmitting(false);
        return;
      }

      const totalCollected = targetCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const totalReceived = receivedLiters;
      const variance = totalReceived - totalCollected;
      const variancePercentage = totalCollected > 0 ? (variance / totalCollected) * 100 : 0;
      const collectionIds = targetCollections.map(c => c.id);

      // Estimate penalty (simple logic for preview)
      let estimatedPenalty = 0;
      if (variance < 0 && Math.abs(variancePercentage) > 0.5) {
        estimatedPenalty = Math.abs(variance) * 50; // Assuming 50 KSh rate
      }

      const preview = {
        totalCollected,
        totalReceived,
        variance,
        variancePercentage,
        estimatedPenalty,
        collectionCount: targetCollections.length,
        collectionIds
      };

      console.log('📈 Preview data calculated:', preview);
      setPreviewData(preview);

    } catch (error: any) {
      console.error('❌ Error in handleReview:', error);
      showError('Error', String(error?.message || 'Failed to prepare review'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchApproval = async () => {
    console.log('🔄 Batch approval button clicked!');
    
    if (!selectedCollector || !previewData) {
      console.error('❌ Missing required data for batch approval:', {
        selectedCollector,
        previewData
      });
      showError('Error', 'Missing required data for batch approval');
      return;
    }

    console.log('🚀 Starting batch approval with parameters:', {
      selectedCollector,
      collectionDate: format(collectionDate, 'yyyy-MM-dd'),
      totalReceived: previewData.totalReceived,
      collectionCount: previewData.collectionCount,
      collectionIds: previewData.collectionIds
    });

    setIsSubmitting(true);

    try {
      // Validate session before making requests
      const isSessionValid = await validateAndRefreshSession();
      if (!isSessionValid) {
        showError('Session Expired', 'Your session has expired. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Get the current user's staff ID for approval
      console.log('👤 Getting current user...');
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = user.id;
      console.log('✅ Current user ID:', userId);
      
      // Check if user has a staff record
      console.log('🔍 Looking up staff record for user ID:', userId);
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('📊 Staff data lookup result:', { staffData, staffError });

      if (staffError) {
        console.error('❌ Error looking up staff record:', staffError);
        throw new Error(`Error looking up staff record: ${staffError.message}`);
      }

      if (!staffData) {
        console.error('❌ No staff record found for user ID:', userId);
        
        // Check what staff records exist for debugging
        const { data: allStaff, error: allStaffError } = await supabase
          .from('staff')
          .select('id, user_id, role')
          .limit(5);
        
        console.log('🔍 Sample staff records for debugging:', { allStaff, allStaffError });
        throw new Error('No staff record found for current user. Please contact administrator.');
      }

      const staffId = staffData.id;
      console.log('✅ Using staff ID for approval:', staffId);
      console.log('👥 Staff role:', staffData.role);

      // Verify staff has permission to approve
      console.log('🔐 Checking user roles for permission...');
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, active')
        .eq('user_id', userId)
        .eq('active', true);

      console.log('📋 User roles:', userRoles);

      if (rolesError) {
        console.error('❌ Error checking user roles:', rolesError);
      }

      const hasPermission = userRoles?.some(role => 
        role.role === 'staff' || role.role === 'admin'
      );

      if (!hasPermission) {
        console.warn('⚠️ User does not have staff or admin role');
        throw new Error('You do not have permission to approve collections. Required role: staff or admin.');
      }

      console.log('✅ User has required permissions, proceeding with batch approval...');

      const batchApprovalParams = {
        staffId,
        collectorId: selectedCollector,
        collectionDate: format(collectionDate, 'yyyy-MM-dd'),
        totalReceived: previewData.totalReceived
      };

      console.log('📤 Calling MilkApprovalService.batchApproveCollections with:', batchApprovalParams);

      // Add a small delay to ensure all logs are visible
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await MilkApprovalService.batchApproveCollections(
        staffId,
        selectedCollector,
        format(collectionDate, 'yyyy-MM-dd'),
        previewData.totalReceived
      );

      console.log('📥 Batch approval service result:', result);

      if (!result.success) {
        console.error('❌ Batch approval service returned error:', result.error);
        
        // Check if it's a database function error
        if (result.error && typeof result.error === 'object' && 'message' in result.error) {
          throw new Error(result.error.message as string);
        }
        throw result.error;
      }

      console.log('✅ Batch approval completed successfully:', result.data);
      setSummary(result.data as BatchApprovalSummary);
      setPreviewData(null); // Clear preview after success

      show({
        title: 'Success',
        description: `Batch approval completed successfully. ${result.data.approved_count} collections approved.`
      });

      // Refresh the collectors list to reflect changes
      fetchCollectors();

    } catch (error: any) {
      console.error('❌ Error in handleBatchApproval:', error);
      
      // More detailed error messages based on error type
      let errorMessage = error?.message || 'Failed to process batch approval';
      
      if (errorMessage.includes('permission') || errorMessage.includes('role')) {
        errorMessage = `Permission denied: ${errorMessage}`;
      } else if (errorMessage.includes('staff record')) {
        errorMessage = `Staff account issue: ${errorMessage}`;
      } else if (errorMessage.includes('authentication')) {
        errorMessage = `Authentication error: ${errorMessage}`;
      } else if (errorMessage.includes('function') || errorMessage.includes('RPC')) {
        errorMessage = `Database error: ${errorMessage}`;
      } else if (errorMessage.includes('Session expired') || errorMessage.includes('JWT expired')) {
        // Handle session expiration specifically
        errorMessage = 'Your session has expired. Please log in again.';
        // Optionally trigger a session refresh
        refreshSession();
      }
      
      showError('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    console.log('🔄 Resetting form...');
    setSelectedCollector('');
    setDefaultReceivedLiters('');
    setPreviewData(null);
    setSummary(null);
  };

  // Debug current state
  console.log('📊 BatchApprovalForm current state:', {
    selectedCollector,
    collectionDate: format(collectionDate, 'yyyy-MM-dd'),
    defaultReceivedLiters,
    isSubmitting,
    hasPreviewData: !!previewData,
    hasSummary: !!summary,
    collectorsCount: collectors.length
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Batch Milk Collection Approval
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReview} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="collector">Collector *</Label>
              <Select
                value={selectedCollector}
                onValueChange={(val) => {
                  console.log('👤 Collector selected:', val);
                  setSelectedCollector(val);
                  setPreviewData(null);
                  setSummary(null);
                }}
              >
                <SelectTrigger id="collector">
                  <SelectValue placeholder="Select a collector" />
                </SelectTrigger>
                <SelectContent>
                  {collectors.map((collector) => (
                    <SelectItem key={collector.id} value={collector.id}>
                      {collector.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {collectors.length === 0 && (
                <p className="text-sm text-yellow-600">No collectors found. Please check system configuration.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectionDate">Collection Date *</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !collectionDate && "text-muted-foreground"
                    )}
                    onClick={() => {
                      setPreviewData(null);
                      setSummary(null);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {collectionDate ? format(collectionDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={collectionDate}
                    onSelect={(date) => {
                      if (date) {
                        console.log('📅 Date selected:', date);
                        setCollectionDate(date);
                        setIsCalendarOpen(false);
                        setPreviewData(null);
                        setSummary(null);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultReceivedLiters">Total Weighed Liters *</Label>
              <Input
                id="defaultReceivedLiters"
                type="number"
                step="0.01"
                min="0.01"
                value={defaultReceivedLiters}
                onChange={(e) => {
                  console.log('💧 Received liters changed:', e.target.value);
                  setDefaultReceivedLiters(e.target.value);
                  setPreviewData(null);
                  setSummary(null);
                }}
                placeholder="Enter total weighed liters for all collections"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            {!previewData ? (
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedCollector || !defaultReceivedLiters}
                onClick={() => console.log('🔄 Review button clicked - form submission')}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Review Batch Approval
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('❌ Cancel preview');
                  setPreviewData(null);
                }}
                className="mr-2"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {previewData && (
          <Card className="mt-6 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Approval Preview
                <span className="text-sm font-normal text-blue-600 ml-2">
                  ({previewData.collectionCount} collections)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-white rounded-lg border shadow-sm">
                  <div className="text-sm text-muted-foreground">Collections</div>
                  <div className="text-xl font-bold">{previewData.collectionCount}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border shadow-sm">
                  <div className="text-sm text-muted-foreground">Total Collected</div>
                  <div className="text-xl font-bold">{previewData.totalCollected.toFixed(2)} L</div>
                </div>
                <div className="p-3 bg-white rounded-lg border shadow-sm">
                  <div className="text-sm text-muted-foreground">Total Received</div>
                  <div className="text-xl font-bold">{previewData.totalReceived.toFixed(2)} L</div>
                </div>
                <div className={`p-3 bg-white rounded-lg border shadow-sm ${
                  previewData.variance < 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}>
                  <div className="text-sm text-muted-foreground">Variance</div>
                  <div className={`text-xl font-bold ${
                    previewData.variance < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {previewData.variance > 0 ? '+' : ''}{previewData.variance.toFixed(2)} L
                    <span className="text-xs font-normal ml-1">
                      ({previewData.variancePercentage.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {previewData.estimatedPenalty > 0 && (
                <div className="mb-6 p-3 bg-red-100 border border-red-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-red-200 rounded-full">
                    <Milk className="h-4 w-4 text-red-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Estimated Penalty: KSh {previewData.estimatedPenalty.toFixed(2)}</p>
                    <p className="text-xs text-red-700">Based on negative variance &gt; 0.5%</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log('❌ Cancel batch approval');
                    setPreviewData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    console.log('✅ Confirm & Approve button clicked - starting batch approval');
                    handleBatchApproval();
                  }}
                  disabled={isSubmitting}
                  className={previewData.variance < 0 ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm & Approve
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card className="mt-6 border-green-500 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Approval Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-700">{summary.approved_count}</div>
                  <div className="text-sm text-muted-foreground">Collections</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-700">{summary.total_liters_collected.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-700">{summary.total_liters_received.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Received</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-orange-700">{summary.total_variance.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Variance</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-red-700">KSh {summary.total_penalty_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Penalties</div>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('🔄 Starting new approval');
                    resetForm();
                  }}
                >
                  Start New Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchApprovalForm;