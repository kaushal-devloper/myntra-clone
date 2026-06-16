import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export function ThemedAlert() {
  const { theme, isDark } = useAppTheme();
  const { alertOptions, hideAlert } = useAlert();

  if (!alertOptions) return null;

  const { title, message, buttons, type = 'info' } = alertOptions;

  const getAlertIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={36} color={theme.colors.success} />;
      case 'warning':
        return <AlertTriangle size={36} color={theme.colors.warning} />;
      case 'error':
        return <AlertCircle size={36} color={theme.colors.error} />;
      case 'info':
      default:
        return <Info size={36} color={theme.colors.primary} />;
    }
  };

  const getIconBackground = () => {
    switch (type) {
      case 'success':
        return isDark ? 'rgba(3, 166, 133, 0.15)' : '#ffeef2';
      case 'warning':
        return isDark ? 'rgba(221, 107, 32, 0.15)' : '#fff6e0';
      case 'error':
        return isDark ? 'rgba(229, 62, 98, 0.15)' : '#fff0f0';
      case 'info':
      default:
        return theme.colors.subduedBrand;
    }
  };

  const alertButtons = buttons && buttons.length > 0 
    ? buttons 
    : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Icon Header */}
          <View style={[styles.iconWrapper, { backgroundColor: getIconBackground() }]}>
            {getAlertIcon()}
          </View>

          {/* Texts */}
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>

          {/* Action Buttons */}
          <View style={[styles.buttonContainer, alertButtons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal]}>
            {alertButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              let btnBg = theme.colors.primary;
              let textCol = '#ffffff';

              if (isCancel) {
                btnBg = theme.colors.inputBackground;
                textCol = theme.colors.text;
              } else if (isDestructive) {
                btnBg = theme.colors.error;
                textCol = '#ffffff';
              }

              const handlePress = async () => {
                hideAlert();
                if (btn.onPress) {
                  await btn.onPress();
                }
              };

              return (
                <TouchableOpacity
                  key={`${btn.text}-${index}`}
                  style={[
                    styles.button,
                    { backgroundColor: btnBg },
                    alertButtons.length > 2 ? styles.verticalButton : styles.horizontalButton
                  ]}
                  onPress={handlePress}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: textCol }]}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: Platform.OS === 'web' ? 380 : width * 0.85,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  horizontalButton: {
    flex: 1,
  },
  verticalButton: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
