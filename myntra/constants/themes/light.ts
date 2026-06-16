import { Theme } from './types';

export const LightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#ff3f6c',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#5e6267',
    textMuted: '#9aa0a6',
    border: '#e1e3e6',
    borderLight: '#f0f0f2',
    tint: '#ff3f6c',
    icon: '#3e3e3e',
    iconMuted: '#687076',
    inputBackground: '#f1f3f5',
    inputText: '#1a1a1a',
    inputPlaceholder: '#8e8e93',
    buttonBackground: '#ff3f6c',
    buttonText: '#ffffff',
    success: '#03a685',
    error: '#e53e3e',
    warning: '#dd6b20',
    subduedBrand: '#ffeef2',
    notification: '#ff3f6c',
  },
  typography: {
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};
