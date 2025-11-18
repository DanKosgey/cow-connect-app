import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MilkApprovalService } from '@/services/milk-approval-service';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Milk, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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

const BatchApprovalForm: React.FC = () => {
  const { show, error: showError } = useToastNotifications();
  
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<Date>(new Date());
  const [defaultReceivedLiters, setDefaultReceivedLiters] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<BatchApprovalSummary | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

  const handleBatchApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCollector) {
      showError('Error', 'Please select a collector');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await MilkApprovalService.batchApproveCollections(
        selectedCollector, // In a real implementation, this would be the actual staff ID
        selectedCollector,
        format(collectionDate, 'yyyy-MM-dd'),
        defaultReceivedLiters ? parseFloat(defaultReceivedLiters) : undefined
      );

      if (!result.success) {
        throw result.error;
      }

      setSummary(result.data as BatchApprovalSummary);
      
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
        <form onSubmit={handleBatchApproval} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="collector">Collector *</Label>
              <Select value={selectedCollector} onValueChange={setSelectedCollector}>
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
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultReceivedLiters">Default Received Liters (Optional)</Label>
              <Input
                id="defaultReceivedLiters"
                type="number"
                step="0.01"
                min="0"
                value={defaultReceivedLiters}
                onChange={(e) => setDefaultReceivedLiters(e.target.value)}
                placeholder="Enter default received liters for all collections"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !selectedCollector}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve All Collections
                </>
              )}
            </Button>
          </div>
        </form>
        
        {summary && (
          <Card className="mt-6 border-primary">
            <CardHeader>
              <CardTitle>Batch Approval Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{summary.approved_count}</div>
                  <div className="text-sm text-muted-foreground">Collections</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{summary.total_liters_collected.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{summary.total_liters_received.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Received</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">{summary.total_variance.toFixed(2)}L</div>
                  <div className="text-sm text-muted-foreground">Variance</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">KSh {summary.total_penalty_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Penalties</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchApprovalForm;