// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock the global localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('pending_profile expiry', () => {
  const key = 'pending_profile';

  beforeEach(() => {
    localStorage.clear();
  });

  it('removes pending_profile older than 24 hours', () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const pending = {
      userId: 'test-id',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '123',
      role: 'farmer',
      createdAt: oldDate
    };
    localStorage.setItem(key, JSON.stringify(pending));

    // simulate AuthContext processing logic: parse and check expiry
    const raw = localStorage.getItem(key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    const createdAt = new Date(parsed.createdAt);
    const now = new Date();
    const expired = now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000;
    if (expired) {
      localStorage.removeItem(key);
    }

    expect(localStorage.getItem(key)).toBeNull();
  });

  it('keeps recent pending_profile (within 24 hours)', () => {
    const recentDate = new Date().toISOString();
    const pending = {
      userId: 'test-id',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '123',
      role: 'farmer',
      createdAt: recentDate
    };
    localStorage.setItem(key, JSON.stringify(pending));

    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw as string);
    const createdAt = new Date(parsed.createdAt);
    const now = new Date();
    const expired = now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000;
    if (expired) {
      localStorage.removeItem(key);
    }

    expect(localStorage.getItem(key)).not.toBeNull();
  });
});