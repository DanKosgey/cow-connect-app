import { settingsService, type SystemSettings } from './settings-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settingsService.clearCache();
  });

  describe('getAllSettings', () => {
    it('should fetch all settings successfully', async () => {
      const mockSettings = [
        { key: 'milk_rate_per_liter', value: 50 },
        { key: 'collection_time_window', value: '6:00 AM - 10:00 AM' },
        { key: 'kyc_required', value: true },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockSettings, error: null });

      const result = await settingsService.getAllSettings();

      expect(result).toEqual({
        milk_rate_per_liter: 50,
        collection_time_window: '6:00 AM - 10:00 AM',
        kyc_required: true,
        notifications_enabled: true,
        data_retention_days: 365,
        system_message: '',
        default_role: 'farmer'
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
    });

    it('should handle fetch error', async () => {
      mockSupabase.select.mockResolvedValue({ data: null, error: new Error('Database error') });

      await expect(settingsService.getAllSettings()).rejects.toThrow('Database error');
    });
  });

  describe('getSetting', () => {
    it('should fetch a specific setting', async () => {
      mockSupabase.select.mockResolvedValue({ 
        data: { value: 50 }, 
        error: null 
      }).mockResolvedValueOnce({ 
        data: { value: '6:00 AM - 10:00 AM' }, 
        error: null 
      });

      const rate = await settingsService.getSetting<number>('milk_rate_per_liter');
      const timeWindow = await settingsService.getSetting<string>('collection_time_window');

      expect(rate).toBe(50);
      expect(timeWindow).toBe('6:00 AM - 10:00 AM');
    });

    it('should return null for non-existent setting', async () => {
      mockSupabase.select.mockResolvedValue({ data: null, error: null });

      const result = await settingsService.getSetting('milk_rate_per_liter');
      expect(result).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update a setting successfully', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      await settingsService.updateSetting('milk_rate_per_liter', 55);

      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings');
      expect(mockSupabase.upsert).toHaveBeenCalledWith({ 
        key: 'milk_rate_per_liter', 
        value: 55 
      }, { onConflict: 'key' });
    });

    it('should handle update error', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: new Error('Update failed') });

      await expect(settingsService.updateSetting('milk_rate_per_liter', 55))
        .rejects.toThrow('Update failed');
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const updates: Partial<SystemSettings> = {
        milk_rate_per_liter: 60,
        collection_time_window: '7:00 AM - 11:00 AM'
      };

      await settingsService.updateSettings(updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        [
          { key: 'milk_rate_per_liter', value: 60 },
          { key: 'collection_time_window', value: '7:00 AM - 11:00 AM' }
        ], 
        { onConflict: 'key' }
      );
    });
  });

  describe('cache', () => {
    it('should cache settings and use cache on subsequent calls', async () => {
      const mockSettings = [{ key: 'milk_rate_per_liter', value: 50 }];
      mockSupabase.select.mockResolvedValue({ data: mockSettings, error: null });

      // First call
      await settingsService.getSetting('milk_rate_per_liter');
      
      // Second call should use cache
      await settingsService.getSetting('milk_rate_per_liter');

      // Should only have been called once
      expect(mockSupabase.select).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockSettings = [{ key: 'milk_rate_per_liter', value: 50 }];
      mockSupabase.select.mockResolvedValue({ data: mockSettings, error: null });

      await settingsService.getSetting('milk_rate_per_liter');
      settingsService.clearCache();
      await settingsService.getSetting('milk_rate_per_liter');

      // Should have been called twice after cache clear
      expect(mockSupabase.select).toHaveBeenCalledTimes(2);
    });
  });
});