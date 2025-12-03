import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface DeductionType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FarmerDeduction {
  id: string;
  farmer_id: string;
  deduction_type_id: string;
  amount: number;
  is_active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_apply_date: string;
  created_at: string;
  updated_at: string;
}

export interface DeductionRecord {
  id: string;
  deduction_type_id: string;
  farmer_id: string | null;
  amount: number;
  reason: string;
  applied_by: string;
  applied_at: string;
}

class DeductionService {
  private static instance: DeductionService;

  private constructor() {}

  static getInstance(): DeductionService {
    if (!DeductionService.instance) {
      DeductionService.instance = new DeductionService();
    }
    return DeductionService.instance;
  }

  /**
   * Validate deduction type data
   */
  private validateDeductionType(name: string, description: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!name || name.trim().length === 0) {
      errors.push('Deduction type name is required');
    }
    
    if (name && name.length > 100) {
      errors.push('Deduction type name must be less than 100 characters');
    }
    
    if (description && description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate farmer deduction data
   */
  private validateFarmerDeduction(
    farmer_id: string, 
    deduction_type_id: string, 
    amount: number,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_apply_date: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!farmer_id) {
      errors.push('Farmer ID is required');
    }
    
    if (!deduction_type_id) {
      errors.push('Deduction type ID is required');
    }
    
    if (amount <= 0) {
      errors.push('Amount must be greater than zero');
    }
    
    if (amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000');
    }
    
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      errors.push('Invalid frequency. Must be daily, weekly, monthly, or yearly');
    }
    
