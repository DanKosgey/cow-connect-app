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
} | null>(null);

useEffect(() => {
  fetchCollectors();
}, []);

const fetchCollectors = async () => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, profiles (full_name)')
      .eq('role', 'collector')
      .order('profiles.full_name');

    if (error) throw error;

    const collectorData = data?.map((staff: any) => ({
      id: staff.id,
      full_name: staff.profiles?.full_name || 'Unknown Collector'
    })) || [];

    setCollectors(collectorData);
  } catch (error: any) {
    console.error('Error fetching collectors:', error);
    showError('Error', String(error?.message || 'Failed to fetch collectors'));
  }
};

const handleReview = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedCollector) {
    showError('Error', 'Please select a collector');
    return;
  }

  if (!defaultReceivedLiters) {
    showError('Error', 'Please enter the total weighed liters');
    return;
  }

  setIsSubmitting(true);
  setSummary(null);
  setPreviewData(null);

  try {
    // Fetch pending collections to calculate totals
    const result = await MilkApprovalService.getPendingCollections();

    if (!result.success) {
      throw result.error;
    }

    const collections = result.data || [];

    // Filter for selected collector and date
    const selectedDateStr = format(collectionDate, 'yyyy-MM-dd');
    const targetCollections = collections.filter(c => {
      const cDate = c.collection_date ? format(new Date(c.collection_date), 'yyyy-MM-dd') : '';
      // Check if collector matches (either by staff_id or if unassigned checks are needed)
      // The form selects a collector ID, so we match against staff_id
      return c.staff_id === selectedCollector && cDate === selectedDateStr;
    });

    if (targetCollections.length === 0) {
      showError('Info', 'No pending collections found for this collector and date.');
      setIsSubmitting(false);
      return;
    }

    const totalCollected = targetCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalReceived = parseFloat(defaultReceivedLiters);
    const variance = totalReceived - totalCollected;
    const variancePercentage = totalCollected > 0 ? (variance / totalCollected) * 100 : 0;

    // Estimate penalty (simple logic for preview)
    let estimatedPenalty = 0;
    if (variance < 0 && Math.abs(variancePercentage) > 0.5) {
      estimatedPenalty = Math.abs(variance) * 50; // Assuming 50 KSh rate
    }

    setPreviewData({
      totalCollected,
      totalReceived,
      variance,
      variancePercentage,
      estimatedPenalty,
      collectionCount: targetCollections.length
    });

  } catch (error: any) {
    console.error('Error preparing review:', error);
    showError('Error', String(error?.message || 'Failed to prepare review'));
  } finally {
    setIsSubmitting(false);
  }
};

const handleBatchApproval = async () => {
  if (!selectedCollector || !previewData) return;

  setIsSubmitting(true);

  try {
    const result = await MilkApprovalService.batchApproveCollections(
      selectedCollector, // In a real implementation, this would be the actual staff ID (user.id)
      selectedCollector,
      format(collectionDate, 'yyyy-MM-dd'),
      previewData.totalReceived
    );

    if (!result.success) {
      throw result.error;
    }

    setSummary(result.data as BatchApprovalSummary);
    setPreviewData(null); // Clear preview after success

    show({
      title: 'Success',
      description: `Batch approval completed successfully. ${result.data.approved_count} collections approved.`
    });
  } catch (error: any) {
    console.error('Error in batch approval:', error);
    showError('Error', String(error?.message || 'Failed to process batch approval'));
  } finally {
    setIsSubmitting(false);
  }
};

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
                setSelectedCollector(val);
                setPreviewData(null); // Reset preview on change
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
              min="0"
              value={defaultReceivedLiters}
              onChange={(e) => {
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
            <Button type="submit" disabled={isSubmitting || !selectedCollector || !defaultReceivedLiters}>
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
              onClick={() => setPreviewData(null)}
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
              <div className={`p-3 bg-white rounded-lg border shadow-sm ${previewData.variance < 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}>
                <div className="text-sm text-muted-foreground">Variance</div>
                <div className={`text-xl font-bold ${previewData.variance < 0 ? 'text-red-600' : 'text-green-600'
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

            <div className="flex justify-end">
              <Button
                onClick={handleBatchApproval}
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
              <Button variant="outline" onClick={() => {
                setSummary(null);
                setSelectedCollector('');
                setDefaultReceivedLiters('');
              }}>
                Start New Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </CardContent>
  </Card>
);
}

export default BatchApprovalForm;