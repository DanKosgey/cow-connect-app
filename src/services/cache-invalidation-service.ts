import { QueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "./cache-utils";

class CacheInvalidationService {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Invalidate admin dashboard related caches
  invalidateAdminDashboard() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_DASHBOARD] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_ANALYTICS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_COLLECTIONS] });
  }

  // Invalidate farmer related caches
  invalidateFarmerData(farmerId?: string) {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_DASHBOARD] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_COLLECTIONS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_PAYMENTS] });
    
    if (farmerId) {
      this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_DASHBOARD, farmerId] });
      this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_COLLECTIONS, farmerId] });
    }
  }

  // Invalidate staff related caches
  invalidateStaffData(staffId?: string) {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_DASHBOARD] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_COLLECTIONS] });
    
    if (staffId) {
      this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_DASHBOARD, staffId] });
      this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_COLLECTIONS, staffId] });
    }
  }

  // Invalidate payment related caches
  invalidatePaymentData() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_PAYMENTS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_PAYMENTS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_PAYMENTS] });
  }

  // Invalidate collection related caches
  invalidateCollectionData() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_COLLECTIONS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_COLLECTIONS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_COLLECTIONS] });
  }

  // Invalidate KYC related caches
  invalidateKycData() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_KYC] });
  }

  // Invalidate credit related caches
  invalidateCreditData() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_CREDIT] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_CREDIT] });
  }

  // Invalidate user profile related caches
  invalidateUserProfile() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.USER_PROFILE] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.USER_ROLE] });
  }

  // Invalidate notification caches
  invalidateNotifications() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.NOTIFICATIONS] });
  }

  // Invalidate settings caches
  invalidateSettings() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.SETTINGS] });
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_SETTINGS] });
  }

  // Invalidate inventory caches
  invalidateInventory() {
    this.queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INVENTORY] });
  }

  // Invalidate all related caches for a specific farmer
  invalidateAllFarmerCaches(farmerId: string) {
    this.invalidateFarmerData(farmerId);
    this.invalidateCollectionData();
    this.invalidatePaymentData();
    this.invalidateCreditData();
    this.invalidateKycData();
  }

  // Invalidate all related caches for a specific staff member
  invalidateAllStaffCaches(staffId: string) {
    this.invalidateStaffData(staffId);
    this.invalidateCollectionData();
    this.invalidatePaymentData();
  }

  // Invalidate all admin related caches
  invalidateAllAdminCaches() {
    this.invalidateAdminDashboard();
    this.invalidateCollectionData();
    this.invalidatePaymentData();
    this.invalidateKycData();
    this.invalidateCreditData();
    this.invalidateSettings();
  }

  // Invalidate all caches (use sparingly)
  invalidateAllCaches() {
    this.queryClient.clear();
  }

  // Invalidate caches based on database table changes
  invalidateCachesForTable(tableName: string) {
    const tableCacheMap: Record<string, () => void> = {
      'collections': () => this.invalidateCollectionData(),
      'farmer_payments': () => this.invalidatePaymentData(),
      'farmers': () => this.invalidateFarmerData(),
      'staff': () => this.invalidateStaffData(),
      'profiles': () => this.invalidateUserProfile(),
      'user_roles': () => this.invalidateUserProfile(),
      'notifications': () => this.invalidateNotifications(),
      'system_settings': () => this.invalidateSettings(),
      'agrovet_inventory': () => this.invalidateInventory(),
      'farmer_credit_profiles': () => this.invalidateCreditData(), // Using farmer_credit_profiles as farmer_credit_limits has been deleted
      'farmer_credit_transactions': () => this.invalidateCreditData(),
      'kyc_documents': () => this.invalidateKycData(),
    };

    const invalidateFunction = tableCacheMap[tableName];
    if (invalidateFunction) {
      invalidateFunction();
    }
  }
}

export default CacheInvalidationService;