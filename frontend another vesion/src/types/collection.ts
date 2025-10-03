// Collection data interfaces
export interface CollectionLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface CollectionData {
  volume: number;
  temperature: number;
  fat_content?: number;
  protein_content?: number;
  ph_level?: number;
  location: CollectionLocation;
  photos?: File[];
  notes?: string;
}

export interface CollectionApiResponse {
  id: string;
  quality_grade: "A" | "B" | "C";
  calculated_price: number;
  quality_score: number;
  created_at: string;
  collection_point: string;
}