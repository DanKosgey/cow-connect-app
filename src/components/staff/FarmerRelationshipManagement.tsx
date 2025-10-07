import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Phone, 
  Mail, 
  User, 
  Users, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';

interface Farmer {
  id: string;
  user_id: string;
  national_id: string;
  address: string;
  kyc_status: string;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string;
    email: string;
  } | null;
  farmer_analytics: {
    total_liters: number;
    total_collections: number;
    current_month_earnings: number;
  } | null;
}

interface Communication {
  id: string;
  farmer_id: string;
  staff_id: string;
  message: string;
  direction: 'sent' | 'received';
  created_at: string;
  farmer: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface Note {
  id: string;
  farmer_id: string;
  staff_id: string;
  note: string;
  created_at: string;
}

const FarmerRelationshipManagement = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  
  // Communication state
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'farmers' | 'communications' | 'notes'>('farmers');

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [farmers, searchTerm, kycStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get staff info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (staffError) throw staffError;
      if (!staffData) throw new Error('Staff record not found');
      
      setStaffId(staffData.id);

      // Fetch approved farmers
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          user_id,
          national_id,
          address,
          kyc_status,
          created_at,
          profiles (
            full_name,
            phone,
            email
          ),
          farmer_analytics (
            total_liters,
            total_collections,
            current_month_earnings
          )
        `)
        .order('profiles.full_name', { foreignTable: 'profiles' });

      if (farmersError) throw farmersError;
      setFarmers(farmersData || []);

      // Fetch recent communications
      const { data: communicationsData, error: communicationsError } = await supabase
        .from('farmer_communications')
        .select(`
          id,
          farmer_id,
          staff_id,
          message,
          direction,
          created_at,
          farmer (
            profiles (
              full_name
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (communicationsError) throw communicationsError;
      setCommunications(communicationsData || []);

      // Fetch recent notes
      const { data: notesData, error: notesError } = await supabase
        .from('farmer_notes')
        .select(`
          id,
          farmer_id,
          staff_id,
          note,
          created_at
        `)
        .eq('staff_id', staffData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError('Error', error.message || 'Failed to load farmer relationship data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...farmers];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(farmer => 
        farmer.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.national_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.profiles?.phone.includes(searchTerm) ||
        farmer.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply KYC status filter
    if (kycStatus) {
      filtered = filtered.filter(farmer => farmer.kyc_status === kycStatus);
    }
    
    setFilteredFarmers(filtered);
  };

  const sendMessage = async () => {
    if (!selectedFarmer || !newMessage.trim() || !staffId) return;
    
    try {
      const { error } = await supabase
        .from('farmer_communications')
        .insert({
          farmer_id: selectedFarmer.id,
          staff_id: staffId,
          message: newMessage,
          direction: 'sent'
        });

      if (error) throw error;
      
      // Add to local state
      const newCommunication: Communication = {
        id: Date.now().toString(),
        farmer_id: selectedFarmer.id,
        staff_id: staffId,
        message: newMessage,
        direction: 'sent',
        created_at: new Date().toISOString(),
        farmer: {
          profiles: {
            full_name: selectedFarmer.profiles?.full_name || 'Unknown Farmer'
          }
        }
      };
      
      setCommunications(prev => [newCommunication, ...prev]);
      setNewMessage('');
      show('Success', 'Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      showError('Error', error.message || 'Failed to send message');
    }
  };

  const addNote = async () => {
    if (!selectedFarmer || !newNote.trim() || !staffId) return;
    
    try {
      const { error } = await supabase
        .from('farmer_notes')
        .insert({
          farmer_id: selectedFarmer.id,
          staff_id: staffId,
          note: newNote
        });

      if (error) throw error;
      
      // Add to local state
      const newNoteItem: Note = {
        id: Date.now().toString(),
        farmer_id: selectedFarmer.id,
        staff_id: staffId,
        note: newNote,
        created_at: new Date().toISOString()
      };
      
      setNotes(prev => [newNoteItem, ...prev]);
      setNewNote('');
      show('Success', 'Note added successfully');
    } catch (error: any) {
      console.error('Error adding note:', error);
      showError('Error', error.message || 'Failed to add note');
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const initiateCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const initiateEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Relationship Management</h1>
          <p className="text-gray-600 mt-1">
            Manage communications and relationships with farmers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <nav className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'farmers'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Farmers
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'communications'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Communications
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'notes'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Notes
          </button>
        </nav>
      </div>

      {/* Farmers Tab */}
      {activeTab === 'farmers' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search farmers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* KYC Status Filter */}
                <Select value={kycStatus} onValueChange={setKycStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="KYC Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setKycStatus('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Farmers List */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Farmer Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFarmers.length > 0 ? (
                <div className="space-y-4">
                  {filteredFarmers.map((farmer) => (
                    <div 
                      key={farmer.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 mb-3 sm:mb-0">
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm" />
                        <div>
                          <div className="font-medium">
                            {farmer.profiles?.full_name || 'Unknown Farmer'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {farmer.national_id}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-center">
                          <div className="font-medium">
                            {farmer.farmer_analytics?.total_collections || 0}
                          </div>
                          <div className="text-xs text-gray-500">Collections</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium">
                            {farmer.farmer_analytics?.total_liters?.toFixed(1) || '0.0'}L
                          </div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium">
                            KSh {farmer.farmer_analytics?.current_month_earnings?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-xs text-gray-500">This Month</div>
                        </div>
                        
                        <div className="text-center">
                          <Badge className={getKycStatusColor(farmer.kyc_status)}>
                            {farmer.kyc_status}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">KYC</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedFarmer(farmer);
                              setActiveTab('communications');
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Contact
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedFarmer(farmer);
                              setActiveTab('notes');
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Note
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No farmers found</h3>
                  <p className="text-gray-500">
                    {farmers.length === 0 
                      ? "No farmers in the system." 
                      : "No farmers match your current filters."}
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm('');
                      setKycStatus('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Communications Tab */}
      {activeTab === 'communications' && (
        <div className="space-y-6">
          {/* Selected Farmer Header */}
          {selectedFarmer && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm" />
                    <div>
                      <div className="font-medium">
                        {selectedFarmer.profiles?.full_name || 'Unknown Farmer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedFarmer.national_id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => selectedFarmer.profiles?.phone && initiateCall(selectedFarmer.profiles.phone)}
                      disabled={!selectedFarmer.profiles?.phone}
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => selectedFarmer.profiles?.email && initiateEmail(selectedFarmer.profiles.email)}
                      disabled={!selectedFarmer.profiles?.email}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedFarmer(null)}
                    >
                      Back to List
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Message */}
          {selectedFarmer && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication History */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length > 0 ? (
                <div className="space-y-4">
                  {communications
                    .filter(comm => !selectedFarmer || comm.farmer_id === selectedFarmer.id)
                    .map((communication) => (
                      <div 
                        key={communication.id} 
                        className={`p-4 rounded-lg ${
                          communication.direction === 'sent' 
                            ? 'bg-blue-50 border border-blue-100' 
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              communication.direction === 'sent' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {communication.direction === 'sent' ? (
                                <Send className="h-4 w-4" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {communication.direction === 'sent' 
                                  ? 'You' 
                                  : communication.farmer?.profiles?.full_name || 'Farmer'}
                              </div>
                              <div className="text-gray-700 mt-1">
                                {communication.message}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                {format(new Date(communication.created_at), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No communications yet</h3>
                  <p className="text-gray-500">
                    {selectedFarmer 
                      ? `Start a conversation with ${selectedFarmer.profiles?.full_name || 'this farmer'}.` 
                      : "Select a farmer to view communication history."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Selected Farmer Header */}
          {selectedFarmer && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm" />
                    <div>
                      <div className="font-medium">
                        {selectedFarmer.profiles?.full_name || 'Unknown Farmer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedFarmer.national_id}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedFarmer(null)}
                  >
                    Back to List
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Note */}
          {selectedFarmer && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Add a note about this farmer..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={addNote}
                      disabled={!newNote.trim()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes History */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length > 0 ? (
                <div className="space-y-4">
                  {notes
                    .filter(note => !selectedFarmer || note.farmer_id === selectedFarmer.id)
                    .map((note) => (
                      <div 
                        key={note.id} 
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-gray-700">
                                {note.note}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No notes yet</h3>
                  <p className="text-gray-500">
                    {selectedFarmer 
                      ? `Add a note about ${selectedFarmer.profiles?.full_name || 'this farmer'}.` 
                      : "Select a farmer to view or add notes."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FarmerRelationshipManagement;