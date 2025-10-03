import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button,
  buttonVariants
} from '@/components/ui/button';
import { 
  Input
} from '@/components/ui/input';
import { 
  Label
} from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { 
  Badge
} from '@/components/ui/badge';
import { 
  Switch
} from '@/components/ui/switch';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Key,
  FileText
} from 'lucide-react';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { 
  User, 
  UserRole, 
  UserStatus,
  Permission
} from '@/types/userManagement';
import { format } from 'date-fns';

const UserManagement: React.FC = () => {
  const {
    users,
    pagination,
    summary,
    roles,
    permissions,
    selectedUser,
    isCreateModalOpen,
    isEditModalOpen,
    isAuditLogOpen,
    isLoading,
    error,
    createUser,
    updateUserPermissions,
    updateUserStatus,
    deleteUser,
    resetPassword,
    refetch,
    changePage,
    changeRole,
    changeStatus,
    changeSearch,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openAuditLog,
    closeAuditLog,
    exportUsers,
  } = useAdminUserManagement();

  // Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'staff' as UserRole,
    permissions: [] as string[],
    temporary_password: true,
  });
  const [editUserPermissions, setEditUserPermissions] = useState<string[]>([]);
  const [permissionReason, setPermissionReason] = useState('');

  // Update form when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setEditUserPermissions(selectedUser.permissions);
    }
  }, [selectedUser]);

  // Handle search
  const handleSearch = () => {
    changeSearch(searchQuery);
  };

  // Handle role change
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    changeRole(role);
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    changeStatus(status);
  };

  // Handle create user
  const handleCreateUser = () => {
    createUser({
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      permissions: newUser.permissions,
      temporary_password: newUser.temporary_password,
    });
  };

  // Handle update permissions
  const handleUpdatePermissions = () => {
    if (!selectedUser) return;
    
    updateUserPermissions({
      userId: selectedUser.id,
      permissionData: {
        permissions: editUserPermissions,
        role: selectedUser.role,
        reason: permissionReason,
      }
    });
  };

  // Handle toggle user status
  const handleToggleUserStatus = (user: User) => {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    updateUserStatus({ userId: user.id, status: newStatus });
  };

  // Handle delete user
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUser(userId);
    }
  };

  // Handle reset password
  const handleResetPassword = (userId: string) => {
    if (window.confirm('Are you sure you want to reset this user\'s password?')) {
      resetPassword(userId);
    }
  };

  // Handle permission toggle
  const togglePermission = (permissionId: string) => {
    setEditUserPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId) 
        : [...prev, permissionId]
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
            <div className="mt-4">
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render create user dialog
  const renderCreateUserDialog = () => {
    return (
      <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with appropriate permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value as UserRole})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="temporary-password"
                checked={newUser.temporary_password}
                onCheckedChange={(checked) => setNewUser({...newUser, temporary_password: checked})}
              />
              <Label htmlFor="temporary-password">Generate temporary password</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
            <Button 
              onClick={handleCreateUser}
              disabled={isLoading || !newUser.email || !newUser.name}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render edit user dialog
  const renderEditUserDialog = () => {
    if (!selectedUser) return null;

    return (
      <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              Modify permissions for {selectedUser.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label>Current Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Switch
                      id={permission.id}
                      checked={editUserPermissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <Label htmlFor={permission.id} className="text-sm">
                      {permission.name}
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="permission-reason">Reason for Changes</Label>
              <Input
                id="permission-reason"
                value={permissionReason}
                onChange={(e) => setPermissionReason(e.target.value)}
                placeholder="Enter reason for permission changes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button 
              onClick={handleUpdatePermissions}
              disabled={isLoading || !permissionReason}
            >
              {isLoading ? (
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render audit log dialog
  const renderAuditLogDialog = () => {
    if (!selectedUser) return null;

    return (
      <Dialog open={isAuditLogOpen} onOpenChange={closeAuditLog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log for {selectedUser.name}</DialogTitle>
            <DialogDescription>
              View all actions performed by or on this user
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Audit Log Feature</AlertTitle>
              <AlertDescription>
                This feature would display a detailed audit log of all user activities.
                In a full implementation, this would fetch and display actual audit data.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button onClick={closeAuditLog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render user status badge
  const renderUserStatus = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render user role badge
  const renderUserRole = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Admin</Badge>;
      case 'staff':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Staff</Badge>;
      case 'farmer':
        return <Badge className="bg-green-500 hover:bg-green-600">Farmer</Badge>;
      case 'processor':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Processor</Badge>;
      case 'supervisor':
        return <Badge className="bg-red-500 hover:bg-red-600">Supervisor</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Render pagination
  const renderPagination = () => {
    if (!pagination) return null;

    const totalPages = pagination.pages;
    const currentPage = pagination.page;
    const hasNext = pagination.has_next;
    const hasPrev = pagination.has_prev;

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (hasPrev) changePage(currentPage - 1);
              }}
              className={hasPrev ? '' : 'pointer-events-none opacity-50'}
            />
          </PaginationItem>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    changePage(pageNum);
                  }}
                  isActive={pageNum === currentPage}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          
          {totalPages > 5 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (hasNext) changePage(currentPage + 1);
              }}
              className={hasNext ? '' : 'pointer-events-none opacity-50'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportUsers}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button 
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.total_active + summary.total_inactive).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.total_active.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.by_role.admin?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.by_role.staff?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{renderUserRole(user.role)}</TableCell>
                  <TableCell>{renderUserStatus(user.status)}</TableCell>
                  <TableCell>
                    {user.last_login 
                      ? format(new Date(user.last_login), 'MMM d, yyyy h:mm a') 
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAuditLog(user)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Audit Log
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                          <Key className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleUserStatus(user)}
                          className={user.status === 'active' ? 'text-red-600' : 'text-green-600'}
                        >
                          {user.status === 'active' ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="mt-4">
            {renderPagination()}
          </div>
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      {renderCreateUserDialog()}
      {renderEditUserDialog()}
      {renderAuditLogDialog()}
    </div>
  );
};

export default UserManagement;