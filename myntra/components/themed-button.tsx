import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  lightColor?: string;
  darkColor?: string;
  textColor?: string;
}

export function ThemedButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  style,
  disabled,
  textColor,
  ...rest
}: ThemedButtonProps) {
  const { theme } = useAppTheme();

  const getStyles = () => {
    let backgroundColor = theme.colors.primary;
    let borderColor = 'transparent';
    let borderWidth = 0;
    let textCol = theme.colors.buttonText;

    if (variant === 'secondary') {
      backgroundColor = theme.colors.subduedBrand;
      textCol = theme.colors.primary;
    } else if (variant === 'outline') {
      backgroundColor = 'transparent';
      borderColor = theme.colors.primary;
      borderWidth = 1.5;
      textCol = theme.colors.primary;
    } else if (variant === 'ghost') {
      backgroundColor = 'transparent';
      textCol = theme.colors.text;
    }

    if (textColor) {
      textCol = textColor;
    }

    let paddingVertical = theme.spacing.md;
    let paddingHorizontal = theme.spacing.lg;
    let fontSize = theme.typography.button.fontSize;

    if (size === 'sm') {
      paddingVertical = theme.spacing.sm;
      paddingHorizontal = theme.spacing.md;
      fontSize = theme.typography.caption.fontSize;
    } else if (size === 'lg') {
      paddingVertical = theme.spacing.lg;
      paddingHorizontal = theme.spacing.xl;
      fontSize = theme.typography.subtitle.fontSize;
    }

    return {
      button: {
        backgroundColor,
        borderColor,
        borderWidth,
        borderRadius: theme.roundness.md,
        paddingVertical,
        paddingHorizontal,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: disabled || loading ? 0.6 : 1,
      },
      text: {
        color: textCol,
        fontSize,
        fontWeight: theme.typography.button.fontWeight,
        letterSpacing: theme.typography.button.letterSpacing,
      },
    };
  };

  const currentStyles = getStyles();

  return (
    <TouchableOpacity
      style={[currentStyles.button as any, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentStyles.text.color} style={{ marginRight: 8 }} />
      ) : null}
      <Text style={currentStyles.text as any}>{title}</Text>
    </TouchableOpacity>
  );
}
