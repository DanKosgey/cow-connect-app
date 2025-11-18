import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Milk, Users, Calendar, TrendingUp } from 'lucide-react';
import BatchApprovalForm from '@/components/staff/BatchApprovalForm';
import { Link } from 'react-router-dom';

const BatchApprovalPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Approval</h1>
          <p className="text-muted-foreground">Approve all milk collections for a collector on a specific date</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link to="/staff-only/milk-approval">
            <Button variant="outline">
              Individual Approval
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BatchApprovalForm />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Milk className="h-5 w-5" />
                How Batch Approval Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <h3 className="font-medium">Select Collector & Date</h3>
                  <p className="text-sm text-muted-foreground">Choose the collector and collection date for batch approval</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <h3 className="font-medium">Optional Default Value</h3>
                  <p className="text-sm text-muted-foreground">Set a default received liters value for all collections</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <h3 className="font-medium">Process Approval</h3>
                  <p className="text-sm text-muted-foreground">Click approve to process all collections at once</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <h3 className="font-medium">Automatic Calculations</h3>
                  <p className="text-sm text-muted-foreground">System automatically calculates variances and penalties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Batch approvals automatically update collector performance metrics including:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Total collections count
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Variance tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Penalty calculations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Performance scores
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BatchApprovalPage;