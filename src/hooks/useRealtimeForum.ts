import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';

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

export function useRealtimeForumPosts() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState<ForumPost | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial forum posts
    const fetchInitialPosts = async () => {
      const { data } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      setPosts(data || []);
    };

    fetchInitialPosts();

    // Subscribe to forum post changes
    const subscription = supabase
      .channel('forum_posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_posts',
        },
        (payload) => {
          const post = payload.new as ForumPost;
          setPosts((current) => [post, ...current.slice(0, 19)]);
          setNewPost(post);
          
          // Show notification for new posts
          addNotification({
            type: 'info',
            title: 'New Forum Post',
            message: `New post: "${post.title}"`,
            autoDismiss: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'forum_posts',
        },
        (payload) => {
          const updatedPost = payload.new as ForumPost;
          setPosts((current) => 
            current.map(post => 
              post.id === updatedPost.id ? updatedPost : post
            )
          );
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return { posts, newPost };
}

export function useRealtimeForumComments(postId: string) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newComment, setNewComment] = useState<ForumComment | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Get initial comments for the post
    const fetchInitialComments = async () => {
      const { data } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      setComments(data || []);
    };

    fetchInitialComments();

    // Subscribe to forum comment changes for this specific post
    const subscription = supabase
      .channel(`forum_comments_${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const comment = payload.new as ForumComment;
          setComments((current) => [...current, comment]);
          setNewComment(comment);
          
          // Show notification for new comments
          addNotification({
            type: 'info',
            title: 'New Comment',
            message: 'Someone commented on this post',
            autoDismiss: true,
          });
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [postId, addNotification]);

  return { comments, newComment };
}