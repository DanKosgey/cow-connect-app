// System Configuration Management interfaces
export interface QualityMultiplier {
  grade: string;
  multiplier: number;
  description?: string;
}

export interface SeasonalPricing {
  season: string;
  start_date: string;
  end_date: string;
  multiplier: number;
}

export interface TempRange {
  grade: string;
  min_temp: number;
  max_temp: number;
  penalty?: number;
}

export interface ContentStandard {
  grade: string;
  min_value: number;
  max_value: number;
  penalty?: number;
}

export interface PHStandard {
  grade: string;
  min_ph: number;
  max_ph: number;
  penalty?: number;
}

export interface NotificationConfig {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  notification_thresholds: Record<string, number>;
}

export interface IntegrationConfig {
  sms_provider: string;
  payment_gateway: string;
  analytics_provider: string;
  api_keys: Record<string, string>;
}

export interface PricingConfig {
  base_price_per_liter: number;
  quality_multipliers: QualityMultiplier[];
  seasonal_adjustments: SeasonalPricing[];
}

export interface QualityStandards {
  temperature_ranges: TempRange[];
  fat_content_standards: ContentStandard[];
  protein_standards: ContentStandard[];
  ph_standards: PHStandard[];
}

export interface SystemConfiguration {
  pricing: PricingConfig;
  quality_standards: QualityStandards;
  notification_settings: NotificationConfig;
  integration_settings: IntegrationConfig;
}

export interface ImpactAnalysis {
  affected_farmers: number;
  estimated_revenue_change: number;
  average_farmer_impact: number;
}

export interface ValidationResult {
  field: string;
  is_valid: boolean;
  message?: string;
}

export interface ConfigUpdateResponse {
  updated_config: SystemConfiguration;
  affected_farmers?: number;
  estimated_impact?: ImpactAnalysis;
  validation_results?: ValidationResult[];
}