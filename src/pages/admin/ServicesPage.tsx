import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  PlusIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
  DollarSignIcon,
  UsersIcon,
  EyeIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  UserIcon,
  RepeatIcon,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import useToastNotifications from '@/hooks/useToastNotifications';
import { deductionService } from '@/services/deduction-service';

interface DeductionType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface FarmerDeduction {
  id: string;
  farmer_id: string;
  deduction_type_id: string;
  amount: number;
  is_active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_apply_date: string;
  created_at: string;
  farmer_name?: string;
  deduction_type_name?: string;
}

interface DeductionRecord {
  id: string;
  deduction_type_id: string;
  farmer_id: string | null;
  amount: number;
  reason: string;
  applied_by: string;
  applied_at: string;
  farmer_name?: string;
  deduction_type_name?: string;
  applied_by_name?: string;
}

const ServicesPage = () => {
  const { success, error: showError } = useToastNotifications();
  const [activeTab, setActiveTab] = useState('types');
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [farmerDeductions, setFarmerDeductions] = useState<FarmerDeduction[]>([]);
  const [deductionRecords, setDeductionRecords] = useState<DeductionRecord[]>([]);
  const [farmers, setFarmers] = useState<{id: string, full_name: string}[]>([]);
  
  // Form states
  const [newDeductionType, setNewDeductionType] = useState({ name: '', description: '' });
  const [editingDeductionType, setEditingDeductionType] = useState<DeductionType | null>(null);
  const [newFarmerDeduction, setNewFarmerDeduction] = useState({ 
    farmer_id: '', 
    deduction_type_id: '', 
    amount: 0,
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_apply_date: new Date().toISOString().split('T')[0]
  });
  const [editingFarmerDeduction, setEditingFarmerDeduction] = useState<FarmerDeduction | null>(null);
  const [immediateDeduction, setImmediateDeduction] = useState({ 
    deduction_type_id: '', 
    amount: 0,
    reason: ''
  });
  const [recurringAllFarmers, setRecurringAllFarmers] = useState({
    deduction_type_id: '',
    amount: 0,
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0]
  });
  
  // Dialog states
  const [showDeductionTypeDialog, setShowDeductionTypeDialog] = useState(false);
  const [showFarmerDeductionDialog, setShowFarmerDeductionDialog] = useState(false);
  const [showImmediateDeductionDialog, setShowImmediateDeductionDialog] = useState(false);
  const [showRecurringAllFarmersDialog, setShowRecurringAllFarmersDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'deductionType' | 'farmerDeduction', id: string} | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDeductionTypes, setFilteredDeductionTypes] = useState<DeductionType[]>([]);
  const [filteredFarmerDeductions, setFilteredFarmerDeductions] = useState<FarmerDeduction[]>([]);
  const [filteredDeductionRecords, setFilteredDeductionRecords] = useState<DeductionRecord[]>([]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDeductionTypes(),
          fetchFarmerDeductions(),
          fetchDeductionRecords(),
          fetchFarmers()
        ]);
      } catch (err) {
        console.error('Error fetching data:', err);
        showError('Error', 'Failed to load deduction data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data when search term changes
  useEffect(() => {
    filterData();
  }, [searchTerm, deductionTypes, farmerDeductions, deductionRecords]);

  const filterData = () => {
    if (!searchTerm) {
      setFilteredDeductionTypes(deductionTypes);
      setFilteredFarmerDeductions(farmerDeductions);
      setFilteredDeductionRecords(deductionRecords);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    const filteredTypes = deductionTypes.filter(type => 
      type.name.toLowerCase().includes(term) || 
      (type.description && type.description.toLowerCase().includes(term))
    );
    
    const filteredFarmerDeds = farmerDeductions.filter(ded => 
      (ded.farmer_name && ded.farmer_name.toLowerCase().includes(term)) ||
      (ded.deduction_type_name && ded.deduction_type_name.toLowerCase().includes(term)) ||
      ded.amount.toString().includes(term) ||
      ded.frequency.toLowerCase().includes(term)
    );
    
    const filteredRecords = deductionRecords.filter(record => 
      (record.deduction_type_name && record.deduction_type_name.toLowerCase().includes(term)) ||
      (record.farmer_name && record.farmer_name.toLowerCase().includes(term)) ||
      (record.reason && record.reason.toLowerCase().includes(term)) ||
      record.amount.toString().includes(term) ||
      (record.applied_by_name && record.applied_by_name.toLowerCase().includes(term))
    );

    setFilteredDeductionTypes(filteredTypes);
    setFilteredFarmerDeductions(filteredFarmerDeds);
    setFilteredDeductionRecords(filteredRecords);
  };

  const fetchDeductionTypes = async () => {
    try {
      const data = await deductionService.getDeductionTypes();
      setDeductionTypes(data);
    } catch (err) {
      throw err;
    }
  };

  const fetchFarmerDeductions = async () => {
    try {
      const data = await deductionService.getFarmerDeductions();
      setFarmerDeductions(data);
    } catch (err) {
      throw err;
    }
  };

  const fetchDeductionRecords = async () => {
    try {
      const data = await deductionService.getDeductionRecords();
      setDeductionRecords(data);
    } catch (err) {
      throw err;
    }
  };

  const fetchFarmers = async () => {
    const { data, error } = await supabase
      .from('farmers')
      .select('id, full_name')
      .order('full_name');
    
    if (error) throw error;
    setFarmers(data || []);
  };

  // Handle deduction type creation/editing
  const handleSaveDeductionType = async () => {
    if (!newDeductionType.name.trim()) {
      showError('Validation Error', 'Deduction type name is required');
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      let result;
      if (editingDeductionType) {
        // Update existing
        result = await deductionService.updateDeductionType(
          editingDeductionType.id,
          newDeductionType.name,
          newDeductionType.description,
          user?.id
        );
      } else {
        // Create new
        result = await deductionService.createDeductionType(
          newDeductionType.name,
          newDeductionType.description,
          user?.id
        );
      }

      if (!result) throw new Error('Operation failed');
      
      success('Success', editingDeductionType ? 'Deduction type updated' : 'Deduction type created');
      setShowDeductionTypeDialog(false);
      resetDeductionTypeForm();
      await fetchDeductionTypes();
    } catch (err: any) {
      console.error('Error saving deduction type:', err);
      showError('Error', err.message || `Failed to ${editingDeductionType ? 'update' : 'create'} deduction type`);
    } finally {
      setSaving(false);
    }
  };

  // Handle farmer deduction creation/editing
  const handleSaveFarmerDeduction = async () => {
    if (!newFarmerDeduction.farmer_id || !newFarmerDeduction.deduction_type_id) {
      showError('Validation Error', 'Farmer and deduction type are required');
      return;
    }

    if (newFarmerDeduction.amount <= 0) {
      showError('Validation Error', 'Amount must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const result = await deductionService.saveFarmerDeduction(
        newFarmerDeduction.farmer_id,
        newFarmerDeduction.deduction_type_id,
        newFarmerDeduction.amount,
        newFarmerDeduction.frequency,
        newFarmerDeduction.next_apply_date,
        user?.id
      );

      if (!result) throw new Error('Operation failed');
      
      success('Success', editingFarmerDeduction ? 'Farmer deduction updated' : 'Farmer deduction saved');
      setShowFarmerDeductionDialog(false);
      resetFarmerDeductionForm();
      await fetchFarmerDeductions();
    } catch (err: any) {
      console.error('Error saving farmer deduction:', err);
      showError('Error', err.message || (editingFarmerDeduction ? 'Failed to update farmer deduction' : 'Failed to save farmer deduction'));
    } finally {
      setSaving(false);
    }
  };

  // Handle recurring deduction for all farmers
  const handleCreateRecurringAllFarmers = async () => {
    if (!recurringAllFarmers.deduction_type_id) {
      showError('Validation Error', 'Deduction type is required');
      return;
    }

    if (recurringAllFarmers.amount <= 0) {
      showError('Validation Error', 'Amount must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create recurring deduction for all farmers
      const result = await deductionService.createRecurringDeductionForAllFarmers(
        recurringAllFarmers.deduction_type_id,
        recurringAllFarmers.amount,
        recurringAllFarmers.frequency,
        recurringAllFarmers.start_date,
        user?.id || ''
      );

      if (!result.success) throw new Error('Operation failed');
      
      success('Success', `Recurring service created for ${result.createdCount} farmers`);
      setShowRecurringAllFarmersDialog(false);
      resetRecurringAllFarmersForm();
      await fetchFarmerDeductions();
      
      if (result.errors.length > 0) {
        showError('Partial Errors', `Some farmers could not be processed: ${result.errors.join(', ')}`);
      }
    } catch (err: any) {
      console.error('Error creating recurring deduction for all farmers:', err);
      showError('Error', err.message || 'Failed to create recurring service for all farmers');
    } finally {
      setSaving(false);
    }
  };

  // Handle immediate deduction for all farmers
  const handleApplyImmediateDeduction = async () => {
    if (!immediateDeduction.deduction_type_id) {
      showError('Validation Error', 'Deduction type is required');
      return;
    }

    if (immediateDeduction.amount <= 0) {
      showError('Validation Error', 'Amount must be greater than zero');
      return;
    }

    if (!immediateDeduction.reason.trim()) {
      showError('Validation Error', 'Reason is required');
      return;
    }

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert deduction record for all farmers
      const result = await deductionService.applyImmediateDeduction(
        immediateDeduction.deduction_type_id,
        immediateDeduction.amount,
        immediateDeduction.reason,
        user?.id || ''
      );

      if (!result) throw new Error('Operation failed');
      
      success('Success', 'Immediate deduction applied to all farmers');
      setShowImmediateDeductionDialog(false);
      resetImmediateDeductionForm();
      await fetchDeductionRecords();
    } catch (err: any) {
      console.error('Error applying immediate deduction:', err);
      showError('Error', err.message || 'Failed to apply immediate deduction');
    } finally {
      setSaving(false);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    if (!itemToDelete) return;

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      let result = false;
      if (itemToDelete.type === 'deductionType') {
        result = await deductionService.deleteDeductionType(itemToDelete.id, user?.id);
      } else if (itemToDelete.type === 'farmerDeduction') {
        result = await deductionService.deleteFarmerDeduction(itemToDelete.id, user?.id);
      }

      if (!result) throw new Error('Operation failed');
      
      success('Success', 'Item deleted successfully');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      
      // Refresh data
      if (itemToDelete.type === 'deductionType') {
        await fetchDeductionTypes();
        await fetchFarmerDeductions();
        await fetchDeductionRecords();
      } else if (itemToDelete.type === 'farmerDeduction') {
        await fetchFarmerDeductions();
      }
    } catch (err: any) {
      console.error('Error deleting item:', err);
      showError('Error', err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  // Reset forms
  const resetDeductionTypeForm = () => {
    setNewDeductionType({ name: '', description: '' });
    setEditingDeductionType(null);
  };

  const resetFarmerDeductionForm = () => {
    setNewFarmerDeduction({ 
      farmer_id: '', 
      deduction_type_id: '', 
      amount: 0,
      frequency: 'monthly',
      next_apply_date: new Date().toISOString().split('T')[0]
    });
    setEditingFarmerDeduction(null);
  };

  const resetImmediateDeductionForm = () => {
    setImmediateDeduction({ deduction_type_id: '', amount: 0, reason: '' });
  };

  const resetRecurringAllFarmersForm = () => {
    setRecurringAllFarmers({
      deduction_type_id: '',
      amount: 0,
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0]
    });
  };

  // Open edit dialog
  const openEditDeductionType = (deductionType: DeductionType) => {
    setEditingDeductionType(deductionType);
    setNewDeductionType({
      name: deductionType.name,
      description: deductionType.description || ''
    });
    setShowDeductionTypeDialog(true);
  };

  const openEditFarmerDeduction = (farmerDeduction: FarmerDeduction) => {
    setEditingFarmerDeduction(farmerDeduction);
    setNewFarmerDeduction({
      farmer_id: farmerDeduction.farmer_id,
      deduction_type_id: farmerDeduction.deduction_type_id,
      amount: farmerDeduction.amount,
      frequency: farmerDeduction.frequency,
      next_apply_date: farmerDeduction.next_apply_date
    });
    setShowFarmerDeductionDialog(true);
  };

  // Open delete confirmation
  const openDeleteConfirmation = (type: 'deductionType' | 'farmerDeduction', id: string) => {
    setItemToDelete({ type, id });
    setDeleteConfirmOpen(true);
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return frequency;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Services Management</h1>
        <p className="text-muted-foreground">
          Manage system-wide and farmer-specific services and deductions
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSearchTerm('')}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={showDeductionTypeDialog} onOpenChange={(open) => {
          setShowDeductionTypeDialog(open);
          if (!open) resetDeductionTypeForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetDeductionTypeForm();
              setShowDeductionTypeDialog(true);
            }}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Service Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingDeductionType ? 'Edit Service Type' : 'Add Service Type'}
              </DialogTitle>
              <DialogDescription>
                {editingDeductionType 
                  ? 'Modify an existing service type' 
                  : 'Create a new service type for recurring services'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="deductionTypeName">Name *</Label>
                <Input
                  id="deductionTypeName"
                  value={newDeductionType.name}
                  onChange={(e) => setNewDeductionType({...newDeductionType, name: e.target.value})}
                  placeholder="e.g., System Maintenance Service"
                />
              </div>
              <div>
                <Label htmlFor="deductionTypeDescription">Description</Label>
                <Textarea
                  id="deductionTypeDescription"
                  value={newDeductionType.description}
                  onChange={(e) => setNewDeductionType({...newDeductionType, description: e.target.value})}
                  placeholder="Describe this deduction type..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeductionTypeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDeductionType} disabled={saving}>
                {saving ? 'Saving...' : (editingDeductionType ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showFarmerDeductionDialog} onOpenChange={(open) => {
          setShowFarmerDeductionDialog(open);
          if (!open) resetFarmerDeductionForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="secondary" onClick={() => {
              resetFarmerDeductionForm();
              setShowFarmerDeductionDialog(true);
            }}>
              <DollarSignIcon className="mr-2 h-4 w-4" />
              Add Farmer Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingFarmerDeduction ? 'Edit Farmer Service' : 'Add Farmer Service'}
              </DialogTitle>
              <DialogDescription>
                {editingFarmerDeduction 
                  ? 'Modify an existing farmer service' 
                  : 'Set up a recurring service for a specific farmer'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="farmerSelect">Farmer *</Label>
                <Select
                  value={newFarmerDeduction.farmer_id}
                  onValueChange={(value) => setNewFarmerDeduction({...newFarmerDeduction, farmer_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmers.map((farmer) => (
                      <SelectItem key={farmer.id} value={farmer.id}>
                        <div className="flex items-center">
                          <UserIcon className="mr-2 h-4 w-4" />
                          {farmer.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deductionTypeSelect">Deduction Type *</Label>
                <Select
                  value={newFarmerDeduction.deduction_type_id}
                  onValueChange={(value) => setNewFarmerDeduction({...newFarmerDeduction, deduction_type_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deduction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deductionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deductionAmount">Amount (KES) *</Label>
                <Input
                  id="deductionAmount"
                  type="number"
                  value={newFarmerDeduction.amount || ''}
                  onChange={(e) => setNewFarmerDeduction({...newFarmerDeduction, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="deductionFrequency">Frequency *</Label>
                <Select
                  value={newFarmerDeduction.frequency}
                  onValueChange={(value) => setNewFarmerDeduction({...newFarmerDeduction, frequency: value as 'daily' | 'weekly' | 'monthly' | 'yearly'})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nextApplyDate">Next Apply Date *</Label>
                <Input
                  id="nextApplyDate"
                  type="date"
                  value={newFarmerDeduction.next_apply_date}
                  onChange={(e) => setNewFarmerDeduction({...newFarmerDeduction, next_apply_date: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFarmerDeductionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFarmerDeduction} disabled={saving}>
                {saving ? 'Saving...' : (editingFarmerDeduction ? 'Update' : 'Save Deduction')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRecurringAllFarmersDialog} onOpenChange={(open) => {
          setShowRecurringAllFarmersDialog(open);
          if (!open) resetRecurringAllFarmersForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="default" onClick={() => {
              resetRecurringAllFarmersForm();
              setShowRecurringAllFarmersDialog(true);
            }}>
              <RepeatIcon className="mr-2 h-4 w-4" />
              Recurring Service (All Farmers)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Recurring Service</DialogTitle>
              <DialogDescription>
                Set up a recurring service for all farmers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recurringAllFarmersType">Service Type *</Label>
                <Select
                  value={recurringAllFarmers.deduction_type_id}
                  onValueChange={(value) => setRecurringAllFarmers({...recurringAllFarmers, deduction_type_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deductionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recurringAllFarmersAmount">Amount (KES) *</Label>
                <Input
                  id="recurringAllFarmersAmount"
                  type="number"
                  value={recurringAllFarmers.amount || ''}
                  onChange={(e) => setRecurringAllFarmers({...recurringAllFarmers, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="recurringAllFarmersFrequency">Frequency *</Label>
                <Select
                  value={recurringAllFarmers.frequency}
                  onValueChange={(value) => setRecurringAllFarmers({...recurringAllFarmers, frequency: value as 'daily' | 'weekly' | 'monthly' | 'yearly'})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recurringAllFarmersStartDate">Start Date *</Label>
                <Input
                  id="recurringAllFarmersStartDate"
                  type="date"
                  value={recurringAllFarmers.start_date}
                  onChange={(e) => setRecurringAllFarmers({...recurringAllFarmers, start_date: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecurringAllFarmersDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRecurringAllFarmers} disabled={saving}>
                {saving ? 'Creating...' : 'Create Recurring Service'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showImmediateDeductionDialog} onOpenChange={(open) => {
          setShowImmediateDeductionDialog(open);
          if (!open) resetImmediateDeductionForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="destructive" onClick={() => {
              resetImmediateDeductionForm();
              setShowImmediateDeductionDialog(true);
            }}>
              <UsersIcon className="mr-2 h-4 w-4" />
              Immediate Service (All Farmers)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Apply Immediate Service</DialogTitle>
              <DialogDescription>
                Apply a one-time service to all farmers immediately
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="immediateDeductionType">Deduction Type *</Label>
                <Select
                  value={immediateDeduction.deduction_type_id}
                  onValueChange={(value) => setImmediateDeduction({...immediateDeduction, deduction_type_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deduction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deductionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="immediateDeductionAmount">Amount (KES) *</Label>
                <Input
                  id="immediateDeductionAmount"
                  type="number"
                  value={immediateDeduction.amount || ''}
                  onChange={(e) => setImmediateDeduction({...immediateDeduction, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="immediateDeductionReason">Reason *</Label>
                <Textarea
                  id="immediateDeductionReason"
                  value={immediateDeduction.reason}
                  onChange={(e) => setImmediateDeduction({...immediateDeduction, reason: e.target.value})}
                  placeholder="Enter reason for this service..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImmediateDeductionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyImmediateDeduction} disabled={saving}>
                {saving ? 'Applying...' : 'Apply Service'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="types">Deduction Types</TabsTrigger>
          <TabsTrigger value="farmer">Farmer Deductions</TabsTrigger>
          <TabsTrigger value="records">Deduction Records</TabsTrigger>
        </TabsList>
        
        {/* Deduction Types Tab */}
        <TabsContent value="types" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>
                Configure different types of services that can be applied
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDeductionTypes.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeductionTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{type.description || '-'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              type.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {type.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDeductionType(type)}>
                                  <EditIcon className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => openDeleteConfirmation('deductionType', type.id)}
                                >
                                  <TrashIcon className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSignIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No service types found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'No service types match your search.' 
                      : 'Get started by adding a new service type.'}
                  </p>
                  <Button onClick={() => {
                    resetDeductionTypeForm();
                    setShowDeductionTypeDialog(true);
                  }}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Deduction Type
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Farmer Deductions Tab */}
        <TabsContent value="farmer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Farmer Services</CardTitle>
              <CardDescription>
                Specific services configured for individual farmers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFarmerDeductions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Apply</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmerDeductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {deduction.farmer_name}
                            </div>
                          </TableCell>
                          <TableCell>{deduction.deduction_type_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(deduction.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <RepeatIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                              {formatFrequency(deduction.frequency)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                              {new Date(deduction.next_apply_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              deduction.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {deduction.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                              {new Date(deduction.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditFarmerDeduction(deduction)}>
                                  <EditIcon className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => openDeleteConfirmation('farmerDeduction', deduction.id)}
                                >
                                  <TrashIcon className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No farmer services found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'No farmer services match your search.' 
                      : 'Get started by adding a new farmer service.'}
                  </p>
                  <Button onClick={() => {
                    resetFarmerDeductionForm();
                    setShowFarmerDeductionDialog(true);
                  }}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Farmer Deduction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Deduction Records Tab */}
        <TabsContent value="records" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Records</CardTitle>
              <CardDescription>
                History of all services applied to farmers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDeductionRecords.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Applied By</TableHead>
                        <TableHead>Date Applied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeductionRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.deduction_type_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {record.farmer_id ? (
                                <>
                                  <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {record.farmer_name}
                                </>
                              ) : (
                                <>
                                  <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  All Farmers
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{record.reason || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(record.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {record.applied_by_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                              {new Date(record.applied_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <EyeIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No service records found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'No service records match your search.' 
                      : 'Service records will appear here when services are applied.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'deductionType' ? (
                <>
                  This action cannot be undone. This will permanently delete the service type
                  and all associated data.
                  {itemToDelete && (
                    <span className="block mt-2 font-medium">
                      Note: You can only delete service types that are not in use by farmers.
                    </span>
                  )}
                </>
              ) : (
                <>
                  This action cannot be undone. This will permanently delete the farmer service.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesPage;