import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgCard: string;
  bgInput: string;
  bgSubtle: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Borders
  border: string;
  borderSubtle: string;
  // Brand
  brand: string;
  brandLight: string;
  // Status
  income: string;
  expense: string;
  // Tab bar
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
}

const lightTheme: ThemeColors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgInput: '#F8FAFC',
  bgSubtle: '#EFF6FF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  brand: '#2563EB',
  brandLight: '#EFF6FF',
  income: '#059669',
  expense: '#EF4444',
  tabBg: '#FFFFFF',
  tabBorder: '#F1F5F9',
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',
};

const darkTheme: ThemeColors = {
  bg: '#0F172A',
  bgCard: '#1E293B',
  bgInput: '#0F172A',
  bgSubtle: '#1E3A5F',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  border: '#334155',
  borderSubtle: '#1E293B',
  brand: '#3B82F6',
  brandLight: '#1E3A5F',
  income: '#34D399',
  expense: '#FB7185',
  tabBg: '#1E293B',
  tabBorder: '#334155',
  tabActive: '#3B82F6',
  tabInactive: '#475569',
};

interface ThemeContextData {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({
  isDark: false,
  colors: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkTheme : lightTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
