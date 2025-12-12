import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  CheckCircle,
  UserCog,
  Award,
  TrendingUp
} from 'lucide-react';

interface StaffProfile {
  id: string;
  user_id: string;
  employee_id: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffPerformanceMetrics {
  total_approvals: number;
  total_collections_approved: number;
  total_liters_approved: number;
  accuracy_score: number;
  total_penalty_amount: number;
}

const StaffProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<StaffPerformanceMetrics | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for editing
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user profile data
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Fetch staff profile data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (staffError) throw staffError;

      // Set profile data
      setUserProfile(userData);
      setStaffProfile(staffData);

      // Set edited profile state
      setEditedProfile({
        full_name: userData?.full_name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        department: staffData?.department || '',
        position: staffData?.position || ''
      });

      // Fetch performance metrics
      await fetchPerformanceMetrics(user.id);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPerformanceMetrics = async (userId: string) => {
    try {
      // Fetch staff ID first
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (staffError) throw staffError;
      
      // Fetch performance metrics from staff_performance table
      const { data: performanceData, error: performanceError } = await supabase
        .from('staff_performance')
        .select(`
          total_approvals,
          total_collections_approved,
          total_liters_approved,
          accuracy_score,
          total_penalty_amount
        `)
        .eq('staff_id', staffData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (performanceError) {
        // If no performance data found, set defaults
        setPerformanceMetrics({
          total_approvals: 0,
          total_collections_approved: 0,
          total_liters_approved: 0,
          accuracy_score: 0,
          total_penalty_amount: 0
        });
        return;
      }

      setPerformanceMetrics(performanceData);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      // Set default values if there's an error
      setPerformanceMetrics({
        total_approvals: 0,
        total_collections_approved: 0,
        total_liters_approved: 0,
        accuracy_score: 0,
        total_penalty_amount: 0
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form to original values
    setEditedProfile({
      full_name: userProfile?.full_name || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      department: staffProfile?.department || '',
      position: staffProfile?.position || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !userProfile || !staffProfile) return;
    
    setIsSaving(true);
    try {
      // Update user profile
      const { error: userUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: editedProfile.full_name,
          phone: editedProfile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      // Update staff profile
      const { error: staffUpdateError } = await supabase
        .from('staff')
        .update({
          department: editedProfile.department,
          position: editedProfile.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffProfile.id);

      if (staffUpdateError) throw staffUpdateError;

      // Update local state
      setUserProfile({
        ...userProfile,
        full_name: editedProfile.full_name,
        phone: editedProfile.phone,
        updated_at: new Date().toISOString()
      });
      
      setStaffProfile({
        ...staffProfile,
        department: editedProfile.department,
        position: editedProfile.position,
        updated_at: new Date().toISOString()
      });

      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal and professional information
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editedProfile.full_name}
                        onChange={(e) => setEditedProfile({...editedProfile, full_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedProfile.email}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={staffProfile?.employee_id || ''}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Employee ID is managed by administrator
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{userProfile?.full_name || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{userProfile?.email || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{userProfile?.phone || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Employee ID</Label>
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <span>{staffProfile?.employee_id || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={editedProfile.position}
                      onChange={(e) => setEditedProfile({...editedProfile, position: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={editedProfile.department}
                      onChange={(e) => setEditedProfile({...editedProfile, department: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Position</Label>
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <span>{staffProfile?.position || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Department</Label>
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <span>{staffProfile?.department || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Hire Date</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(staffProfile?.hire_date || null)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
          )}
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Approvals</span>
                  <span className="font-semibold">{performanceMetrics?.total_approvals || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Collections Approved</span>
                  <span className="font-semibold">{performanceMetrics?.total_collections_approved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Liters Approved</span>
                  <span className="font-semibold">{performanceMetrics?.total_liters_approved?.toLocaleString() || 0} L</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Accuracy Score</span>
                  <Badge 
                    variant={performanceMetrics?.accuracy_score && performanceMetrics.accuracy_score >= 90 ? "default" : 
                           performanceMetrics?.accuracy_score && performanceMetrics.accuracy_score >= 80 ? "secondary" : "destructive"}
                  >
                    {performanceMetrics?.accuracy_score?.toFixed(1) || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Penalties</span>
                  <span className="font-semibold">KSh {performanceMetrics?.total_penalty_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Member Since</span>
                <span>{formatDate(userProfile?.created_at || null)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDate(userProfile?.updated_at || null)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffProfilePage;