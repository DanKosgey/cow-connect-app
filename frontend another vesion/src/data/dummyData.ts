
import { Farmer, Cow, Collection, Payment, Staff, DashboardStats } from '@/types';

export const dummyFarmers: Farmer[] = [
  {
    id: 'f1',
    name: 'John Kiprotich',
    phone: '+254712345678',
    email: 'john.kiprotich@email.com',
    address: 'Nakuru County, Bahati Sub-County',
    gpsLocation: { lat: -0.3031, lng: 36.0800 },
    nationalId: '12345678',
    govIdUrl: '/api/placeholder/400/300',
    selfieUrl: '/api/placeholder/400/400',
    qrCode: 'DC_F1_2024',
    nfcUid: 'NFC001',
    kycStatus: 'approved',
    registeredAt: '2024-01-15T08:30:00Z',
    approvedAt: '2024-01-16T10:15:00Z',
    cardIssued: true,
    dailyValidationCode: '847293'
  },
  {
    id: 'f2',
    name: 'Mary Wanjiku',
    phone: '+254723456789',
    email: 'mary.wanjiku@email.com',
    address: 'Kiambu County, Limuru Sub-County',
    gpsLocation: { lat: -1.0369, lng: 36.6429 },
    nationalId: '23456789',
    govIdUrl: '/api/placeholder/400/300',
    selfieUrl: '/api/placeholder/400/400',
    qrCode: 'DC_F2_2024',
    nfcUid: 'NFC002',
    kycStatus: 'approved',
    registeredAt: '2024-01-20T09:15:00Z',
    approvedAt: '2024-01-21T11:30:00Z',
    cardIssued: true,
    dailyValidationCode: '593847'
  },
  {
    id: 'f3',
    name: 'Peter Kamau',
    phone: '+254734567890',
    email: 'peter.kamau@email.com',
    address: 'Nyandarua County, Ol Kalou Sub-County',
    gpsLocation: { lat: -0.2667, lng: 36.3833 },
    nationalId: '34567890',
    govIdUrl: '/api/placeholder/400/300',
    selfieUrl: '/api/placeholder/400/400',
    qrCode: 'DC_F3_2024',
    nfcUid: 'NFC003',
    kycStatus: 'pending',
    registeredAt: '2024-06-10T14:20:00Z',
    cardIssued: false,
    dailyValidationCode: '729384'
  },
  {
    id: 'f4',
    name: 'Grace Achieng',
    phone: '+254745678901',
    email: 'grace.achieng@email.com',
    address: 'Nyeri County, Tetu Sub-County',
    gpsLocation: { lat: -0.4167, lng: 36.9500 },
    nationalId: '45678901',
    govIdUrl: '/api/placeholder/400/300',
    selfieUrl: '/api/placeholder/400/400',
    qrCode: 'DC_F4_2024',
    nfcUid: 'NFC004',
    kycStatus: 'approved',
    registeredAt: '2024-02-05T11:45:00Z',
    approvedAt: '2024-02-06T13:20:00Z',
    cardIssued: true,
    dailyValidationCode: '485729'
  },
  {
    id: 'f5',
    name: 'Samuel Mutua',
    phone: '+254756789012',
    email: 'samuel.mutua@email.com',
    address: 'Machakos County, Kangundo Sub-County',
    gpsLocation: { lat: -1.3167, lng: 37.3500 },
    nationalId: '56789012',
    govIdUrl: '/api/placeholder/400/300',
    selfieUrl: '/api/placeholder/400/400',
    qrCode: 'DC_F5_2024',
    nfcUid: 'NFC005',
    kycStatus: 'rejected',
    registeredAt: '2024-05-28T16:10:00Z',
    rejectedReason: 'Invalid national ID verification',
    cardIssued: false
  }
];

export const dummyCows: Cow[] = [
  {
    id: 'c1',
    farmerId: 'f1',
    breed: 'Friesian',
    birthYear: 2021,
    isPregnant: false,
    lactationStage: 'peak',
    photos: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
    healthScore: 92,
    lastYield: 28.5,
    avgYield30Days: 26.8,
    createdAt: '2024-01-16T08:00:00Z'
  },
  {
    id: 'c2',
    farmerId: 'f1',
    breed: 'Ayrshire',
    birthYear: 2020,
    isPregnant: true,
    expectedCalvingDate: '2024-08-15',
    lactationStage: 'late',
    photos: ['/api/placeholder/400/300'],
    healthScore: 88,
    lastYield: 18.2,
    avgYield30Days: 19.5,
    createdAt: '2024-01-16T08:00:00Z'
  },
  {
    id: 'c3',
    farmerId: 'f2',
    breed: 'Jersey',
    birthYear: 2022,
    isPregnant: false,
    lactationStage: 'early',
    photos: ['/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300'],
    healthScore: 95,
    lastYield: 22.8,
    avgYield30Days: 21.2,
    createdAt: '2024-01-21T09:00:00Z'
  },
  {
    id: 'c4',
    farmerId: 'f4',
    breed: 'Guernsey',
    birthYear: 2019,
    isPregnant: false,
    lactationStage: 'mid',
    photos: ['/api/placeholder/400/300'],
    healthScore: 85,
    lastYield: 24.1,
    avgYield30Days: 23.8,
    createdAt: '2024-02-06T10:00:00Z'
  }
];

