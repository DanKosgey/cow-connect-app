import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  ThumbsUp, 
  User,
  Clock,
  Bot,
  Sparkles,
  AlertCircle,
  BookOpen,
  Bell,
  X,
  Send,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useRealtimeForumPosts, useRealtimeForumComments } from "@/hooks/useRealtimeForum";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { PageHeader } from "@/components/PageHeader";
import RefreshButton from "@/components/ui/RefreshButton";
import { useCommunityForumData } from "@/hooks/useCommunityForumData";

const GEMINI_API_KEY = "AIzaSyAbRPjA1V7byZ5db23NOxWtY1UX7qp5h8M";

// Notification Component
const NotificationCenter = ({ notifications, onClose, onClear }) => {
  return (
    <div className="absolute top-16 right-4 w-96 bg-white rounded-lg shadow-2xl border-2 border-blue-500 z-50 max-h-[500px] overflow-hidden flex flex-col md:w-96 sm:w-80 xs:w-72 notification-center">
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Notifications ({notifications.length})
        </h3>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button onClick={onClear} className="text-sm text-blue-600 hover:text-blue-800">
              Clear All
            </button>
          )}
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notif, idx) => (
              <div key={idx} className={`p-4 hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${notif.type === 'ai' ? 'bg-purple-100' : 'bg-green-100'}`}>
                    {notif.type === 'ai' ? 
                      <Bot className="h-4 w-4 text-purple-600" /> : 
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{notif.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// AI Chat Center Component
const AIChatCenter = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGeminiAPI = async (userMessage) => {
    try {
      const systemPrompt = `You are Dr. Dairy AI, a PhD-level dairy science specialist. You provide evidence-based advice on:
- Dairy cattle nutrition and feeding strategies
- Milk production optimization techniques
- Disease prevention and herd health management
- Breeding and genetics
- Farm management best practices

CRITICAL BOUNDARIES - You MUST follow these rules:
1. For animal disease diagnosis or treatment: Say "⚠️ Please consult a licensed veterinarian immediately for proper diagnosis and treatment."
2. For animal health emergencies: Say "🚨 This requires urgent veterinary attention. Contact your local vet right away."
3. For legal/regulatory matters: Say "Please consult your local agricultural extension office or legal advisor."
4. For financial/investment advice: Say "Please consult a financial advisor for investment decisions."

Always cite scientific sources when possible (e.g., Journal of Dairy Science, ILRI Research, FAO guidelines).
Be concise, practical, and farmer-friendly in your language.
Use bullet points and clear formatting for better readability.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: systemPrompt + "\n\nFarmer's Question: " + userMessage
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Details:', errorData);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // More helpful error message
      if (error.message.includes('API request failed: 400')) {
        return "⚠️ I encountered an error processing your request. This might be due to API configuration. Please try rephrasing your question or contact support if this continues.";
      } else if (error.message.includes('API request failed: 429')) {
        return "⚠️ I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (error.message.includes('API request failed: 403')) {
        return "⚠️ There's an authentication issue with the API. Please contact the administrator to check the API key configuration.";
      } else {
        return "⚠️ I'm having trouble connecting right now. Please check your internet connection and try again. If the issue persists, contact support.";
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const aiResponse = await callGeminiAPI(input);

    const aiMessage = {
      role: 'ai',
      content: aiResponse,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (confirm('Clear all chat history?')) {
      setMessages([]);
    }
  };

  return (
    <Card className="h-[500px] md:h-[600px] flex flex-col shadow-lg ai-chat-card">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">Dr. Dairy AI</div>
              <div className="text-xs font-normal opacity-90">PhD Dairy Science Specialist</div>
            </div>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-friendly"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Disclaimer */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              <strong>Important:</strong> For animal health emergencies, disease diagnosis, or treatment decisions, always consult a licensed veterinarian.
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Ask Dr. Dairy AI Anything!</h3>
              <p className="text-sm text-gray-600 mb-6">Get expert advice on dairy farming</p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <button
                  onClick={() => setInput('What are the best feeding practices during dry season?')}
                  className="p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors text-left touch-friendly"
                >
                  <div className="text-2xl mb-1">🌾</div>
                  <div className="text-xs font-medium text-gray-700">Feeding Strategies</div>
                </button>
                <button
                  onClick={() => setInput('How can I prevent mastitis in my dairy herd?')}
                  className="p-3 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors text-left touch-friendly"
                >
                  <div className="text-2xl mb-1">🏥</div>
                  <div className="text-xs font-medium text-gray-700">Disease Prevention</div>
                </button>
                <button
                  onClick={() => setInput('What factors affect milk quality?')}
                  className="p-3 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors text-left touch-friendly"
                >
                  <div className="text-2xl mb-1">🥛</div>
                  <div className="text-xs font-medium text-gray-700">Milk Quality</div>
                </button>
                <button
                  onClick={() => setInput('Best practices for breeding dairy cows?')}
                  className="p-3 bg-white rounded-lg border-2 border-pink-200 hover:border-pink-400 transition-colors text-left touch-friendly"
                >
                  <div className="text-2xl mb-1">🐄</div>
                  <div className="text-xs font-medium text-gray-700">Breeding Tips</div>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-2 rounded-full h-fit ${msg.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  {msg.role === 'user' ? 
                    <User className="h-5 w-5 text-blue-600" /> : 
                    <Bot className="h-5 w-5 text-purple-600" />
                  }
                </div>
                <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="p-2 rounded-full bg-purple-100 h-fit">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about feeding, health, breeding, milk quality..."
              rows={2}
              className="flex-1 resize-none"
              disabled={loading}
            />
            <Button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 px-6 touch-friendly"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Discussion Forum Component
const DiscussionForum = ({ onNewNotification }) => {
  const { posts: realtimePosts, newPost } = useRealtimeForumPosts();
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostContent, setEditingPostContent] = useState('');
  const [showComments, setShowComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [postComments, setPostComments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const { useForumPosts, useForumComments, useUserProfiles, createPost, updatePost, deletePost: deletePostMutation, addComment, updateComment, deleteComment: deleteCommentMutation, likePost } = useCommunityForumData();

  // Get forum posts with caching
  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useForumPosts(searchTerm, sortBy, filterBy);
  
  // Combine realtime posts with cached posts
  const combinedPosts = [...posts, ...realtimePosts.filter(post => !posts.some(p => p.id === post.id))];

  // Get user profiles for display names
  const [userProfiles, setUserProfiles] = useState({});

  // Get comments for a post
  const getCommentsForPost = (postId) => {
    return postComments[postId] || [];
  };

  // Fetch comments when showing comments for a post
  useEffect(() => {
    const fetchComments = async () => {
      const postIds = Object.keys(showComments).filter(id => showComments[id]);
      for (const postId of postIds) {
        const { data, error } = await supabase
          .from('forum_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setPostComments(prev => ({
            ...prev,
            [postId]: data
          }));
          
          // Fetch user profiles for comment authors
          const authorIds = [...new Set(data.map(comment => comment.author_id))];
          if (authorIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', authorIds);
            
            if (!profilesError && profilesData) {
              const profileMap = {};
              profilesData.forEach(profile => {
                profileMap[profile.id] = profile.full_name || 'Unknown User';
              });
              setUserProfiles(prev => ({
                ...prev,
                ...profileMap
              }));
            }
          }
        }
      }
    };

    fetchComments();
  }, [showComments]);

  // Fetch user profiles for all post authors
  const fetchUserProfiles = useCallback(async () => {
    if (combinedPosts.length > 0) {
      const authorIds = [...new Set(combinedPosts.map(post => post.author_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      
      if (!error && data) {
        const profileMap = {};
        data.forEach(profile => {
          profileMap[profile.id] = profile.full_name || 'Unknown User';
        });
        setUserProfiles(profileMap);
      }
    }
  }, [combinedPosts]);

  useEffect(() => {
    fetchUserProfiles();
  }, [fetchUserProfiles]);

  // Fetch user profile for new post author
  useEffect(() => {
    if (newPost) {
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', newPost.author_id)
          .single();
        
        if (!error && data) {
          setUserProfiles(prev => ({
            ...prev,
            [newPost.author_id]: data.full_name || 'Unknown User'
          }));
        }
      };

      fetchUserProfile();
    }
  }, [newPost]);

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return;

    try {
      await createPost.mutateAsync(newPostContent);
      setNewPostContent('');
      onNewNotification({
        type: 'post',
        title: 'Post Published',
        message: 'Your post has been shared with the community',
        time: 'Just now',
        read: false
      });
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const startEditingPost = (post) => {
    if (user && post.author_id === user.id) {
      setEditingPostId(post.id);
      setEditingPostContent(post.content);
    }
  };

  const saveEditedPost = async (postId) => {
    if (!editingPostContent.trim() || !user) return;

    try {
      await updatePost.mutateAsync({ postId, content: editingPostContent });
      setEditingPostId(null);
      setEditingPostContent('');
      onNewNotification({
        type: 'post',
        title: 'Post Updated',
        message: 'Your post has been updated',
        time: 'Just now',
        read: false
      });
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePostMutation.mutateAsync(postId);
        onNewNotification({
          type: 'post',
          title: 'Post Deleted',
          message: 'Your post has been deleted',
          time: 'Just now',
          read: false
        });
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleLike = async (postId, currentLikes, isLiked) => {
    try {
      await likePost.mutateAsync({ postId, currentLikes, isLiked });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCommentChange = (postId, text) => {
    setCommentText(prev => ({
      ...prev,
      [postId]: text
    }));
  };

  const handleComment = async (postId) => {
    const text = commentText[postId] || '';
    if (!text.trim() || !user) return;

    try {
      await addComment.mutateAsync({ postId, content: text });
      
      // Clear comment text for this post
      setCommentText(prev => ({
        ...prev,
        [postId]: ''
      }));
      
      // Refresh comments for this post
      setShowComments(prev => ({
        ...prev,
        [postId]: false
      }));
      setTimeout(() => setShowComments(prev => ({
        ...prev,
        [postId]: true
      })), 100);
      
      onNewNotification({
        type: 'comment',
        title: 'Comment Added',
        message: 'Your comment has been posted',
        time: 'Just now',
        read: false
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const startEditingComment = (comment) => {
    if (user && comment.author_id === user.id) {
      setEditingCommentId(comment.id);
      setEditingCommentContent(comment.content);
    }
  };

  const saveEditedComment = async (commentId, postId) => {
    if (!editingCommentContent.trim() || !user) return;

    try {
      await updateComment.mutateAsync({ commentId, content: editingCommentContent, postId });
      setEditingCommentId(null);
      setEditingCommentContent('');
      
      // Refresh comments for this post
      setShowComments(prev => ({
        ...prev,
        [postId]: false
      }));
      setTimeout(() => setShowComments(prev => ({
        ...prev,
        [postId]: true
      })), 100);
      
      onNewNotification({
        type: 'comment',
        title: 'Comment Updated',
        message: 'Your comment has been updated',
        time: 'Just now',
        read: false
      });
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteCommentMutation.mutateAsync({ commentId, postId });
        
        // Refresh comments for this post
        setShowComments(prev => ({
          ...prev,
          [postId]: false
        }));
        setTimeout(() => setShowComments(prev => ({
          ...prev,
          [postId]: true
        })), 100);
        
        onNewNotification({
          type: 'comment',
          title: 'Comment Deleted',
          message: 'Your comment has been deleted',
          time: 'Just now',
          read: false
        });
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Filter and sort posts
  const filteredAndSortedPosts = combinedPosts
    .filter(post => {
      // Search filter
      if (searchTerm && !post.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // User filter
      if (filterBy === 'mine' && user && post.author_id !== user.id) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'popular') {
        return b.likes - a.likes;
      }
      return 0;
    });

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  return (
    <Card className="shadow-lg discussion-card">
      <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Community Discussion
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search discussions..."
              className="pl-10"
            />
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2 filter-controls">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 touch-friendly"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm filter-select"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="popular">Most Liked</option>
                </select>
                
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm filter-select"
                >
                  <option value="all">All Posts</option>
                  <option value="mine">My Posts</option>
                </select>
              </div>
            )}
            
            <div className="ml-auto">
              <RefreshButton 
                isRefreshing={postsLoading} 
                onRefresh={refetchPosts}
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* New Post Form */}
        <div className="mb-8 p-4 bg-white rounded-lg border shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Start a Discussion
          </h3>
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts, ask questions, or start a discussion..."
            rows={3}
            className="mb-3"
          />
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {newPostContent.length}/500 characters
            </div>
            <Button 
              onClick={handlePost}
              disabled={!newPostContent.trim() || newPostContent.length > 500}
              className="bg-green-600 hover:bg-green-700 touch-friendly"
            >
              <Send className="h-4 w-4 mr-2" />
              Post
            </Button>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {filteredAndSortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No discussions yet</h3>
              <p className="text-gray-500">Be the first to start a conversation!</p>
            </div>
          ) : (
            filteredAndSortedPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                        {userProfiles[post.author_id]?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {userProfiles[post.author_id] || 'Unknown User'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {user && post.author_id === user.id && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingPost(post)}
                          className="p-2 touch-friendly"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 touch-friendly"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    {editingPostId === post.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingPostContent}
                          onChange={(e) => setEditingPostContent(e.target.value)}
                          rows={3}
                          className="mb-2"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => saveEditedPost(post.id)}
                            size="sm"
                            className="touch-friendly"
                          >
                            Save
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingPostId(null)}
                            size="sm"
                            className="touch-friendly"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
                    )}
                  </div>

                  {/* Post Stats */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <button 
                      onClick={() => handleLike(post.id, post.likes, false)}
                      className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors touch-friendly"
                    >
                      <ThumbsUp className="h-5 w-5" />
                      <span>{post.likes}</span>
                    </button>
                    <button 
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors touch-friendly"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>{post.comments}</span>
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="border-t border-gray-100 bg-gray-50 rounded-b-lg">
                    <div className="p-4">
                      {/* Add Comment Form */}
                      <div className="mb-4">
                        <Textarea
                          value={commentText[post.id] || ''}
                          onChange={(e) => handleCommentChange(post.id, e.target.value)}
                          placeholder="Add a comment..."
                          rows={2}
                          className="mb-2"
                        />
                        <Button 
                          onClick={() => handleComment(post.id)}
                          size="sm"
                          disabled={!commentText[post.id]?.trim()}
                          className="touch-friendly"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Comment
                        </Button>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-4">
                        {getCommentsForPost(post.id).map((comment) => (
                          <div key={comment.id} className="bg-white p-3 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                  {userProfiles[comment.author_id]?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <div className="font-medium text-sm text-gray-900">
                                    {userProfiles[comment.author_id] || 'Unknown User'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTime(comment.created_at)}
                                  </div>
                                </div>
                              </div>
                              {user && comment.author_id === user.id && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingComment(comment)}
                                    className="p-1 h-8 w-8 touch-friendly"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comment.id, post.id)}
                                    className="p-1 h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50 touch-friendly"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-10">
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                    rows={2}
                                    className="text-sm mb-1"
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={() => saveEditedComment(comment.id, post.id)}
                                      size="sm"
                                      className="text-xs h-8 touch-friendly"
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setEditingCommentId(null)}
                                      size="sm"
                                      className="text-xs h-8 touch-friendly"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-700 text-sm whitespace-pre-line">{comment.content}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function CommunityForumPage() {
  const [activeTab, setActiveTab] = useState('forum');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 p-4 forum-container">
      <PageHeader 
        title="Community Forum" 
      />
      
      <div className="max-w-6xl mx-auto mt-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('forum')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'forum'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageCircle className="inline h-4 w-4 mr-2" />
            Discussion Forum
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bot className="inline h-4 w-4 mr-2" />
            Dr. Dairy AI Assistant
          </button>
        </div>

        {/* Notification Bell */}
        <div className="fixed top-4 right-4 z-40">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative bg-white shadow-lg border-2 border-blue-500 hover:bg-blue-50 touch-friendly"
          >
            <Bell className="h-5 w-5 text-blue-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </Button>
          
          {showNotifications && (
            <NotificationCenter
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
              onClear={clearNotifications}
            />
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'forum' ? (
          <DiscussionForum onNewNotification={handleNewNotification} />
        ) : (
          <AIChatCenter />
        )}
      </div>
    </div>
  );
}