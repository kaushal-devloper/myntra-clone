import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface ThemedCardProps extends ViewProps {
  bordered?: boolean;
  shadowed?: boolean;
}

export function ThemedCard({
  bordered = true,
  shadowed = true,
  style,
  children,
  ...rest
}: ThemedCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.roundness.lg,
          borderColor: theme.colors.border,
          borderWidth: bordered ? 1 : 0,
        },
        shadowed && !isDark && styles.shadowLight,
        shadowed && isDark && styles.shadowDark,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
});
