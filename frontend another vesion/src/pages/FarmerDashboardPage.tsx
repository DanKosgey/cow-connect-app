import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FarmerDashboard from '@/components/farmer/FarmerDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

const FarmerDashboardPage = () => {
  const { user } = useAuth();
  const [farmerId, setFarmerId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Map the authenticated user to a farmer ID
    const fetchFarmerId = async () => {
      try {
        setLoading(true);
        // Use the authenticated user's ID as the farmer ID
        if (user && user.role === 'farmer') {
          setFarmerId(user.id);
        } else {
          setError('User is not authorized as a farmer');
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load farmer information');
        setLoading(false);
      }
    };

    if (user) {
      fetchFarmerId();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Farmer Not Found</CardTitle>
            <CardDescription>
              No farmer profile associated with your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FarmerDashboard farmerId={farmerId} />
    </div>
  );
};

export default FarmerDashboardPage;