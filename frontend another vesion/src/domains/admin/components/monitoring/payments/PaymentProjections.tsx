import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PaymentProjection {
  currentMonthLiters: number;
  currentMonthAmount: number;
  projectedNextMonthLiters: number;
  projectedNextMonthAmount: number;
  growthRate: number;
  confidenceLevel: number;
}

interface PaymentProjectionsProps {
  projection: PaymentProjection;
}

export function PaymentProjections({ projection }: PaymentProjectionsProps) {
  const {
    currentMonthLiters,
    currentMonthAmount,
    projectedNextMonthLiters,
    projectedNextMonthAmount,
    growthRate,
    confidenceLevel
  } = projection;

  const isPositiveGrowth = growthRate >= 0;

  return (
    <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Payment Projections
        </CardTitle>
        <CardDescription>Estimated earnings based on current production trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Month */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">Current Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Liters</p>
                <p className="text-xl font-bold text-gray-900">{currentMonthLiters.toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-xl font-bold text-gray-900">KSh {currentMonthAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Projected Next Month */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Projected Next Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Projected Liters</p>
                <p className="text-xl font-bold text-gray-900">{projectedNextMonthLiters.toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Projected Earnings</p>
                <p className="text-xl font-bold text-gray-900">KSh {projectedNextMonthAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Growth Rate */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Growth Rate</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {isPositiveGrowth ? '+' : ''}{(growthRate * 100).toFixed(1)}%
                </span>
                {isPositiveGrowth ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <Badge 
              className={isPositiveGrowth ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
            >
              {isPositiveGrowth ? 'Increasing' : 'Decreasing'}
            </Badge>
          </div>

          {/* Confidence Level */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Projection Confidence</p>
                <p className="text-lg font-bold text-gray-900">{(confidenceLevel * 100).toFixed(0)}%</p>
              </div>
              <Badge className="bg-purple-100 text-purple-700">
                {confidenceLevel > 0.8 ? 'High' : confidenceLevel > 0.6 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}