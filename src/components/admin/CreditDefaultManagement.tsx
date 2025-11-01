import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter,
  User,
  Phone,
  Calendar,
  MessageSquare,
  Shield,
  XCircle
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CreditDefaultManagementService } from "@/services/credit-default-management-service";

interface DefaultRecord {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  overdue_amount: number;
  days_overdue: number;
  status: 'overdue' | 'past_due' | 'severely_overdue' | 'resolved';
  created_at: string;
  updated_at: string;
}

const CreditDefaultManagement = () => {
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<DefaultRecord[]>([]);
  const [filteredDefaults, setFilteredDefaults] = useState<DefaultRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDefault, setSelectedDefault] = useState<DefaultRecord | null>(null);
  const [recoveryAction, setRecoveryAction] = useState<'withhold_credit' | 'suspend_credit' | 'schedule_visit' | 'escalate' | 'close_account'>('schedule_visit');
  const [actionNotes, setActionNotes] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [contactMethod, setContactMethod] = useState<'sms' | 'email' | 'visit'>('sms');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching credit defaults...');
      
      // Get all defaults
      const allDefaultsData = await CreditDefaultManagementService.getAllDefaults();
      
      console.log('Credit defaults fetch result:', allDefaultsData);
      
      // Handle case when no defaults exist
      if (!allDefaultsData || allDefaultsData.length === 0) {
        console.log('No credit defaults found');
        setDefaults([]);
        setFilteredDefaults([]);
        return;
      }
      
      // Transform the data to match our interface
      const transformedDefaults = allDefaultsData.map((defaultRecord: any) => ({
        id: defaultRecord.id,
        farmer_id: defaultRecord.farmer_id,
        farmer_name: defaultRecord.farmers?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: defaultRecord.farmers?.profiles?.phone || 'No phone',
        overdue_amount: defaultRecord.overdue_amount,
        days_overdue: defaultRecord.days_overdue,
        status: defaultRecord.status,
        created_at: defaultRecord.created_at,
        updated_at: defaultRecord.updated_at,
      }));
      
      console.log('Transformed defaults:', transformedDefaults);
      setDefaults(transformedDefaults);
      setFilteredDefaults(transformedDefaults);
    } catch (err) {
      console.error("Error fetching defaults:", err);
      toast({
        title: "Error",
        description: "Failed to load default records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = defaults;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(defaultRecord => 
        defaultRecord.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defaultRecord.farmer_phone.includes(searchTerm)
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(defaultRecord => defaultRecord.status === filterStatus);
    }
    
    setFilteredDefaults(filtered);
  }, [searchTerm, filterStatus, defaults]);

  const handleCreateRecoveryAction = async () => {
    if (!selectedDefault) return;
    
    try {
      await CreditDefaultManagementService.createRecoveryAction(
        selectedDefault.id,
        recoveryAction,
        actionNotes,
        (await supabase.auth.getUser()).data.user?.id
      );
      
      toast({
        title: "Recovery Action Created",
        description: "Recovery action has been created successfully",
      });
      
      // Refresh data
      fetchData();
      
      // Reset form
      setRecoveryAction('schedule_visit');
      setActionNotes("");
    } catch (error) {
      console.error("Error creating recovery action:", error);
      toast({
        title: "Error",
        description: "Failed to create recovery action",
        variant: "destructive",
      });
    }
  };

  const handleAddContact = async () => {
    if (!selectedDefault) return;
    
    try {
      await CreditDefaultManagementService.addContactHistory(
        selectedDefault.id,
        contactMethod,
        contactNotes,
        (await supabase.auth.getUser()).data.user?.id
      );
      
      toast({
        title: "Contact Record Added",
        description: "Contact history has been updated",
      });
      
      // Reset form
      setContactNotes("");
    } catch (error) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: "Failed to add contact record",
        variant: "destructive",
      });
    }
  };

  const handleResolveDefault = async () => {
    if (!selectedDefault) return;
    
    try {
      await CreditDefaultManagementService.resolveDefault(
        selectedDefault.id,
        "Manually resolved by admin"
      );
      
      toast({
        title: "Default Resolved",
        description: "Default has been marked as resolved",
      });
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error resolving default:", error);
      toast({
        title: "Error",
        description: "Failed to resolve default",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-yellow-100 text-yellow-800';
      case 'past_due': return 'bg-orange-100 text-orange-800';
      case 'severely_overdue': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'past_due': return <AlertTriangle className="w-4 h-4" />;
      case 'severely_overdue': return <XCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading default records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by farmer name or phone..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="severely_overdue">Severely Overdue</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Defaults List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Credit Defaults Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDefaults.length > 0 ? (
              filteredDefaults.map(defaultRecord => (
                <div key={defaultRecord.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{defaultRecord.farmer_name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {defaultRecord.farmer_phone}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-sm text-gray-500">Overdue Amount</p>
                          <p className="font-medium">{formatCurrency(defaultRecord.overdue_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Days Overdue</p>
                          <p className="font-medium">{defaultRecord.days_overdue} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Default Date</p>
                          <p className="font-medium">
                            {new Date(defaultRecord.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(defaultRecord.status)}`}>
                        {getStatusIcon(defaultRecord.status)}
                        {defaultRecord.status.replace('_', ' ').toUpperCase()}
                      </span>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedDefault(defaultRecord)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Actions
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Recovery Actions for {defaultRecord.farmer_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Recovery Action Form */}
                              <div className="space-y-4">
                                <h3 className="font-semibold">Create Recovery Action</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Action Type
                                    </label>
                                    <Select 
                                      value={recoveryAction} 
                                      onValueChange={(value: any) => setRecoveryAction(value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="withhold_credit">Withhold Credit</SelectItem>
                                        <SelectItem value="suspend_credit">Suspend Credit</SelectItem>
                                        <SelectItem value="schedule_visit">Schedule Visit</SelectItem>
                                        <SelectItem value="escalate">Escalate</SelectItem>
                                        <SelectItem value="close_account">Close Account</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Contact Method
                                    </label>
                                    <Select 
                                      value={contactMethod} 
                                      onValueChange={(value: any) => setContactMethod(value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sms">SMS</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="visit">In-person Visit</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <Input
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder="Enter action notes..."
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button onClick={handleCreateRecoveryAction}>
                                    Create Action
                                  </Button>
                                  <Button variant="outline" onClick={handleAddContact}>
                                    Add Contact Record
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Resolve Default */}
                              <div className="pt-4 border-t border-gray-200">
                                <h3 className="font-semibold mb-2">Resolve Default</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  Mark this default as resolved if the issue has been addressed.
                                </p>
                                <Button 
                                  variant="outline" 
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={handleResolveDefault}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Resolved
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No default records found in the system</p>
                <p className="text-sm mt-1">Defaults will appear here when farmers have overdue payments</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditDefaultManagement;