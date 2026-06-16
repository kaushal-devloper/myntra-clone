import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface ThemedLoaderProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export function ThemedLoader({
  size = 'large',
  color,
  message,
  overlay = false,
  style,
}: ThemedLoaderProps) {
  const { theme, isDark } = useAppTheme();
  
  const spinnerColor = color || theme.colors.primary;
  const backgroundColor = overlay 
    ? (isDark ? 'rgba(18, 18, 20, 0.8)' : 'rgba(248, 249, 250, 0.8)')
    : 'transparent';

  const containerStyle = overlay 
    ? [styles.overlay, { backgroundColor }]
    : [styles.inline, style];

  return (
    <View style={containerStyle}>
      <View style={[styles.content, overlay && [styles.overlayContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]]}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {message ? (
          <Text style={[styles.message, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
    minWidth: 120,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
