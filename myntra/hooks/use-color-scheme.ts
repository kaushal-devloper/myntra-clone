import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export function useColorScheme() {
  try {
    const { isDark } = useAppTheme();
    return isDark ? 'dark' : 'light';
  } catch (error) {
    // Fallback if context is not available (e.g., during initialization/testing)
    const rnScheme = useRNColorScheme();
    return rnScheme ?? 'light';
  }
}
