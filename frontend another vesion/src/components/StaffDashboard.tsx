import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { LineChart } from './ui/chart';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/ApiService';
import { Collection } from '@/types';
import { VisuallyHidden } from './ui/VisuallyHidden';
import { SkipLink } from './ui/SkipLink';

const performanceData = {
  daily: [65, 75, 82, 78, 89, 92, 95],
  weekly: [320, 380, 450, 420, 480, 520, 550],
  monthly: [1200, 1500, 1800, 1600, 2000, 2200, 2400]
};

const StaffDashboard = () => {
  // TODO: Add dark mode support using context/theme provider
  // TODO: Implement user preferences saving to localStorage
  // TODO: Add performance monitoring hooks for dashboard metrics
  // TODO: Add real-time updates using WebSocket connections
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalLiters: 0
  });
  
  useEffect(() => {
    const fetchCollections = async () => {
    // TODO: Implement caching mechanism for collections data
    // TODO: Add error retry mechanism for failed API calls
    // TODO: Add loading state management for individual components
    // TODO: Add pagination for large collections data
    if (!user) return;
      
      try {
        // Fetch recent collections
        const response = await apiService.Collections.list(5, 0, undefined, user.id);
        setCollections(response.items);
        
        // Calculate statistics
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;
        let totalLiters = 0;
        
        response.items.forEach(collection => {
          const collectionDate = new Date(collection.timestamp);
          
          // Today's collections
          if (collectionDate.toDateString() === today.toDateString()) {
            todayCount++;
          }
          
          // This week's collections
          if (collectionDate >= startOfWeek) {
            weekCount++;
          }
          
          // This month's collections
          if (collectionDate >= startOfMonth) {
            monthCount++;
          }
          
          // Total liters
          totalLiters += collection.liters;
        });
        
        setStats({
          today: todayCount,
          thisWeek: weekCount,
          thisMonth: monthCount,
          totalLiters
        });
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCollections();
  }, [user]);
  
  // Get quality grade color
  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      
      <main id="main-content" role="main">
        <section aria-labelledby="stats-heading">
          <VisuallyHidden as="h2" id="stats-heading">Dashboard Statistics</VisuallyHidden>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Today's Collections</h3>
              <div className="text-4xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-sm text-gray-500 mt-2">Collections recorded</div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">This Week</h3>
              <div className="text-4xl font-bold text-primary-600">{stats.thisWeek}</div>
              <div className="text-sm text-gray-500 mt-2">Collections</div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">This Month</h3>
              <div className="text-4xl font-bold text-purple-600">{stats.thisMonth}</div>
              <div className="text-sm text-gray-500 mt-2">Collections</div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Total Volume</h3>
              <div className="text-4xl font-bold text-orange-600">{stats.totalLiters.toFixed(1)}L</div>
              <div className="text-sm text-gray-500 mt-2">Milk collected</div>
            </Card>
          </div>
        </section>

        <section aria-labelledby="trends-heading" className="mt-8">
          <VisuallyHidden as="h2" id="trends-heading">Collection Trends</VisuallyHidden>
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Collection Trends</h3>
            <div className="h-[300px]">
              <LineChart 
                data={performanceData.daily}
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              />
            </div>
          </Card>
        </section>

        <section aria-labelledby="activity-heading" className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <VisuallyHidden as="h2" id="activity-heading">Activity</VisuallyHidden>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Recent Collections</h3>
              <Button variant="outline" size="sm" aria-label="View all collections">View All</Button>
            </div>
            
            {loading ? (
              <div className="text-center py-4 text-gray-500" role="status">
                <VisuallyHidden>Loading collections...</VisuallyHidden>
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No collections recorded yet</div>
            ) : (
              <div className="space-y-4">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{collection.farmer_name || 'Unknown Farmer'}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(collection.timestamp).toLocaleDateString()} • {collection.liters}L
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getQualityGradeColor(collection.quality_grade)}>
                        Grade {collection.quality_grade}
                      </Badge>
                      <span className="text-sm font-medium">{collection.liters}L</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Upcoming Rewards</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Quarterly Bonus</span>
                <span className="text-primary-600 font-semibold">$1,500</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Performance Incentive</span>
                <span className="text-primary-600 font-semibold">$800</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Training Completion Bonus</span>
                <span className="text-primary-600 font-semibold">$500</span>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
  // TODO: Add componentDidCatch for better error handling
  // TODO: Implement dashboard layout persistence
};

export default StaffDashboard;