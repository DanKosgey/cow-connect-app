import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Save,
  RotateCcw,
  Database,
  Bell,
  Shield,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface CreditSettingsConfig {
  // Global Credit Parameters
  default_credit_percentages: {
    new_farmers: number;
    established_farmers: number;
    premium_farmers: number;
  };
  max_absolute_credit_cap: number;
  min_pending_payment_threshold: number;
  credit_utilization_warnings: {
    warning_threshold: number;
    critical_threshold: number;
  };

  // Agrovet Integration Settings
  agrovet_connection_status: 'connected' | 'disconnected' | 'error';
  credit_enabled_products: string[];
  sync_frequency: 'realtime' | 'hourly' | 'daily';

  // Settlement Configuration
  monthly_settlement_date: number;
  settlement_advance_notice_days: number;
  payment_processing_method: 'bank_transfer' | 'mobile_money' | 'other';
  tax_vat_configuration: string;

  // Notification Settings
  sms_alerts_enabled: boolean;
  email_alerts_enabled: boolean;
  alert_triggers: string[];
  alert_recipients: {
    phone: string;
    email: string;
  }[];

  // Security & Compliance
  data_retention_period: number;
  audit_log_retention: number;
  encryption_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'custom';
}

const CreditSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CreditSettingsConfig>({
    // Global Credit Parameters
    default_credit_percentages: {
      new_farmers: 30,
      established_farmers: 60,
      premium_farmers: 70
    },
    max_absolute_credit_cap: 100000,
    min_pending_payment_threshold: 5000,
    credit_utilization_warnings: {
      warning_threshold: 85,
      critical_threshold: 95
    },

    // Agrovet Integration Settings
    agrovet_connection_status: 'connected',
    credit_enabled_products: [],
    sync_frequency: 'realtime',

    // Settlement Configuration
    monthly_settlement_date: 25,
    settlement_advance_notice_days: 3,
    payment_processing_method: 'mobile_money',
    tax_vat_configuration: '16%',

    // Notification Settings
    sms_alerts_enabled: true,
    email_alerts_enabled: true,
    alert_triggers: ['approval_threshold', 'utilization_warnings', 'settlement_reminders', 'defaults'],
    alert_recipients: [{
      phone: '+254',
      email: 'admin@example.com'
    }],

    // Security & Compliance
    data_retention_period: 3,
    audit_log_retention: 5,
    encryption_enabled: true,
    backup_frequency: 'daily'
  });

  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('credit_settings')
          .select('*')
          .single();

        if (error) {
          console.error("Error fetching settings:", error);
          // If no settings found (e.g. empty table), we start with defaults
          // but usually migration ensures one row exists.
        }

        if (data) {
          // Ensure JSON fields are correctly typed/structured if necessary
          // Data from supabase comes as snake_case like defined in interface
          setSettings(data as CreditSettingsConfig);
        }
      } catch (err) {
        console.error("Unexpected error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Remove any fields that shouldn't be updated directly if any (like id if it was in state separately)
      // But here settings state matches table columns closely.
      // We assume there's only one row, so we can update the known singleton or by ID if we had it.
      // Since we fetched it, we might want to capture ID. 
      // Let's rely on the singleton nature or fetch ID.

      // Better approach: Since it's a singleton, we can just update the first row, 
      // or if we have the ID from fetch (which we should add to interface).

      // Let's assume we grabbed the ID in fetch. 
      // I'll update the interface to include ID temporarily casted.
      const settingsWithId = settings as CreditSettingsConfig & { id?: string };

      let error;
      if (settingsWithId.id) {
        const { error: updateError } = await supabase
          .from('credit_settings')
          .update(settings)
          .eq('id', settingsWithId.id);
        error = updateError;
      } else {
        // Fallback if no ID (shouldn't happen if fetch worked)
        // Upsert based on a known constant? No, table has UUID PK.
        // We'll rely on fetch having populated it. 
        // If generic update is needed without ID:
        // Update where true (policy allows?) - risky.
        console.warn("No settings ID found, cannot update.");
        throw new Error("Settings not loaded correctly.");
      }

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Credit system configuration has been updated successfully",
      });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    // Reset to default settings
    setSettings({
      // Global Credit Parameters
      default_credit_percentages: {
        new_farmers: 30,
        established_farmers: 60,
        premium_farmers: 70
      },
      max_absolute_credit_cap: 100000,
      min_pending_payment_threshold: 5000,
      credit_utilization_warnings: {
        warning_threshold: 85,
        critical_threshold: 95
      },

      // Agrovet Integration Settings
      agrovet_connection_status: 'connected',
      credit_enabled_products: [],
      sync_frequency: 'realtime',

      // Settlement Configuration
      monthly_settlement_date: 25,
      settlement_advance_notice_days: 3,
      payment_processing_method: 'mobile_money',
      tax_vat_configuration: '16%',

      // Notification Settings
      sms_alerts_enabled: true,
      email_alerts_enabled: true,
      alert_triggers: ['approval_threshold', 'utilization_warnings', 'settlement_reminders', 'defaults'],
      alert_recipients: [{
        phone: '+254',
        email: 'admin@example.com'
      }],

      // Security & Compliance
      data_retention_period: 3,
      audit_log_retention: 5,
      encryption_enabled: true,
      backup_frequency: 'daily'
    });

    toast({
      title: "Settings Reset",
      description: "Configuration has been reset to default values",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading credit settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Credit System Settings</h1>
        <p className="text-gray-600 mt-2">Configure credit system parameters and behavior</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleResetSettings}
          disabled={saving}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Credit Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Global Credit Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Default Credit Percentages</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="newFarmersPercentage">New Farmers (%)</Label>
                  <Input
                    id="newFarmersPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.default_credit_percentages.new_farmers}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_credit_percentages: {
                        ...settings.default_credit_percentages,
                        new_farmers: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="establishedFarmersPercentage">Established Farmers (%)</Label>
                  <Input
                    id="establishedFarmersPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.default_credit_percentages.established_farmers}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_credit_percentages: {
                        ...settings.default_credit_percentages,
                        established_farmers: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="premiumFarmersPercentage">Premium Farmers (%)</Label>
                  <Input
                    id="premiumFarmersPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.default_credit_percentages.premium_farmers}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_credit_percentages: {
                        ...settings.default_credit_percentages,
                        premium_farmers: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="maxCreditCap">Maximum Absolute Credit Cap (KES)</Label>
                <Input
                  id="maxCreditCap"
                  type="number"
                  min="0"
                  value={settings.max_absolute_credit_cap}
                  onChange={(e) => setSettings({
                    ...settings,
                    max_absolute_credit_cap: Number(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="minPendingThreshold">Minimum Pending Payment Threshold (KES)</Label>
                <Input
                  id="minPendingThreshold"
                  type="number"
                  min="0"
                  value={settings.min_pending_payment_threshold}
                  onChange={(e) => setSettings({
                    ...settings,
                    min_pending_payment_threshold: Number(e.target.value)
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Credit Utilization Warnings</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="warningThreshold">Warning Threshold (%)</Label>
                  <Input
                    id="warningThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.credit_utilization_warnings.warning_threshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      credit_utilization_warnings: {
                        ...settings.credit_utilization_warnings,
                        warning_threshold: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="criticalThreshold">Critical Threshold (%)</Label>
                  <Input
                    id="criticalThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.credit_utilization_warnings.critical_threshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      credit_utilization_warnings: {
                        ...settings.credit_utilization_warnings,
                        critical_threshold: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agrovet Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Agrovet Integration Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Connection Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${settings.agrovet_connection_status === 'connected' ? 'bg-green-500' :
                    settings.agrovet_connection_status === 'disconnected' ? 'bg-gray-500' :
                      'bg-red-500'
                    }`}></div>
                  <span className="text-sm">
                    {settings.agrovet_connection_status === 'connected' ? 'Connected' :
                      settings.agrovet_connection_status === 'disconnected' ? 'Disconnected' :
                        'Error'}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="syncFrequency">Sync Frequency</Label>
                <Select
                  value={settings.sync_frequency}
                  onValueChange={(value: 'realtime' | 'hourly' | 'daily') =>
                    setSettings({ ...settings, sync_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="testConnection">Test Connection</Label>
                <div className="mt-2">
                  <Button variant="outline" disabled>
                    Test Connection
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settlement Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="settlementDate">Monthly Settlement Date</Label>
                <Select
                  value={settings.monthly_settlement_date.toString()}
                  onValueChange={(value) =>
                    setSettings({ ...settings, monthly_settlement_date: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="noticeDays">Advance Notice Days</Label>
                <Input
                  id="noticeDays"
                  type="number"
                  min="0"
                  max="30"
                  value={settings.settlement_advance_notice_days}
                  onChange={(e) => setSettings({
                    ...settings,
                    settlement_advance_notice_days: Number(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Processing Method</Label>
                <Select
                  value={settings.payment_processing_method}
                  onValueChange={(value: 'bank_transfer' | 'mobile_money' | 'other') =>
                    setSettings({ ...settings, payment_processing_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="taxVat">Tax/VAT Configuration</Label>
                <Input
                  id="taxVat"
                  value={settings.tax_vat_configuration}
                  onChange={(e) => setSettings({
                    ...settings,
                    tax_vat_configuration: e.target.value
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="smsAlerts">SMS Alerts</Label>
                <Switch
                  id="smsAlerts"
                  checked={settings.sms_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, sms_alerts_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="emailAlerts">Email Alerts</Label>
                <Switch
                  id="emailAlerts"
                  checked={settings.email_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, email_alerts_enabled: checked })
                  }
                />
              </div>

              <div>
                <Label>Alert Recipients</Label>
                <div className="mt-2 space-y-2">
                  {settings.alert_recipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Phone number"
                        value={recipient.phone}
                        onChange={(e) => {
                          const newRecipients = [...settings.alert_recipients];
                          newRecipients[index].phone = e.target.value;
                          setSettings({ ...settings, alert_recipients: newRecipients });
                        }}
                      />
                      <Input
                        placeholder="Email address"
                        value={recipient.email}
                        onChange={(e) => {
                          const newRecipients = [...settings.alert_recipients];
                          newRecipients[index].email = e.target.value;
                          setSettings({ ...settings, alert_recipients: newRecipients });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettings({
                      ...settings,
                      alert_recipients: [...settings.alert_recipients, { phone: '', email: '' }]
                    })}
                  >
                    Add Recipient
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Compliance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dataRetention">Data Retention Period (years)</Label>
                  <Input
                    id="dataRetention"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.data_retention_period}
                    onChange={(e) => setSettings({
                      ...settings,
                      data_retention_period: Number(e.target.value)
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="auditRetention">Audit Log Retention (years)</Label>
                  <Input
                    id="auditRetention"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.audit_log_retention}
                    onChange={(e) => setSettings({
                      ...settings,
                      audit_log_retention: Number(e.target.value)
                    })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="encryption">Encryption Enabled</Label>
                  <Switch
                    id="encryption"
                    checked={settings.encryption_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, encryption_enabled: checked })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select
                    value={settings.backup_frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'custom') =>
                      setSettings({ ...settings, backup_frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreditSettings;