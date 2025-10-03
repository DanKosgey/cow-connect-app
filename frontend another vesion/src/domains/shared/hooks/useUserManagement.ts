import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersAPI } from '@/services/ApiService';
import { 
  User, 
  UserListResponse, 
  CreateUserRequest, 
  CreateUserResponse, 
  UpdateUserPermissionsRequest,
  UserStatus,
  Role,
  Permission
} from '@/types/userManagement';

interface UseUserManagementProps {
  initialPage?: number;
  initialRole?: string;
  initialStatus?: string;
  initialSearch?: string;
  refetchInterval?: number;
}

export const useUserManagement = ({
  initialPage = 1,
  initialRole = 'all',
  initialStatus = 'all',
  initialSearch = '',
  refetchInterval = 60000 // 1 minute
}: UseUserManagementProps = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(initialPage);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Fetch users with pagination and filtering
  const { data, isLoading, error, refetch } = useQuery<UserListResponse>({
    queryKey: ['users', page, role, status, search],
    queryFn: () => UsersAPI.list(page, role, status, search),
    refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Fetch roles and permissions
  const { data: rolesAndPermissions } = useQuery({
    queryKey: ['roles-permissions'],
    queryFn: UsersAPI.getRolesAndPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update roles and permissions when they load
  useEffect(() => {
    if (rolesAndPermissions) {
      setRoles(rolesAndPermissions.roles);
      setPermissions(rolesAndPermissions.permissions);
    }
  }, [rolesAndPermissions]);

  // Create user mutation
  const { mutate: createUser, isPending: isCreatingUser } = useMutation({
    mutationFn: (userData: CreateUserRequest) => UsersAPI.create(userData),
    onSuccess: (response: CreateUserResponse) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      
      // Show success message with temporary password if provided
      if (response.temporary_password) {
        alert(`User created successfully. Temporary password: ${response.temporary_password}`);
      } else {
        alert('User created successfully. Activation email sent.');
      }
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Please try again.');
    }
  });

  // Update user permissions mutation
  const { mutate: updateUserPermissions, isPending: isUpdatingPermissions } = useMutation({
    mutationFn: ({ userId, permissionData }: { userId: string, permissionData: UpdateUserPermissionsRequest }) => 
      UsersAPI.updatePermissions(userId, permissionData),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', selectedUser?.id] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      alert('User permissions updated successfully.');
    },
    onError: (error) => {
      console.error('Failed to update user permissions:', error);
      alert('Failed to update user permissions. Please try again.');
    }
  });

  // Update user status mutation
  const { mutate: updateUserStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: ({ userId, status }: { userId: string, status: UserStatus }) => 
      UsersAPI.updateStatus(userId, status),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', selectedUser?.id] });
      alert('User status updated successfully.');
    },
    onError: (error) => {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status. Please try again.');
    }
  });

  // Delete user mutation
  const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
    mutationFn: (userId: string) => UsersAPI.delete(userId),
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('User deleted successfully.');
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  });

  // Reset user password mutation
  const { mutate: resetPassword, isPending: isResettingPassword } = useMutation({
    mutationFn: (userId: string) => UsersAPI.resetPassword(userId),
    onSuccess: (response) => {
      if (response.temporary_password) {
        alert(`Password reset successfully. New temporary password: ${response.temporary_password}`);
      } else {
        alert('Password reset email sent successfully.');
      }
    },
    onError: (error) => {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password. Please try again.');
    }
  });

  // Change page
  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Change role filter
  const changeRole = useCallback((newRole: string) => {
    setRole(newRole);
    setPage(1); // Reset to first page when changing filters
  }, []);

  // Change status filter
  const changeStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    setPage(1); // Reset to first page when changing filters
  }, []);

  // Change search query
  const changeSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page when changing filters
  }, []);

  // Open create user modal
  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  // Close create user modal
  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  // Open edit user modal
  const openEditModal = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  }, []);

  // Close edit user modal
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
  }, []);

  // Open audit log modal
  const openAuditLog = useCallback((user: User) => {
    setSelectedUser(user);
    setIsAuditLogOpen(true);
  }, []);

  // Close audit log modal
  const closeAuditLog = useCallback(() => {
    setIsAuditLogOpen(false);
    setSelectedUser(null);
  }, []);

  // Export users data
  const exportUsers = useCallback(async () => {
    try {
      if (!data) return;
      
      // Create CSV content
      const csvContent = [
        ['ID', 'Name', 'Email', 'Role', 'Status', 'Last Login', 'Created At'],
        ...data.users.map(user => [
          user.id,
          user.name,
          user.email,
          user.role,
          user.status,
          user.last_login || '',
          user.created_at
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting users:', err);
      alert('Failed to export users. Please try again.');
    }
  }, [data]);

  return {
    // Data
    users: data?.users || [],
    pagination: data?.pagination,
    summary: data?.summary,
    roles,
    permissions,
    selectedUser,
    isCreateModalOpen,
    isEditModalOpen,
    isAuditLogOpen,
    isLoading,
    error,
    
    // Mutations
    createUser,
    isCreatingUser,
    updateUserPermissions,
    isUpdatingPermissions,
    updateUserStatus,
    isUpdatingStatus,
    deleteUser,
    isDeletingUser,
    resetPassword,
    isResettingPassword,
    
    // Actions
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
  };
};