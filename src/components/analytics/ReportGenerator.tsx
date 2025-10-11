import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataExportService, ExportData } from '@/utils/data-export';

interface ReportGeneratorProps {
  data: any;
  onGenerateReport: (reportType: string, startDate: Date, endDate: Date) => Promise<ExportData[]>;
}

const ReportGenerator = ({ data, onGenerateReport }: ReportGeneratorProps) => {
  const [reportType, setReportType] = useState('collections');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      alert('Start date must be before end date');
      return;
    }

    setIsGenerating(true);
    try {
      const reportData = await onGenerateReport(reportType, startDate, endDate);
      const formattedData = DataExportService.formatDataForExport(reportData);
      
      DataExportService.exportData(formattedData, {
        fileName: `${reportType}-report`,
        format: exportFormat,
        sheetName: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get icon based on export format
  const getFormatIcon = () => {
    switch (exportFormat) {
      case 'xlsx': return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      case 'csv': return <FileText className="h-4 w-4 mr-2" />;
      default: return <Download className="h-4 w-4 mr-2" />;
    }
  };

  // Get icon based on report type
  const getReportIcon = () => {
    switch (reportType) {
      case 'collections': return <FileText className="h-5 w-5 mr-2 text-blue-500" />;
      case 'farmers': return <FileText className="h-5 w-5 mr-2 text-green-500" />;
      case 'payments': return <FileText className="h-5 w-5 mr-2 text-purple-500" />;
      case 'quality': return <FileText className="h-5 w-5 mr-2 text-amber-500" />;
      case 'staff': return <FileText className="h-5 w-5 mr-2 text-indigo-500" />;
      default: return <FileText className="h-5 w-5 mr-2" />;
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center">
          {getReportIcon()}
          Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="font-medium">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="focus:ring-2 focus:ring-primary">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collections">Collections</SelectItem>
                <SelectItem value="farmers">Farmers</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="quality">Quality Reports</SelectItem>
                <SelectItem value="staff">Staff Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal hover:bg-gray-50 transition-colors",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal hover:bg-gray-50 transition-colors",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'xlsx' | 'csv')}>
              <SelectTrigger className="focus:ring-2 focus:ring-primary">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleGenerateReport} 
              disabled={isGenerating}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {getFormatIcon()}
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
        
        {/* Report generation tips */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Tip:</span> Select a date range and report type, then click "Generate Report" to export data in your preferred format.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;