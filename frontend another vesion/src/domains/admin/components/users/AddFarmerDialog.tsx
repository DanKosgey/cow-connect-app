import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import apiService from '@/services/ApiService';

interface AddFarmerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFarmerAdded: () => void;
}

export function AddFarmerDialog({ open, onOpenChange, onFarmerAdded }: AddFarmerDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    national_id: '',
    gps_latitude: 0.0,
    gps_longitude: 0.0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gps_latitude' || name === 'gps_longitude' ? parseFloat(value) || 0.0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create farmer profile
      await apiService.Farmers.create(formData);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        national_id: '',
        gps_latitude: 0.0,
        gps_longitude: 0.0
      });
      
      // Notify parent component
      onFarmerAdded();
      
      // Close dialog
      onOpenChange(false);
    } catch (err: any) {
      console.error('Farmer creation error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create farmer profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Farmer</DialogTitle>
          <DialogDescription>
            Register a new farmer in the system. All fields except email are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Physical Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="national_id">National ID Number</Label>
            <Input
              id="national_id"
              name="national_id"
              value={formData.national_id}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gps_latitude">GPS Latitude</Label>
              <Input
                id="gps_latitude"
                name="gps_latitude"
                type="number"
                step="any"
                value={formData.gps_latitude}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gps_longitude">GPS Longitude</Label>
              <Input
                id="gps_longitude"
                name="gps_longitude"
                type="number"
                step="any"
                value={formData.gps_longitude}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Farmer...
                </>
              ) : (
                'Add Farmer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}