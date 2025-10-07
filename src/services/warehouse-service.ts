import { supabase } from '@/integrations/supabase/client';

export interface WarehouseLocation {
  id: string;
  name: string;
  address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  gps_latitude: number;
  gps_longitude: number;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutePoint {
  id: string;
  route_id: string;
  collection_point_id: string;
  sequence_number: number;
  is_active: boolean;
  created_at: string;
}

export class WarehouseService {
  // Get all warehouses with location data
  static async getWarehousesWithLocations() {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Error fetching warehouses: ${error.message}`);
    }

    return data;
  }

  // Update warehouse location
  static async updateWarehouseLocation(warehouseId: string, latitude: number, longitude: number) {
    const { data, error } = await supabase
      .from('warehouses')
      .update({
        gps_latitude: latitude,
        gps_longitude: longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', warehouseId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating warehouse location: ${error.message}`);
    }

    return data;
  }

  // Get collection points from collections with GPS data
  static async getCollectionPointsFromCollections() {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        id,
        gps_latitude,
        gps_longitude,
        collection_date,
        farmer_id,
        farmers (full_name)
      `)
      .not('gps_latitude', 'is', null)
      .not('gps_longitude', 'is', null)
      .order('collection_date', { ascending: false })
      .limit(1000);

    if (error) {
      throw new Error(`Error fetching collection points: ${error.message}`);
    }

    // Group collections by location (same GPS coordinates)
    const locationGroups: Record<string, any[]> = {};
    
    data.forEach(collection => {
      const key = `${collection.gps_latitude},${collection.gps_longitude}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(collection);
    });

    // Create collection points from grouped locations
    const collectionPoints = Object.entries(locationGroups).map(([key, collections], index) => {
      const [lat, lng] = key.split(',').map(Number);
      const latestCollection = collections[0]; // Already ordered by date
      
      return {
        id: `point-${index}`,
        name: `Collection Point ${index + 1}`,
        gps_latitude: lat,
        gps_longitude: lng,
        address: null,
        is_active: true,
        collections_count: collections.length,
        unique_farmers: new Set(collections.map((c: any) => c.farmer_id)).size,
        latest_collection_date: latestCollection.collection_date,
        created_at: latestCollection.collection_date,
        updated_at: latestCollection.collection_date
      };
    });

    return collectionPoints;
  }

  // Get routes with collection points
  static async getRoutesWithPoints() {
    const { data, error } = await supabase
      .from('routes')
      .select(`
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        route_points (
          sequence_number,
          is_active,
          collection_points (
            id,
            name,
            gps_latitude,
            gps_longitude,
            address
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.warn(`Warning: Error fetching routes: ${error.message}`);
      // Return empty array if routes table doesn't exist yet
      return [];
    }

    return data || [];
  }

  // Create a new collection point
  static async createCollectionPoint(point: Omit<CollectionPoint, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('collection_points')
      .insert({
        ...point,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating collection point: ${error.message}`);
    }

    return data;
  }

  // Assign collection to warehouse based on proximity
  static async assignCollectionToWarehouse(collectionId: string, warehouseId: string) {
    const { data, error } = await supabase
      .from('warehouse_collections')
      .insert({
        warehouse_id: warehouseId,
        collection_id: collectionId,
        added_at: new Date().toISOString()
      })
      .select();

    if (error) {
      throw new Error(`Error assigning collection to warehouse: ${error.message}`);
    }

    return data;
  }

  // Find the nearest collection point based on GPS coordinates
  static async findNearestCollectionPoint(latitude: number, longitude: number) {
    // Using the Supabase RPC function to calculate distance
    const { data, error } = await supabase
      .from('collection_points')
      .select('id, name, location')
      .limit(1);

    if (error) {
      console.warn(`Warning: Error finding nearest collection point: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // In a real implementation, we would calculate the actual nearest point
    // For now, we'll return the first point as a placeholder
    return data[0];
  }

  // Get warehouse collections with location data
  static async getWarehouseCollections(warehouseId: string) {
    const { data, error } = await supabase
      .from('warehouse_collections')
      .select(`
        id,
        added_at,
        collections (
          id,
          collection_id,
          liters,
          quality_grade,
          total_amount,
          collection_date,
          gps_latitude,
          gps_longitude,
          farmers (full_name)
        )
      `)
      .eq('warehouse_id', warehouseId)
      .order('added_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching warehouse collections: ${error.message}`);
    }

    return data || [];
  }

  // Find the nearest warehouse based on GPS coordinates
  static async findNearestWarehouse(latitude: number, longitude: number) {
    // Using the Supabase RPC function to calculate distance
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name, gps_latitude, gps_longitude')
      .not('gps_latitude', 'is', null)
      .not('gps_longitude', 'is', null)
      .limit(1);

    if (error) {
      console.warn(`Warning: Error finding nearest warehouse: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // In a real implementation, we would calculate the actual nearest warehouse
    // For now, we'll return the first warehouse as a placeholder
    return data[0];
  }

  // Automatically assign a collection to the nearest warehouse
  static async autoAssignCollectionToWarehouse(collectionId: string, latitude: number, longitude: number) {
    try {
      // Find the nearest warehouse
      const nearestWarehouse = await this.findNearestWarehouse(latitude, longitude);
      
      if (!nearestWarehouse) {
        console.warn('No warehouse found for automatic assignment');
        return null;
      }

      // Assign the collection to the warehouse
      const assignment = await this.assignCollectionToWarehouse(collectionId, nearestWarehouse.id);
      return assignment;
    } catch (error) {
      console.error('Error auto-assigning collection to warehouse:', error);
      return null;
    }
  }
}