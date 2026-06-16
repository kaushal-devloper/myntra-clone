import React from 'react';
import { View, StyleSheet, SafeAreaView, ViewProps, Platform } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface ThemedContainerProps extends ViewProps {
  safe?: boolean;
}

export function ThemedContainer({
  safe = false,
  style,
  children,
  ...rest
}: ThemedContainerProps) {
  const { theme } = useAppTheme();

  if (safe && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }, style]} {...rest}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
