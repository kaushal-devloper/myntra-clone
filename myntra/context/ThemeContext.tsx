import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme, Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme, Theme } from '@/constants/themes';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  themeMode: ThemeMode;
  theme: Theme;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const STORAGE_KEY = '@app_theme_mode';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  
  // Use React Native's hook and fallback to direct Appearance check for immediate hydration
  const rnColorScheme = useRNColorScheme();
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>(
    rnColorScheme || Appearance.getColorScheme() || 'light'
  );

  // Keep systemColorScheme in sync when useRNColorScheme updates
  useEffect(() => {
    if (rnColorScheme) {
      setSystemColorScheme(rnColorScheme);
    }
  }, [rnColorScheme]);

  // Handle system color changes immediately, even if hook is delayed
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setSystemColorScheme(colorScheme);
      }
    });
    return () => subscription.remove();
  }, []);

  // Load saved theme on startup
  useEffect(() => {
    async function loadTheme() {
      try {
        let savedMode: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          savedMode = window.localStorage.getItem(STORAGE_KEY);
        } else {
          savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        }
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode from storage', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  // Memoize setThemeMode function to prevent re-renders in consumer settings controls
  const setThemeMode = React.useCallback(async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, mode);
      }
    } catch (error) {
      console.error('Failed to save theme mode to storage', error);
    }
  }, []);

  // Determine if dark mode is active
  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const theme = isDark ? DarkTheme : LightTheme;

  // Sync document body style on web platform to avoid white background issues
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.colors.background;
      document.body.style.color = theme.colors.text;
    }
  }, [theme]);

  // Memoize context value to optimize performance and prevent unnecessary consumer re-renders
  const contextValue = React.useMemo(() => ({
    themeMode,
    theme,
    isDark,
    setThemeMode,
    isLoading,
  }), [themeMode, theme, isDark, setThemeMode, isLoading]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
}
