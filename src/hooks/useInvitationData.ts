import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invitationService } from '@/services/invitation-service';

// Define interfaces for our data structures
interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  accepted_at?: string;
  invited_by: string;
  invited_by_name?: string;
}

// Cache keys for different data types
export const INVITATION_CACHE_KEYS = {
  PENDING_INVITATIONS: 'pending-invitations',
  ALL_INVITATIONS: 'all-invitations'
};

// Main hook for Invitation Management data
export const useInvitationData = () => {
  const queryClient = useQueryClient();

  // Get pending invitations for current admin
  const usePendingInvitations = (adminId: string) => {
    return useQuery<InvitationRecord[]>({
      queryKey: [INVITATION_CACHE_KEYS.PENDING_INVITATIONS, adminId],
      queryFn: () => invitationService.getPendingInvitations(adminId),
      enabled: !!adminId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get all invitations (pending and accepted) for current admin
  const useAllInvitations = (adminId: string) => {
    return useQuery<InvitationRecord[]>({
      queryKey: [INVITATION_CACHE_KEYS.ALL_INVITATIONS, adminId],
      queryFn: () => invitationService.getAllInvitations(adminId),
      enabled: !!adminId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Resend invitation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const success = await invitationService.resendInvitation(invitationId);
      if (!success) throw new Error('Failed to resend invitation');
      return invitationId;
    },
    onSuccess: () => {
      // Invalidate all invitation caches to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.PENDING_INVITATIONS] });
      queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.ALL_INVITATIONS] });
    }
  });

  // Revoke invitation
  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const success = await invitationService.revokeInvitation(invitationId);
      if (!success) throw new Error('Failed to revoke invitation');
      return invitationId;
    },
    onSuccess: () => {
      // Invalidate all invitation caches to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.PENDING_INVITATIONS] });
      queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.ALL_INVITATIONS] });
    }
  });

  // Mutation to invalidate all invitation caches
  const invalidateInvitationCache = () => {
    queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.PENDING_INVITATIONS] });
    queryClient.invalidateQueries({ queryKey: [INVITATION_CACHE_KEYS.ALL_INVITATIONS] });
  };

  return {
    usePendingInvitations,
    useAllInvitations,
    resendInvitation: resendInvitationMutation,
    revokeInvitation: revokeInvitationMutation,
    invalidateInvitationCache
  };
};