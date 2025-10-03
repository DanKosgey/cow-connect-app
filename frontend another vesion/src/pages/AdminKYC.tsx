import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Plus
} from "lucide-react";
import { useEffect, useState } from 'react';
import apiService from '@/services/ApiService';
import { logger } from '../lib/logger';
import { AddFarmerDialog } from '@/components/admin/AddFarmerDialog';

const AdminKYC = () => {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFarmerDialog, setShowAddFarmerDialog] = useState(false);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const response = await apiService.Farmers.list(100, 0);
      setFarmers(response.items); // Extract items array from paginated response
      logger.info('Farmers data fetched successfully');
    } catch (err) {
      logger.error('Error fetching farmers data', err);
      setError('Failed to load farmers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const pendingKYC = farmers.filter(f => f.kycStatus === 'pending');
  const approvedKYC = farmers.filter(f => f.kycStatus === 'approved');
  const rejectedKYC = farmers.filter(f => f.kycStatus === 'rejected');

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
          <p>Error loading KYC data: {error}</p>
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
                <h1 className="text-3xl font-bold text-dairy-900">KYC Management</h1>
                <p className="text-dairy-600">Review and manage farmer verification requests</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddFarmerDialog(true)}
              className="bg-dairy-green hover:bg-dairy-green/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Farmer
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{pendingKYC.length}</div>
                <p className="text-xs text-dairy-600">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-dairy-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{approvedKYC.length}</div>
                <p className="text-xs text-dairy-600">Verified farmers</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{rejectedKYC.length}</div>
                <p className="text-xs text-dairy-600">Declined applications</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Total Applications</CardTitle>
                <User className="h-4 w-4 text-dairy-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{farmers.length}</div>
                <p className="text-xs text-dairy-600">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending KYC Applications */}
          <Card className="border-dairy-200 mb-8">
            <CardHeader>
              <CardTitle className="text-dairy-900">Pending KYC Applications</CardTitle>
              <CardDescription>Review farmer verification documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingKYC.map((farmer: any) => (
                  <div key={farmer.id} className="border border-dairy-200 rounded-lg p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-dairy-blue/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-dairy-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-dairy-900">{farmer.name}</h3>
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              Pending Review
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-dairy-600" />
                            <span className="text-dairy-700">{farmer.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-dairy-600" />
                            <span className="text-dairy-700">{farmer.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-dairy-600" />
                            <span className="text-dairy-700">{farmer.address}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-dairy-600" />
                            <span className="text-dairy-700">ID: {farmer.nationalId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-dairy-900 mb-2">Government ID</h4>
                          <div className="w-full h-32 bg-dairy-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-8 w-8 text-dairy-400" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-dairy-900 mb-2">Selfie Verification</h4>
                          <div className="w-full h-32 bg-dairy-100 rounded-lg flex items-center justify-center">
                            <User className="h-8 w-8 text-dairy-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-6 pt-4 border-t border-dairy-200">
                      <Button className="bg-dairy-green hover:bg-dairy-green/90">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve KYC
                      </Button>
                      <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approved Farmers */}
          <Card className="border-dairy-200">
            <CardHeader>
              <CardTitle className="text-dairy-900">Approved Farmers</CardTitle>
              <CardDescription>Recently verified farmers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvedKYC.slice(0, 5).map((farmer: any) => (
                  <div key={farmer.id} className="flex items-center justify-between p-3 border border-dairy-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-dairy-green/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-dairy-green" />
                      </div>
                      <div>
                        <p className="font-medium text-dairy-900">{farmer.name}</p>
                        <p className="text-sm text-dairy-600">{farmer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-dairy-green">Approved</Badge>
                      <p className="text-xs text-dairy-600 mt-1">
                        {farmer.approvedAt ? new Date(farmer.approvedAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminKYC;