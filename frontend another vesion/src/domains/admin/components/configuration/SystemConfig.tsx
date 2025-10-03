import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button,
  buttonVariants
} from '@/components/ui/button';
import { 
  Input
} from '@/components/ui/input';
import { 
  Label
} from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Badge
} from '@/components/ui/badge';
import { 
  Switch
} from '@/components/ui/switch';
import { 
  Calendar,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RotateCcw,
  Eye
} from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { 
  QualityMultiplier, 
  SeasonalPricing, 
  TempRange, 
  ContentStandard, 
  PHStandard,
  NotificationConfig,
  IntegrationConfig
} from '@/types/systemConfig';
import { format } from 'date-fns';

const SystemConfig: React.FC = () => {
  const {
    data: config,
    isLoading,
    error,
    updatePricing,
    isUpdatingPricing,
    updateQualityStandards,
    isUpdatingQuality,
    updateNotifications,
    isUpdatingNotifications,
    updateIntegrations,
    isUpdatingIntegrations,
    refetch,
    resetToDefault,
    exportConfig,
    importConfig,
    isPreviewOpen,
    previewData,
    setIsPreviewOpen,
    closePreview
  } = useSystemConfig();

  // Form states
  const [basePrice, setBasePrice] = useState<number>(0);
  const [tempRanges, setTempRanges] = useState<TempRange[]>([]);
  const [fatStandards, setFatStandards] = useState<ContentStandard[]>([]);
  const [proteinStandards, setProteinStandards] = useState<ContentStandard[]>([]);
  const [phStandards, setPhStandards] = useState<PHStandard[]>([]);
  const [notifications, setNotifications] = useState<NotificationConfig | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationConfig | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [importFile, setImportFile] = useState<File | null>(null);

  // Initialize form data when config loads
  useEffect(() => {
    if (config) {
      setBasePrice(config.pricing.base_price_per_liter);
      setTempRanges(config.quality_standards.temperature_ranges);
      setFatStandards(config.quality_standards.fat_content_standards);
      setProteinStandards(config.quality_standards.protein_standards);
      setPhStandards(config.quality_standards.ph_standards);
      setNotifications(config.notification_settings);
      setIntegrations(config.integration_settings);
    }
  }, [config]);

  // Handle pricing update
  const handleUpdatePricing = () => {
    updatePricing({
      base_price_per_liter: basePrice,
      effective_date: effectiveDate
    });
  };

  // Handle quality standards update
  const handleUpdateQuality = () => {
    if (!config) return;
    
    updateQualityStandards({
      temperature_ranges: tempRanges,
      fat_content_standards: fatStandards,
      protein_standards: proteinStandards,
      ph_standards: phStandards
    });
  };

  // Handle notifications update
  const handleUpdateNotifications = () => {
    if (!notifications) return;
    
    updateNotifications(notifications);
  };

  // Handle integrations update
  const handleUpdateIntegrations = () => {
    if (!integrations) return;
    
    updateIntegrations(integrations);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      importConfig(file)
        .then(() => {
          alert('Configuration imported successfully');
        })
        .catch((error) => {
          alert(`Error importing configuration: ${error.message}`);
        });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Configuration</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
            <div className="mt-4">
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render preview dialog
  const renderPreviewDialog = () => {
    if (!previewData) return null;

    return (
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration Change Impact Preview</DialogTitle>
            <DialogDescription>
              Review the estimated impact of your configuration changes before saving
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.affected_farmers?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">Affected Farmers</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.estimated_impact?.estimated_revenue_change?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">Estimated Revenue Change</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {previewData.estimated_impact?.average_farmer_impact?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Farmer Impact</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important Notice</AlertTitle>
              <AlertDescription>
                Changes will take effect on {effectiveDate}. Affected farmers will be notified of the new pricing structure.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>Cancel</Button>
            <Button onClick={closePreview}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">
            Manage pricing, quality standards, and system settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportConfig}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Label className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Upload className="h-4 w-4 mr-2" />
            Import
            <Input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleFileImport}
            />
          </Label>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetToDefault}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="quality">Quality Standards</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        {/* Pricing Configuration */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>
                Set base pricing and quality multipliers for milk collections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="base-price">Base Price per Liter (KSh)</Label>
                  <Input
                    id="base-price"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="effective-date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Effective Date
                    </div>
                  </Label>
                  <Input
                    id="effective-date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdatePricing}
                  disabled={isUpdatingPricing}
                >
                  {isUpdatingPricing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Pricing Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Quality Standards */}
        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quality Standards</CardTitle>
              <CardDescription>
                Define quality standards for milk collections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature Ranges */}
              <div>
                <h3 className="text-lg font-medium mb-2">Temperature Ranges</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Min Temp (°C)</TableHead>
                      <TableHead>Max Temp (°C)</TableHead>
                      <TableHead>Penalty (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tempRanges.map((range, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline">{range.grade}</Badge>
                        </TableCell>
                        <TableCell>{range.min_temp}</TableCell>
                        <TableCell>{range.max_temp}</TableCell>
                        <TableCell>{range.penalty || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Fat Content Standards */}
              <div>
                <h3 className="text-lg font-medium mb-2">Fat Content Standards</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Min Value (%)</TableHead>
                      <TableHead>Max Value (%)</TableHead>
                      <TableHead>Penalty (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fatStandards.map((standard, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline">{standard.grade}</Badge>
                        </TableCell>
                        <TableCell>{standard.min_value}</TableCell>
                        <TableCell>{standard.max_value}</TableCell>
                        <TableCell>{standard.penalty || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateQuality}
                  disabled={isUpdatingQuality}
                >
                  {isUpdatingQuality ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Quality Standards
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notifications && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Send system alerts via email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications({
                          ...notifications,
                          email_notifications: checked
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">SMS Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Send system alerts via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notifications.sms_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications({
                          ...notifications,
                          sms_notifications: checked
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Push Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Send system alerts via push notifications
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push_notifications}
                      onCheckedChange={(checked) => 
                        setNotifications({
                          ...notifications,
                          push_notifications: checked
                        })
                      }
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateNotifications}
                  disabled={isUpdatingNotifications}
                >
                  {isUpdatingNotifications ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure external service integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {integrations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">SMS Provider</Label>
                    <Select
                      value={integrations.sms_provider}
                      onValueChange={(value) => 
                        setIntegrations({
                          ...integrations,
                          sms_provider: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select SMS provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="africastalking">Africastalking</SelectItem>
                        <SelectItem value="nexmo">Nexmo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment-gateway">Payment Gateway</Label>
                    <Select
                      value={integrations.payment_gateway}
                      onValueChange={(value) => 
                        setIntegrations({
                          ...integrations,
                          payment_gateway: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="analytics-provider">Analytics Provider</Label>
                    <Select
                      value={integrations.analytics_provider}
                      onValueChange={(value) => 
                        setIntegrations({
                          ...integrations,
                          analytics_provider: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select analytics provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Analytics</SelectItem>
                        <SelectItem value="mixpanel">Mixpanel</SelectItem>
                        <SelectItem value="amplitude">Amplitude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateIntegrations}
                  disabled={isUpdatingIntegrations}
                >
                  {isUpdatingIntegrations ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Integration Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Preview Dialog */}
      {renderPreviewDialog()}
    </div>
  );
};

export default SystemConfig;