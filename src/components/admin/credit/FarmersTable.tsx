import { Users, CreditCard, Edit, Pause, Play, History, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/formatters';

interface FarmerCreditData {
    farmer_id: string;
    farmer_name: string;
    farmer_phone: string;
    credit_profile: any;
    pending_payments: number;
}

interface FarmersTableProps {
    farmers: FarmerCreditData[];
    onGrantCredit: (farmerId: string, farmerName: string) => void;
    onAdjustCredit: (farmerId: string, farmerName: string, currentLimit: number) => void;
    onFreezeCredit: (farmerId: string, farmerName: string, freeze: boolean) => void;
    onViewHistory: (farmerId: string) => void;
}

export const FarmersTable: React.FC<FarmersTableProps> = ({
    farmers,
    onGrantCredit,
    onAdjustCredit,
    onFreezeCredit,
    onViewHistory
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Farmers Credit Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Farmer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Pending Payments</TableHead>
                                <TableHead>Credit Limit</TableHead>
                                <TableHead>Available Credit</TableHead>
                                <TableHead>Credit Used</TableHead>
                                <TableHead>Utilization</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {farmers.length > 0 ? (
                                farmers.map((farmer) => {
                                    const creditProfile = farmer.credit_profile;
                                    const hasCredit = creditProfile && creditProfile.current_credit_balance > 0;
                                    const creditLimit = creditProfile?.max_credit_amount || 0;
                                    const availableCredit = creditProfile?.current_credit_balance || 0;
                                    const creditUsed = creditProfile?.total_credit_used || 0;
                                    const utilization = creditLimit > 0 ?
                                        ((creditLimit - availableCredit) / creditLimit) * 100 : 0;

                                    return (
                                        <TableRow key={farmer.farmer_id} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">{farmer.farmer_name}</TableCell>
                                            <TableCell>{farmer.farmer_phone}</TableCell>
                                            <TableCell>{formatCurrency(farmer.pending_payments)}</TableCell>
                                            <TableCell>{formatCurrency(creditLimit)}</TableCell>
                                            <TableCell className={availableCredit > 0 ? "text-green-600 font-semibold" : ""}>
                                                {formatCurrency(availableCredit)}
                                            </TableCell>
                                            <TableCell>{formatCurrency(creditUsed)}</TableCell>
                                            <TableCell>{utilization.toFixed(1)}%</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hasCredit
                                                    ? utilization > 80
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {hasCredit ? (
                                                        <>
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            No Credit
                                                        </>
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {!hasCredit && farmer.pending_payments > 0 && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => onGrantCredit(farmer.farmer_id, farmer.farmer_name)}
                                                            title="Recalculate credit limit based on pending collections"
                                                        >
                                                            <CreditCard className="w-4 h-4 mr-1" />
                                                            Recalculate
                                                        </Button>
                                                    )}

                                                    {hasCredit && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onAdjustCredit(farmer.farmer_id, farmer.farmer_name, creditLimit)}
                                                            >
                                                                <Edit className="w-4 h-4 mr-1" />
                                                                Adjust
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onFreezeCredit(farmer.farmer_id, farmer.farmer_name, !creditProfile.is_frozen)}
                                                            >
                                                                {creditProfile.is_frozen ? (
                                                                    <>
                                                                        <Play className="w-4 h-4 mr-1" />
                                                                        Unfreeze
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Pause className="w-4 h-4 mr-1" />
                                                                        Freeze
                                                                    </>
                                                                )}
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onViewHistory(farmer.farmer_id)}
                                                            >
                                                                <History className="w-4 h-4 mr-1" />
                                                                History
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No farmers found in the system</p>
                                        <p className="text-sm mt-1">Add farmers to see credit information</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
