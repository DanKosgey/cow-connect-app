import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Award, Activity } from 'lucide-react';

export function AnalyticsSkeleton() {
  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80 animate-pulse" />
          <Skeleton className="h-4 w-96 animate-pulse" />
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Skeleton className="h-10 w-40 animate-pulse" />
          <Skeleton className="h-10 w-32 animate-pulse" />
        </div>
      </div>

      {/* Business Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow animate-pulse shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px] bg-gray-300" />
                <Skeleton className="h-6 w-[100px] bg-gray-300" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full bg-gray-300" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center mt-1">
                <Skeleton className="h-3 w-[80px] bg-gray-300" />
              </div>
              <Skeleton className="h-3 w-[120px] mt-1 bg-gray-300" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Business Insights */}
      <div className="mt-8">
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <Skeleton className="h-6 w-48 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <Skeleton className="h-5 w-40 bg-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-32 bg-gray-300" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-16 bg-gray-300" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Skeleton className="w-3 h-3 rounded-full bg-gray-300" />
                                <Skeleton className="h-3 w-24 bg-gray-300" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <Skeleton className="h-5 w-40 bg-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-32 bg-gray-300" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-16 bg-gray-300" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Skeleton className="w-3 h-3 rounded-full bg-gray-300" />
                                <Skeleton className="h-3 w-24 bg-gray-300" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Collection Trends */}
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-40 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <Skeleton className="h-64 w-full rounded-lg bg-gray-300" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Forecasting */}
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-48 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <Skeleton className="h-64 w-full rounded-lg bg-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Quality Distribution */}
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-40 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-48 w-full rounded-lg bg-gray-300" />
            </div>
          </CardContent>
        </Card>

        {/* Quality Gauge */}
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-32 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <Skeleton className="h-40 w-40 rounded-full bg-gray-300" />
          </CardContent>
        </Card>

        {/* Report Generator */}
        <Card className="shadow-xl animate-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-6 w-40 bg-gray-300" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-gray-300" />
                <Skeleton className="h-10 w-full bg-gray-300" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-gray-300" />
                <Skeleton className="h-10 w-full bg-gray-300" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-gray-300" />
                <Skeleton className="h-10 w-full bg-gray-300" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-gray-300" />
                <Skeleton className="h-10 w-full bg-gray-300" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-10 w-full bg-gray-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}