import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Milk, MapPin } from 'lucide-react';

interface Farmer {
  id: string;
  national_id: string;
  profiles: {
    full_name: string;
  };
}

const NewCollection = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [liters, setLiters] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFarmers();
    fetchCurrentRate();
    getCurrentLocation();
  }, []);

  const fetchFarmers = async () => {
    const { data, error } = await supabase
      .from('farmers')
      .select('id, national_id, profiles!inner(full_name)')
      .eq('kyc_status', 'approved')
      .order('national_id');

    if (!error && data) {
      setFarmers(data as any);
    }
  };

  const fetchCurrentRate = async () => {
    const { data, error } = await supabase
      .from('milk_rates')
      .select('rate_per_liter')
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setCurrentRate(data.rate_per_liter);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get staff ID
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (staffError) throw staffError;

      // Generate validation code
      const validationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Insert collection
      const { error: collectionError } = await supabase
        .from('collections')
        .insert({
          farmer_id: selectedFarmer,
          staff_id: staff.id,
          liters: parseFloat(liters),
          quality_grade: qualityGrade,
          rate_per_liter: currentRate,
          gps_latitude: location?.lat,
          gps_longitude: location?.lng,
          validation_code: validationCode,
          collection_date: new Date().toISOString(),
        });

      if (collectionError) throw collectionError;

      show({ title: 'Success', description: `Collection recorded successfully! Validation code: ${validationCode}` });

      navigate('/staff');
    } catch (error: any) {
      showError('Error', String(error?.message || 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Milk className="h-6 w-6" />
              Record New Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="farmer">Select Farmer</Label>
                <Select value={selectedFarmer} onValueChange={setSelectedFarmer} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmers.map((farmer) => (
                      <SelectItem key={farmer.id} value={farmer.id}>
                        {farmer.profiles?.full_name} - {farmer.national_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="liters">Quantity (Liters)</Label>
                <Input
                  id="liters"
                  type="number"
                  step="0.1"
                  min="0"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  placeholder="Enter liters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Quality Grade</Label>
                <Select value={qualityGrade} onValueChange={setQualityGrade} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+ (Excellent)</SelectItem>
                    <SelectItem value="A">A (Good)</SelectItem>
                    <SelectItem value="B">B (Average)</SelectItem>
                    <SelectItem value="C">C (Below Average)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Rate</Label>
                <div className="text-2xl font-bold">₹{currentRate} / Liter</div>
              </div>

              {liters && (
                <div className="space-y-2">
                  <Label>Estimated Payment</Label>
                  <div className="text-2xl font-bold text-primary">
                    ₹{(parseFloat(liters) * currentRate).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  GPS Location
                </Label>
                <div className="text-sm text-muted-foreground">
                  {location ? (
                    <span>
                      Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </span>
                  ) : (
                    <span>Getting location...</span>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Recording...' : 'Record Collection'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewCollection;
