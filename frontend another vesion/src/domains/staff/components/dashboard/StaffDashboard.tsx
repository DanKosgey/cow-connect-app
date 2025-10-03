import React from 'react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { LineChart } from './ui/chart';

const performanceData = {
  daily: [65, 75, 82, 78, 89, 92, 95],
  weekly: [320, 380, 450, 420, 480, 520, 550],
  monthly: [1200, 1500, 1800, 1600, 2000, 2200, 2400]
};

const StaffDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Performance Score</h3>
          <div className="text-4xl font-bold text-green-600">92%</div>
          <Progress value={92} className="mt-4" />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Tasks Completed</h3>
          <div className="text-4xl font-bold text-blue-600">156</div>
          <div className="text-sm text-gray-500 mt-2">+23% from last month</div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Rewards Earned</h3>
          <div className="text-4xl font-bold text-purple-600">$2,450</div>
          <div className="text-sm text-gray-500 mt-2">This quarter</div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Performance Trends</h3>
        <div className="h-[300px]">
          <LineChart 
            data={performanceData.daily}
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Achievements</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Badge variant="success" className="p-2">
                Top Performer
              </Badge>
              <span>3 months streak</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="primary" className="p-2">
                Expert Level
              </Badge>
              <span>Achieved in Task Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="p-2">
                Innovation Star
              </Badge>
              <span>5 process improvements</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Upcoming Rewards</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Quarterly Bonus</span>
              <span className="text-green-600 font-semibold">$1,500</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Performance Incentive</span>
              <span className="text-green-600 font-semibold">$800</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Training Completion Bonus</span>
              <span className="text-green-600 font-semibold">$500</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
