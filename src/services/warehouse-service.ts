import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/utils/uuid';

export interface WarehouseLocation {
  id: string;
  name: string;
  address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
  updated_at: string;
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
    // Return empty array since routes functionality is not available
    return [];
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

  // Automatically assign a collection to the nearest warehouse (stub implementation)
  static async autoAssignCollectionToWarehouse(collectionId: string, latitude: number, longitude: number) {
    try {
      // Find the nearest warehouse
      const nearestWarehouse = await this.findNearestWarehouse(latitude, longitude);
      
      if (!nearestWarehouse) {
        console.warn('No warehouse found for automatic assignment');
        return null;
      }

      // Since warehouse_collections table doesn't exist, we'll just log the assignment
      console.log(`Would assign collection ${collectionId} to warehouse ${nearestWarehouse.id}`);
      return { warehouse_id: nearestWarehouse.id, collection_id: collectionId };
    } catch (error) {
      console.error('Error auto-assigning collection to warehouse:', error);
      return null;
    }
  }
}
