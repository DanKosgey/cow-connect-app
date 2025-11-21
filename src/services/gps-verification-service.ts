import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class GPSVerificationService {
  /**
   * Validate GPS coordinates are within acceptable range
   */
  static validateCoordinates(latitude: number, longitude: number): { valid: boolean; error?: string } {
    // Validate latitude range
    if (latitude < -90 || latitude > 90) {
      return { 
        valid: false, 
        error: 'Latitude must be between -90 and 90 degrees' 
      };
    }
    
    // Validate longitude range
    if (longitude < -180 || longitude > 180) {
      return { 
        valid: false, 
        error: 'Longitude must be between -180 and 180 degrees' 
      };
    }
    
    return { valid: true };
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate that collection location is reasonable
   */
  static async validateCollectionLocation(
    collectionId: string,
    latitude: number,
    longitude: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // First validate coordinate format
      const coordinateValidation = this.validateCoordinates(latitude, longitude);
      if (!coordinateValidation.valid) {
        return coordinateValidation;
      }

      // Get the farmer's registered location
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select(`
          farmer_id,
          farmers (
            id,
            gps_latitude,
            gps_longitude
          )
        `)
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('GPSVerificationService - fetching collection', collectionError);
        return { 
          valid: false, 
          error: 'Failed to fetch collection data' 
        };
      }

      if (!collection) {
        return { 
          valid: false, 
          error: 'Collection not found' 
        };
      }

      const farmer = collection.farmers;
      if (!farmer) {
        return { 
          valid: false, 
          error: 'Farmer data not found' 
        };
      }

      // If farmer doesn't have registered GPS coordinates, we can't validate
      if (farmer.gps_latitude === null || farmer.gps_longitude === null) {
        logger.warn('Farmer has no registered GPS coordinates for validation', {
          farmerId: farmer.id
        });
        return { valid: true }; // Allow collection without validation
      }

      // Calculate distance between collection location and farmer's registered location
      const distance = this.calculateDistance(
        latitude,
        longitude,
        farmer.gps_latitude,
        farmer.gps_longitude
      );

      // Allow collections within 50km of the farmer's registered location
      // This accounts for reasonable travel distances for milk collection
      if (distance > 50) {
        return { 
          valid: false, 
          error: `Collection location is ${distance.toFixed(2)}km from farmer's registered location. Maximum allowed distance is 50km.` 
        };
      }

      return { valid: true };
    } catch (error) {
      logger.errorWithContext('GPSVerificationService - validateCollectionLocation', error);
      return { 
        valid: false, 
        error: 'Failed to validate collection location' 
      };
    }
  }

  /**
   * Validate that staff location is reasonable for the collection
   */
  static async validateStaffLocation(
    staffId: string,
    latitude: number,
    longitude: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // First validate coordinate format
      const coordinateValidation = this.validateCoordinates(latitude, longitude);
      if (!coordinateValidation.valid) {
        return coordinateValidation;
      }

      // Get the staff member's assigned area or base location
      // For now, we'll assume staff can work anywhere, but log the location for audit
      logger.info('Staff location recorded for audit', {
        staffId,
        latitude,
        longitude
      });

      return { valid: true };
    } catch (error) {
      logger.errorWithContext('GPSVerificationService - validateStaffLocation', error);
      return { 
        valid: false, 
        error: 'Failed to validate staff location' 
      };
    }
  }

  /**
   * Detect suspicious location patterns
   */
  static async detectSuspiciousLocations(staffId: string): Promise<boolean> {
    try {
      // Get recent collections by this staff member
      const { data: recentCollections, error } = await supabase
        .from('collections')
        .select(`
          id,
          gps_latitude,
          gps_longitude,
          collection_date,
          farmer_id
        `)
        .eq('staff_id', staffId)
        .order('collection_date', { ascending: false })
        .limit(10); // Check last 10 collections

      if (error) {
        logger.errorWithContext('GPSVerificationService - fetching recent collections', error);
        return false;
      }

      if (!recentCollections || recentCollections.length < 2) {
        // Not enough data to detect patterns
        return false;
      }

      // Check for impossible travel speeds between consecutive collections
      for (let i = 0; i < recentCollections.length - 1; i++) {
        const current = recentCollections[i];
        const next = recentCollections[i + 1];
        
        // Skip if either collection doesn't have GPS data
        if (
          current.gps_latitude === null || 
          current.gps_longitude === null ||
          next.gps_latitude === null || 
          next.gps_longitude === null
        ) {
          continue;
        }

        // Calculate distance between collections
        const distance = this.calculateDistance(
          current.gps_latitude,
          current.gps_longitude,
          next.gps_latitude,
          next.gps_longitude
        );

        // Calculate time difference in hours
        const timeDiff = (
          new Date(current.collection_date).getTime() - 
          new Date(next.collection_date).getTime()
        ) / (1000 * 60 * 60);

        // Skip if time difference is zero or negative
        if (timeDiff <= 0) {
          continue;
        }

        // Calculate average speed in km/h
        const speed = distance / timeDiff;

        // Flag as suspicious if average speed exceeds 200 km/h (reasonable limit for vehicle travel)
        if (speed > 200) {
          logger.warn('Suspicious travel speed detected', {
            staffId,
            collection1: current.id,
            collection2: next.id,
            distance: distance.toFixed(2),
            timeHours: timeDiff.toFixed(2),
            speed: speed.toFixed(2),
            farmer1: current.farmer_id,
            farmer2: next.farmer_id
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.errorWithContext('GPSVerificationService - detectSuspiciousLocations', error);
      return false;
    }
  }

  /**
   * Get location analytics for a staff member
   */
  static async getStaffLocationAnalytics(staffId: string) {
    try {
      const { data: collections, error } = await supabase
        .from('collections')
        .select(`
          id,
          gps_latitude,
          gps_longitude,
          collection_date,
          farmer_id,
          liters
        `)
        .eq('staff_id', staffId)
        .not('gps_latitude', 'is', null)
        .not('gps_longitude', 'is', null)
        .order('collection_date', { ascending: false })
        .limit(100); // Last 100 geotagged collections

      if (error) {
        logger.errorWithContext('GPSVerificationService - fetching staff collections', error);
        throw error;
      }

      if (!collections || collections.length === 0) {
        return {
          totalCollections: 0,
          coverageArea: 0,
          averageDistance: 0,
          mostFrequentArea: null
        };
      }

      // Calculate basic analytics
      const totalCollections = collections.length;
      
      // Calculate average distance between collections
      let totalDistance = 0;
      let validDistances = 0;
      
      for (let i = 0; i < collections.length - 1; i++) {
        if (
          collections[i].gps_latitude !== null &&
          collections[i].gps_longitude !== null &&
          collections[i + 1].gps_latitude !== null &&
          collections[i + 1].gps_longitude !== null
        ) {
          const distance = this.calculateDistance(
            collections[i].gps_latitude,
            collections[i].gps_longitude,
            collections[i + 1].gps_latitude,
            collections[i + 1].gps_longitude
          );
          totalDistance += distance;
          validDistances++;
        }
      }
      
      const averageDistance = validDistances > 0 ? totalDistance / validDistances : 0;

      return {
        totalCollections,
        averageDistance: parseFloat(averageDistance.toFixed(2)),
        // Additional analytics could be added here
      };
    } catch (error) {
      logger.errorWithContext('GPSVerificationService - getStaffLocationAnalytics', error);
      throw error;
    }
  }
}