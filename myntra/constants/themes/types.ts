export interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  tint: string;
  icon: string;
  iconMuted: string;
  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  buttonBackground: string;
  buttonText: string;
  success: string;
  error: string;
  warning: string;
  subduedBrand: string;
  notification: string;
}

export interface ThemeTypography {
  title: {
    fontSize: number;
    fontWeight: '700' | 'bold';
    lineHeight: number;
  };
  subtitle: {
    fontSize: number;
    fontWeight: '600';
    lineHeight: number;
  };
  body: {
    fontSize: number;
    fontWeight: '400';
    lineHeight: number;
  };
  caption: {
    fontSize: number;
    fontWeight: '400';
    lineHeight: number;
  };
  button: {
    fontSize: number;
    fontWeight: '600';
    letterSpacing: number;
  };
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  roundness: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}
