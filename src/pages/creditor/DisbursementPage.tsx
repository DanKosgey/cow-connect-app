import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { CreditService, AgrovetPurchase } from '@/services/credit-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, CheckCircle, Clock, Package, User, Phone, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import StatusFilter from '@/components/StatusFilter';

interface ExtendedAgrovetPurchase extends AgrovetPurchase {
    agrovet_inventory?: {
        name: string;
        category: string;
        unit: string;
    };
    farmers?: {
        id: string;
        profiles?: {
            full_name: string;
            phone: string;
        };
    };
}

const DisbursementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [purchases, setPurchases] = useState<ExtendedAgrovetPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<ExtendedAgrovetPurchase | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchPendingPurchases();
    }, []);

    const fetchPendingPurchases = async () => {
        setLoading(true);
        try {
            // 1. Fetch purchases with status 'pending_collection'
            const { data: purchasesData, error: purchasesError } = await supabase
                .from('agrovet_purchases')
                .select(`
          *,
          agrovet_inventory(name, category, unit)
        `)
                .eq('status', 'pending_collection')
                .order('created_at', { ascending: false });

            if (purchasesError) throw purchasesError;

            if (!purchasesData || purchasesData.length === 0) {
                setPurchases([]);
                return;
            }

            // 2. Extract farmer IDs
            const farmerIds = [...new Set(purchasesData.map(p => p.farmer_id))];

            // 3. Fetch farmers to get user_ids
            const { data: farmersData, error: farmersError } = await supabase
                .from('farmers')
                .select('id, user_id')
                .in('id', farmerIds);

            if (farmersError) throw farmersError;

            // 4. Extract user IDs
            const userIds = [...new Set(farmersData?.map(f => f.user_id).filter(Boolean) as string[])];

            // 5. Fetch profiles to get names and phones
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            // 6. Map data together
            const farmersMap = new Map(farmersData?.map(f => [f.id, f]));
            const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

            const combinedData = purchasesData.map(purchase => {
                const farmer = farmersMap.get(purchase.farmer_id);
                const profile = farmer?.user_id ? profilesMap.get(farmer.user_id) : null;

                return {
                    ...purchase,
                    farmers: {
                        id: purchase.farmer_id,
                        profiles: {
                            full_name: profile?.full_name || 'Unknown Farmer',
                            phone: profile?.phone || 'No Phone'
                        }
                    }
                };
            });

            setPurchases(combinedData as unknown as ExtendedAgrovetPurchase[]);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            toast({
                title: "Error",
                description: "Failed to load pending disbursements",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCollection = async (purchaseId: string) => {
        setProcessingId(purchaseId);
        try {
            await CreditService.confirmPurchaseCollection(purchaseId, user?.email);

            toast({
                title: "Collection Confirmed",
                description: "Product collection has been recorded successfully.",
            });

            // Remove from list
            setPurchases(prev => prev.filter(p => p.id !== purchaseId));
            setSelectedPurchase(null);
        } catch (error) {
            console.error('Error confirming collection:', error);
            toast({
                title: "Confirmation Failed",
                description: "Failed to confirm collection. Please try again.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const filteredPurchases = purchases.filter(purchase => {
        const farmerName = purchase.farmers?.profiles?.full_name?.toLowerCase() || '';
        const farmerPhone = purchase.farmers?.profiles?.phone || '';
        const productName = purchase.agrovet_inventory?.name?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();

        // Apply status filter
        const statusMatch = statusFilter === 'all' || purchase.status === statusFilter;

        return statusMatch && (
            farmerName.includes(query) ||
            farmerPhone.includes(query) ||
            productName.includes(query)
        );
    });

    // Define status options for filtering
    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending_collection', label: 'Pending Collection' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Disbursement</h1>
                    <p className="text-muted-foreground">Confirm product collection by farmers</p>
                </div>
                <Button onClick={fetchPendingPurchases} variant="outline">
                    Refresh List
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by farmer name, phone, or product..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <StatusFilter
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                                statusOptions={statusOptions}
                                placeholder="Filter by status"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredPurchases.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                            <p className="text-lg font-medium">No pending collections</p>
                            <p>All purchased products have been collected.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredPurchases.map((purchase) => (
                                <div key={purchase.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold">
                                                    {purchase.agrovet_inventory?.name || 'Unknown Product'}
                                                </h3>
                                                <StatusBadge status={purchase.status || 'unknown'} type="purchase" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <div className="text-muted-foreground">Farmer</div>
                                                    <div className="font-medium">
                                                        {purchase.farmers?.profiles?.full_name || 'Unknown Farmer'}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {purchase.farmers?.profiles?.phone || 'No phone'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Quantity</div>
                                                    <div className="font-medium">
                                                        {purchase.quantity} {purchase.agrovet_inventory?.unit || 'units'}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {formatCurrency(purchase.unit_price)} each
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Total Amount</div>
                                                    <div className="font-medium text-lg">
                                                        {formatCurrency(purchase.total_amount)}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {new Date(purchase.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Dialog open={selectedPurchase?.id === purchase.id} onOpenChange={(open) => {
                                            if (!open) setSelectedPurchase(null);
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedPurchase(purchase)}
                                                    disabled={processingId === purchase.id}
                                                >
                                                    {processingId === purchase.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                    )}
                                                    Confirm Collection
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Confirm Product Collection</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to confirm that {purchase.farmers?.profiles?.full_name} has collected their purchase of {purchase.quantity} {purchase.agrovet_inventory?.unit} of {purchase.agrovet_inventory?.name}?
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setSelectedPurchase(null)}
                                                        disabled={processingId === purchase.id}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleConfirmCollection(purchase.id)}
                                                        disabled={processingId === purchase.id}
                                                    >
                                                        {processingId === purchase.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                        )}
                                                        Confirm Collection
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DisbursementPage;