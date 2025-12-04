import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Clock,
  CreditCard,
  ChevronRight,
  BarChart3,
  Search,
  Plus,
  Minus,
  Check,
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Home,
  PieChart,
  Settings,
  Tag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';
import { formatCurrency } from '@/utils/formatters';

// Types
const ProductCategories = {
  FEED: 'Feed',
  SUPPLEMENTS: 'Supplements',
  VETERINARY: 'Veterinary',
  HEALTH: 'Health'
};

const TransactionTypes = {
  CREDIT_USED: 'credit_used',
  CREDIT_GRANTED: 'credit_granted',
  CREDIT_REPAID: 'credit_repaid'
};

const OrderStatus = {
  COMPLETED: 'completed',
  PENDING_COLLECTION: 'pending_collection'
};

// Custom Hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Database Service Functions
const databaseService = {
  // Farmer Data
  async getFarmerCreditProfile(farmerId) {
    const { data, error } = await supabase
      .from('farmer_credit_profiles')
      .select(`
        *,
        farmers (
          full_name,
          phone_number,
          registration_number
        )
      `)
      .eq('farmer_id', farmerId)
      .single();

    if (error) throw error;
    return data;
  },

  // Inventory with packaging options
  async getAgrovetInventoryWithPackaging() {
    try {
      // First get all credit-eligible products
      const products = await AgrovetInventoryService.getCreditEligibleProducts();
      
      // Then fetch packaging options for each product
      const productsWithPackaging = await Promise.all(
        products.map(async (product) => {
          try {
            const packagingOptions = await AgrovetInventoryService.getProductPackaging(product.id);
            return {
              ...product,
              packaging_options: packagingOptions?.filter(p => p.is_credit_eligible) || []
            };
          } catch (error) {
            // If there's an error fetching packaging, return empty array
            console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
            return {
              ...product,
              packaging_options: []
            };
          }
        })
      );

      return productsWithPackaging;
    } catch (error) {
      console.error('Error fetching products with packaging:', error);
      throw error;
    }
  },

  // Credit Transactions
  async getCreditTransactions(farmerId, limit = 50) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Purchases
  async getFarmerPurchases(farmerId, limit = 50) {
    const { data, error } = await supabase
      .from('agrovet_purchases')
      .select(`
        *,
        agrovet_inventory (
          name,
          category,
          unit
        )
      `)
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Create Purchase with Packaging
  async createPurchaseWithPackaging(farmerId, productId, packagingId, quantity) {
    try {
      // Get the packaging option details
      const packagingOptions = await AgrovetInventoryService.getProductPackaging(productId);
      const selectedPackaging = packagingOptions.find(p => p.id === packagingId);
      
      if (!selectedPackaging) {
        throw new Error('Selected packaging option not found');
      }

      // Calculate total amount
      const totalAmount = selectedPackaging.price * quantity;

      // Get farmer's current credit balance
      const creditProfile = await this.getFarmerCreditProfile(farmerId);
      if (!creditProfile) {
        throw new Error('Farmer credit profile not found');
      }

      if (totalAmount > creditProfile.current_credit_balance) {
        throw new Error('Insufficient credit balance');
      }

      // Create the purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('agrovet_purchases')
        .insert({
          farmer_id: farmerId,
          item_id: productId,
          quantity: quantity,
          unit_price: selectedPackaging.price,
          total_amount: totalAmount,
          payment_method: 'credit',
          status: 'completed',
          purchased_by: farmerId
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Update inventory stock
      const { error: inventoryError } = await supabase
        .from('agrovet_inventory')
        .update({ 
          current_stock: (await AgrovetInventoryService.getInventoryItem(productId))?.current_stock - (selectedPackaging.weight * quantity)
        })
        .eq('id', productId);

      if (inventoryError) {
        console.warn('Failed to update inventory stock:', inventoryError);
      }

      // Create credit transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: -totalAmount,
          balance_before: creditProfile.current_credit_balance,
          balance_after: creditProfile.current_credit_balance - totalAmount,
          description: `Purchase of ${quantity} x ${selectedPackaging.name}`,
          approved_by: farmerId
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update credit profile
      const { error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: creditProfile.current_credit_balance - totalAmount,
          total_credit_used: creditProfile.total_credit_used + totalAmount
        })
        .eq('farmer_id', farmerId);

      if (profileError) {
        console.warn('Failed to update credit profile:', profileError);
      }

      return {
        purchase: purchaseData,
        transaction: transactionData
      };
    } catch (error) {
      console.error('Error creating purchase with packaging:', error);
      throw error;
    }
  },

  // Update Credit Profile
  async updateCreditProfile(farmerId, updates) {
    const { data, error } = await supabase
      .from('farmer_credit_profiles')
      .update(updates)
      .eq('farmer_id', farmerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const CreditProgressBar = ({ used, limit, className = "" }) => {
  const percentage = (used / limit) * 100;
  const getColor = (percent) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${getColor(percentage)}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, subtitle, trend, className = "" }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{title}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-2">{subtitle}</div>}
  </div>
);

// Enhanced Product Card with Packaging Options
const ProductCard = ({ product, onAddToCart, disabled }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 group">
    <div className="p-5 text-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform duration-200">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-16 h-16 mx-auto object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/64x64?text=Product";
            }}
          />
        ) : (
          '📦'
        )}
      </div>
      <span className="inline-block px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 border border-gray-200">
        {product.category}
      </span>
    </div>
    <div className="p-5">
      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
      
      {product.packaging_options && product.packaging_options.length > 0 ? (
        <div className="space-y-3">
          {product.packaging_options.map((packaging) => (
            <div 
              key={packaging.id} 
              className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-gray-900">{packaging.name}</div>
                  <div className="text-xs text-gray-500">
                    {packaging.weight} {packaging.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{formatCurrency(packaging.price)}</div>
                  {packaging.is_credit_eligible ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                      Credit
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                      Cash Only
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onAddToCart(product, packaging)}
                disabled={disabled || !packaging.is_credit_eligible}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium mt-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <Package className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No packaging options available</p>
        </div>
      )}
    </div>
  </div>
);

// Enhanced Cart Item with Packaging
const CartItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center text-3xl">
        {item.product.image_url ? (
          <img 
            src={item.product.image_url} 
            alt={item.product.name} 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/48x48?text=Product";
            }}
          />
        ) : (
          '📦'
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-gray-900">{item.product.name}</h3>
            <p className="text-sm text-gray-500">{item.packaging.name}</p>
            <p className="text-xs text-gray-400">{item.packaging.weight} {item.packaging.unit}</p>
          </div>
          <button
            onClick={() => onRemove(item.product.id, item.packaging.id)}
            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded"
          >
            ×
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onUpdateQuantity(item.product.id, item.packaging.id, -1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-50"
              disabled={item.quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-semibold w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.product.id, item.packaging.id, 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{formatCurrency(item.packaging.price)} each</div>
            <div className="font-bold text-gray-900">{formatCurrency(item.packaging.price * item.quantity)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main Component
const EnhancedCreditSystem = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [farmer, setFarmer] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useLocalStorage('farmerCreditCart', []);
  const [purchases, setPurchases] = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Get farmer ID from Supabase auth
  const getFarmerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) throw farmerError;
      return farmerData?.id || null;
    } catch (err) {
      console.error('Error getting farmer ID:', err);
      return null;
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(inventory.map(p => p.category)));
    return ['All', ...uniqueCategories];
  }, [inventory]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const farmerId = await getFarmerId();
      if (!farmerId) {
        setError('Please log in to access your credit dashboard.');
        setLoading(false);
        return;
      }

      const [
        farmerData,
        inventoryData,
        transactionsData,
        purchasesData
      ] = await Promise.all([
        databaseService.getFarmerCreditProfile(farmerId),
        databaseService.getAgrovetInventoryWithPackaging(),
        databaseService.getCreditTransactions(farmerId),
        databaseService.getFarmerPurchases(farmerId)
      ]);

      setFarmer(farmerData);
      setInventory(inventoryData);
      setCreditHistory(transactionsData);
      setPurchases(purchasesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Memoized computations
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const cartTotals = useMemo(() => {
    return cart.reduce((totals, item) => {
      const itemTotal = item.packaging.price * item.quantity;
      return {
        items: totals.items + item.quantity,
        total: totals.total + itemTotal
      };
    }, { items: 0, total: 0 });
  }, [cart]);

  // Transform farmer data for UI
  const farmerUI = useMemo(() => {
    if (!farmer) return null;

    return {
      id: farmer.farmer_id,
      name: farmer.farmers?.full_name || 'Farmer',
      phone: farmer.farmers?.phone_number || '',
      creditLimit: farmer.max_credit_amount || 0,
      creditUsed: farmer.total_credit_used || 0,
      availableCredit: farmer.current_credit_balance || 0,
      pendingPayments: farmer.pending_deductions || 0,
      tier: farmer.credit_tier || 'New',
      joinDate: farmer.created_at
    };
  }, [farmer]);

  // Callback functions
  const addToCart = useCallback((product, packaging) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(
        item => item.product.id === product.id && item.packaging.id === packaging.id
      );
      
      if (existingItem) {
        return currentCart.map(item =>
          item.product.id === product.id && item.packaging.id === packaging.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...currentCart, { product, packaging, quantity: 1 }];
      }
    });
  }, [setCart]);

  const updateQuantity = useCallback((productId, packagingId, change) => {
    setCart(currentCart =>
      currentCart.map(item => {
        if (item.product.id === productId && item.packaging.id === packagingId) {
          const newQuantity = item.quantity + change;
          if (newQuantity <= 0) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean)
    );
  }, [setCart]);

  const removeFromCart = useCallback((productId, packagingId) => {
    setCart(currentCart => 
      currentCart.filter(item => 
        !(item.product.id === productId && item.packaging.id === packagingId)
      )
    );
  }, [setCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, [setCart]);

  const handleCheckout = async () => {
    if (!farmerUI) return;

    if (cartTotals.total > farmerUI.availableCredit) {
      alert('Insufficient credit balance! Please remove some items or contact support.');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    setLoading(true);

    try {
      const farmerId = await getFarmerId();
      if (!farmerId) {
        throw new Error('Not authenticated');
      }

      // Process each cart item
      for (const item of cart) {
        await databaseService.createPurchaseWithPackaging(
          farmerId,
          item.product.id,
          item.packaging.id,
          item.quantity
        );
      }

      // Refresh data
      await loadInitialData();

      setCart([]);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setCurrentView('dashboard');
      }, 3000);

    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dashboard View
  const DashboardView = () => {
    if (!farmerUI) return <LoadingSpinner />;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome back, {farmerUI.name}</h1>
              <p className="text-blue-100">Manage your credit and shop for supplies</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Credit Tier</div>
              <div className="text-xl font-bold">{farmerUI.tier}</div>
            </div>
          </div>
        </div>

        {/* Credit Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CreditCard}
            title="Available Credit"
            value={formatCurrency(farmerUI.availableCredit)}
            subtitle={`of ${formatCurrency(farmerUI.creditLimit)}`}
          />

          <StatCard
            icon={DollarSign}
            title="Credit Used"
            value={formatCurrency(farmerUI.creditUsed)}
            subtitle="Total credit utilized"
          />

          <StatCard
            icon={Clock}
            title="Pending Payments"
            value={formatCurrency(farmerUI.pendingPayments)}
            subtitle="From milk collections"
          />

          <StatCard
            icon={TrendingUp}
            title="Utilization Rate"
            value={`${((farmerUI.creditUsed / farmerUI.creditLimit) * 100).toFixed(1)}%`}
            subtitle="Current usage"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('shop')}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="p-3 bg-blue-100 rounded-lg w-fit mb-3">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Shop with Credit</h3>
                <p className="text-sm text-gray-500">Browse and purchase supplies</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => setCurrentView('analytics')}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="p-3 bg-purple-100 rounded-lg w-fit mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">View Analytics</h3>
                <p className="text-sm text-gray-500">Track your spending trends</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </button>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="p-3 bg-green-100 rounded-lg w-fit mb-3">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Next Settlement</h3>
            <p className="text-sm text-gray-500">
              {farmer?.next_settlement_date
                ? new Date(farmer.next_settlement_date).toLocaleDateString()
                : 'Not scheduled'
              }
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {creditHistory.slice(0, 5).map(transaction => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{transaction.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`font-semibold ${transaction.transaction_type === TransactionTypes.CREDIT_GRANTED ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {transaction.transaction_type === TransactionTypes.CREDIT_GRANTED ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Purchases</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {purchases.slice(0, 5).map(purchase => (
                  <div key={purchase.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {purchase.agrovet_inventory?.name || purchase.item_id}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Qty: {purchase.quantity} • {new Date(purchase.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">{formatCurrency(purchase.total_amount)}</div>
                      <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${purchase.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {purchase.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Shop View
  const ShopView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shop with Credit</h2>
            <p className="text-gray-500">Browse and add items to your cart</p>
          </div>
        </div>
        <button
          onClick={() => setCurrentView('checkout')}
          className="relative bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Cart ({cartTotals.items})
          {cartTotals.items > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {cartTotals.items}
            </span>
          )}
        </button>
      </div>

      {/* Credit Balance Alert */}
      {farmerUI && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-semibold text-gray-900">
                Available Credit: {formatCurrency(farmerUI.availableCredit)}
              </div>
              <div className="text-sm text-gray-600">Cart Total: {formatCurrency(cartTotals.total)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">After Purchase</div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(farmerUI.availableCredit - cartTotals.total)}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInventory.map(item => (
            <ProductCard
              key={item.id}
              product={item}
              onAddToCart={addToCart}
              disabled={false}
            />
          ))}
        </div>
      )}

      {filteredInventory.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );

  // Checkout View
  const CheckoutView = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {checkoutSuccess ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Successful!</h2>
          <p className="text-gray-600">Your items are pending collection at the agrovet.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
              <p className="text-gray-500">Review your order</p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some items to get started</p>
              <button
                onClick={() => setCurrentView('shop')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map(item => (
                  <CartItem
                    key={`${item.product.id}-${item.packaging.id}`}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 sticky top-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(cartTotals.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Items</span>
                      <span>{cartTotals.items}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotals.total)}</span>
                    </div>
                  </div>

                  {farmerUI && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-gray-900">Credit Payment</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Available: {formatCurrency(farmerUI.availableCredit)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Remaining: {formatCurrency(farmerUI.availableCredit - cartTotals.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {farmerUI && cartTotals.total > farmerUI.availableCredit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-700">
                        Insufficient credit balance. Please remove some items.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={loading || !farmerUI || cartTotals.total > farmerUI.availableCredit}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      'Complete Purchase'
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Items will be ready for collection at the agrovet
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Analytics View
  const AnalyticsView = () => {
    if (!farmerUI) return <LoadingSpinner />;

    const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const avgTransaction = purchases.length > 0 ? totalSpent / purchases.length : 0;
    const creditUsageRate = (farmerUI.creditUsed / farmerUI.creditLimit) * 100;

    // Group purchases by category
    const spendingByCategory = purchases.reduce((acc, purchase) => {
      const category = purchase.agrovet_inventory?.category || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += purchase.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
            <p className="text-gray-500">Track your spending and credit usage</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(totalSpent)}</div>
            <div className="text-blue-100 text-sm">Total Spent (All Time)</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(avgTransaction)}</div>
            <div className="text-green-100 text-sm">Average Transaction</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div className="text-3xl font-bold mb-1">{purchases.length}</div>
            <div className="text-purple-100 text-sm">Total Purchases</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{creditUsageRate.toFixed(1)}%</div>
            <div className="text-amber-100 text-sm">Credit Usage Rate</div>
          </div>
        </div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Spending by Category</h3>
            <div className="space-y-4">
              {Object.entries(spendingByCategory).map(([category, amount], index) => {
                const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500'];

                return (
                  <div key={category}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{category}</span>
                      <span className="text-sm text-gray-600">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Credit Utilization Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Credit Health Score</h3>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    fill="none"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke={creditUsageRate < 50 ? "#10b981" : creditUsageRate < 75 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${(creditUsageRate / 100) * 502.4} 502.4`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-4xl font-bold text-gray-900">{creditUsageRate.toFixed(0)}%</div>
                  <div className="text-sm text-gray-500">Utilized</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Available Credit</span>
                <span className="font-semibold text-gray-900">{formatCurrency(farmerUI.availableCredit)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Credit Limit</span>
                <span className="font-semibold text-gray-900">{formatCurrency(farmerUI.creditLimit)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Health Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${creditUsageRate < 50 ? 'bg-green-100 text-green-700' :
                  creditUsageRate < 75 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                  {creditUsageRate < 50 ? 'Excellent' : creditUsageRate < 75 ? 'Good' : 'High Usage'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Purchased Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Top Purchased Items</h3>
            <div className="space-y-4">
              {purchases
                .reduce((acc, purchase) => {
                  const itemName = purchase.agrovet_inventory?.name || purchase.item_id;
                  const existing = acc.find(item => item.name === itemName);
                  if (existing) {
                    existing.quantity += purchase.quantity;
                    existing.total += purchase.total_amount;
                  } else {
                    acc.push({
                      name: itemName,
                      quantity: purchase.quantity,
                      total: purchase.total_amount
                    });
                  }
                  return acc;
                }, [])
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center font-bold text-blue-600">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Purchase Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Recent Purchase Activity</h3>
            <div className="space-y-4">
              {creditHistory
                .filter(h => h.transaction_type === TransactionTypes.CREDIT_USED)
                .slice(0, 6)
                .map((transaction, index, array) => (
                  <div key={transaction.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-red-600" />
                      </div>
                      {index < array.length - 1 && (
                        <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-gray-900 text-sm">{transaction.description}</div>
                        <div className="font-semibold text-red-600 text-sm">
                          -{formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Balance: {formatCurrency(transaction.balance_after)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Insights and Recommendations */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">💡</div>
              <div className="font-medium text-gray-900 mb-1">Credit Management</div>
              <div className="text-sm text-gray-600">
                {creditUsageRate < 50
                  ? "You're managing your credit well! Keep maintaining this healthy balance."
                  : "Consider reducing your credit usage to improve your credit health score."}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-900 mb-1">Spending Pattern</div>
              <div className="text-sm text-gray-600">
                Your average transaction is {formatCurrency(avgTransaction)}. Plan ahead for better budgeting.
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-medium text-gray-900 mb-1">Next Payment</div>
              <div className="text-sm text-gray-600">
                You have {formatCurrency(farmerUI.pendingPayments)} pending from milk collections.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main Render
  if (loading && !farmer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'shop' && <ShopView />}
        {currentView === 'checkout' && <CheckoutView />}
        {currentView === 'analytics' && <AnalyticsView />}
      </div>
    </div>
  );
};

export default EnhancedCreditSystem;