export const dummyCollections: Collection[] = [
  {
    id: 'col1',
    farmerId: 'f1',
    farmerName: 'John Kiprotich',
    staffId: 's1',
    staffName: 'David Mwangi',
    liters: 28.5,
    geoPoint: { lat: -0.3031, lng: 36.0800 },
    photoUrl: '/api/placeholder/400/300',
    timestamp: '2024-06-16T06:30:00Z',
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    validationCode: '847293',
    qualityGrade: 'A',
    temperature: 4.2,
    fatContent: 3.8,
    proteinContent: 3.2
  },
  {
    id: 'col2',
    farmerId: 'f2',
    farmerName: 'Mary Wanjiku',
    staffId: 's1',
    staffName: 'David Mwangi',
    liters: 22.8,
    geoPoint: { lat: -1.0369, lng: 36.6429 },
    photoUrl: '/api/placeholder/400/300',
    timestamp: '2024-06-16T07:15:00Z',
    txHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    validationCode: '593847',
    qualityGrade: 'A',
    temperature: 3.9,
    fatContent: 4.1,
    proteinContent: 3.4
  },
  {
    id: 'col3',
    farmerId: 'f4',
    farmerName: 'Grace Achieng',
    staffId: 's2',
    staffName: 'Susan Nduta',
    liters: 24.1,
    geoPoint: { lat: -0.4167, lng: 36.9500 },
    photoUrl: '/api/placeholder/400/300',
    timestamp: '2024-06-16T05:45:00Z',
    txHash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    validationCode: '485729',
    qualityGrade: 'A',
    temperature: 4.0,
    fatContent: 3.6,
    proteinContent: 3.1
  },
  {
    id: 'col4',
    farmerId: 'f1',
    farmerName: 'John Kiprotich',
    staffId: 's1',
    staffName: 'David Mwangi',
    liters: 27.2,
    geoPoint: { lat: -0.3031, lng: 36.0800 },
    photoUrl: '/api/placeholder/400/300',
    timestamp: '2024-06-15T06:45:00Z',
    txHash: '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    validationCode: '847293',
    qualityGrade: 'A',
    temperature: 4.1,
    fatContent: 3.9,
    proteinContent: 3.3
  },
  {
    id: 'col5',
    farmerId: 'f2',
    farmerName: 'Mary Wanjiku',
    staffId: 's2',
    staffName: 'Susan Nduta',
    liters: 21.9,
    geoPoint: { lat: -1.0369, lng: 36.6429 },
    photoUrl: '/api/placeholder/400/300',
    timestamp: '2024-06-15T07:30:00Z',
    txHash: '0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    validationCode: '593847',
    qualityGrade: 'B',
    temperature: 4.8,
    fatContent: 3.7,
    proteinContent: 2.9
  }
];

export const dummyPayments: Payment[] = [
  {
    id: 'pay1',
    farmerId: 'f1',
    farmerName: 'John Kiprotich',
    periodMonth: '2024-05',
    totalLiters: 825.6,
    ratePerLiter: 55,
    totalAmount: 45408,
    status: 'paid',
    paidAt: '2024-06-01T12:00:00Z',
    txReference: 'MPESA_REF_001',
    paymentMethod: 'mpesa',
    phoneNumber: '+254712345678'
  },
  {
    id: 'pay2',
    farmerId: 'f2',
    farmerName: 'Mary Wanjiku',
    periodMonth: '2024-05',
    totalLiters: 682.4,
    ratePerLiter: 55,
    totalAmount: 37532,
    status: 'paid',
    paidAt: '2024-06-01T14:30:00Z',
    txReference: 'BANK_TXN_002',
    paymentMethod: 'bank',
    accountNumber: '1234567890'
  },
  {
    id: 'pay3',
    farmerId: 'f4',
    farmerName: 'Grace Achieng',
    periodMonth: '2024-05',
    totalLiters: 743.1,
    ratePerLiter: 55,
    totalAmount: 40870.5,
    status: 'pending',
    txReference: 'PENDING_003',
    paymentMethod: 'mpesa',
    phoneNumber: '+254745678901'
  },
  {
    id: 'pay4',
    farmerId: 'f1',
    farmerName: 'John Kiprotich',
    periodMonth: '2024-06',
    totalLiters: 456.8,
    ratePerLiter: 57,
    totalAmount: 26037.6,
    status: 'pending',
    txReference: 'PENDING_004',
    paymentMethod: 'mpesa',
    phoneNumber: '+254712345678'
  }
];

export const dummyStaff: Staff[] = [
  {
    id: 's1',
    name: 'David Mwangi',
    phone: '+254701234567',
    email: 'david.mwangi@dairychain.com',
    role: 'collector',
    isActive: true,
    lastActiveAt: '2024-06-16T07:15:00Z'
  },
  {
    id: 's2',
    name: 'Susan Nduta',
    phone: '+254712345678',
    email: 'susan.nduta@dairychain.com',
    role: 'collector',
    isActive: true,
    lastActiveAt: '2024-06-16T08:00:00Z'
  },
  {
    id: 's3',
    name: 'Michael Ochieng',
    phone: '+254723456789',
    email: 'michael.ochieng@dairychain.com',
    role: 'supervisor',
    isActive: true,
    lastActiveAt: '2024-06-15T18:30:00Z'
  }
];

export const dummyDashboardStats: DashboardStats = {
  totalFarmers: 127,
  activeFarmers: 98,
  pendingKYC: 8,
  todayCollections: 23,
  todayLiters: 587.3,
  weekLiters: 3456.8,
  monthLiters: 14892.6,
  totalRevenue: 823096.2,
  avgQuality: 4.6
};
