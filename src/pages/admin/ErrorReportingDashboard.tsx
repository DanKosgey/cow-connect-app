import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import { ErrorReportingService, ErrorReport } from '@/services/error-reporting-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const ErrorReportingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ErrorReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResolved, setFilterResolved] = useState("all");
  const [stats, setStats] = useState<{
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    unresolved: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  useEffect(() => {
    // Filter error reports
    let filtered = errorReports;

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.error_context.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.component && report.component.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterSeverity !== "all") {
      filtered = filtered.filter(report => report.severity === filterSeverity);
    }

    if (filterResolved !== "all") {
      const isResolved = filterResolved === "resolved";
      filtered = filtered.filter(report => report.resolved === isResolved);
    }

    setFilteredReports(filtered);
  }, [searchTerm, filterSeverity, filterResolved, errorReports]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await ErrorReportingService.getErrorReports(100, 0);
      setErrorReports(data);
      setFilteredReports(data);
    } catch (error) {
      console.error("Error fetching error reports:", error);
      toast({
        title: "Error",
        description: "Failed to load error reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statistics = await ErrorReportingService.getErrorStatistics();
      setStats(statistics);
    } catch (error) {
      console.error("Error fetching error statistics:", error);
      toast({
        title: "Error",
        description: "Failed to load error statistics",
        variant: "destructive"
      });
    }
  };

  const handleResolveError = async (errorId: string) => {
    try {
      await ErrorReportingService.resolveError(errorId);
      toast({
        title: "Success",
        description: "Error marked as resolved"
      });
      fetchData(); // Refresh the data
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resolving error report:", error);
      toast({
        title: "Error",
        description: "Failed to resolve error report",
        variant: "destructive"
      });
    }
  };

  const handleDeleteError = async (errorId: string) => {
    try {
      await ErrorReportingService.deleteError(errorId);
      toast({
        title: "Success",
        description: "Error report deleted"
      });
      fetchData(); // Refresh the data
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error("Error deleting error report:", error);
      toast({
        title: "Error",
        description: "Failed to delete error report",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Clock className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Reporting Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage application errors
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unresolved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bySeverity.critical || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Components Affected</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.byComponent).length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-full md:w-32">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterResolved} onValueChange={setFilterResolved}>
          <SelectTrigger className="w-full md:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Error Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No error reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(report.severity)}
                          <span className={getSeverityColor(report.severity)}>
                            {report.severity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {report.error_message}
                      </TableCell>
                      <TableCell>
                        {report.component || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.error_context}
                      </TableCell>
                      <TableCell>
                        {report.reported_at ? format(new Date(report.reported_at), 'PP p') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {report.resolved ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Resolved
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-4 w-4" />
                            Unresolved
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!report.resolved && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => report.id && handleResolveError(report.id)}
                            >
                              Resolve
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => report.id && handleDeleteError(report.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReportingDashboard;