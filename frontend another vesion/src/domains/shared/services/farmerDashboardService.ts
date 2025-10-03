// TypeScript interfaces matching the API contract
interface PaymentSummary {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  dueDate: string;
}

interface Collection {
  id: string;
  volume: number;
  quality: string;
  timestamp: string;
  pricePerLiter: number;
}

interface ChartData {
  date: string;
  quality: number;
  volume: number;
}

interface DashboardData {
  totalCollections: number;
  monthlyEarnings: number;
  averageQuality: number;
  upcomingPayments: PaymentSummary[];
  recentCollections: Collection[];
  qualityTrends: ChartData[];
}

/**
 * Generic request helper with proper error handling
 * Copied from ApiService.ts since it's not exported
 */
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Fix the API path to include /api/v1
  const fullPath = path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : '/' + path}`;
  const API_BASE = '';
  
  const response = await fetch(`${API_BASE}${fullPath}`, {
    ...opts,
    headers,
  });

  let responseData;
  
  try {
    responseData = await response.json();
  } catch (jsonError) {
    // If JSON parsing fails, the response might be text
    try {
      responseData = await response.text();
    } catch (textError) {
      responseData = 'Unable to parse response';
    }
  }
  
  if (!response.ok) {
    // For error responses, try to extract meaningful error message
    let errorText = 'Unknown error occurred';
    
    if (typeof responseData === 'object' && responseData !== null) {
      errorText = responseData.detail || responseData.message || JSON.stringify(responseData);
    } else if (typeof responseData === 'string') {
      errorText = responseData;
    }
    
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  return responseData;
}

/**
 * Fetch farmer dashboard data
 * @param farmerId - The ID of the farmer
 * @returns Promise<DashboardData>
 */
async function getDashboardData(farmerId: string): Promise<DashboardData> {
  try {
    const response: any = await request(`/farmers/${farmerId}/dashboard`);
    
    // Transform the response to match our frontend interface
    const transformedData: DashboardData = {
      totalCollections: response.total_collections,
      monthlyEarnings: response.monthly_earnings,
      averageQuality: response.average_quality,
      upcomingPayments: response.upcoming_payments?.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        dueDate: payment.due_date
      })) || [],
      recentCollections: response.recent_collections?.map((collection: any) => ({
        id: collection.id,
        volume: collection.volume,
        quality: collection.quality,
        timestamp: collection.timestamp,
        pricePerLiter: collection.price_per_liter
      })) || [],
      qualityTrends: response.quality_trends?.map((trend: any) => ({
        date: trend.date,
        quality: trend.quality,
        volume: trend.volume
      })) || []
    };
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch farmer dashboard data:', error);
    throw new Error('Failed to load dashboard data. Please try again.');
  }
}

export default {
  getDashboardData
};