    if (!next_apply_date) {
      errors.push('Next apply date is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate immediate deduction data
   */
  private validateImmediateDeduction(deduction_type_id: string, amount: number, reason: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!deduction_type_id) {
      errors.push('Deduction type ID is required');
    }
    
    if (amount <= 0) {
      errors.push('Amount must be greater than zero');
    }
    
    if (amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000');
    }
    
    if (!reason || reason.trim().length === 0) {
      errors.push('Reason is required');
    }
    
    if (reason && reason.length > 500) {
      errors.push('Reason must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log deduction activity for audit purposes
   */
  private async logDeductionActivity(
    action: string,
    details: any,
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        table_name: 'deductions',
        operation: action,
        changed_by: userId || null,
        old_data: details.oldData || null,
        new_data: details.newData || null,
        changed_at: new Date().toISOString()
      });
    } catch (error) {
      logger.errorWithContext('DeductionService - logDeductionActivity', error);
    }
  }

  /**
   * Get all deduction types
   */
  async getDeductionTypes(): Promise<DeductionType[]> {
    try {
      const { data, error } = await supabase
        .from('deduction_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.errorWithContext('DeductionService - getDeductionTypes', error);
      return [];
    }
  }

  /**
   * Create a new deduction type
   */
  async createDeductionType(name: string, description: string, userId?: string): Promise<DeductionType | null> {
    try {
      // Validate input
      const validation = this.validateDeductionType(name, description);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const { data, error } = await supabase
        .from('deduction_types')
        .insert([{ name, description }])
        .select()
        .single();

      if (error) throw error;
      
      // Log the activity
      await this.logDeductionActivity('CREATE_DEDUCTION_TYPE', {
        newData: { name, description }
      }, userId);
      
      return data;
    } catch (error) {
      logger.errorWithContext('DeductionService - createDeductionType', error);
      throw error;
    }
  }

  /**
   * Update an existing deduction type
   */
  async updateDeductionType(id: string, name: string, description: string, userId?: string): Promise<DeductionType | null> {
    try {
      // Validate input
      const validation = this.validateDeductionType(name, description);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate ID
      if (!id) {
        throw new Error('Deduction type ID is required');
      }

      // Get the old data for logging
      const { data: oldData } = await supabase
        .from('deduction_types')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('deduction_types')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Log the activity
      await this.logDeductionActivity('UPDATE_DEDUCTION_TYPE', {
        oldData,
        newData: { id, name, description }
      }, userId);
      
      return data;
    } catch (error) {
      logger.errorWithContext('DeductionService - updateDeductionType', error);
      throw error;
    }
  }

  /**
   * Delete a deduction type
   */
  async deleteDeductionType(id: string, userId?: string): Promise<boolean> {
    try {
      // Validate ID
      if (!id) {
        throw new Error('Deduction type ID is required');
      }

      // Check if there are any farmer deductions using this type
      const { data: farmerDeductions, error: checkError } = await supabase
        .from('farmer_deductions')
        .select('id')
        .eq('deduction_type_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (farmerDeductions && farmerDeductions.length > 0) {
        throw new Error('Cannot delete deduction type that is in use by farmers');
      }

      // Get the old data for logging
      const { data: oldData } = await supabase
        .from('deduction_types')
        .select('*')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('deduction_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log the activity
      await this.logDeductionActivity('DELETE_DEDUCTION_TYPE', {
        oldData
      }, userId);
      
      return true;
    } catch (error) {
      logger.errorWithContext('DeductionService - deleteDeductionType', error);
      throw error;
    }
  }

  /**
   * Delete a farmer deduction
   */
  async deleteFarmerDeduction(id: string, userId?: string): Promise<boolean> {
    try {
      // Validate ID
      if (!id) {
        throw new Error('Farmer deduction ID is required');
      }

      // Get the old data for logging
      const { data: oldData } = await supabase
        .from('farmer_deductions')
        .select(`
          *,
          farmers!inner (full_name),
          deduction_types!inner (name)
        `)
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('farmer_deductions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Log the activity
      await this.logDeductionActivity('DELETE_FARMER_DEDUCTION', {
        oldData: {
          farmer_name: oldData?.farmers?.full_name || 'Unknown Farmer',
          deduction_type_name: oldData?.deduction_types?.name || 'Unknown Type',
          amount: oldData?.amount || 0
        }
      }, userId);
      
      return true;
    } catch (error) {
      logger.errorWithContext('DeductionService - deleteFarmerDeduction', error);
      throw error;
    }
  }

  /**
   * Get farmer deductions
   */
  async getFarmerDeductions(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('farmer_deductions')
        .select(`
          *,
          farmers!inner (full_name),
          deduction_types!inner (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        farmer_name: item.farmers?.full_name || 'Unknown Farmer',
        deduction_type_name: item.deduction_types?.name || 'Unknown Type'
      }));
    } catch (error) {
      logger.errorWithContext('DeductionService - getFarmerDeductions', error);
      throw error;
    }
  }

  /**
   * Save farmer deduction (create or update) with recurring support
   */
  async saveFarmerDeduction(
    farmer_id: string, 
    deduction_type_id: string, 
    amount: number,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_apply_date: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Validate input
      const validation = this.validateFarmerDeduction(
        farmer_id, 
        deduction_type_id, 
        amount,
        frequency,
        next_apply_date
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if farmer exists
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('id', farmer_id)
        .single();

      if (farmerError || !farmer) {
        throw new Error('Farmer not found');
      }

      // Check if deduction type exists
      const { data: deductionType, error: typeError } = await supabase
        .from('deduction_types')
        .select('id')
        .eq('id', deduction_type_id)
        .single();

      if (typeError || !deductionType) {
        throw new Error('Deduction type not found');
      }

      // Get the old data for logging (if updating)
      const { data: existingData } = await supabase
        .from('farmer_deductions')
        .select('*')
        .eq('farmer_id', farmer_id)
        .eq('deduction_type_id', deduction_type_id)
        .single();
      
      const { error } = await supabase
        .from('farmer_deductions')
        .upsert([{
          farmer_id,
          deduction_type_id,
          amount,
          frequency,
          next_apply_date,
          is_active: true
        }], {
          onConflict: 'farmer_id,deduction_type_id'
        });

      if (error) throw error;
      
      // Log the activity
      const action = existingData ? 'UPDATE_FARMER_DEDUCTION' : 'CREATE_FARMER_DEDUCTION';
      await this.logDeductionActivity(action, {
        oldData: existingData,
        newData: { farmer_id, deduction_type_id, amount, frequency, next_apply_date }
      }, userId);
      
      return true;
    } catch (error) {
      logger.errorWithContext('DeductionService - saveFarmerDeduction', error);
      throw error;
    }
  }

  /**
   * Get deduction records
   */
  async getDeductionRecords(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('deduction_records')
        .select(`
          *,
          farmers!left (full_name),
          deduction_types!inner (name),
          profiles!inner (full_name)
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        farmer_name: item.farmers?.full_name || 'All Farmers',
        deduction_type_name: item.deduction_types?.name || 'Unknown Type',
        applied_by_name: item.profiles?.full_name || 'Unknown User'
      }));
    } catch (error) {
      logger.errorWithContext('DeductionService - getDeductionRecords', error);
      throw error;
    }
  }

  /**
   * Create recurring deduction for all farmers
   */
  async createRecurringDeductionForAllFarmers(
    deduction_type_id: string,
    amount: number,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    start_date: string,
    applied_by: string
  ): Promise<{success: boolean, createdCount: number, errors: string[]}> {
    try {
      const errors: string[] = [];
      let createdCount = 0;

      // Validate input
      if (!deduction_type_id) {
        errors.push('Deduction type ID is required');
      }

      if (amount <= 0) {
        errors.push('Amount must be greater than zero');
      }

      if (amount > 1000000) {
        errors.push('Amount cannot exceed 1,000,000');
      }

      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
        errors.push('Invalid frequency. Must be daily, weekly, monthly, or yearly');
      }

      if (!start_date) {
        errors.push('Start date is required');
      }

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Check if deduction type exists
      const { data: deductionType, error: typeError } = await supabase
        .from('deduction_types')
        .select('id')
        .eq('id', deduction_type_id)
        .single();

      if (typeError || !deductionType) {
        throw new Error('Deduction type not found');
      }

      // Get all farmers
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id');

      if (farmersError) throw farmersError;

      if (!farmers || farmers.length === 0) {
        throw new Error('No farmers found');
      }

      // Create recurring deduction for each farmer
      for (const farmer of farmers) {
        try {
          const { error: insertError } = await supabase
            .from('farmer_deductions')
            .upsert([{
              farmer_id: farmer.id,
              deduction_type_id,
              amount,
              frequency,
              next_apply_date: start_date,
              is_active: true
            }], {
              onConflict: 'farmer_id,deduction_type_id'
            });

          if (insertError) throw insertError;
          createdCount++;
        } catch (error) {
          errors.push(`Failed to create deduction for farmer ${farmer.id}: ${error.message}`);
          logger.errorWithContext('DeductionService - createRecurringDeductionForAllFarmers', error);
        }
      }

      // Log the activity
      await this.logDeductionActivity('CREATE_RECURRING_DEDUCTION_ALL_FARMERS', {
        newData: { deduction_type_id, amount, frequency, start_date, createdCount }
      }, applied_by);

      return { success: true, createdCount, errors };
    } catch (error) {
      logger.errorWithContext('DeductionService - createRecurringDeductionForAllFarmers', error);
      return { success: false, createdCount: 0, errors: [error.message] };
    }
  }

