import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';

interface StaffMember {
  id: string;
  employee_id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  roles: string[];
  activeRoles: string[];
}

interface StaffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: StaffMember | null;
  onSave: () => void;
}

export const StaffEditDialog: React.FC<StaffEditDialogProps> = ({ open, onOpenChange, staffMember, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'staff' | 'admin' | 'none'>('none');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { show, error: showError } = useToastNotifications();

  useEffect(() => {
    if (staffMember && open) {
      setFullName(staffMember.profiles?.full_name || '');
      setEmail(staffMember.profiles?.email || '');
      setEmployeeId(staffMember.employee_id || '');
      // Set the role based on existing roles
      if (staffMember.activeRoles?.includes('admin')) {
        setSelectedRole('admin');
        setIsActive(true);
      } else if (staffMember.activeRoles?.includes('staff')) {
        setSelectedRole('staff');
        setIsActive(true);
      } else if (staffMember.roles?.includes('admin')) {
        setSelectedRole('admin');
        setIsActive(false);
      } else if (staffMember.roles?.includes('staff')) {
        setSelectedRole('staff');
        setIsActive(false);
      } else {
        setSelectedRole('none');
        setIsActive(false);
      }
    }
  }, [staffMember, open]);

  const handleSave = async () => {
    if (!staffMember) return;
    
    setLoading(true);
    try {
      // Update profile information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          email: email,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffMember.user_id);
      
      if (profileError) throw profileError;
      
      // Update employee ID
      const { error: staffError } = await supabase
        .from('staff')
        .update({ 
          employee_id: employeeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffMember.id);
      
      if (staffError) throw staffError;
      
      // Handle role updates using a service role approach or inform user about limitation
      if (selectedRole !== 'none') {
        // Try to update the role status
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ active: isActive })
          .eq('user_id', staffMember.user_id)
          .eq('role', selectedRole);
        
        // If we get a permission error, inform the user they need to contact support or use a different method
        if (roleUpdateError && roleUpdateError.code === '42501') {
          // Permission denied - RLS policy violation
          showError('Permission Denied', 'You do not have permission to modify user roles. Please contact your system administrator or try assigning roles through the invitation process.');
        } else if (roleUpdateError) {
          throw roleUpdateError;
        }
      } else {
        // Deactivate all roles if none selected
        const { error: deactivateAllError } = await supabase
          .from('user_roles')
          .update({ active: false })
          .eq('user_id', staffMember.user_id);
        
        if (deactivateAllError && deactivateAllError.code === '42501') {
          // Permission denied - RLS policy violation
          showError('Permission Denied', 'You do not have permission to modify user roles. Please contact your system administrator or try assigning roles through the invitation process.');
        } else if (deactivateAllError) {
          throw deactivateAllError;
        }
      }
      
      if (!loading) { // Only show success if we didn't encounter permission errors
        show({ 
          title: 'Success', 
          description: 'Staff member updated successfully' 
        });
      }
      
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating staff member:', err);
      if (err.code !== '42501') { // Don't show error toast for permission errors as we already handled them
        showError('Update Failed', err.message || 'Failed to update staff member.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!staffMember) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update staff member information. Note: Role changes may require administrative privileges.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Profile Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Profile Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="employee-id">Employee ID</Label>
              <Input
                id="employee-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Role and Status */}
          <div className="space-y-4">
            <h3 className="font-medium">Role and Status</h3>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={selectedRole} 
                onValueChange={(value: 'staff' | 'admin' | 'none') => setSelectedRole(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Role</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-4">
                <Button
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setIsActive(true)}
                  disabled={loading || selectedRole === 'none'}
                  className={selectedRole === 'none' ? "opacity-50" : ""}
                >
                  Active
                </Button>
                <Button
                  variant={!isActive ? "default" : "outline"}
                  onClick={() => setIsActive(false)}
                  disabled={loading || selectedRole === 'none'}
                  className={selectedRole === 'none' ? "opacity-50" : ""}
                >
                  Inactive
                </Button>
              </div>
              {selectedRole === 'none' && (
                <p className="text-sm text-gray-500">Assign a role to set status</p>
              )}
            </div>
            
            {staffMember.roles.length > 0 && (
              <div className="space-y-2">
                <Label>Current Roles</Label>
                <div className="flex flex-wrap gap-1">
                  {staffMember.roles.map((role) => (
                    <Badge 
                      key={role} 
                      variant={staffMember.activeRoles.includes(role) ? "default" : "secondary"}
                    >
                      {role} {staffMember.activeRoles.includes(role) ? '(Active)' : '(Inactive)'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Role changes may require administrative privileges. If you encounter permission errors, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};