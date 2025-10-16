import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NetworkService } from '@/services/network-service';
import { useToast } from '@/components/ui/use-toast';
import { NetworkDiagnostics } from '@/types/network';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function NetworkDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const networkService = new NetworkService();

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const results = await networkService.runSystemDiagnostics();
      setDiagnostics(results);
      toast({
        title: 'Diagnostics Complete',
        description: 'Network diagnostics have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run network diagnostics.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  if (!diagnostics && isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Network Diagnostics</h2>
        <Button 
          onClick={runDiagnostics} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="latency">Latency</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant={diagnostics?.systemStatus.healthy ? 'default' : 'destructive'}>
                  <AlertTitle>
                    {diagnostics?.systemStatus.healthy ? 'System Healthy' : 'System Issues Detected'}
                  </AlertTitle>
                  <AlertDescription>
                    {diagnostics?.systemStatus.message}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnostics?.apiHealth.endpoints.map((endpoint, index) => (
                    <Alert key={index} variant={endpoint.status === 'ok' ? 'default' : 'destructive'}>
                      <AlertTitle>{endpoint.name}</AlertTitle>
                      <AlertDescription>
                        Status: {endpoint.status} - Response Time: {endpoint.responseTime}ms
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant={diagnostics?.databaseStatus.connected ? 'default' : 'destructive'}>
                  <AlertTitle>
                    {diagnostics?.databaseStatus.connected ? 'Connected' : 'Connection Issues'}
                  </AlertTitle>
                  <AlertDescription>
                    {diagnostics?.databaseStatus.message}
                    {diagnostics?.databaseStatus.connectionPool && (
                      <div className="mt-2">
                        Active Connections: {diagnostics.databaseStatus.connectionPool.active}
                        <br />
                        Idle Connections: {diagnostics.databaseStatus.connectionPool.idle}
                        <br />
                        Waiting Queries: {diagnostics.databaseStatus.connectionPool.waiting}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics?.connections.map((connection, index) => (
                  <Alert key={index}>
                    <AlertTitle>{connection.type}</AlertTitle>
                    <AlertDescription>
                      Status: {connection.status}
                      <br />
                      Duration: {connection.duration}
                      <br />
                      IP: {connection.ip}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="latency">
          <Card>
            <CardHeader>
              <CardTitle>System Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics?.latencyMetrics.map((metric, index) => (
                  <Alert key={index}>
                    <AlertTitle>{metric.service}</AlertTitle>
                    <AlertDescription>
                      Average Response Time: {metric.averageResponseTime}ms
                      <br />
                      Peak Response Time: {metric.peakResponseTime}ms
                      <br />
                      Request Count: {metric.requestCount}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics?.recentErrors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTitle>{error.type}</AlertTitle>
                    <AlertDescription>
                      Message: {error.message}
                      <br />
                      Timestamp: {new Date(error.timestamp).toLocaleString()}
                      <br />
                      Service: {error.service}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}