  /**
   * Apply immediate deduction to all farmers
   */
  async applyImmediateDeduction(
    deduction_type_id: string,
    amount: number,
    reason: string,
    applied_by: string
  ): Promise<boolean> {
    try {
      // Validate input
      const validation = this.validateImmediateDeduction(deduction_type_id, amount, reason);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if deduction type exists
      const { data: deductionType, error: typeError } = await supabase
        .from('deduction_types')
        .select('id')
        .eq('id', deduction_type_id)
        .single();

      if (typeError || !deductionType) {
        throw new Error('Deduction type not found');
      }

      const { error } = await supabase
        .from('deduction_records')
        .insert([{
          deduction_type_id,
          farmer_id: null, // Null indicates this applies to all farmers
          amount,
          reason,
          applied_by
        }]);

      if (error) throw error;
      
      // Log the activity
      await this.logDeductionActivity('APPLY_IMMEDIATE_DEDUCTION', {
        newData: { deduction_type_id, amount, reason, applied_by }
      }, applied_by);
      
      return true;
    } catch (error) {
      logger.errorWithContext('DeductionService - applyImmediateDeduction', error);
      throw error;
    }
  }

  /**
   * Get active deductions for a specific farmer
   */
  async getActiveDeductionsForFarmer(farmer_id: string): Promise<FarmerDeduction[]> {
    try {
      // Validate input
      if (!farmer_id) {
        throw new Error('Farmer ID is required');
      }

      const { data, error } = await supabase
        .from('farmer_deductions')
        .select('*')
        .eq('farmer_id', farmer_id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.errorWithContext('DeductionService - getActiveDeductionsForFarmer', error);
      throw error;
    }
  }

  /**
   * Calculate total deductions for a farmer including system-wide deductions
   */
  async calculateTotalDeductionsForFarmer(farmer_id: string): Promise<number> {
    try {
      // Validate input
      if (!farmer_id) {
        throw new Error('Farmer ID is required');
      }

      // Get farmer-specific deductions
      const activeDeductions = await this.getActiveDeductionsForFarmer(farmer_id);
      const farmerSpecificDeductions = activeDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);

      // Get system-wide deductions (where farmer_id is null in deduction_records)
      const { data: systemDeductions, error: systemError } = await supabase
        .from('deduction_records')
        .select('amount')
        .is('farmer_id', null);

      if (systemError) {
        logger.errorWithContext('DeductionService - fetching system deductions', systemError);
        throw systemError;
      }

      const systemWideDeductions = systemDeductions?.reduce((sum, record) => sum + record.amount, 0) || 0;

      return farmerSpecificDeductions + systemWideDeductions;
    } catch (error) {
      logger.errorWithContext('DeductionService - calculateTotalDeductionsForFarmer', error);
      throw error;
    }
  }

