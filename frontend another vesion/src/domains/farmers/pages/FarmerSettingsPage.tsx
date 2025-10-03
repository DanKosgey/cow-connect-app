import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Bell, 
  Lock, 
  User, 
  MapPin, 
  Phone,
  Mail,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';
import { useToastContext } from '@/components/ToastWrapper';

const FarmerSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const toast = useToastContext();

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    farmName: '',
    farmSize: '',
    cattleCount: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    collectionReminders: true,
    paymentNotifications: true,
    qualityAlerts: true,
    promotionalEmails: false
  });

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const userData = await supabaseFastApiAuth.getCurrentUser();
        setUser(userData.user);
        
        // Set profile data from user info
        setProfileData({
          name: userData.user?.user_metadata?.full_name || '',
          email: userData.user?.email || '',
          phone: userData.profile?.phone || '',
          address: userData.profile?.address || '',
          farmName: userData.profile?.farm_name || '',
          farmSize: userData.profile?.farm_size || '',
          cattleCount: userData.profile?.cattle_count?.toString() || ''
        });
      } catch (error: any) {
        console.error('Error loading user data:', error);
        if (toast) {
          toast.showError('Load Error', 'Failed to load user data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (name: string, checked: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would save profile data to the backend
      // For now, we'll just show a success message
      if (toast) {
        toast.showSuccess('Profile Updated', 'Your profile has been updated successfully');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (toast) {
        toast.showError('Update Error', 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      setLoading(true);
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        if (toast) {
          toast.showError('Password Error', 'New passwords do not match');
        }
        return;
      }
      
      if (passwordData.newPassword.length < 6) {
        if (toast) {
          toast.showError('Password Error', 'Password must be at least 6 characters');
        }
        return;
      }
      
      // Update password using the new FastAPI auth system
      const response = await supabaseFastApiAuth.updatePassword({ 
        password: passwordData.newPassword 
      });
      
      if (toast) {
        toast.showSuccess('Password Updated', response.message || 'Password changed successfully');
      }
      
      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (toast) {
        toast.showError('Password Error', error.message || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = confirm('Are you sure you want to deactivate your account? This action cannot be undone.');
    if (confirmed) {
      try {
        setLoading(true);
        // In a real implementation, you would call an API to deactivate the account
        // For now, we'll just show a success message
        if (toast) {
          toast.showSuccess('Account Deactivated', 'Your account has been deactivated');
        }
      } catch (error: any) {
        console.error('Error deactivating account:', error);
        if (toast) {
          toast.showError('Deactivation Error', 'Failed to deactivate account');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-600" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal and farm information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          name="name"
                          value={profileData.name}
                          onChange={handleProfileChange}
                          placeholder="Enter your full name"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={profileData.email}
                          onChange={handleProfileChange}
                          placeholder="Enter your email"
                          className="pl-10"
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          placeholder="Enter your phone number"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Physical Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="address"
                          name="address"
                          value={profileData.address}
                          onChange={handleProfileChange}
                          placeholder="Enter your address"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="farmName">Farm Name</Label>
                      <Input
                        id="farmName"
                        name="farmName"
                        value={profileData.farmName}
                        onChange={handleProfileChange}
                        placeholder="Enter your farm name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="farmSize">Farm Size</Label>
                      <Input
                        id="farmSize"
                        name="farmSize"
                        value={profileData.farmSize}
                        onChange={handleProfileChange}
                        placeholder="Enter farm size (e.g., 50 acres)"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cattleCount">Number of Cattle</Label>
                      <Input
                        id="cattleCount"
                        name="cattleCount"
                        type="number"
                        value={profileData.cattleCount}
                        onChange={handleProfileChange}
                        placeholder="Enter number of cattle"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProfile} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'password' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2 text-green-600" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your new password"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Password must be at least 6 characters long.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm your new password"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSavePassword} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-green-600" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                      </div>
                      <Switch
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Collection Reminders</Label>
                        <p className="text-sm text-gray-500">Reminders about milk collection times</p>
                      </div>
                      <Switch
                        checked={notifications.collectionReminders}
                        onCheckedChange={(checked) => handleNotificationChange('collectionReminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Payment Notifications</Label>
                        <p className="text-sm text-gray-500">Notifications about payments and earnings</p>
                      </div>
                      <Switch
                        checked={notifications.paymentNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('paymentNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Quality Alerts</Label>
                        <p className="text-sm text-gray-500">Alerts about milk quality issues</p>
                      </div>
                      <Switch
                        checked={notifications.qualityAlerts}
                        onCheckedChange={(checked) => handleNotificationChange('qualityAlerts', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Promotional Emails</Label>
                        <p className="text-sm text-gray-500">Receive promotional offers and updates</p>
                      </div>
                      <Switch
                        checked={notifications.promotionalEmails}
                        onCheckedChange={(checked) => handleNotificationChange('promotionalEmails', checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Deactivation */}
            <Card className="mt-6 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  Permanently deactivate your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-medium text-red-900">Deactivate Account</h3>
                    <p className="text-sm text-red-700">
                      Once you deactivate your account, there is no going back. Please be certain.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeactivateAccount}
                    className="flex items-center"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerSettingsPage;