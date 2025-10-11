import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  ThumbsUp, 
  Share2, 
  Filter, 
  Search,
  Plus,
  User,
  Clock,
  Tag,
  Users,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { formatDistanceToNow } from 'date-fns';
import { useRealtimeForumPosts, useRealtimeForumComments } from "@/hooks/useRealtimeForum";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likes: number;
  comments: number;
  tags: string[];
  isLiked: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

const CommunityForumPage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ForumPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const { posts: realtimePosts, newPost: latestPost } = useRealtimeForumPosts();
  const { comments: realtimeComments, newComment: latestComment } = useRealtimeForumComments(selectedPost?.id || '');

  // Fetch forum posts
  useEffect(() => {
    const fetchForumPosts = async () => {
      try {
        setLoading(true);
        
        // Use real-time posts if available, otherwise generate mock data
        if (realtimePosts.length > 0) {
          setPosts(realtimePosts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: {
              id: post.author_id,
              name: 'Community Member', // In a real app, this would come from user data
            },
            createdAt: post.created_at,
            likes: post.likes,
            comments: post.comments,
            tags: [], // In a real app, this would come from post data
            isLiked: false
          })));
        } else {
          // Generate mock forum posts
          const mockPosts: ForumPost[] = [
            {
              id: '1',
              title: 'Best practices for dairy cow feeding in dry season',
              content: 'I\'ve been struggling with maintaining milk production during the dry season. What feeding strategies have worked for you?',
              author: {
                id: 'user1',
                name: 'John Kamau',
              },
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              likes: 24,
              comments: 8,
              tags: ['feeding', 'dry-season', 'cows'],
              isLiked: false
            },
            {
              id: '2',
              title: 'Mastitis prevention tips',
              content: 'Share your experiences with preventing mastitis in dairy cows. I\'ve found that regular teat dipping helps a lot.',
              author: {
                id: 'user2',
                name: 'Mary Wanjiru',
              },
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
              likes: 18,
              comments: 12,
              tags: ['health', 'mastitis', 'prevention'],
              isLiked: true
            },
            {
              id: '3',
              title: 'New milking parlor equipment recommendations',
              content: 'Looking to upgrade our milking parlor. Any recommendations for cost-effective yet efficient equipment?',
              author: {
                id: 'user3',
                name: 'Peter Ochieng',
              },
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              likes: 31,
              comments: 15,
              tags: ['equipment', 'milking', 'upgrade'],
              isLiked: false
            },
            {
              id: '4',
              title: 'Organic dairy farming experiences',
              content: 'Has anyone transitioned to organic dairy farming? How was your experience with certification?',
              author: {
                id: 'user4',
                name: 'Grace Njeri',
              },
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
              likes: 12,
              comments: 7,
              tags: ['organic', 'certification', 'transition'],
              isLiked: false
            },
            {
              id: '5',
              title: 'Dealing with milk spoilage during transport',
              content: 'We\'re experiencing milk spoilage issues during transport to the collection center. Any solutions?',
              author: {
                id: 'user5',
                name: 'David Mwangi',
              },
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
              likes: 9,
              comments: 5,
              tags: ['transport', 'spoilage', 'quality'],
              isLiked: false
            }
          ];
          
          setPosts(mockPosts);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching forum posts:', err);
        toast.error('Error', 'Failed to load forum posts');
        setLoading(false);
      }
    };
    
    fetchForumPosts();
  }, [realtimePosts, toast]);

  // Update comments when real-time comments change
  useEffect(() => {
    if (realtimeComments.length > 0) {
      setComments(realtimeComments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author_id,
          name: 'Community Member', // In a real app, this would come from user data
        },
        createdAt: comment.created_at,
        likes: comment.likes,
        isLiked: false
      })));
    }
  }, [realtimeComments]);

  // Update filtered posts when posts or filters change
  useEffect(() => {
    let result = [...posts];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(term) ||
        post.content.toLowerCase().includes(term) ||
        post.author.name.toLowerCase().includes(term)
      );
    }
    
    if (tagFilter !== 'all') {
      result = result.filter(post => post.tags.includes(tagFilter));
    }
    
    setFilteredPosts(result);
  }, [searchTerm, tagFilter, posts]);

  // Generate mock comments
  const generateMockComments = () => {
    // Generate mock comments
    const mockComments: Comment[] = [
      {
        id: 'c1',
        content: 'We use a combination of hay and silage during dry season. Works well for us!',
        author: {
          id: 'user6',
          name: 'Sarah Kimani',
        },
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        likes: 5,
        isLiked: false
      },
      {
        id: 'c2',
        content: 'Don\'t forget to supplement with minerals. That\'s crucial during dry season.',
        author: {
          id: 'user7',
          name: 'Robert Onyango',
        },
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        likes: 3,
        isLiked: true
      }
    ];
    
    setComments(mockComments);
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Error', 'Please fill in all required fields');
      return;
    }
    
    const tags = newPostTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    const newPost: ForumPost = {
      id: `${posts.length + 1}`,
      title: newPostTitle,
      content: newPostContent,
      author: {
        id: 'current-user',
        name: 'You',
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      tags,
      isLiked: false
    };
    
    setPosts([newPost, ...posts]);
    setFilteredPosts([newPost, ...filteredPosts]);
    setShowNewPostForm(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostTags('');
    toast.success('Success', 'Post created successfully');
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedPost) {
      toast.error('Error', 'Please enter a comment');
      return;
    }
    
    const comment: Comment = {
      id: `${comments.length + 1}`,
      content: newComment,
      author: {
        id: 'current-user',
        name: 'You',
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false
    };
    
    setComments([...comments, comment]);
    setNewComment('');
    
    // Update comment count on the post
    setPosts(posts.map(post => 
      post.id === selectedPost.id 
        ? {...post, comments: post.comments + 1} 
        : post
    ));
    
    setFilteredPosts(filteredPosts.map(post => 
      post.id === selectedPost.id 
        ? {...post, comments: post.comments + 1} 
        : post
    ));
    
    toast.success('Success', 'Comment added successfully');
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? {...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked} 
        : post
    ));
    
    setFilteredPosts(filteredPosts.map(post => 
      post.id === postId 
        ? {...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked} 
        : post
    ));
    
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        likes: selectedPost.isLiked ? selectedPost.likes - 1 : selectedPost.likes + 1,
        isLiked: !selectedPost.isLiked
      });
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? {...comment, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1, isLiked: !comment.isLiked} 
        : comment
    ));
  };

  // Get all unique tags
  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));

  const exportForumData = (format: 'csv' | 'json') => {
    try {
      // Prepare posts data for export
      const postsExportData = filteredPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author.name,
        createdAt: new Date(post.createdAt).toLocaleDateString(),
        likes: post.likes,
        comments: post.comments,
        tags: post.tags.join(', ')
      }));
      
      // Prepare comments data for export
      const commentsExportData = comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.author.name,
        createdAt: new Date(comment.createdAt).toLocaleDateString(),
        likes: comment.likes
      }));
      
      if (format === 'csv') {
        exportToCSV(postsExportData, 'forum-posts');
        exportToCSV(commentsExportData, 'forum-comments');
        toast.success('Success', 'Forum data exported as CSV');
      } else {
        exportToJSON(postsExportData, 'forum-posts');
        exportToJSON(commentsExportData, 'forum-comments');
        toast.success('Success', 'Forum data exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting forum data:', err);
      toast.error('Error', 'Failed to export forum data');
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

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Forum</h1>
            <p className="text-gray-600 mt-2">Connect with fellow farmers and share knowledge</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              onClick={() => setShowNewPostForm(!showNewPostForm)} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
            <Button onClick={() => exportForumData('csv')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => exportForumData('json')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* New Post Form - Responsive */}
        {showNewPostForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Create New Post
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Enter post title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your thoughts, questions, or experiences..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                  <Input
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                    placeholder="e.g., feeding, health, equipment"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowNewPostForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost}>
                    Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters - Responsive */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setTagFilter('all');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Forum Content - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Forum Posts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Recent Discussions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPosts.length > 0 ? (
                  <div className="space-y-6">
                    {filteredPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className={`border rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer ${
                          selectedPost?.id === post.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-full bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{post.title}</h3>
                              <p className="text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {post.tags.map(tag => (
                                  <span 
                                    key={tag} 
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{post.author.name}</span>
                            <span>•</span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <button 
                              className="flex items-center space-x-1 text-sm hover:text-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikePost(post.id);
                              }}
                            >
                              <ThumbsUp className={`h-4 w-4 ${post.isLiked ? 'text-primary fill-current' : ''}`} />
                              <span>{post.likes}</span>
                            </button>
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments}</span>
                            </div>
                            <button className="text-muted-foreground hover:text-primary transition-colors">
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Post Details & Comments - Responsive */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPost ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold">{selectedPost.title}</h2>
                      <div className="flex items-center mt-2 text-sm text-muted-foreground">
                        <span>{selectedPost.author.name}</span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-4 text-gray-700">{selectedPost.content}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {selectedPost.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <button 
                        className="flex items-center space-x-1 hover:text-primary transition-colors"
                        onClick={() => handleLikePost(selectedPost.id)}
                      >
                        <ThumbsUp className={`h-5 w-5 ${selectedPost.isLiked ? 'text-primary fill-current' : ''}`} />
                        <span>{selectedPost.likes} likes</span>
                      </button>
                      <button className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors">
                        <Share2 className="h-5 w-5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No post selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a post from the list to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section - Responsive */}
            {selectedPost && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Comments ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Add Comment Form */}
                    <div className="flex space-x-3">
                      <div className="p-2 rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={3}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button 
                            size="sm" 
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                          >
                            Post Comment
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-6">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                          <div className="p-2 rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{comment.author.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="mt-2 text-gray-700">{comment.content}</p>
                            </div>
                            <div className="mt-2 flex items-center space-x-4">
                              <button 
                                className="flex items-center space-x-1 text-xs hover:text-primary transition-colors"
                                onClick={() => handleLikeComment(comment.id)}
                              >
                                <ThumbsUp className={`h-4 w-4 ${comment.isLiked ? 'text-primary fill-current' : ''}`} />
                                <span>{comment.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CommunityForumPage;