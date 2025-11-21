import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { CreditService, AgrovetInventory, FarmerCreditLimit } from '@/services/credit-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, Search, Filter, Plus, Minus, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CartItem extends AgrovetInventory {
    quantity: number;
}

const ShopPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<AgrovetInventory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [creditStatus, setCreditStatus] = useState<FarmerCreditLimit | null>(null);
    const [availableCredit, setAvailableCredit] = useState(0);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProducts();
            fetchCreditStatus();
        }
    }, [user]);

    const fetchProducts = async () => {
        try {
            const data = await CreditService.getAgrovetInventory();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast({
                title: "Error",
                description: "Failed to load products",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchCreditStatus = async () => {
        if (!user?.id) return;
        try {
            const status = await CreditService.getCreditStatus(user.id);
            setCreditStatus(status);

            const creditInfo = await CreditService.calculateAvailableCredit(user.id);
            setAvailableCredit(creditInfo.availableCredit);
        } catch (error) {
            console.error('Error fetching credit status:', error);
        }
    };

    const addToCart = (product: AgrovetInventory) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        toast({
            title: "Added to cart",
            description: `${product.name} added to your cart`,
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

    const handleCheckout = async () => {
        if (!user?.id) return;

        if (cartTotal > availableCredit) {
            toast({
                title: "Insufficient Credit",
                description: `You need ${formatCurrency(cartTotal)} but only have ${formatCurrency(availableCredit)} available.`,
                variant: "destructive",
            });
            return;
        }

        setProcessing(true);
        try {
            // Process each item in the cart
            for (const item of cart) {
                await CreditService.createAgrovetPurchase(
                    user.id,
                    item.id,
                    item.quantity,
                    'credit',
                    user.email
                );
            }

            toast({
                title: "Order Placed Successfully",
                description: "Your items are ready for collection at the agrovet.",
            });

            setCart([]);
            setIsCartOpen(false);
            fetchCreditStatus(); // Refresh credit status
        } catch (error) {
            console.error('Checkout error:', error);
            toast({
                title: "Checkout Failed",
                description: "There was an error processing your order. Please try again.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agrovet Shop</h1>
                    <p className="text-muted-foreground">Browse and purchase supplies on credit</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Available Credit</p>
                        <p className="font-bold text-lg text-primary">{formatCurrency(availableCredit)}</p>
                    </div>
                    <Button
                        variant="outline"
                        className="relative"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Cart
                        {cart.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full">
                                {cart.length}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {categories.map(category => (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? "default" : "outline"}
                            onClick={() => setSelectedCategory(category)}
                            className="capitalize whitespace-nowrap"
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                    <Card key={product.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                                {product.is_credit_eligible && (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Credit Available</Badge>
                                )}
                            </div>
                            <CardTitle className="mt-2">{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                                <div className="mt-4 flex justify-between items-end">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Price</p>
                                        <p className="text-xl font-bold">{formatCurrency(product.selling_price)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Stock</p>
                                        <p className={`font-medium ${product.current_stock < 10 ? 'text-red-500' : ''}`}>
                                            {product.current_stock} {product.unit}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => addToCart(product)}
                                disabled={product.current_stock <= 0 || (!product.is_credit_eligible && availableCredit > 0)} // Logic check: if paying with credit, item must be eligible
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Cart
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
                </div>
            )}

            <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Shopping Cart</DialogTitle>
                        <DialogDescription>
                            Review your items before checkout. Total will be deducted from your credit limit.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                    <div className="flex-1">
                                        <h4 className="font-medium">{item.name}</h4>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(item.selling_price)} / {item.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center border rounded-md">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="font-medium min-w-[80px] text-right">
                                            {formatCurrency(item.selling_price * item.quantity)}
                                        </p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromCart(item.id)}>
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="border-t pt-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Total Amount</span>
                                <span className="text-xl font-bold">{formatCurrency(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Available Credit</span>
                                <span className={availableCredit < cartTotal ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                                    {formatCurrency(availableCredit)}
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                            Continue Shopping
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || processing || cartTotal > availableCredit}
                            className="bg-primary"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Pay with Credit
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShopPage;
