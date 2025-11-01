import { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  Calendar,
  User,
  CreditCard,
  ShoppingCart,
  FileText,
  RefreshCw
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
import { useToast } from "@/components/ui/use-toast";
import { useAuditLog } from '@/hooks/useAuditLog';

interface TransactionAuditRecord {
  id: string;
  timestamp: string;
  farmer_id: string;
  farmer_name: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted' | 'settlement' | 'dispute_resolution';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  notes?: string;
}

const CreditTransactionAudit = () => {
  const [transactions, setTransactions] = useState<TransactionAuditRecord[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionAuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();
  
  const { useTransactionAudit, refreshTransactionAudit } = useAuditLog();
  const { data: auditData, isLoading, refetch } = useTransactionAudit(200);

  useEffect(() => {
    if (auditData) {
      setTransactions(auditData);
    }
  }, [auditData]);

  useEffect(() => {
    let filtered = transactions || [];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()))
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
    
    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, filterStatus, transactions]);

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by farmer name or notes..."
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
        
        <Button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'approved' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
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
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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