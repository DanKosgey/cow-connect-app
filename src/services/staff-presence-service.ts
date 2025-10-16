import { supabase } from '@/integrations/supabase/client';

export interface StaffPresence {
  staffId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  currentRoute?: string;
}

class StaffPresenceService {
  private presenceChannel: any;
  private userId: string | null = null;
  private staffId: string | null = null;
  private presenceInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(presence: StaffPresence[]) => void> = new Set();

  constructor() {
    // Keep track of window visibility
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.setStatus('online');
        } else {
          this.setStatus('away');
        }
      });
    }

    // Handle beforeunload to set offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.setStatus('offline');
      });
    }
  }

  async initialize(userId: string, staffId: string) {
    this.userId = userId;
    this.staffId = staffId;

    // Subscribe to presence channel
    this.presenceChannel = supabase.channel('staff-presence', {
      config: {
        presence: {
          key: staffId,
        },
      },
    });

    // Handle presence state changes
    this.presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = this.presenceChannel.presenceState();
      this.notifyListeners(this.transformPresenceState(state));
    });

    // Handle presence join
    this.presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
      console.log('Staff joined:', key, newPresences);
    });

    // Handle presence leave
    this.presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
      console.log('Staff left:', key, leftPresences);
    });

    await this.presenceChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.setStatus('online');
      }
    });

    // Start heartbeat to maintain presence
    this.startHeartbeat();
  }

  private transformPresenceState(state: any): StaffPresence[] {
    return Object.entries(state).map(([staffId, presences]: [string, any]) => ({
      staffId,
      status: presences[0].status,
      lastSeen: presences[0].lastSeen,
      currentRoute: presences[0].currentRoute
    }));
  }

  private startHeartbeat() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    this.presenceInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await this.setStatus('online');
      }
    }, 30000); // Update every 30 seconds
  }

  async setStatus(status: 'online' | 'away' | 'offline', currentRoute?: string) {
    if (!this.staffId || !this.presenceChannel) return;

    try {
      await this.presenceChannel.track({
        staffId: this.staffId,
        status,
        lastSeen: new Date().toISOString(),
        currentRoute
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }

  subscribeToPresence(callback: (presence: StaffPresence[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(presence: StaffPresence[]) {
    this.listeners.forEach(listener => listener(presence));
  }

  updateRoute(route: string) {
    if (document.visibilityState === 'visible') {
      this.setStatus('online', route);
    }
  }

  cleanup() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
    if (this.presenceChannel) {
      this.setStatus('offline');
      supabase.removeChannel(this.presenceChannel);
    }
    this.listeners.clear();
  }
}

export const staffPresence = new StaffPresenceService();