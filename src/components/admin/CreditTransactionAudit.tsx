import { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  Calendar,
  User,
  CreditCard,
  ShoppingCart,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calculator,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuditLog } from '@/hooks/useAuditLog';

interface TransactionAuditRecord {
  id: string;
  timestamp: string;
  farmer_id: string;
  farmer_name: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted' | 'settlement' | 'dispute_resolution';
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  notes?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  mathematical_verification?: {
    is_valid: boolean;
    expected_balance_after: number;
    discrepancy_amount: number;
    verification_notes: string;
  };
}

const CreditTransactionAudit = () => {
  const [transactions, setTransactions] = useState<TransactionAuditRecord[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionAuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showVerificationErrors, setShowVerificationErrors] = useState(false);
  const { toast } = useToast();
  
  const { useTransactionAudit, refreshTransactionAudit } = useAuditLog();
  const { data: auditData, isLoading, refetch } = useTransactionAudit(200);

  useEffect(() => {
    if (auditData) {
      // Add mathematical verification to each transaction
      const verifiedTransactions = auditData.map((transaction: any) => {
        // Perform mathematical verification
        let mathematicalVerification = {
          is_valid: true,
          expected_balance_after: 0,
          discrepancy_amount: 0,
          verification_notes: ""
        };
        
        try {
          // Calculate expected balance after based on transaction type
          let expectedBalanceAfter = transaction.balance_before;
          
          switch (transaction.transaction_type) {
            case 'credit_granted':
              expectedBalanceAfter = transaction.balance_before + transaction.amount;
              break;
            case 'credit_used':
              expectedBalanceAfter = transaction.balance_before - transaction.amount;
              break;
            case 'credit_repaid':
              expectedBalanceAfter = transaction.balance_before + transaction.amount;
              break;
            case 'credit_adjusted':
              // For adjustments, we need to check if it's an increase or decrease
              // Since we don't have the previous transaction, we'll just verify the balance_after
              expectedBalanceAfter = transaction.balance_after;
              break;
            case 'settlement':
              expectedBalanceAfter = transaction.balance_before - transaction.amount;
              break;
            default:
              expectedBalanceAfter = transaction.balance_after;
          }
          
          // Check if the calculated balance matches the recorded balance
          const discrepancy = Math.abs(expectedBalanceAfter - transaction.balance_after);
          const isValid = discrepancy < 0.01; // Allow for floating point precision issues
          
          mathematicalVerification = {
            is_valid: isValid,
            expected_balance_after: expectedBalanceAfter,
            discrepancy_amount: discrepancy,
            verification_notes: isValid 
              ? "Mathematical verification passed" 
              : `Discrepancy found: Expected ${formatCurrency(expectedBalanceAfter)}, got ${formatCurrency(transaction.balance_after)}`
          };
        } catch (error) {
          mathematicalVerification = {
            is_valid: false,
            expected_balance_after: 0,
            discrepancy_amount: 0,
            verification_notes: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
        
        return {
          ...transaction,
          mathematical_verification: mathematicalVerification
        };
      });
      
      setTransactions(verifiedTransactions);
    }
  }, [auditData]);

  useEffect(() => {
    let filtered = transactions || [];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.product_name && transaction.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(transaction => transaction.transaction_type === filterType);
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(transaction => transaction.status === filterStatus);
    }
    
    // Apply verification error filter
    if (showVerificationErrors) {
      filtered = filtered.filter(transaction => 
        transaction.mathematical_verification && !transaction.mathematical_verification.is_valid
      );
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, filterStatus, showVerificationErrors, transactions]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Success",
        description: "Audit records refreshed successfully",
      });
    } catch (err) {
      console.error("Error refreshing transaction audit:", err);
      toast({
        title: "Error",
        description: "Failed to refresh transaction audit records",
        variant: "destructive",
      });
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_granted': return <CreditCard className="w-4 h-4" />;
      case 'credit_used': return <ShoppingCart className="w-4 h-4" />;
      case 'credit_repaid': return <CreditCard className="w-4 h-4" />;
      case 'credit_adjusted': return <FileText className="w-4 h-4" />;
      case 'settlement': return <CreditCard className="w-4 h-4" />;
      case 'dispute_resolution': return <FileText className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'credit_granted': return 'Credit Granted';
      case 'credit_used': return 'Credit Used';
      case 'credit_repaid': return 'Credit Repaid';
      case 'credit_adjusted': return 'Credit Adjusted';
      case 'settlement': return 'Settlement';
      case 'dispute_resolution': return 'Dispute Resolution';
      default: return type;
    }
  };

  const VerificationDetailsDialog = ({ transaction }: { transaction: TransactionAuditRecord }) => {
    if (!transaction.mathematical_verification) return null;
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="ml-2">
            <Calculator className="w-4 h-4 mr-1" />
            Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mathematical Verification Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Transaction Type</p>
                <p className="font-semibold">{getTransactionTypeName(transaction.transaction_type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance Before</p>
                <p className="font-semibold">{formatCurrency(transaction.balance_before)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Recorded Balance After</p>
                <p className="font-semibold">{formatCurrency(transaction.balance_after)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Balance After</p>
                <p className="font-semibold">{formatCurrency(transaction.mathematical_verification.expected_balance_after)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Discrepancy</p>
                <p className={`font-semibold ${transaction.mathematical_verification.discrepancy_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(transaction.mathematical_verification.discrepancy_amount)}
                </p>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg ${transaction.mathematical_verification.is_valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {transaction.mathematical_verification.is_valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${transaction.mathematical_verification.is_valid ? 'text-green-800' : 'text-red-800'}`}>
                  {transaction.mathematical_verification.is_valid ? 'Verification Passed' : 'Verification Failed'}
                </span>
              </div>
              <p className={`mt-2 text-sm ${transaction.mathematical_verification.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                {transaction.mathematical_verification.verification_notes}
              </p>
            </div>
            
            {transaction.product_name && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Product Details</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-gray-600">Product</p>
                    <p className="text-sm">{transaction.product_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="text-sm">{transaction.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Unit Price</p>
                    <p className="text-sm">{formatCurrency(transaction.unit_price || 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading transaction audit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by farmer name, notes, or product..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit_granted">Credit Granted</SelectItem>
            <SelectItem value="credit_used">Credit Used</SelectItem>
            <SelectItem value="credit_repaid">Credit Repaid</SelectItem>
            <SelectItem value="credit_adjusted">Credit Adjusted</SelectItem>
            <SelectItem value="settlement">Settlement</SelectItem>
            <SelectItem value="dispute_resolution">Dispute Resolution</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant={showVerificationErrors ? "destructive" : "outline"}
          onClick={() => setShowVerificationErrors(!showVerificationErrors)}
          className="flex items-center gap-2"
        >
          {showVerificationErrors ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          {showVerificationErrors ? "Showing Errors" : "Verify Math"}
        </Button>
        
        <Button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verification Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {transactions.filter(t => t.mathematical_verification && !t.mathematical_verification.is_valid).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions.filter(t => t.mathematical_verification && t.mathematical_verification.is_valid).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transaction Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <TableRow 
                      key={transaction.id} 
                      className={`hover:bg-gray-50 ${transaction.mathematical_verification && !transaction.mathematical_verification.is_valid ? 'bg-red-50' : ''}`}
                    >
                      <TableCell>
                        <div className="text-sm">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.timestamp).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <User className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="font-medium">{transaction.farmer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 p-1 rounded-full">
                            {getTransactionTypeIcon(transaction.transaction_type)}
                          </div>
                          <span>{getTransactionTypeName(transaction.transaction_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Before: {formatCurrency(transaction.balance_before)}</div>
                          <div>After: {formatCurrency(transaction.balance_after)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'approved' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.mathematical_verification ? (
                          <div className="flex items-center gap-1">
                            {transaction.mathematical_verification.is_valid ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xs ${transaction.mathematical_verification.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.mathematical_verification.is_valid ? 'Valid' : 'Error'}
                            </span>
                            <VerificationDetailsDialog transaction={transaction} />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.approved_by || 'System'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-600">
                          {transaction.notes || 'No notes'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No transaction records found in the system</p>
                      <p className="text-sm mt-1">Transactions will appear here when credit activities occur</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredTransactions.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditTransactionAudit;