import React, { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreditService } from '@/hooks/useCreditService';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';

interface Product {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  packaging_options: any[];
}

const AgrovetCreditRequest = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPackaging, setSelectedPackaging] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [creditInfo, setCreditInfo] = useState<any>(null);
  const { toast } = useToast();
  const { calculateFarmerCredit } = useCreditService();

  useEffect(() => {
    loadProducts();
    loadCreditInfo();
  }, []);

  const loadProducts = async () => {
    try {
      // Get credit-eligible products with their packaging options
      const productsWithPackaging = await AgrovetInventoryService.getCreditEligibleProducts();
      
      // Enrich products with packaging options
      const enrichedProducts = await Promise.all(
        productsWithPackaging.map(async (product) => {
          try {
            const packagingOptions = await AgrovetInventoryService.getProductPackaging(product.id);
            return {
              ...product,
              packaging_options: packagingOptions?.filter(p => p.is_credit_eligible) || []
            };
          } catch (error) {
            return {
              ...product,
              packaging_options: []
            };
          }
        })
      );

      setProducts(enrichedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      });
    }
  };

  const loadCreditInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const creditInfo = await calculateFarmerCredit(user.id);
      setCreditInfo(creditInfo);
    } catch (error) {
      console.error('Error loading credit info:', error);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setSelectedPackaging(null);
    setQuantity('');
  };

  const handlePackagingChange = (packagingId: string) => {
    if (!selectedProduct) return;
    
    const packaging = selectedProduct.packaging_options.find(p => p.id === packagingId);
    setSelectedPackaging(packaging || null);
    setQuantity('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedPackaging || !quantity) return;

    try {
      setLoading(true);

      if (!creditInfo?.isEligible) {
        throw new Error('You are not eligible for credit at this time');
      }

      const totalAmount = selectedPackaging.price * Number(quantity);
      if (totalAmount > creditInfo.availableCredit) {
        throw new Error('Request amount exceeds your available credit');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('agrovet_credit_requests')
        .insert({
          farmer_id: user.id,
          product_id: selectedProduct.id,
          packaging_id: selectedPackaging.id,
          quantity: Number(quantity),
          unit_price: selectedPackaging.price,
          total_amount: totalAmount,
          notes: notes.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Credit request submitted successfully'
      });

      // Reset form
      setSelectedProduct(null);
      setSelectedPackaging(null);
      setQuantity('');
      setNotes('');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="bg-green-100 p-3 rounded-full">
          <Package className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Request Agrovet Products</h2>
          <p className="text-gray-600">Request farm supplies on credit with packaging options</p>
        </div>
      </div>

      {creditInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Your Credit Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-600">Available Credit</p>
              <p className="font-semibold text-blue-800">
                KES {creditInfo.availableCredit.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Credit Limit</p>
              <p className="font-semibold text-blue-800">
                KES {creditInfo.creditLimit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {!creditInfo?.isEligible && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Not Eligible for Credit</h3>
            <p className="text-sm text-red-700">
              You are currently not eligible for credit. This may be due to:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside mt-2">
              <li>No pending payments</li>
              <li>Existing overdue credit</li>
              <li>Account restrictions</li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="product">Product</Label>
          <select
            id="product"
            className="w-full p-2 border border-gray-300 rounded-md mt-1"
            value={selectedProduct?.id || ''}
            onChange={(e) => handleProductChange(e.target.value)}
            required
            disabled={loading || !creditInfo?.isEligible}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && selectedProduct.packaging_options.length > 0 && (
          <div>
            <Label htmlFor="packaging">Packaging Option</Label>
            <select
              id="packaging"
              className="w-full p-2 border border-gray-300 rounded-md mt-1"
              value={selectedPackaging?.id || ''}
              onChange={(e) => handlePackagingChange(e.target.value)}
              required
              disabled={loading || !creditInfo?.isEligible}
            >
              <option value="">Select a packaging option</option>
              {selectedProduct.packaging_options.map((packaging) => (
                <option key={packaging.id} value={packaging.id}>
                  {packaging.name} - KES {packaging.price.toLocaleString()} ({packaging.weight} {packaging.unit})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            required
            disabled={loading || !selectedPackaging || !creditInfo?.isEligible}
          />
        </div>

        {selectedPackaging && quantity && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">
              KES {(selectedPackaging.price * Number(quantity)).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedPackaging.name} ({selectedPackaging.weight} {selectedPackaging.unit} each)
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <textarea
            id="notes"
            className="w-full p-2 border border-gray-300 rounded-md mt-1"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or special instructions"
            disabled={loading || !creditInfo?.isEligible}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !selectedProduct || !selectedPackaging || !quantity || !creditInfo?.isEligible}
        >
          {loading ? 'Submitting...' : 'Submit Credit Request'}
        </Button>
      </form>
    </Card>
  );
};

export default AgrovetCreditRequest;