import { useState, useEffect, useMemo, useCallback } from 'react';
// DashboardLayout provided by AdminPortalLayout; avoid duplicate wrapper here
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { settingsService, type SystemSettings } from '@/services/settings-service';
import { databaseOptimizer } from '@/services/database-optimizer';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { notificationService } from '@/services/notification-service';
import { exportService } from '@/services/export-service';

// Define types for our data
interface UserRole {
  role: string;
  active: boolean;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_roles: UserRole[] | null;
}

// Define type for company locations
interface CompanyLocation {
  id: string;
  name: string;
  address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
}

// Validation functions
const validateMilkRate = (rate: number): string | null => {
  // Milk rate validation removed as it's no longer in settings
  return null;
};

const validateDataRetention = (days: number): string | null => {
  if (days < 1) return 'Data retention must be at least 1 day';
  if (days > 3650) return 'Data retention cannot exceed 10 years';
  return null;
};

const validateNotification = (title: string, message: string): string | null => {
  if (!title.trim()) return 'Notification title is required';
  if (title.length > 100) return 'Title must be less than 100 characters';
  if (!message.trim()) return 'Notification message is required';
  if (message.length > 500) return 'Message must be less than 500 characters';
  return null;
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    milk_rate_per_liter: 0,
    collection_time_window: '',
    kyc_required: true,
    notifications_enabled: true,
    data_retention_days: 365,
    system_message: '',
    default_role: 'farmer'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [systemNotification, setSystemNotification] = useState({
    title: '',
    message: ''
  });
  const [exportLoading, setExportLoading] = useState({
    farmers: false,
    collections: false,
    payments: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notificationErrors, setNotificationErrors] = useState<Record<string, string>>({});
  
  // Company location state
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    gps_latitude: '',
    gps_longitude: ''
  });
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const settingsData = await settingsService.getAllSettings();
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      // Use database optimizer for better performance
      const usersData = await databaseOptimizer.fetchUsersWithRoles(100, 0);
      
      // Ensure user_roles is always an array
      const usersWithRoles = usersData.map(user => ({
        ...user,
        user_roles: Array.isArray(user.user_roles) ? user.user_roles : []
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'error',
      });
    } finally {
      setUserLoading(false);
    }
  }, [toast]);

  // Fetch company locations
  const fetchLocations = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setLocations(data || []);
    } catch (error: any) {
      console.error('Error fetching company locations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load company locations',
        variant: 'error',
      });
    } finally {
      setLocationLoading(false);
    }
  }, [toast]);

  // Add new company location
  const addLocation = useCallback(async () => {
    // Validate input
    const errors: Record<string, string> = {};
    
    if (!newLocation.name.trim()) {
      errors.name = 'Location name is required';
    }
    
    if (!newLocation.address.trim()) {
      errors.address = 'Location address is required';
    }
    
    // GPS coordinates are now mandatory for new locations
    if (!newLocation.gps_latitude) {
      errors.gps_latitude = 'Latitude is required';
    }
    
    if (!newLocation.gps_longitude) {
      errors.gps_longitude = 'Longitude is required';
    }
    
    // Validate GPS coordinates if provided
    if (newLocation.gps_latitude && newLocation.gps_longitude) {
      const lat = parseFloat(newLocation.gps_latitude);
      const lng = parseFloat(newLocation.gps_longitude);
      
      if (isNaN(lat)) {
        errors.gps_latitude = 'Invalid latitude value';
      } else if (lat < -90 || lat > 90) {
        errors.gps_latitude = 'Latitude must be between -90 and 90';
      }
      
      if (isNaN(lng)) {
        errors.gps_longitude = 'Invalid longitude value';
      } else if (lng < -180 || lng > 180) {
        errors.gps_longitude = 'Longitude must be between -180 and 180';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setLocationErrors(errors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'error',
      });
      return;
    }

    try {
      const locationData: any = {
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        gps_latitude: parseFloat(newLocation.gps_latitude),
        gps_longitude: parseFloat(newLocation.gps_longitude)
      };
      
      const { data, error } = await supabase
        .from('warehouses')
        .insert([locationData])
        .select();

      if (error) throw error;
      
      // Check if we have data and handle accordingly
      const locationRecord = data && data.length > 0 ? data[0] : null;
      
      if (!locationRecord) {
        throw new Error('Failed to create company location');
      }
      
      // Add to local state
      setLocations(prev => [...prev, locationRecord]);
      
      // Reset form
      setNewLocation({
        name: '',
        address: '',
        gps_latitude: '',
        gps_longitude: ''
      });
      
      toast({
        title: 'Success',
        description: 'Company location added successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error adding company location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add company location',
        variant: 'error',
      });
    }
  }, [newLocation, toast]);

  // Delete company location
  const deleteLocation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Remove from local state
      setLocations(prev => prev.filter(location => location.id !== id));
      
      toast({
        title: 'Success',
        description: 'Company location deleted successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error deleting company location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete company location',
        variant: 'error',
      });
    }
  }, [toast]);

  const validateSettings = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Remove milk rate validation since it's no longer in settings

    // Validate data retention
    const dataRetentionError = validateDataRetention(settings.data_retention_days);
    if (dataRetentionError) newErrors.data_retention_days = dataRetentionError;

    // Validate collection time window
    if (settings.collection_time_window && settings.collection_time_window.length > 50) {
      newErrors.collection_time_window = 'Collection time window must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settings]);

  const handleSave = useCallback(async () => {
    if (!validateSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      
      // Invalidate related caches
      databaseOptimizer.invalidateRelatedCaches('system_settings');

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [settings, validateSettings, toast]);

  const handleInputChange = useCallback((key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  const handleNotificationChange = useCallback((field: string, value: string) => {
    setSystemNotification(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (notificationErrors[field]) {
      setNotificationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [notificationErrors]);

  const sendSystemNotification = useCallback(async () => {
    const notificationError = validateNotification(
      systemNotification.title,
      systemNotification.message
    );

    if (notificationError) {
      toast({
        title: 'Validation Error',
        description: notificationError,
        variant: 'error',
      });
      return;
    }

    try {
      await notificationService.sendSystemNotification(
        systemNotification.title,
        systemNotification.message,
        'admin'
      );

      toast({
        title: 'Success',
        description: 'System notification sent to all users',
        variant: 'success',
      });

      // Clear the form
      setSystemNotification({
        title: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Error sending system notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send system notification',
        variant: 'error',
      });
    }
  }, [systemNotification, toast]);

  const exportData = useCallback(async (type: 'farmers' | 'collections' | 'payments') => {
    setExportLoading(prev => ({ ...prev, [type]: true }));
    try {
      let data: string | Blob;
      let filename: string;

      switch (type) {
        case 'farmers':
          data = await exportService.exportFarmers();
          filename = 'farmers-data';
          break;
        case 'collections':
          data = await exportService.exportCollections();
          filename = 'collections-data';
          break;
        case 'payments':
          data = await exportService.exportPayments();
          filename = 'payments-data';
          break;
        default:
          throw new Error('Invalid export type');
      }

      exportService.downloadFile(data, filename, 'csv');

      toast({
        title: 'Success',
        description: `Exported ${type} data successfully`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error(`Error exporting ${type} data:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to export ${type} data`,
        variant: 'error',
      });
    } finally {
      setExportLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [toast]);

  const toggleUserRole = useCallback(async (userId: string, role: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ active: !currentActive })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw new Error(error.message);

      // Refresh users list
      await fetchUsers();
      
      // Invalidate related caches
      databaseOptimizer.invalidateRelatedCaches('user_roles');

      toast({
        title: 'Success',
        description: `User role ${!currentActive ? 'activated' : 'deactivated'} successfully`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'error',
      });
    }
  }, [fetchUsers, toast]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'error',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLocation(prev => ({
          ...prev,
          gps_latitude: position.coords.latitude.toString(),
          gps_longitude: position.coords.longitude.toString()
        }));
        
        toast({
          title: 'Success',
          description: 'Current location captured successfully',
          variant: 'success',
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. Please enter manually.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          case 1: // PERMISSION_DENIED - specifically for secure context issues
            if (error.message.includes('secure origin') || window.location.protocol !== 'https:') {
              errorMessage = 'Location access requires HTTPS. Please access this application over a secure connection.';
            }
            break;
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'error',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [toast]);

  // Handle location input change
  const handleLocationInputChange = useCallback((field: keyof typeof newLocation, value: string) => {
    setNewLocation(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (locationErrors[field]) {
      setLocationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [locationErrors]);

  // Memoize users with roles to prevent unnecessary re-renders
  const usersWithRoles = useMemo(() => {
    return users.map(user => ({
      ...user,
      user_roles: Array.isArray(user.user_roles) ? user.user_roles : []
    }));
  }, [users]);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchLocations(); // Fetch locations on component mount
  }, [fetchSettings, fetchUsers, fetchLocations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader 
          title="System Settings" 
          description="Manage system configuration and preferences"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Configure core system parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hidden milk rate field - kept in state but not displayed per user request */}
              <input
                type="hidden"
                value={settings.milk_rate_per_liter}
                onChange={(e) => handleInputChange('milk_rate_per_liter', parseFloat(e.target.value) || 0)}
              />

              <div className="space-y-2">
                <Label htmlFor="collection_time">Collection Time Window</Label>
                <Input
                  id="collection_time"
                  value={settings.collection_time_window}
                  onChange={(e) => handleInputChange('collection_time_window', e.target.value)}
                  placeholder="e.g., 6:00 AM - 10:00 AM"
                />
                {errors.collection_time_window && (
                  <p className="text-sm text-red-500">{errors.collection_time_window}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_retention">Data Retention (Days)</Label>
                <Input
                  id="data_retention"
                  type="number"
                  value={settings.data_retention_days}
                  onChange={(e) => handleInputChange('data_retention_days', parseInt(e.target.value) || 365)}
                  placeholder="Enter number of days"
                />
                {errors.data_retention_days && (
                  <p className="text-sm text-red-500">{errors.data_retention_days}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>KYC Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Require KYC verification for farmers
                  </p>
                </div>
                <Switch
                  checked={settings.kyc_required}
                  onCheckedChange={(checked) => handleInputChange('kyc_required', checked)}
                />
              </div>

              <Separator />

              {/* New Settings */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to farmers
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => handleInputChange('notifications_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_role">Default User Role</Label>
                <Select 
                  value={settings.default_role} 
                  onValueChange={(value) => handleInputChange('default_role', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="farmer">Farmer</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Settings Placeholder */}
              {/* Additional settings can be added here as needed */}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send system notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => handleInputChange('notifications_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_message">System Message</Label>
                <Textarea
                  id="system_message"
                  value={settings.system_message}
                  onChange={(e) => handleInputChange('system_message', e.target.value)}
                  placeholder="Enter a system-wide message for users"
                  rows={4}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Send System Notification</h3>
                <div className="space-y-2">
                  <Label htmlFor="notification_title">Title</Label>
                  <Input
                    id="notification_title"
                    value={systemNotification.title}
                    onChange={(e) => handleNotificationChange('title', e.target.value)}
                    placeholder="Enter notification title"
                  />
                  {notificationErrors.title && (
                    <p className="text-sm text-red-500">{notificationErrors.title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification_message">Message</Label>
                  <Textarea
                    id="notification_message"
                    value={systemNotification.message}
                    onChange={(e) => handleNotificationChange('message', e.target.value)}
                    placeholder="Enter notification message"
                    rows={3}
                  />
                  {notificationErrors.message && (
                    <p className="text-sm text-red-500">{notificationErrors.message}</p>
                  )}
                </div>
                <Button onClick={sendSystemNotification}>
                  Send to All Users
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Export system data for backup or analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Export Farmers Data</Label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => exportData('farmers')}
                    disabled={exportLoading.farmers}
                  >
                    {exportLoading.farmers ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Export Collections Data</Label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => exportData('collections')}
                    disabled={exportLoading.collections}
                  >
                    {exportLoading.collections ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Export Payments Data</Label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => exportData('payments')}
                    disabled={exportLoading.payments}
                  >
                    {exportLoading.payments ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Company Locations</CardTitle>
            <CardDescription>Manage company locations and GPS coordinates</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add New Location Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  value={newLocation.name}
                  onChange={(e) => handleLocationInputChange('name', e.target.value)}
                  placeholder="Enter location name"
                />
                {locationErrors.name && (
                  <p className="text-sm text-red-500">{locationErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_address">Location Address *</Label>
                <Input
                  id="location_address"
                  value={newLocation.address}
                  onChange={(e) => handleLocationInputChange('address', e.target.value)}
                  placeholder="Enter location address"
                />
                {locationErrors.address && (
                  <p className="text-sm text-red-500">{locationErrors.address}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_latitude">Latitude *</Label>
                <div className="flex gap-2">
                  <Input
                    id="location_latitude"
                    type="number"
                    step="any"
                    value={newLocation.gps_latitude}
                    onChange={(e) => handleLocationInputChange('gps_latitude', e.target.value)}
                    placeholder="Enter latitude"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={getCurrentLocation}
                    title="Get current location"
                  >
                    📍
                  </Button>
                </div>
                {locationErrors.gps_latitude && (
                  <p className="text-sm text-red-500">{locationErrors.gps_latitude}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_longitude">Longitude *</Label>
                <Input
                  id="location_longitude"
                  type="number"
                  step="any"
                  value={newLocation.gps_longitude}
                  onChange={(e) => handleLocationInputChange('gps_longitude', e.target.value)}
                  placeholder="Enter longitude"
                />
                {locationErrors.gps_longitude && (
                  <p className="text-sm text-red-500">{locationErrors.gps_longitude}</p>
                )}
              </div>
              
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={addLocation}>
                  Add Company Location
                </Button>
              </div>
            </div>
            
            {/* Company Locations List */}
            {locationLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>GPS Coordinates</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No company locations found. Add your first company location above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      locations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell>{location.address}</TableCell>
                          <TableCell>
                            {location.gps_latitude !== null && location.gps_longitude !== null ? (
                              <span>{location.gps_latitude.toFixed(6)}, {location.gps_longitude.toFixed(6)}</span>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteLocation(location.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {userLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithRoles.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(user.user_roles) && user.user_roles.map((role) => (
                              <Badge 
                                key={`${user.id}-${role.role}`}
                                variant={role.active ? "default" : "secondary"}
                              >
                                {role.role} {role.active ? '' : '(Inactive)'}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(user.user_roles) && user.user_roles.map((role) => (
                              <Button
                                key={`${user.id}-${role.role}-toggle`}
                                size="sm"
                                variant={role.active ? "destructive" : "default"}
                                onClick={() => toggleUserRole(user.id, role.role, role.active)}
                              >
                                {role.active ? 'Deactivate' : 'Activate'} {role.role}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
  );
};

export default AdminSettings;