  /**
   * Get all farmers with their deduction information including system-wide deductions
   */
  async getAllFarmersWithDeductions(): Promise<any[]> {
    try {
      // Get all farmers
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id, full_name')
        .order('full_name');

      if (farmersError) throw farmersError;

      // Get all farmer deductions
      const { data: farmerDeductions, error: deductionsError } = await supabase
        .from('farmer_deductions')
        .select('*')
        .eq('is_active', true);

      if (deductionsError) throw deductionsError;

      // Get system-wide deductions (where farmer_id is null in deduction_records)
      const { data: systemDeductions, error: systemError } = await supabase
        .from('deduction_records')
        .select('amount')
        .is('farmer_id', null);

      if (systemError) throw systemError;

      const systemWideDeductions = systemDeductions?.reduce((sum, record) => sum + record.amount, 0) || 0;

      // Combine data
      return (farmers || []).map(farmer => {
        const deductions = farmerDeductions?.filter(d => d.farmer_id === farmer.id) || [];
        const farmerSpecificDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const totalDeductions = farmerSpecificDeductions + systemWideDeductions;
        
        return {
          ...farmer,
          deductions,
          totalDeductions
        };
      });
    } catch (error) {
      logger.errorWithContext('DeductionService - getAllFarmersWithDeductions', error);
      throw error;
    }
  }

  /**
   * Apply recurring deductions that are due today
   */
  async applyDueRecurringDeductions(applied_by: string): Promise<{success: boolean, appliedCount: number, errors: string[]}> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const errors: string[] = [];
      let appliedCount = 0;

      // Get all active farmer deductions that are due today or earlier
      const { data: dueDeductions, error: fetchError } = await supabase
        .from('farmer_deductions')
        .select(`
          *,
          farmers!inner (full_name),
          deduction_types!inner (name)
        `)
        .eq('is_active', true)
        .lte('next_apply_date', today);

      if (fetchError) throw fetchError;

      // Apply each due deduction
      for (const deduction of dueDeductions || []) {
        try {
          // Insert deduction record
          const { error: insertError } = await supabase
            .from('deduction_records')
            .insert([{
              deduction_type_id: deduction.deduction_type_id,
              farmer_id: deduction.farmer_id,
              amount: deduction.amount,
              reason: `Recurring ${deduction.deduction_types?.name || 'deduction'} - ${deduction.frequency} deduction`,
              applied_by
            }]);

          if (insertError) throw insertError;

          // Calculate next apply date based on frequency
          let nextApplyDate = new Date(deduction.next_apply_date);
          switch (deduction.frequency) {
            case 'daily':
              nextApplyDate.setDate(nextApplyDate.getDate() + 1);
              break;
            case 'weekly':
              nextApplyDate.setDate(nextApplyDate.getDate() + 7);
              break;
            case 'monthly':
              nextApplyDate.setMonth(nextApplyDate.getMonth() + 1);
              break;
            case 'yearly':
              nextApplyDate.setFullYear(nextApplyDate.getFullYear() + 1);
              break;
          }

          // Update the next apply date
          const { error: updateError } = await supabase
            .from('farmer_deductions')
            .update({ next_apply_date: nextApplyDate.toISOString().split('T')[0] })
            .eq('id', deduction.id);

          if (updateError) throw updateError;

          appliedCount++;
        } catch (error) {
          errors.push(`Failed to apply deduction for farmer ${deduction.farmers?.full_name || deduction.farmer_id}: ${error.message}`);
          logger.errorWithContext('DeductionService - applyDueRecurringDeductions', error);
        }
      }

      return { success: true, appliedCount, errors };
    } catch (error) {
      logger.errorWithContext('DeductionService - applyDueRecurringDeductions', error);
      return { success: false, appliedCount: 0, errors: [error.message] };
    }
  }
}

export const deductionService = DeductionService.getInstance();