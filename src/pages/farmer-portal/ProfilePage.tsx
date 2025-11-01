import { useState, useEffect, useCallback } from "react";
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
  Edit3,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { PageHeader } from "@/components/PageHeader";
import RefreshButton from "@/components/ui/RefreshButton";
import { useProfileData } from "@/hooks/useProfileData";
import { TimeframeSelector } from "@/components/TimeframeSelector";

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
  const [saving, setSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("month"); // Add timeframe state
  const { useFarmerProfile, updateProfile } = useProfileData();

  // Fetch farmer profile with caching
  const { data: farmer, isLoading, refetch } = useFarmerProfile();
  const [editableFarmer, setEditableFarmer] = useState<FarmerProfile | null>(null);

  // Update timeframe handler
  const handleTimeframeChange = (timeframeValue: string, start: Date, end: Date) => {
    setTimeframe(timeframeValue);
    // In a real implementation, you would filter the data based on the timeframe
  };

  // Update editableFarmer when farmer data changes
  useEffect(() => {
    if (farmer) {
      setEditableFarmer(farmer);
    }
  }, [farmer]);

  const handleSave = async () => {
    if (!editableFarmer) return;
    
    try {
      setSaving(true);
      
      // Update farmer profile using the mutation
      await updateProfile.mutateAsync({
        full_name: editableFarmer.full_name,
        phone_number: editableFarmer.phone_number,
        address: editableFarmer.address,
        farm_location: editableFarmer.farm_location
      });
      
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

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation Error", "Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
        
        setEditableFarmer(prev => prev ? {...prev, farm_location: locationText} : null);
        toast.success("Location Captured", "Your GPS coordinates have been captured");
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location Error", "Could not get your location. Please enter manually.");
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!farmer || !editableFarmer) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal and farm information"
        actions={
          isEditing ? (
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
            <div className="flex space-x-3">
              <TimeframeSelector onTimeframeChange={handleTimeframeChange} defaultValue={timeframe} />
              <RefreshButton 
                isRefreshing={isLoading} 
                onRefresh={refetch} 
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
              />
              <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          )
        }
      />

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Picture */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-600 text-center">
                {isEditing ? "Click the camera icon to upload a new profile picture" : "Your profile picture"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={editableFarmer?.full_name || ""}
                    onChange={(e) => setEditableFarmer(prev => prev ? {...prev, full_name: e.target.value} : null)}
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{farmer?.full_name || "N/A"}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <p className="mt-1 text-gray-900">{farmer?.email || "N/A"}</p>
              </div>
              
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    value={editableFarmer?.phone_number || ""}
                    onChange={(e) => setEditableFarmer(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{farmer?.phone_number || "N/A"}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="national_id">National ID</Label>
                <p className="mt-1 text-gray-900">{farmer?.national_id || "N/A"}</p>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    value={editableFarmer?.address || ""}
                    onChange={(e) => setEditableFarmer(prev => prev ? {...prev, address: e.target.value} : null)}
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{farmer?.address || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Farm Information */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Farm Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="farm_location">Farm Location</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id="farm_location"
                      value={editableFarmer?.farm_location || ""}
                      onChange={(e) => setEditableFarmer(prev => prev ? {...prev, farm_location: e.target.value} : null)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={getLocation} 
                      disabled={isGettingLocation}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isGettingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Get Location
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-gray-900">{farmer?.farm_location || "N/A"}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <p className="mt-1 text-gray-900">{farmer?.registration_number || "N/A"}</p>
              </div>
              
              <div>
                <Label htmlFor="kyc_status">KYC Status</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    farmer?.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                    farmer?.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    farmer?.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <Award className="h-4 w-4 mr-1" />
                    {farmer?.kyc_status ? farmer.kyc_status.charAt(0).toUpperCase() + farmer.kyc_status.slice(1) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;