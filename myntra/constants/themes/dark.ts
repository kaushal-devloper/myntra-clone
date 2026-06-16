import { Theme } from './types';

export const DarkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#ff3f6c',
    background: '#121214',
    card: '#1b1b1f',
    text: '#f3f4f6',
    textSecondary: '#a0aec0',
    textMuted: '#64748b',
    border: '#2d2f34',
    borderLight: '#242529',
    tint: '#ff5c84',
    icon: '#f3f4f6',
    iconMuted: '#9BA1A6',
    inputBackground: '#242428',
    inputText: '#f3f4f6',
    inputPlaceholder: '#718096',
    buttonBackground: '#ff3f6c',
    buttonText: '#ffffff',
    success: '#05c79f',
    error: '#fc8181',
    warning: '#f6ad55',
    subduedBrand: '#3a1520',
    notification: '#ff5c84',
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
