import { RefreshCw, Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreditHeaderProps {
    autoApproveInfo: { enabled: boolean; loading: boolean };
    setAutoApproveInfo: React.Dispatch<React.SetStateAction<{ enabled: boolean; loading: boolean }>>;
    pendingRequestsCount: number;
    onRefresh: () => void;
}

export const CreditHeader: React.FC<CreditHeaderProps> = ({
    autoApproveInfo,
    setAutoApproveInfo,
    pendingRequestsCount,
    onRefresh
}) => {
    const { toast } = useToast();

    const handleAutoApproveToggle = async () => {
        const newState = !autoApproveInfo.enabled;

        // If turning ON auto-approve, check for existing pending requests
        if (newState) {
            const { data: pendingRequests } = await supabase
                .from('credit_requests')
                .select('id')
                .eq('status', 'pending');

            if (pendingRequests && pendingRequests.length > 0) {
                const confirmMessage = `There are ${pendingRequests.length} pending request(s). Enabling auto-approve will automatically approve all pending requests. Continue?`;
                if (!window.confirm(confirmMessage)) {
                    return; // User cancelled
                }
            }
        }

        setAutoApproveInfo(prev => ({ ...prev, enabled: newState }));

        try {
            // Update the setting
            await supabase
                .from('system_settings')
                .upsert({ key: 'credit_config', value: { auto_approve: newState } });

            // If turning ON, auto-approve all existing pending requests
            if (newState) {
                const { data: pendingRequests } = await supabase
                    .from('credit_requests')
                    .select('*')
                    .eq('status', 'pending');

                if (pendingRequests && pendingRequests.length > 0) {
                    // Import the service dynamically to avoid circular dependencies
                    const { CreditService } = await import('@/services/credit-service');

                    for (const request of pendingRequests) {
                        try {
                            await CreditService.approveCreditRequest(request.id, 'SYSTEM_AUTO_APPROVE');
                        } catch (err) {
                            console.error(`Failed to auto-approve request ${request.id}:`, err);
                        }
                    }

                    toast({
                        title: "Auto-Approve Enabled",
                        description: `Automatically approved ${pendingRequests.length} pending request(s).`,
                    });

                    // Refresh the page data
                    onRefresh();
                    return;
                }
            }

            toast({
                title: newState ? "Auto-Approve Enabled" : "Auto-Approve Disabled",
                description: newState
                    ? "New credit requests will be automatically approved."
                    : "Credit requests will require manual approval.",
            });

            onRefresh();
        } catch (err) {
            console.error("Failed to update settings", err);
            setAutoApproveInfo(prev => ({ ...prev, enabled: !newState }));
            toast({
                title: "Error",
                description: "Failed to update setting",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
                    <p className="text-gray-600 mt-2">Manage farmer credit limits and monitor credit usage</p>
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
                {/* Auto-Approve Toggle */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700">Auto-Approve</span>
                        <span className="text-[10px] text-gray-500">
                            {autoApproveInfo.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <Button
                        variant={autoApproveInfo.enabled ? "default" : "outline"}
                        size="sm"
                        className={`h-6 text-xs ${autoApproveInfo.enabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={handleAutoApproveToggle}
                    >
                        {autoApproveInfo.enabled ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        {autoApproveInfo.enabled ? 'ON' : 'OFF'}
                    </Button>
                </div>

                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                    <Bell className="w-4 h-4" />
                    <span className="font-medium">{pendingRequestsCount} pending requests</span>
                </div>

                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>
        </div>
    );
};
