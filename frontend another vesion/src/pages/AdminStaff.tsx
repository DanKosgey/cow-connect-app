import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Users, 
  User, 
  UserCheck, 
  UserX,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Wifi,
  WifiOff
} from "lucide-react";
import { useEffect, useState } from 'react';
import apiService from '@/services/ApiService';
import { logger } from '../lib/logger';
import { Staff } from '@/types';

const AdminStaff = () => {
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        // For now, we'll use mock data since there's no specific staff API endpoint
        // In a real implementation, you would fetch from apiService.Staff.list()
        const mockStaff: Staff[] = [
          {
            id: '1',
            name: 'John Smith',
            phone: '+254712345678',
            email: 'john.smith@dairychain.com',
            role: 'FIELD_AGENT',
            is_active: true,
            last_active_at: new Date().toISOString(),
            assigned_routes: [],
            created_at: '2023-01-15T10:30:00Z'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            phone: '+254723456789',
            email: 'sarah.johnson@dairychain.com',
            role: 'SUPERVISOR',
            is_active: true,
            last_active_at: new Date().toISOString(),
            assigned_routes: [],
            created_at: '2023-02-20T14:15:00Z'
          },
          {
            id: '3',
            name: 'Michael Brown',
            phone: '+254734567890',
            email: 'michael.brown@dairychain.com',
            role: 'FIELD_AGENT',
            is_active: false,
            last_active_at: '2023-10-15T09:20:00Z',
            assigned_routes: [],
            created_at: '2023-03-10T11:45:00Z'
          },
          {
            id: '4',
            name: 'Emily Davis',
            phone: '+254745678901',
            email: 'emily.davis@dairychain.com',
            role: 'PROCESSOR',
            is_active: true,
            last_active_at: new Date().toISOString(),
            assigned_routes: [],
            created_at: '2023-04-05T16:30:00Z'
          },
          {
            id: '5',
            name: 'David Wilson',
            phone: '+254756789012',
            email: 'david.wilson@dairychain.com',
            role: 'ADMIN',
            is_active: true,
            last_active_at: new Date().toISOString(),
            assigned_routes: [],
            created_at: '2023-05-12T08:15:00Z'
          }
        ];
        
        setStaffMembers(mockStaff);
        setFilteredStaff(mockStaff);
        setConnectionStatus('connected');
        logger.info('Staff data fetched successfully');
      } catch (err) {
        logger.error('Error fetching staff data', err);
        setError('Failed to load staff data');
        setConnectionStatus('disconnected');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...staffMembers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.includes(term)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(s => s.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => 
        statusFilter === 'active' ? s.is_active : !s.is_active
      );
    }
    
    setFilteredStaff(result);
  }, [staffMembers, searchTerm, roleFilter, statusFilter]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'FIELD_AGENT':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Field Agent</Badge>;
      case 'SUPERVISOR':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Supervisor</Badge>;
      case 'PROCESSOR':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Processor</Badge>;
      case 'ADMIN':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Admin</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dairy-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading staff: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dairy-50">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="border border-dairy-200" />
              <div>
                <h1 className="text-3xl font-bold text-dairy-900">Staff Management</h1>
                <p className="text-dairy-600">Manage and monitor dairy collection staff</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="h-4 w-4 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              <div className="flex space-x-2">
                <Button className="bg-dairy-blue hover:bg-dairy-blue/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-dairy-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{staffMembers.length}</div>
                <p className="text-xs text-dairy-600">All registered staff</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Active Staff</CardTitle>
                <UserCheck className="h-4 w-4 text-dairy-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">
                  {staffMembers.filter(s => s.is_active).length}
                </div>
                <p className="text-xs text-dairy-600">Currently working</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Field Agents</CardTitle>
                <User className="h-4 w-4 text-dairy-amber" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">
                  {staffMembers.filter(s => s.role === 'FIELD_AGENT').length}
                </div>
                <p className="text-xs text-dairy-600">Collection staff</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Supervisors</CardTitle>
                <User className="h-4 w-4 text-dairy-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">
                  {staffMembers.filter(s => s.role === 'SUPERVISOR').length}
                </div>
                <p className="text-xs text-dairy-600">Management staff</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Controls */}
          <Card className="border-dairy-200 mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dairy-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search staff..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="FIELD_AGENT">Field Agent</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="PROCESSOR">Processor</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="border-dairy-300"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Staff Records */}
          <Card className="border-dairy-200">
            <CardHeader>
              <CardTitle className="text-dairy-900">Staff Records</CardTitle>
              <CardDescription>{filteredStaff.length} staff members found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStaff.map((staff: Staff) => (
                  <div key={staff.id} className="border border-dairy-200 rounded-lg p-4 hover:bg-dairy-50 transition-colors">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-dairy-blue/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-dairy-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-dairy-900">{staff.name}</h3>
                            <p className="text-sm text-dairy-600">{staff.email}</p>
                          </div>
                        </div>
                        {getRoleBadge(staff.role)}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-dairy-700">
                          <p>Phone: {staff.phone}</p>
                          <p className="mt-1">Joined: {new Date(staff.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(staff.is_active)}
                        </div>
                        <div className="text-sm text-dairy-700">
                          Last Active: {staff.last_active_at ? new Date(staff.last_active_at).toLocaleDateString() : 'Never'}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2">
                        <Button size="sm" variant="outline" className="border-dairy-300">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-dairy-300">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredStaff.length === 0 && (
                  <div className="text-center py-8 text-dairy-600">
                    <User className="h-12 w-12 mx-auto text-dairy-300 mb-2" />
                    <p>No staff members found matching your filters</p>
                    <Button 
                      variant="outline" 
                      className="mt-2 border-dairy-300"
                      onClick={() => {
                        setSearchTerm('');
                        setRoleFilter('all');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminStaff;