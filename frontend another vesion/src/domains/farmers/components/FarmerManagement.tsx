import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Search, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  MessageSquare,
  Filter,
  Download,
  Eye,
  Edit,
  Ban,
  Check
} from 'lucide-react';
import { FarmersAPI } from '@/services/ApiService';
import { useMessaging } from '@/hooks/useMessaging';
import { FarmerProfile, KYCStatus, FarmerStatus } from '@/types/farmerManagement';
import { Farmer } from '@/types';

interface FarmerManagementProps {
  staffId: string;
}

const FarmerManagement: React.FC<FarmerManagementProps> = ({ staffId }) => {
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FarmerStatus | 'all'>('all');
  const [kycFilter, setKycFilter] = useState<KYCStatus | 'all'>('all');
  const [selectedFarmers, setSelectedFarmers] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  const { sendMessage, markAsRead } = useMessaging();

  // Fetch farmers
  useEffect(() => {
    const fetchFarmers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, you would call the specific endpoint
        // For now, we'll use the existing FarmersAPI and transform the data
        const response = await FarmersAPI.list(100, 0, searchQuery);
        
        // Transform Farmer to FarmerProfile
        const transformedFarmers: FarmerProfile[] = response.items.map((farmer: Farmer) => ({
          id: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          email: farmer.email,
          national_id: farmer.national_id,
          address: farmer.address,
          location_coordinates: farmer.location_coordinates,
          registered_at: farmer.registered_at,
          approved_at: farmer.approved_at,
          rejected_reason: farmer.rejected_reason,
          kyc_status: farmer.kyc_status || 'pending',
          collection_history: {
            total_collections: farmer.total_collections || 0,
            total_volume: farmer.total_volume || 0,
            last_collection_date: farmer.last_collection_date,
            avg_quality: 0 // Would need to calculate from collection data
          },
          payment_status: 'active', // Would need to determine from payment data
          quality_rating: 0, // Would need to calculate from collection data
          last_collection: farmer.last_collection_date || '',
          active_issues: [], // Would need to fetch from issues API
          location: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          }
        }));
        
        setFarmers(transformedFarmers);
        setFilteredFarmers(transformedFarmers);
      } catch (err) {
        setError('Failed to fetch farmers');
        console.error('Error fetching farmers:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFarmers();
  }, [searchQuery]);

  // Apply filters
  useEffect(() => {
    let result = [...farmers];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      // In a real implementation, you would filter by actual status
      // For now, we'll skip this since we don't have status in the current data
    }
    
    // Apply KYC filter
    if (kycFilter !== 'all') {
      result = result.filter(farmer => farmer.kyc_status === kycFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(farmer => 
        farmer.name.toLowerCase().includes(query) ||
        farmer.phone.includes(query) ||
        farmer.national_id.includes(query) ||
        farmer.address.toLowerCase().includes(query)
      );
    }
    
    setFilteredFarmers(result);
  }, [farmers, statusFilter, kycFilter, searchQuery]);

  // Handle farmer selection for bulk actions
  const toggleFarmerSelection = (farmerId: string) => {
    setSelectedFarmers(prev => 
      prev.includes(farmerId) 
        ? prev.filter(id => id !== farmerId) 
        : [...prev, farmerId]
    );
  };

  // Select all farmers
  const selectAllFarmers = () => {
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([]);
    } else {
      setSelectedFarmers(filteredFarmers.map(farmer => farmer.id));
    }
  };

  // Update farmer status
  const updateFarmerStatus = async (farmerId: string, status: FarmerStatus) => {
    try {
      await FarmersAPI.updateStatus(farmerId, { status });
      
      // Update local state
      setFarmers(prev => 
        prev.map(farmer => 
          farmer.id === farmerId ? { ...farmer, payment_status: status } : farmer
        )
      );
      
      setFilteredFarmers(prev => 
        prev.map(farmer => 
          farmer.id === farmerId ? { ...farmer, payment_status: status } : farmer
        )
      );
    } catch (err) {
      setError('Failed to update farmer status');
      console.error('Error updating farmer status:', err);
    }
  };

  // Send message to farmer
  const sendMessageToFarmer = async (farmerId: string, message: string) => {
    try {
      await sendMessage({
        recipient_id: farmerId,
        recipient_type: 'farmer',
        message,
        message_type: 'text',
        priority: 'medium'
      });
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  // Export selected farmers
  const exportSelectedFarmers = async () => {
    setIsExporting(true);
    try {
      // In a real implementation, you would call an export API
      // For now, we'll simulate the export
      const dataToExport = selectedFarmers.length > 0 
        ? farmers.filter(farmer => selectedFarmers.includes(farmer.id))
        : farmers;
      
      // Create CSV content
      const csvContent = [
        ['Name', 'Phone', 'Email', 'National ID', 'Address', 'KYC Status', 'Total Collections', 'Total Volume'],
        ...dataToExport.map(farmer => [
          farmer.name,
          farmer.phone,
          farmer.email || '',
          farmer.national_id,
          farmer.address,
          farmer.kyc_status,
          farmer.collection_history.total_collections.toString(),
          farmer.collection_history.total_volume.toString()
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export farmers');
      console.error('Error exporting farmers:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Get KYC status badge variant
  const getKycStatusVariant = (status: KYCStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'in_review': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get payment status badge variant
  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspended': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Farmer Management
          </CardTitle>
          <CardDescription>
            Manage farmers, communicate with them, and track their activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dairy-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search farmers by name, phone, ID, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: FarmerStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={kycFilter} onValueChange={(value: KYCStatus | 'all') => setKycFilter(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="KYC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Bulk Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllFarmers}
              >
                {selectedFarmers.length === filteredFarmers.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-dairy-600">
                {selectedFarmers.length} selected
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportSelectedFarmers}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
          
          {/* Farmers Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                      onChange={selectAllFarmers}
                      className="h-4 w-4 rounded border-dairy-300 text-dairy-blue focus:ring-dairy-blue"
                    />
                  </TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Collection History</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Quality Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading farmers...
                    </TableCell>
                  </TableRow>
                ) : filteredFarmers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No farmers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFarmers.map((farmer) => (
                    <TableRow key={farmer.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedFarmers.includes(farmer.id)}
                          onChange={() => toggleFarmerSelection(farmer.id)}
                          className="h-4 w-4 rounded border-dairy-300 text-dairy-blue focus:ring-dairy-blue"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{farmer.name}</div>
                        <div className="text-sm text-dairy-600">ID: {farmer.national_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-dairy-500" />
                          <a href={`tel:${farmer.phone}`} className="text-sm hover:underline">
                            {farmer.phone}
                          </a>
                        </div>
                        {farmer.email && (
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="h-4 w-4 text-dairy-500" />
                            <a href={`mailto:${farmer.email}`} className="text-sm hover:underline">
                              {farmer.email}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-4 w-4 text-dairy-500" />
                          <span className="text-sm text-dairy-600 truncate max-w-[150px]">
                            {farmer.address}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getKycStatusVariant(farmer.kyc_status)}>
                          {farmer.kyc_status.charAt(0).toUpperCase() + farmer.kyc_status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{farmer.collection_history.total_collections} collections</div>
                          <div className="text-dairy-600">
                            {farmer.collection_history.total_volume}L total
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusVariant(farmer.payment_status)}>
                          {farmer.payment_status.charAt(0).toUpperCase() + farmer.payment_status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <CheckCircle 
                              key={i} 
                              className={`h-4 w-4 ${i < Math.floor(farmer.quality_rating) ? 'text-yellow-500 fill-yellow-500' : 'text-dairy-300'}`} 
                            />
                          ))}
                          <span className="ml-1 text-sm">{farmer.quality_rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => sendMessageToFarmer(farmer.id, "Hello, this is a test message")}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Select onValueChange={(value: FarmerStatus) => updateFarmerStatus(farmer.id, value)}>
                            <SelectTrigger className="w-8 h-8 p-0">
                              <Ban className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">
                                <div className="flex items-center">
                                  <Check className="h-4 w-4 mr-2" />
                                  Activate
                                </div>
                              </SelectItem>
                              <SelectItem value="suspended">
                                <div className="flex items-center">
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </div>
                              </SelectItem>
                              <SelectItem value="pending_review">
                                <div className="flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Review
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerManagement;