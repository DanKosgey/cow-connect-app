import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark' | 'nature';

interface AnalyticsColors {
  success: string;
  warning: string;
  error: string;
  info: string;
  charts: {
    primary: string[];
    secondary: string[];
    accent: string[];
  };
}

interface ThemeConfig {
  bg: {
    primary: string;
    secondary: string;
    accent: string;
  };
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  analytics: AnalyticsColors;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeConfig: ThemeConfig;
}

const defaultAnalyticsColors: AnalyticsColors = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  charts: {
    primary: ['#10B981', '#059669', '#047857', '#065F46'],
    secondary: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
    accent: ['#F59E0B', '#D97706', '#B45309', '#92400E'],
  },
};

const themes: Record<Theme, ThemeConfig> = {
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      accent: '#e9ecef',
    },
    text: {
      primary: '#212529',
      secondary: '#495057',
      accent: '#6c757d',
    },
    border: {
      primary: '#dee2e6',
      secondary: '#ced4da',
    },
    analytics: defaultAnalyticsColors,
  },
  dark: {
    bg: {
      primary: '#1F2937',
      secondary: '#111827',
      accent: '#374151',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#E5E7EB',
      accent: '#D1D5DB',
    },
    border: {
      primary: '#4B5563',
      secondary: '#6B7280',
    },
    analytics: {
      ...defaultAnalyticsColors,
      charts: {
        primary: ['#34D399', '#10B981', '#059669', '#047857'],
        secondary: ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'],
        accent: ['#FBBF24', '#F59E0B', '#D97706', '#B45309'],
      },
    },
  },
  nature: {
    bg: {
      primary: '#F0FDF4',
      secondary: '#DCFCE7',
      accent: '#BBF7D0',
    },
    text: {
      primary: '#166534',
      secondary: '#15803D',
      accent: '#16A34A',
    },
    border: {
      primary: '#4ADE80',
      secondary: '#86EFAC',
    },
    analytics: {
      ...defaultAnalyticsColors,
      charts: {
        primary: ['#22C55E', '#16A34A', '#15803D', '#166534'],
        secondary: ['#38BDF8', '#0EA5E9', '#0284C7', '#0369A1'],
        accent: ['#FB923C', '#F97316', '#EA580C', '#C2410C'],
      },
    },
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('nature');

  const value = {
    theme,
    setTheme,
    themeConfig: themes[theme],
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}