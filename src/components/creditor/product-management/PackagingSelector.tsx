import React, { useState } from "react";
import { ProductPackaging } from "@/services/agrovet-inventory-service";
import { formatCurrency } from "@/utils/formatters";
import { CreditCard, Package, Tag, Plus, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PackagingSelectorProps {
  packagingOptions: ProductPackaging[];
  onAdd?: (packaging: Omit<ProductPackaging, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (id: string, packaging: Partial<Omit<ProductPackaging, 'id' | 'created_at'>>) => void;
  onDelete?: (id: string) => void;
  editable?: boolean;
}

const PackagingSelector: React.FC<PackagingSelectorProps> = ({ 
  packagingOptions, 
  onAdd,
  onUpdate,
  onDelete,
  editable = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<ProductPackaging | null>(null);
  const [formData, setFormData] = useState<Partial<ProductPackaging>>({
    name: "",
    weight: 0,
    unit: "",
    price: 0,
    is_credit_eligible: true
  });

  // Group packaging options by credit eligibility
  const creditEligibleOptions = packagingOptions.filter(option => option.is_credit_eligible);
  const cashOnlyOptions = packagingOptions.filter(option => !option.is_credit_eligible);

  const handleEdit = (packaging: ProductPackaging) => {
    setEditingPackaging(packaging);
    setFormData({
      name: packaging.name,
      weight: packaging.weight,
      unit: packaging.unit,
      price: packaging.price,
      is_credit_eligible: packaging.is_credit_eligible
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPackaging && onUpdate) {
      onUpdate(editingPackaging.id, formData);
    } else if (onAdd) {
      onAdd({
        product_id: packagingOptions[0]?.product_id || "",
        name: formData.name || "",
        weight: formData.weight || 0,
        unit: formData.unit || "",
        price: formData.price || 0,
        is_credit_eligible: formData.is_credit_eligible || false
      });
    }
    setIsDialogOpen(false);
    setEditingPackaging(null);
    setFormData({
      name: "",
      weight: 0,
      unit: "",
      price: 0,
      is_credit_eligible: true
    });
  };

  const handleDelete = (id: string) => {
    if (onDelete && window.confirm("Are you sure you want to delete this packaging option?")) {
      onDelete(id);
    }
  };

  // If no packaging options, show a message
  if (packagingOptions.length === 0) {
    return (
      <div className="text-center py-4">
        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No packaging options available</p>
        {editable && onAdd && (
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={() => {
              setEditingPackaging(null);
              setFormData({
                name: "",
                weight: 0,
                unit: "",
                price: 0,
                is_credit_eligible: true
              });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Packaging
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit Eligible Options */}
      {creditEligibleOptions.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Credit Options</span>
            </div>
            {editable && onAdd && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => {
                  setEditingPackaging(null);
                  setFormData({
                    name: "",
                    weight: 0,
                    unit: "",
                    price: 0,
                    is_credit_eligible: true
                  });
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {creditEligibleOptions.map((packaging) => (
              <Card key={packaging.id} className="border-green-200">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {packaging.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {packaging.weight} {packaging.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-700 text-sm">
                        {formatCurrency(packaging.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        per {packaging.unit}
                      </div>
                    </div>
                  </div>
                  {editable && (onUpdate || onDelete) && (
                    <div className="flex justify-end gap-1 mt-2">
                      {onUpdate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(packaging)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(packaging.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cash Only Options */}
      {cashOnlyOptions.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Cash Options</span>
            </div>
            {editable && onAdd && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => {
                  setEditingPackaging(null);
                  setFormData({
                    name: "",
                    weight: 0,
                    unit: "",
                    price: 0,
                    is_credit_eligible: false
                  });
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cashOnlyOptions.map((packaging) => (
              <Card key={packaging.id} className="border-gray-200">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {packaging.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {packaging.weight} {packaging.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-700 text-sm">
                        {formatCurrency(packaging.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        per {packaging.unit}
                      </div>
                    </div>
                  </div>
                  {editable && (onUpdate || onDelete) && (
                    <div className="flex justify-end gap-1 mt-2">
                      {onUpdate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(packaging)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(packaging.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Packaging Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPackaging ? "Edit Packaging Option" : "Add Packaging Option"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Packaging Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., 100kg bag, 20kg bag"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || 0}
                  onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit || ""}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="e.g., kg, lbs"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={formData.price || 0}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is_credit_eligible">Credit Eligible</Label>
              <Switch
                id="is_credit_eligible"
                checked={formData.is_credit_eligible || false}
                onCheckedChange={(checked) => setFormData({...formData, is_credit_eligible: checked})}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingPackaging ? "Update" : "Add"} Packaging
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackagingSelector;