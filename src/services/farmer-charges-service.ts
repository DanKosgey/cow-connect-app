import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { collectorRateService } from '@/services/collector-rate-service';

export interface FarmerCharge {
  id?: string;
  farmer_id: string;
  collection_id?: string;
  collector_id?: string;
  charge_type: 'collector_fee' | 'service_charge' | 'other';
  rate_per_liter: number;
  liters_charged: number;
  total_charge_amount: number;
  status: 'pending' | 'applied' | 'waived';
  applied_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmerChargeSummary {
  farmer_id: string;
  farmer_name: string;
  total_pending_charges: number;
  total_applied_charges: number;
  total_waived_charges: number;
  recent_charges: FarmerCharge[];
}

class FarmerChargesService {
  private static instance: FarmerChargesService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): FarmerChargesService {
    if (!FarmerChargesService.instance) {
      FarmerChargesService.instance = new FarmerChargesService();
    }
    return FarmerChargesService.instance;
  }

  /**
   * Calculate farmer charges based on collector rates and collection data
   */
  async calculateFarmerCharge(
    farmerId: string,
    collectionId: string,
    collectorId: string,
    liters: number
  ): Promise<FarmerCharge> {
    try {
      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();
      
      // Calculate the total charge amount
      const totalChargeAmount = liters * ratePerLiter;
      
      return {
        farmer_id: farmerId,
        collection_id: collectionId,
        collector_id: collectorId,
        charge_type: 'collector_fee',
        rate_per_liter: ratePerLiter,
        liters_charged: liters,
        total_charge_amount: parseFloat(totalChargeAmount.toFixed(2)),
        status: 'pending'
      };
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - calculateFarmerCharge exception', error);
      throw error;
    }
  }

  /**
   * Record a farmer charge
   */
  async recordFarmerCharge(charge: Omit<FarmerCharge, 'id' | 'created_at' | 'updated_at'>): Promise<FarmerCharge | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_charges')
        .insert([charge])
        .select()
        .single();

      if (error) {
        logger.errorWithContext('FarmerChargesService - recordFarmerCharge', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - recordFarmerCharge exception', error);
      return null;
    }
  }

  /**
   * Get all charges for a specific farmer
   */
  async getFarmerCharges(farmerId: string): Promise<FarmerCharge[]> {
    try {
      const { data, error } = await supabase
        .from('farmer_charges')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('FarmerChargesService - getFarmerCharges', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - getFarmerCharges exception', error);
      return [];
    }
  }

  /**
   * Get farmer charges summary including totals by status
   */
  async getFarmerChargesSummary(farmerId: string): Promise<FarmerChargeSummary | null> {
    try {
      // Get farmer name
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('full_name')
        .eq('id', farmerId)
        .single();

      if (farmerError) {
        logger.errorWithContext('FarmerChargesService - getFarmerChargesSummary fetch farmer', farmerError);
        return null;
      }

      // Get all charges for this farmer
      const charges = await this.getFarmerCharges(farmerId);
      
      // Calculate totals by status
      const pendingCharges = charges.filter(c => c.status === 'pending');
      const appliedCharges = charges.filter(c => c.status === 'applied');
      const waivedCharges = charges.filter(c => c.status === 'waived');
      
      const totalPendingCharges = pendingCharges.reduce((sum, charge) => sum + charge.total_charge_amount, 0);
      const totalAppliedCharges = appliedCharges.reduce((sum, charge) => sum + charge.total_charge_amount, 0);
      const totalWaivedCharges = waivedCharges.reduce((sum, charge) => sum + charge.total_charge_amount, 0);
      
      // Get recent charges (last 5)
      const recentCharges = charges.slice(0, 5);

      return {
        farmer_id: farmerId,
        farmer_name: farmerData?.full_name || 'Unknown Farmer',
        total_pending_charges: parseFloat(totalPendingCharges.toFixed(2)),
        total_applied_charges: parseFloat(totalAppliedCharges.toFixed(2)),
        total_waived_charges: parseFloat(totalWaivedCharges.toFixed(2)),
        recent_charges: recentCharges
      };
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - getFarmerChargesSummary exception', error);
      return null;
    }
  }

  /**
   * Get all farmer charges with farmer names for admin dashboard
   */
  async getAllFarmerChargesWithNames(): Promise<(FarmerCharge & { farmer_name: string })[]> {
    try {
      const { data, error } = await supabase
        .from('farmer_charges')
        .select(`
          *,
          farmers!inner (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('FarmerChargesService - getAllFarmerChargesWithNames', error);
        return [];
      }

      return data?.map(charge => ({
        ...charge,
        farmer_name: charge.farmers?.full_name || 'Unknown Farmer'
      })) || [];
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - getAllFarmerChargesWithNames exception', error);
      return [];
    }
  }

  /**
   * Apply a pending charge to a farmer
   */
  async applyFarmerCharge(chargeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('farmer_charges')
        .update({ 
          status: 'applied',
          applied_date: new Date().toISOString()
        })
        .eq('id', chargeId);

      if (error) {
        logger.errorWithContext('FarmerChargesService - applyFarmerCharge', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - applyFarmerCharge exception', error);
      return false;
    }
  }

  /**
   * Waive a pending charge for a farmer
   */
  async waiveFarmerCharge(chargeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('farmer_charges')
        .update({ 
          status: 'waived'
        })
        .eq('id', chargeId);

      if (error) {
        logger.errorWithContext('FarmerChargesService - waiveFarmerCharge', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - waiveFarmerCharge exception', error);
      return false;
    }
  }

  /**
   * Automatically generate farmer charges for approved collections
   */
  async autoGenerateFarmerCharges(): Promise<boolean> {
    try {
      // Get all approved collections that don't have corresponding farmer charges yet
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('id, farmer_id, staff_id, liters')
        .eq('approved_for_payment', true)
        .eq('status', 'Collected');
        
      if (collectionsError) {
        logger.errorWithContext('FarmerChargesService - autoGenerateFarmerCharges fetch collections', collectionsError);
        return false;
      }
      
      if (!collections || collections.length === 0) {
        return true; // No collections to process
      }
      
      // Check which collections already have charges
      const collectionIds = collections.map(c => c.id);
      const { data: existingCharges, error: chargesError } = await supabase
        .from('farmer_charges')
        .select('collection_id')
        .in('collection_id', collectionIds);
        
      if (chargesError) {
        logger.errorWithContext('FarmerChargesService - autoGenerateFarmerCharges fetch existing charges', chargesError);
        return false;
      }
      
      // Filter out collections that already have charges
      const existingChargeCollectionIds = new Set(existingCharges?.map(c => c.collection_id) || []);
      const collectionsWithoutCharges = collections.filter(c => !existingChargeCollectionIds.has(c.id));
      
      if (collectionsWithoutCharges.length === 0) {
        return true; // All collections already have charges
      }
      
      // Generate charges for remaining collections
      const chargePromises = collectionsWithoutCharges.map(collection => 
        this.calculateFarmerCharge(
          collection.farmer_id,
          collection.id,
          collection.staff_id,
          collection.liters
        )
      );
      
      const charges = await Promise.all(chargePromises);
      
      // Record all charges
      const recordPromises = charges.map(charge => this.recordFarmerCharge(charge));
      await Promise.all(recordPromises);
      
      return true;
    } catch (error) {
      logger.errorWithContext('FarmerChargesService - autoGenerateFarmerCharges exception', error);
      return false;
    }
  }
}

// Export singleton instance
export const farmerChargesService = FarmerChargesService.getInstance();