import { type NotificationType, type DocumentStatus, type PaymentStatus, type ProfileStatus } from '../types/farmer.types';

export type WorkflowTrigger = {
  event: string;
  conditions: Record<string, any>;
  source: string;
};

export type WorkflowAction = {
  type: 'notification' | 'status_update' | 'assignment' | 'calculation' | 'validation' | 'escalation';
  target: string;
  data: Record<string, any>;
};

export type WorkflowDefinition = {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  validations?: Array<{
    field: string;
    rules: Array<{
      type: string;
      value: any;
      message: string;
    }>;
  }>;
  actions: WorkflowAction[];
  errorHandling?: {
    retryCount: number;
    retryDelay: number;
    fallbackAction?: WorkflowAction;
  };
  sla?: {
    duration: number;
    escalationAction: WorkflowAction;
  };
};

// KYC Workflow Definition
export const kycWorkflow: WorkflowDefinition = {
  name: 'Farmer KYC Processing',
  description: 'Handles the verification and approval of farmer KYC documents',
  trigger: {
    event: 'document_submitted',
    conditions: {
      documentTypes: ['id_document', 'proof_of_address', 'bank_statement'],
      farmerStatus: 'pending_verification' as ProfileStatus
    },
    source: 'farmer_documents'
  },
  validations: [
    {
      field: 'id_document',
      rules: [
        { type: 'fileType', value: ['pdf', 'jpg', 'png'], message: 'Invalid file type' },
        { type: 'fileSize', value: 5000000, message: 'File too large' },
        { type: 'required', value: true, message: 'ID document is required' }
      ]
    },
    {
      field: 'proof_of_address',
      rules: [
        { type: 'fileType', value: ['pdf', 'jpg', 'png'], message: 'Invalid file type' },
        { type: 'fileSize', value: 5000000, message: 'File too large' },
        { type: 'maxAge', value: 90, message: 'Document too old' }
      ]
    }
  ],
  actions: [
    {
      type: 'validation',
      target: 'documents',
      data: {
        validateFields: ['file_type', 'file_size', 'document_count']
      }
    },
    {
      type: 'notification',
      target: 'admin',
      data: {
        type: 'document' as NotificationType,
        title: 'New KYC Submission',
        priority: 'high'
      }
    },
    {
      type: 'assignment',
      target: 'reviewer',
      data: {
        assignmentType: 'round_robin',
        role: 'kyc_reviewer'
      }
    }
  ],
  sla: {
    duration: 48, // hours
    escalationAction: {
      type: 'notification',
      target: 'supervisor',
      data: {
        type: 'system' as NotificationType,
        title: 'KYC Review SLA Breach',
        priority: 'urgent'
      }
    }
  }
};

// Collection Verification Workflow
export const collectionWorkflow: WorkflowDefinition = {
  name: 'Milk Collection Verification',
  description: 'Validates and processes milk collection entries',
  trigger: {
    event: 'collection_recorded',
    conditions: {
      farmerStatus: 'approved' as ProfileStatus,
      hasActiveRoute: true
    },
    source: 'collections'
  },
  validations: [
    {
      field: 'quantity',
      rules: [
        { type: 'range', value: { min: 0, max: 500 }, message: 'Invalid quantity' },
        { type: 'required', value: true, message: 'Quantity is required' }
      ]
    },
    {
      field: 'location',
      rules: [
        { type: 'gpsRadius', value: 100, message: 'Collection outside designated area' },
        { type: 'required', value: true, message: 'Location is required' }
      ]
    }
  ],
  actions: [
    {
      type: 'validation',
      target: 'collection',
      data: {
        checks: ['duplicate_entry', 'quantity_limits', 'location_verification']
      }
    },
    {
      type: 'calculation',
      target: 'quality_score',
      data: {
        metrics: ['fat_content', 'density', 'bacterial_count']
      }
    },
    {
      type: 'notification',
      target: 'farmer',
      data: {
        type: 'collection' as NotificationType,
        title: 'Collection Recorded',
        includeQuality: true
      }
    }
  ],
  errorHandling: {
    retryCount: 3,
    retryDelay: 300, // seconds
    fallbackAction: {
      type: 'notification',
      target: 'staff',
      data: {
        type: 'system' as NotificationType,
        title: 'Collection Verification Failed',
        priority: 'high'
      }
    }
  }
};

// Payment Processing Workflow
export const paymentWorkflow: WorkflowDefinition = {
  name: 'Payment Processing',
  description: 'Automates the calculation and processing of farmer payments',
  trigger: {
    event: 'payment_schedule',
    conditions: {
      scheduleType: 'periodic',
      hasCollections: true
    },
    source: 'payment_schedules'
  },
  validations: [
    {
      field: 'bank_details',
      rules: [
        { type: 'status', value: 'verified', message: 'Bank details not verified' },
        { type: 'required', value: true, message: 'Bank details required' }
      ]
    }
  ],
  actions: [
    {
      type: 'calculation',
      target: 'payment',
      data: {
        components: ['base_rate', 'quality_bonus', 'volume_bonus', 'deductions']
      }
    },
    {
      type: 'status_update',
      target: 'payment',
      data: {
        status: 'processing' as PaymentStatus
      }
    },
    {
      type: 'notification',
      target: 'farmer',
      data: {
        type: 'payment' as NotificationType,
        title: 'Payment Processing Started',
        includeAmount: true
      }
    }
  ],
  errorHandling: {
    retryCount: 2,
    retryDelay: 3600, // seconds
    fallbackAction: {
      type: 'notification',
      target: 'finance',
      data: {
        type: 'system' as NotificationType,
        title: 'Payment Processing Failed',
        priority: 'urgent'
      }
    }
  }
};

// Scheduled Jobs Configuration
export const scheduledJobs = {
  daily: [
    {
      name: 'collection_summary',
      schedule: '0 20 * * *', // 8 PM daily
      actions: ['summarize_collections', 'update_farmer_totals', 'generate_reports']
    },
    {
      name: 'payment_calculation',
      schedule: '0 22 * * *', // 10 PM daily
      actions: ['calculate_pending_payments', 'prepare_payment_batch']
    }
  ],
  weekly: [
    {
      name: 'staff_performance',
      schedule: '0 1 * * 1', // 1 AM Monday
      actions: ['calculate_metrics', 'generate_report', 'send_notifications']
    },
    {
      name: 'quality_analysis',
      schedule: '0 2 * * 1', // 2 AM Monday
      actions: ['analyze_trends', 'flag_issues', 'update_farmer_scores']
    }
  ],
  monthly: [
    {
      name: 'farmer_statements',
      schedule: '0 1 1 * *', // 1 AM on 1st of month
      actions: ['generate_statements', 'send_notifications', 'archive_documents']
    },
    {
      name: 'analytics_report',
      schedule: '0 2 1 * *', // 2 AM on 1st of month
      actions: ['generate_analytics', 'distribute_reports', 'update_dashboards']
    }
  ]
};