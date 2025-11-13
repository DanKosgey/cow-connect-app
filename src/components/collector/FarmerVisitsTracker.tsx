import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Milk,
  Filter,
  Download,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FarmerVisit {
  id: string;
  farmerName: string;
  farmerId: string;
  visitDate: string;
  visitTime: string;
  location: string;
  litersCollected: number;
  qualityGrade: string;
  notes: string;
}

const FarmerVisitsTracker = () => {
  const { toast } = useToast();
  const [visits, setVisits] = useState<FarmerVisit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<FarmerVisit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchVisits();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [visits, searchTerm, dateFilter]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      // Mock data - in a real implementation, this would fetch from Supabase
      const mockVisits: FarmerVisit[] = [
        {
          id: '1',
          farmerName: 'John Smith',
          farmerId: 'FARMER-001',
          visitDate: '2023-06-15',
          visitTime: '08:30 AM',
          location: 'Milk Collection Point A',
          litersCollected: 45.5,
          qualityGrade: 'A',
          notes: 'Regular collection, good quality milk'
        },
        {
          id: '2',
          farmerName: 'Jane Doe',
          farmerId: 'FARMER-002',
          visitDate: '2023-06-15',
          visitTime: '09:15 AM',
          location: 'Milk Collection Point B',
          litersCollected: 38.2,
          qualityGrade: 'A+',
          notes: 'Excellent quality, high fat content'
        },
        {
          id: '3',
          farmerName: 'Robert Johnson',
          farmerId: 'FARMER-003',
          visitDate: '2023-06-14',
          visitTime: '08:45 AM',
          location: 'Milk Collection Point A',
          litersCollected: 29.8,
          qualityGrade: 'B',
          notes: 'Slightly low temperature, needs monitoring'
        },
        {
          id: '4',
          farmerName: 'Emily Wilson',
          farmerId: 'FARMER-004',
          visitDate: '2023-06-14',
          visitTime: '10:30 AM',
          location: 'Milk Collection Point C',
          litersCollected: 52.1,
          qualityGrade: 'A',
          notes: 'Consistent quality, good volume'
        },
        {
          id: '5',
          farmerName: 'Michael Brown',
          farmerId: 'FARMER-005',
          visitDate: '2023-06-13',
          visitTime: '08:00 AM',
          location: 'Milk Collection Point A',
          litersCollected: 41.7,
          qualityGrade: 'A+',
          notes: 'Outstanding quality, premium payment'
        }
      ];
      
      setVisits(mockVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast({
        title: "Error",
        description: "Failed to load farmer visits",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterVisits = () => {
    let result = visits;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(visit => 
        visit.farmerName.toLowerCase().includes(term) ||
        visit.farmerId.toLowerCase().includes(term) ||
        visit.location.toLowerCase().includes(term)
      );
    }
    
    if (dateFilter) {
      result = result.filter(visit => visit.visitDate === dateFilter);
    }
    
    setFilteredVisits(result);
  };

  const exportToCSV = () => {
    toast({
      title: "Export Started",
      description: "Farmer visits data export in progress...",
      variant: "success"
    });
    
    // In a real implementation, this would generate and download a CSV file
    console.log('Exporting visits data to CSV');
  };

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Farmer Visits Tracker</h1>
          <p className="text-muted-foreground">Track and manage your farmer visits</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Visit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer name, ID, or location..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Visit Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVisits.length > 0 ? (
            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <div 
                  key={visit.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{visit.farmerName}</h3>
                        <p className="text-sm text-muted-foreground">{visit.farmerId}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(visit.visitDate), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{visit.visitTime}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{visit.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-center">
                        <div className="font-medium">{visit.litersCollected}L</div>
                        <div className="text-xs text-muted-foreground">Collected</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityGradeColor(visit.qualityGrade)}`}>
                          {visit.qualityGrade}
                        </div>
                        <div className="text-xs text-muted-foreground">Quality</div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                  
                  {visit.notes && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <p className="text-muted-foreground">{visit.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">No visits found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerVisitsTracker;