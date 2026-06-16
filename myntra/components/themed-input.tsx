import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function ThemedInput({
  label,
  error,
  style,
  placeholderTextColor,
  ...rest
}: ThemedInputProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.inputText,
            borderColor: error ? theme.colors.error : theme.colors.border,
            borderRadius: theme.roundness.md,
            padding: theme.spacing.md,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor || theme.colors.inputPlaceholder}
        {...rest}
      />
      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
