import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Eye, 
  Package, 
  Plus, 
  Edit, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  supplier: string | null;
  cost_per_unit: number | null;
  created_at: string;
  updated_at: string;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: 'in' | 'out';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason: string | null;
  performed_by: string;
  created_at: string;
  inventory_items: {
    name: string;
  } | null;
  staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  
  // Form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemStock, setItemStock] = useState(0);
  const [itemReorderLevel, setItemReorderLevel] = useState(0);
  const [itemSupplier, setItemSupplier] = useState('');
  const [itemCost, setItemCost] = useState(0);
  
  // Transaction form state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionQuantity, setTransactionQuantity] = useState(1);
  const [transactionReason, setTransactionReason] = useState('');
  const [transactionCost, setTransactionCost] = useState(0);
  
  // Categories
  const categories = ['Feed', 'Medicine', 'Equipment', 'Cleaning Supplies', 'Packaging', 'Other'];

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [items, searchTerm, categoryFilter, stockStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get staff info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (staffError) throw staffError;
      if (!staffData) throw new Error('Staff record not found');
      
      setStaffId(staffData.id);

      // Fetch inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (name),
          staff (profiles (full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError('Error', error.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Apply stock status filter
    if (stockStatus) {
      filtered = filtered.filter(item => {
        if (stockStatus === 'low') {
          return item.current_stock <= item.reorder_level;
        } else if (stockStatus === 'adequate') {
          return item.current_stock > item.reorder_level;
        }
        return true;
      });
    }
    
    setFilteredItems(filtered);
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Reorder Level', 'Supplier', 'Cost per Unit'];
      const rows = filteredItems.map(item => [
        item.name,
        item.category,
        item.current_stock,
        item.unit,
        item.reorder_level,
        item.supplier || '',
        item.cost_per_unit || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      show('Success', 'Inventory report exported successfully');
    } catch (error: any) {
      console.error('Error exporting report:', error);
      showError('Error', 'Failed to export inventory report');
    }
  };

  const handleAddItem = () => {
    resetItemForm();
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || '');
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemStock(item.current_stock);
    setItemReorderLevel(item.reorder_level);
    setItemSupplier(item.supplier || '');
    setItemCost(item.cost_per_unit || 0);
    setShowItemForm(true);
  };

  const saveItem = async () => {
    if (!itemName || !itemCategory || !itemUnit) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('inventory_items')
          .update({
            name: itemName,
            description: itemDescription,
            category: itemCategory,
            unit: itemUnit,
            current_stock: itemStock,
            reorder_level: itemReorderLevel,
            supplier: itemSupplier,
            cost_per_unit: itemCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        show('Success', 'Inventory item updated successfully');
      } else {
        // Create new item
        const { error } = await supabase
          .from('inventory_items')
          .insert({
            name: itemName,
            description: itemDescription,
            category: itemCategory,
            unit: itemUnit,
            current_stock: itemStock,
            reorder_level: itemReorderLevel,
            supplier: itemSupplier,
            cost_per_unit: itemCost
          });

        if (error) throw error;
        show('Success', 'Inventory item added successfully');
      }
      
      setShowItemForm(false);
      resetItemForm();
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error saving item:', error);
      showError('Error', error.message || 'Failed to save inventory item');
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemCategory('');
    setItemUnit('');
    setItemStock(0);
    setItemReorderLevel(0);
    setItemSupplier('');
    setItemCost(0);
    setEditingItem(null);
  };

  const handleAddTransaction = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransactionQuantity(1);
    setTransactionType('in');
    setTransactionReason('');
    setTransactionCost(item.cost_per_unit || 0);
    setShowTransactionForm(true);
  };

  const saveTransaction = async () => {
    if (!selectedItem || !staffId || transactionQuantity <= 0) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Create transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id: selectedItem.id,
          transaction_type: transactionType,
          quantity: transactionQuantity,
          unit_cost: transactionCost,
          total_cost: transactionCost * transactionQuantity,
          reason: transactionReason,
          performed_by: staffId
        });

      if (transactionError) throw transactionError;

      // Update item stock
      const newStock = transactionType === 'in' 
        ? selectedItem.current_stock + transactionQuantity
        : selectedItem.current_stock - transactionQuantity;
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;
      
      show('Success', 'Inventory transaction recorded successfully');
      setShowTransactionForm(false);
      resetTransactionForm();
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error recording transaction:', error);
      showError('Error', error.message || 'Failed to record inventory transaction');
    }
  };

  const resetTransactionForm = () => {
    setSelectedItem(null);
    setTransactionQuantity(1);
    setTransactionType('in');
    setTransactionReason('');
    setTransactionCost(0);
  };

  // Prepare data for charts
  const categoryDistribution = categories.map(category => ({
    name: category,
    value: filteredItems.filter(item => item.category === category).length
  })).filter(item => item.value > 0);

  const stockLevelData = filteredItems.slice(0, 10).map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    stock: item.current_stock,
    reorder: item.reorder_level
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">
            Track and manage dairy operation supplies and equipment
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="flex items-center gap-2"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
            <Package className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {items.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {items.filter(item => item.current_stock <= item.reorder_level).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Categories</CardTitle>
            <FileText className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {new Set(items.map(item => item.category)).size}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
            <TrendingUp className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {transactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Levels */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockLevelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="#3b82f6" 
                  name="Current Stock" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="reorder" 
                  stroke="#ef4444" 
                  name="Reorder Level" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Status Filter */}
            <Select value={stockStatus} onValueChange={setStockStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="adequate">Adequate Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Item Name</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Current Stock</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Reorder Level</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Supplier</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b hover:bg-muted/50 ${
                      item.current_stock <= item.reorder_level ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </td>
                    <td className="p-3 text-sm">
                      <Badge variant="secondary">{item.category}</Badge>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.current_stock} {item.unit}</span>
                        {item.current_stock <= item.reorder_level && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm">{item.reorder_level} {item.unit}</td>
                    <td className="p-3 text-sm">{item.supplier || 'N/A'}</td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddTransaction(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No inventory items found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Item</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Quantity</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Cost</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Performed By</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{transaction.inventory_items?.name || 'Unknown Item'}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={transaction.transaction_type === 'in' ? 'default' : 'destructive'}>
                        {transaction.transaction_type === 'in' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {transaction.transaction_type === 'in' ? 'In' : 'Out'}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{transaction.quantity}</td>
                    <td className="p-3 text-sm">
                      {transaction.total_cost ? `KSh ${transaction.total_cost.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="p-3 text-sm">
                      {transaction.staff?.profiles?.full_name || 'Unknown Staff'}
                    </td>
                    <td className="p-3 text-sm">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No transactions recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                    <Input
                      placeholder="Enter item name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <Select value={itemCategory} onValueChange={setItemCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                    <Input
                      placeholder="e.g., kg, liters, pieces"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <Input
                      placeholder="Enter supplier name"
                      value={itemSupplier}
                      onChange={(e) => setItemSupplier(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                    <Input
                      type="number"
                      placeholder="Enter current stock"
                      value={itemStock}
                      onChange={(e) => setItemStock(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                    <Input
                      type="number"
                      placeholder="Enter reorder level"
                      value={itemReorderLevel}
                      onChange={(e) => setItemReorderLevel(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (KSh)</label>
                    <Input
                      type="number"
                      placeholder="Enter cost per unit"
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    placeholder="Enter item description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowItemForm(false);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveItem}
                    disabled={!itemName || !itemCategory || !itemUnit}
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Record Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Item Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Item</p>
                    <p className="font-medium">{selectedItem.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{selectedItem.current_stock} {selectedItem.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="secondary">{selectedItem.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reorder Level</p>
                    <p className="font-medium">{selectedItem.reorder_level} {selectedItem.unit}</p>
                  </div>
                </div>

                {/* Transaction Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
                      <Select value={transactionType} onValueChange={setTransactionType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              Stock In
                            </div>
                          </SelectItem>
                          <SelectItem value="out">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-500" />
                              Stock Out
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        value={transactionQuantity}
                        onChange={(e) => setTransactionQuantity(Number(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (KSh)</label>
                    <Input
                      type="number"
                      placeholder="Enter unit cost"
                      value={transactionCost}
                      onChange={(e) => setTransactionCost(Number(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <Textarea
                      placeholder="Enter reason for transaction..."
                      value={transactionReason}
                      onChange={(e) => setTransactionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowTransactionForm(false);
                      resetTransactionForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveTransaction}
                    disabled={transactionQuantity <= 0}
                  >
                    Record Transaction
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}