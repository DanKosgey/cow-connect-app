import { type ProfileStatus, type PaymentStatus } from '../types/farmer.types';

// Test User Personas
export const testPersonas = {
  admin: {
    id: 'test-admin-1',
    role: 'admin',
    permissions: ['manage_users', 'manage_system', 'view_all_data', 'approve_kyc'],
    expectedAccess: {
      routes: ['/*'],
      actions: ['create', 'read', 'update', 'delete'],
      data: ['all']
    }
  },
  staff: {
    id: 'test-staff-1',
    role: 'staff',
    permissions: ['record_collection', 'view_route', 'manage_farmers'],
    expectedAccess: {
      routes: ['/staff/*', '/farmers/*'],
      actions: ['create', 'read', 'update'],
      data: ['assigned_farmers', 'own_collections']
    }
  },
  farmer: {
    id: 'test-farmer-1',
    role: 'farmer',
    permissions: ['view_own_data', 'update_profile'],
    expectedAccess: {
      routes: ['/farmer/*'],
      actions: ['read', 'update'],
      data: ['own_profile', 'own_collections', 'own_payments']
    }
  }
};

// Role-Based Access Test Cases
export const accessTestCases = {
  admin: [
    {
      name: 'Admin Full Access',
      scenarios: [
        {
          action: 'View All Farmers',
          endpoint: '/api/farmers',
          method: 'GET',
          expectedStatus: 200
        },
        {
          action: 'Approve KYC',
          endpoint: '/api/farmers/:id/kyc',
          method: 'PUT',
          data: { status: 'approved' as ProfileStatus },
          expectedStatus: 200
        },
        {
          action: 'View System Analytics',
          endpoint: '/api/analytics/system',
          method: 'GET',
          expectedStatus: 200
        }
      ]
    }
  ],
  staff: [
    {
      name: 'Staff Limited Access',
      scenarios: [
        {
          action: 'View Assigned Farmers',
          endpoint: '/api/staff/:id/farmers',
          method: 'GET',
          expectedStatus: 200
        },
        {
          action: 'Record Collection',
          endpoint: '/api/collections',
          method: 'POST',
          data: {
            farmerId: 'test-farmer-1',
            quantity: 100
          },
          expectedStatus: 201
        },
        {
          action: 'Attempt System Settings',
          endpoint: '/api/system/settings',
          method: 'GET',
          expectedStatus: 403
        }
      ]
    }
  ],
  farmer: [
    {
      name: 'Farmer Self-Service',
      scenarios: [
        {
          action: 'View Own Profile',
          endpoint: '/api/farmers/:id/profile',
          method: 'GET',
          expectedStatus: 200
        },
        {
          action: 'Attempt Other Farmer',
          endpoint: '/api/farmers/other-id/profile',
          method: 'GET',
          expectedStatus: 403
        }
      ]
    }
  ]
};

// Workflow Test Cases
export const workflowTests = {
  kyc: {
    name: 'KYC Processing Workflow',
    scenarios: [
      {
        name: 'Complete KYC Submission',
        steps: [
          {
            action: 'Submit Documents',
            data: {
              documents: ['id', 'address_proof'],
              status: 'pending' as ProfileStatus
            },
            expectation: 'Documents uploaded, status pending'
          },
          {
            action: 'Admin Review',
            data: {
              review: { status: 'approved' as ProfileStatus },
            },
            expectation: 'Status updated, notifications sent'
          },
          {
            action: 'Account Activation',
            data: {
              status: 'active' as ProfileStatus
            },
            expectation: 'Account activated, welcome sent'
          }
        ]
      },
      {
        name: 'Incomplete Submission',
        steps: [
          {
            action: 'Submit Partial',
            data: {
              documents: ['id'],
              status: 'pending' as ProfileStatus
            },
            expectation: 'Error: Missing documents'
          }
        ]
      }
    ]
  },
  collection: {
    name: 'Collection Recording',
    scenarios: [
      {
        name: 'Valid Collection',
        steps: [
          {
            action: 'Record Collection',
            data: {
              quantity: 100,
              quality: { fat: 3.5, density: 1.028 }
            },
            expectation: 'Collection recorded, farmer notified'
          }
        ]
      },
      {
        name: 'Offline Collection',
        steps: [
          {
            action: 'Save Offline',
            data: {
              quantity: 100,
              timestamp: '2025-10-02T10:00:00Z'
            },
            expectation: 'Stored locally'
          },
          {
            action: 'Sync Online',
            expectation: 'Synced to server'
          }
        ]
      }
    ]
  }
};

// UI/UX Test Cases
export const uiTests = {
  responsive: [
    {
      name: 'Mobile View',
      viewport: { width: 375, height: 667 },
      elements: [
        {
          selector: 'button',
          minSize: { width: 44, height: 44 }
        },
        {
          selector: 'input',
          minSize: { width: 44, height: 44 }
        }
      ]
    },
    {
      name: 'Tablet View',
      viewport: { width: 768, height: 1024 },
      elements: [
        {
          selector: '.sidebar',
          visibility: 'visible'
        }
      ]
    }
  ],
  accessibility: [
    {
      name: 'Keyboard Navigation',
      checks: [
        'Tab order follows visual layout',
        'Focus indicators visible',
        'Skip navigation link present'
      ]
    },
    {
      name: 'Screen Reader',
      checks: [
        'Proper heading hierarchy',
        'ARIA labels on interactive elements',
        'Image alt text present'
      ]
    }
  ]
};

// Performance Test Scenarios
export const performanceTests = {
  database: [
    {
      name: 'Collection Query Performance',
      scenario: 'Filter 100k collections',
      benchmark: {
        maxDuration: 500, // ms
        dataSize: 100000
      }
    },
    {
      name: 'Payment Batch Processing',
      scenario: 'Process 1000 payments',
      benchmark: {
        maxDuration: 5000, // ms
        batchSize: 1000
      }
    }
  ],
  api: [
    {
      name: 'Collection Recording',
      endpoint: '/api/collections',
      load: {
        users: 100,
        duration: 300, // seconds
        rampUp: 60 // seconds
      },
      benchmark: {
        meanResponseTime: 200, // ms
        p95ResponseTime: 500, // ms
        errorRate: 0.01 // 1%
      }
    }
  ],
  frontend: [
    {
      name: 'Initial Load',
      metrics: {
        fcp: 1500, // ms
        lcp: 2500, // ms
        fid: 100, // ms
        cls: 0.1
      }
    },
    {
      name: 'Bundle Size',
      limits: {
        initial: 200, // KB
        lazy: 100 // KB per chunk
      }
    }
  ]
};

// Validation Rules
export const validationRules = {
  payment: [
    {
      field: 'amount',
      rules: [
        {
          type: 'precision',
          decimals: 2,
          message: 'Amount must have exactly 2 decimal places'
        },
        {
          type: 'range',
          min: 0,
          message: 'Amount cannot be negative'
        }
      ]
    }
  ],
  collection: [
    {
      field: 'quantity',
      rules: [
        {
          type: 'range',
          min: 0,
          max: 500,
          message: 'Quantity must be between 0 and 500 liters'
        }
      ]
    },
    {
      field: 'quality',
      rules: [
        {
          type: 'object',
          required: ['fat', 'density'],
          message: 'Quality metrics incomplete'
        }
      ]
    }
  ]
};