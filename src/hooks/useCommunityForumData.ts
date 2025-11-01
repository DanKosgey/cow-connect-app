import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

// Define interfaces for our data structures
interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  likes: number;
  comments: number;
}

interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes: number;
}

interface UserProfile {
  id: string;
  full_name: string;
}

// Cache keys for different data types
export const FORUM_CACHE_KEYS = {
  POSTS: 'forum-posts',
  COMMENTS: 'forum-comments',
  USER_PROFILES: 'user-profiles'
};

// Main hook for Community Forum data
export const useCommunityForumData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get forum posts with filtering and sorting
  const useForumPosts = (searchTerm: string = '', sortBy: string = 'newest', filterBy: string = 'all') => {
    return useQuery<ForumPost[]>({
      queryKey: [FORUM_CACHE_KEYS.POSTS, searchTerm, sortBy, filterBy],
      queryFn: async () => {
        let query = supabase
          .from('forum_posts')
          .select('*')
          .limit(100);

        // Apply sorting
        switch (sortBy) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'popular':
            query = query.order('likes', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Get comments for a specific post
  const useForumComments = (postId: string) => {
    return useQuery<ForumComment[]>({
      queryKey: [FORUM_CACHE_KEYS.COMMENTS, postId],
      queryFn: async () => {
        if (!postId) return [];

        const { data, error } = await supabase
          .from('forum_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      enabled: !!postId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get user profiles for display names
  const useUserProfiles = (userIds: string[]) => {
    return useQuery<UserProfile[]>({
      queryKey: [FORUM_CACHE_KEYS.USER_PROFILES, userIds],
      queryFn: async () => {
        if (userIds.length === 0) return [];

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (error) throw error;
        return data || [];
      },
      enabled: userIds.length > 0,
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Create a new post
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          content: content,
          author_id: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate posts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Update a post
  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_posts')
        .update({
          content: content,
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate posts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Delete a post
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate posts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Add a comment to a post
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: postId,
          content: content,
          author_id: user.id
        });

      if (error) throw error;

      // Update the comment count for the post
      const { data: post } = await supabase
        .from('forum_posts')
        .select('comments')
        .eq('id', postId)
        .single();

      if (post) {
        await supabase
          .from('forum_posts')
          .update({ comments: post.comments + 1 })
          .eq('id', postId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate comments cache for this post
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.COMMENTS, variables.postId] });
      // Invalidate posts cache to update comment counts
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Update a comment
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content, postId }: { commentId: string; content: string; postId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_comments')
        .update({
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate comments cache for this post
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.COMMENTS, variables.postId] });
    }
  });

  // Delete a comment
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('forum_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      // Update the comment count for the post
      const { data: post } = await supabase
        .from('forum_posts')
        .select('comments')
        .eq('id', postId)
        .single();

      if (post) {
        await supabase
          .from('forum_posts')
          .update({ comments: Math.max(0, post.comments - 1) })
          .eq('id', postId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate comments cache for this post
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.COMMENTS, variables.postId] });
      // Invalidate posts cache to update comment counts
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Like a post
  const likePostMutation = useMutation({
    mutationFn: async ({ postId, currentLikes, isLiked }: { postId: string; currentLikes: number; isLiked: boolean }) => {
      const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
      
      const { error } = await supabase
        .from('forum_posts')
        .update({ likes: newLikes })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate posts cache to refresh like counts
      queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    }
  });

  // Mutation to invalidate all forum caches
  const invalidateForumCache = () => {
    queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.POSTS] });
    queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.COMMENTS] });
    queryClient.invalidateQueries({ queryKey: [FORUM_CACHE_KEYS.USER_PROFILES] });
  };

  return {
    useForumPosts,
    useForumComments,
    useUserProfiles,
    createPost: createPostMutation,
    updatePost: updatePostMutation,
    deletePost: deletePostMutation,
    addComment: addCommentMutation,
    updateComment: updateCommentMutation,
    deleteComment: deleteCommentMutation,
    likePost: likePostMutation,
    invalidateForumCache
  };
};