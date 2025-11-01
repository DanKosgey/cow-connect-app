import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  CreditCard
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComprehensiveCreditAnalyticsService } from "@/services/comprehensive-credit-analytics-service";

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  generator: () => Promise<any>;
}

const CreditReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("monthly_summary");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState("pdf");

  const reportTypes: ReportConfig[] = [
    {
      id: "monthly_summary",
      name: "Monthly Credit Summary",
      description: "Comprehensive overview of credit activity for a selected period",
      icon: <FileText className="w-5 h-5" />,
      generator: () => ComprehensiveCreditAnalyticsService.generateMonthlySummaryReport(
        dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateRange.end || new Date().toISOString()
      )
    },
    {
      id: "settlement",
      name: "Settlement Report",
      description: "Detailed report on credit settlements and deductions",
      icon: <CreditCard className="w-5 h-5" />,
      generator: () => Promise.resolve({}) // Placeholder
    },
    {
      id: "risk_analysis",
      name: "Risk Analysis Report",
      description: "Farmer risk assessment and default trends",
      icon: <TrendingUp className="w-5 h-5" />,
      generator: () => Promise.resolve({}) // Placeholder
    },
    {
      id: "product_utilization",
      name: "Product Utilization Report",
      description: "Analysis of credit usage by product categories",
      icon: <BarChart3 className="w-5 h-5" />,
      generator: () => Promise.resolve({}) // Placeholder
    },
    {
      id: "farmer_cohort",
      name: "Farmer Cohort Analysis",
      description: "Comparative analysis by farmer tier and credit behavior",
      icon: <Users className="w-5 h-5" />,
      generator: () => Promise.resolve({}) // Placeholder
    }
  ];

  const exportFormats = [
    { id: "pdf", name: "PDF" },
    { id: "excel", name: "Excel" },
    { id: "csv", name: "CSV" }
  ];

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const selectedReport = reportTypes.find(r => r.id === reportType);
      if (selectedReport) {
        const report = await selectedReport.generator();
        
        // Handle case when no data exists
        if (!report) {
          setGeneratedReport(null);
          return;
        }
        
        setGeneratedReport(report);
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // In a real implementation, this would export the generated report
      alert(`Exporting report as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      console.error("Error exporting report:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Credit Reports</h1>
        <p className="text-gray-600 mt-2">Generate and export comprehensive credit system reports</p>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(report => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex items-center gap-2">
                        {report.icon}
                        {report.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {reportTypes.find(r => r.id === reportType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map(format => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="startDate"
                  type="date"
                  className="pl-10"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="endDate"
                  type="date"
                  className="pl-10"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleGenerateReport} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
            
            {generatedReport && (
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export as {exportFormat.toUpperCase()}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Report Preview */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Preview
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {reportTypes.find(r => r.id === reportType)?.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  Period: {dateRange.start || '30 days ago'} to {dateRange.end || 'today'}
                </p>
              </div>

              {reportType === "monthly_summary" && generatedReport && generatedReport.data ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900">Credit Issued</h3>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {formatCurrency(generatedReport.data.totalCreditIssued || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900">Credit Used</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {formatCurrency(generatedReport.data.totalCreditUsed || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900">New Farmers</h3>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        {generatedReport.data.newFarmersAdded || 0}
                      </p>
                    </div>
                  </div>

                  {generatedReport.data.topCreditUsers && generatedReport.data.topCreditUsers.length > 0 ? (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900 mb-4">Top Credit Users</h3>
                      <div className="space-y-3">
                        {generatedReport.data.topCreditUsers.map((user: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-600">Farmer ID: {user.farmer_id}</span>
                            <span className="font-semibold">
                              {formatCurrency(user.total_credit_used)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900 mb-4">Top Credit Users</h3>
                      <p className="text-gray-500">No credit usage data available</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No report data available</p>
                  <p className="text-sm mt-1">Generate a report to see credit analytics</p>
                </div>
              )}

              {reportType !== "monthly_summary" && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    Detailed report preview would appear here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Custom Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Date Range</h3>
              <p className="text-sm text-gray-600">
                Select custom date ranges for your reports
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Metrics</h3>
              <p className="text-sm text-gray-600">
                Choose which metrics to include in your report
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Filters</h3>
              <p className="text-sm text-gray-600">
                Apply filters by farmer tier, credit status, etc.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Scheduling</h3>
              <p className="text-sm text-gray-600">
                Schedule automatic report delivery
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" disabled>
              <PieChart className="w-4 h-4 mr-2" />
              Build Custom Report (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditReports;