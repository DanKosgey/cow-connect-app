import React, { useState, useEffect } from 'react';
import { StaffChatWidget } from '@/components/StaffChatWidget';
import RouteManagement from '@/components/RouteManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import StaffDashboard from '../components/StaffDashboard';
import TaskMarketplace from '../components/TaskMarketplace';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ThemeToggle from '../components/ThemeToggle';
import { Collection } from '@/types';
import apiService from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { StaffSidebar } from '@/components/StaffSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { SkipLink } from '@/components/ui/SkipLink';
import { FileText, Upload, MapPin, Thermometer, FlaskConical } from 'lucide-react';
import { useToastContext } from '@/components/ToastWrapper';

export default function StaffPortal() {
  const { user, isAuthenticated, loading: authLoading, userRole } = useAuth();
  const toast = useToastContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [farmerId, setFarmerId] = useState('');
  const [liters, setLiters] = useState<number>(0);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [qualityGrade, setQualityGrade] = useState('A');
  const [dataFetchAttempted, setDataFetchAttempted] = useState(false);

  // Check if user has the correct role
  const hasCorrectRole = userRole === 'staff' || userRole === 'admin';

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (location.pathname.includes('/staff/routes')) return 'routes';
    if (location.pathname.includes('/staff/collections')) return 'marketplace';
    if (location.pathname.includes('/staff/rewards')) return 'rewards';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when route changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    switch (value) {
      case 'routes':
        navigate('/staff/routes');
        break;
      case 'marketplace':
        navigate('/staff/collections');
        break;
      case 'rewards':
        navigate('/staff/rewards');
        break;
      default:
        navigate('/staff');
        break;
    }
  };

  useEffect(() => {
    // Redirect if user doesn't have the correct role
    if (isAuthenticated && !hasCorrectRole) {
      toast.showError('Access Denied', 'You do not have permission to access the staff portal.');
      window.location.href = '/';
      return;
    }
    
    // Fetch collections data for the authenticated staff user
    const fetchCollections = async () => {
      // Don't fetch if user is not authenticated or we've already attempted
      if (!isAuthenticated || !user || dataFetchAttempted || authLoading) return;
      
      try {
        setLoading(true);
        const data = await apiService.Collections.list(100, 0, undefined, user.id);
        setCollections(data.items);
      } catch (err: any) {
        console.error('Error fetching collections:', err);
        
        // Handle authentication errors
        if (err.message && err.message.includes('401')) {
          toast.showError('Authentication Failed', 'Please log in again to access your dashboard');
          setError('Authentication failed. Please log in again.');
        } else if (err.message && err.message.includes('403')) {
          toast.showError('Access Denied', 'You do not have permission to view this data');
          setError('Access denied. You do not have permission to view this data.');
        } else {
          toast.showError('Data Load Failed', 'Failed to load collections. Please try again later.');
          setError('Failed to load collections. Please try again later.');
        }
      } finally {
        setLoading(false);
        setDataFetchAttempted(true);
      }
    };
    
    fetchCollections();
  }, [user, isAuthenticated, authLoading, dataFetchAttempted, hasCorrectRole, toast]);

  const submitCollection = async () => {
    toast.promiseToast(
      (async () => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const collectionData = {
          farmer_id: farmerId, 
          staff_id: user.id,
          liters,
          gps_latitude: latitude,
          gps_longitude: longitude,
          quality_grade: qualityGrade as 'A' | 'B' | 'C',
          validation_code: 'VALID-' + Date.now()
        };
        
        const response = await apiService.Collections.create(collectionData);
        
        // Reset form fields
        setFarmerId('');
        setLiters(0);
        setLatitude(0);
        setLongitude(0);
        setQualityGrade('A');
        setShowForm(false);
        
        // Refresh collections list
        const data = await apiService.Collections.list(100, 0, undefined, user.id);
        setCollections(data.items);
        
        return response;
      })(),
      {
        loading: 'Submitting Collection...',
        success: 'Collection recorded successfully!',
        error: 'Failed to submit collection. Please try again.'
      }
    );
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" role="status">
          <VisuallyHidden>Loading staff portal...</VisuallyHidden>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    window.location.href = '/staff/login';
    return null;
  }

  // Redirect users with incorrect role
  if (!hasCorrectRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <SkipLink targetId="main-content">Skip to main content</SkipLink>
        <StaffSidebar />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <header className="flex justify-between items-center mb-6" role="banner">
              <div>
                <h1 className="text-3xl font-bold">Welcome to DairyChain Pro Elite</h1>
                <p className="text-gray-600 mt-2">Your professional dairy management platform</p>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white" aria-label="Elite Staff Member">
                  Elite Staff Member
                </Button>
              </div>
            </header>

          <main id="main-content" role="main">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="routes">Routes</TabsTrigger>
                <TabsTrigger value="marketplace">Collections</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <StaffDashboard />
              </TabsContent>

              <TabsContent value="routes">
                <RouteManagement />
              </TabsContent>

              <TabsContent value="marketplace">
                <section aria-labelledby="collections-heading">
                  <VisuallyHidden as="h2" id="collections-heading">Collections Management</VisuallyHidden>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold">My Collections</h2>
                      <Button onClick={() => setShowForm(!showForm)} aria-label={showForm ? "Cancel collection recording" : "Record new collection"}>
                        {showForm ? 'Cancel' : 'New Collection'}
                      </Button>
                    </div>
                    
                    {showForm && (
                      <Card className="p-6">
                        <h3 className="text-xl font-semibold mb-4">Record New Collection</h3>
                        <form onSubmit={(e) => { e.preventDefault(); submitCollection(); }} className="space-y-4">
                          <div>
                            <Label htmlFor="farmerId" className="block text-sm font-medium mb-1">Farmer ID</Label>
                            <Input 
                              id="farmerId"
                              type="text" 
                              value={farmerId}
                              onChange={(e) => setFarmerId(e.target.value)}
                              placeholder="Enter farmer ID"
                              aria-describedby="farmerId-help"
                            />
                            <p id="farmerId-help" className="text-sm text-gray-500 mt-1">Unique identifier for the farmer</p>
                          </div>
                          
                          <div>
                            <Label htmlFor="liters" className="block text-sm font-medium mb-1">Liters Collected</Label>
                            <div className="relative">
                              <Input 
                                id="liters"
                                type="number" 
                                value={liters}
                                onChange={(e) => setLiters(Number(e.target.value))}
                                placeholder="Enter liters"
                                min="0.1"
                                step="0.1"
                                aria-describedby="liters-help"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-500">L</span>
                              </div>
                            </div>
                            <p id="liters-help" className="text-sm text-gray-500 mt-1">Volume of milk collected in liters</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="latitude" className="block text-sm font-medium mb-1">Latitude</Label>
                              <div className="relative">
                                <Input 
                                  id="latitude"
                                  type="number" 
                                  value={latitude}
                                  onChange={(e) => setLatitude(Number(e.target.value))}
                                  placeholder="Enter latitude"
                                  step="0.0001"
                                  aria-describedby="latitude-help"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" />
                                </div>
                              </div>
                              <p id="latitude-help" className="text-sm text-gray-500 mt-1">GPS latitude coordinate</p>
                            </div>
                            
                            <div>
                              <Label htmlFor="longitude" className="block text-sm font-medium mb-1">Longitude</Label>
                              <div className="relative">
                                <Input 
                                  id="longitude"
                                  type="number" 
                                  value={longitude}
                                  onChange={(e) => setLongitude(Number(e.target.value))}
                                  placeholder="Enter longitude"
                                  step="0.0001"
                                  aria-describedby="longitude-help"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" />
                                </div>
                              </div>
                              <p id="longitude-help" className="text-sm text-gray-500 mt-1">GPS longitude coordinate</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="qualityGrade" className="block text-sm font-medium mb-1">Quality Grade</Label>
                            <Select value={qualityGrade} onValueChange={setQualityGrade}>
                              <SelectTrigger id="qualityGrade" aria-describedby="qualityGrade-help">
                                <SelectValue placeholder="Select quality grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">Grade A</SelectItem>
                                <SelectItem value="B">Grade B</SelectItem>
                                <SelectItem value="C">Grade C</SelectItem>
                              </SelectContent>
                            </Select>
                            <p id="qualityGrade-help" className="text-sm text-gray-500 mt-1">Quality assessment of the milk</p>
                          </div>
                          
                          <Button type="submit" className="w-full" aria-label="Record collection">
                            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                            Record Collection
                          </Button>
                        </form>
                      </Card>
                    )}
                    
                    {loading ? (
                      <div className="text-center py-4" role="status">
                        <VisuallyHidden>Loading collections...</VisuallyHidden>
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {collections.length > 0 ? (
                          collections.map((collection) => (
                            <Card key={collection.id} className="p-4">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                <div>
                                  <h3 className="font-semibold">Collection #{collection.id.substring(0, 8)}</h3>
                                  <p className="text-sm text-gray-600">Farmer: {collection.farmer_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{collection.liters} liters</p>
                                  <p className="text-sm text-gray-600">Grade: {collection.quality_grade}</p>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-500">
                                {collection.timestamp && new Date(collection.timestamp).toLocaleString()}
                              </div>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No collections found. Record your first collection above.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="rewards">
                <section aria-labelledby="rewards-heading">
                  <VisuallyHidden as="h2" id="rewards-heading">Rewards and Incentives</VisuallyHidden>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Current Balance</h3>
                      <div className="text-4xl font-bold text-green-600">$2,450</div>
                      <p className="text-sm text-gray-500 mt-2">Available for withdrawal</p>
                      <Button className="w-full mt-4" aria-label="Withdraw funds">
                        Withdraw Funds
                      </Button>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Next Milestone</h3>
                      <div className="text-2xl font-bold text-purple-600">Elite Status</div>
                      <p className="text-sm text-gray-500 mt-2">Complete 5 more premium tasks</p>
                      <div className="mt-4 h-2 bg-gray-200 rounded-full">
                        <div className="h-full bg-purple-600 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Bonus Opportunities</h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Weekend Premium</span>
                          <span className="text-green-600">+25%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Quick Response</span>
                          <span className="text-green-600">+15%</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Quality Bonus</span>
                          <span className="text-green-600">+30%</span>
                        </li>
                      </ul>
                    </Card>
                  </div>
                </section>
              </TabsContent>
            </Tabs>
          </main>
        </div>
        <StaffChatWidget />
        </div>
      </div>
    </SidebarProvider>
  );
}