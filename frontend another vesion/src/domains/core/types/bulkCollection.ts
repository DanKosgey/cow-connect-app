// Bulk Collection Entry interfaces
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface QualityTest {
  fat_content?: number;
  protein_content?: number;
  ph_level?: number;
  bacteria_count?: number;
  antibiotic_residue?: boolean;
}

export interface BulkCollectionItem {
  farmer_id: string;
  volume: number;
  temperature: number;
  quality_tests: QualityTest;
  timestamp: Date;
  location: Coordinates;
  container_id?: string;
}

export interface BulkCollectionData {
  collections: BulkCollectionItem[];
  route_id: string;
  staff_notes: string;
}

export interface BulkCollectionRequest {
  collections: Array<{
    farmer_id: string;
    staff_id: string;
    liters: number;
    temperature: number;
    fat_content?: number;
    protein_content?: number;
    ph_level?: number;
    gps_latitude: number;
    gps_longitude: number;
    quality_grade: 'A' | 'B' | 'C';
    container_id?: string;
    notes?: string;
  }>;
  route_id: string;
  staff_id: string;
  collected_at: string;
  staff_notes?: string;
}

export interface BulkCollectionResponse {
  created_collections: Array<{
    id: string;
    farmer_id: string;
    quality_grade: string;
    calculated_price: number;
  }>;
  failed_collections: Array<{
    farmer_id: string;
    error: string;
    reason: string;
  }>;
  summary: {
    total_volume: number;
    average_quality: number;
    total_value: number;
  };
}