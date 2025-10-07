import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Award,
  Camera,
  Save,
  Edit3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";

interface FarmerProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  address: string;
  farm_location: string;
  national_id: string;
  kyc_status: string;
  registration_number: string;
}

const ProfilePage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [editableFarmer, setEditableFarmer] = useState<FarmerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fetch farmer profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile
        const { data: farmerData, error } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setFarmer(farmerData);
        setEditableFarmer(farmerData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast.error('Error', 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!editableFarmer) return;
    
    try {
      setSaving(true);
      
      // Update farmer profile
      const { error } = await supabase
        .from('farmers')
        .update({
          full_name: editableFarmer.full_name,
          phone_number: editableFarmer.phone_number,
          address: editableFarmer.address,
          farm_location: editableFarmer.farm_location
        })
        .eq('id', editableFarmer.id);

      if (error) throw error;
      
      setFarmer(editableFarmer);
      setIsEditing(false);
      toast.success('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large', 'Please upload an image smaller than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Image selected', 'Profile picture will be updated');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!farmer || !editableFarmer) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <p className="text-muted-foreground">No profile data available</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">Manage your personal and farm information</p>
          </div>
          <div className="mt-4 md:mt-0">
            {isEditing ? (
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {previewImage ? (
                        <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-2 right-2 bg-primary rounded-full p-2 cursor-pointer">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </label>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">{farmer.full_name}</h2>
                    <p className="text-muted-foreground">Farmer</p>
                    <span className={`inline-flex mt-2 px-3 py-1 text-sm font-semibold rounded-full ${
                      farmer.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                      farmer.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      KYC: {farmer.kyc_status.charAt(0).toUpperCase() + farmer.kyc_status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{farmer.registration_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">National ID</p>
                    <p className="font-medium">{farmer.national_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{farmer.email || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Personal & Farm Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        value={editableFarmer.full_name}
                        onChange={(e) => setEditableFarmer({...editableFarmer, full_name: e.target.value})}
                      />
                    ) : (
                      <p className="font-medium">{farmer.full_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    {isEditing ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={editableFarmer.phone_number}
                          onChange={(e) => setEditableFarmer({...editableFarmer, phone_number: e.target.value})}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{farmer.phone_number || 'N/A'}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={editableFarmer.address}
                          onChange={(e) => setEditableFarmer({...editableFarmer, address: e.target.value})}
                          className="pl-10"
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <p className="font-medium">{farmer.address || 'N/A'}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="farmLocation">Farm Location</Label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="farmLocation"
                          value={editableFarmer.farm_location}
                          onChange={(e) => setEditableFarmer({...editableFarmer, farm_location: e.target.value})}
                          className="pl-10"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{farmer.farm_location || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">KYC Status</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Your KYC status is <span className="font-semibold">{farmer.kyc_status}</span>. 
                          {farmer.kyc_status === 'pending' && ' Please complete your KYC verification to unlock all features.'}
                          {farmer.kyc_status === 'approved' && ' You have full access to all farmer features.'}
                          {farmer.kyc_status === 'rejected' && ' Please contact support to resolve KYC issues.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;