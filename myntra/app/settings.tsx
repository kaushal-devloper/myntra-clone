import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sun, Moon, Laptop, Check, Lock, MapPin, RotateCcw, ChevronRight, AlertTriangle, Trash2, ShieldAlert } from 'lucide-react-native';
import { useAppTheme, ThemeMode } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { resetUserData } from '@/utils/settingsApi';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, isDark } = useAppTheme();
  const { user } = useAuth();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const themeOptions: { mode: ThemeMode; label: string; description: string; icon: any }[] = [
    {
      mode: 'light',
      label: 'Light Mode',
      description: 'Clean light background with soft charcoal text',
      icon: Sun,
    },
    {
      mode: 'dark',
      label: 'Dark Mode',
      description: 'Deep slate background with bright highlights',
      icon: Moon,
    },
    {
      mode: 'system',
      label: 'System Default',
      description: 'Automatically adjust to your phone\'s settings',
      icon: Laptop,
    },
  ];

  const settingsOptions = [
    {
      icon: Lock,
      label: 'Change Password',
      description: 'Update your account password',
      route: '/change-password',
      color: '#3b82f6',
    },
    {
      icon: MapPin,
      label: 'Manage Address',
      description: 'Add or update your delivery address',
      route: '/manage-address',
      color: '#10b981',
    },
  ];

  const handleReset = async () => {
    setResetting(true);
    setResetError('');
    try {
      await resetUserData();
      setResetSuccess(true);

      // Trigger native system notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Data Reset Complete 🗑️',
            body: 'All your app data has been cleared. Your account and login credentials are safe.',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (notifErr) {
        console.error('Error sending reset notification:', notifErr);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>APPEARANCE</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {themeOptions.map((option, index) => {
            const isSelected = themeMode === option.mode;
            const IconComponent = option.icon;

            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.optionRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
                ]}
                activeOpacity={0.7}
                onPress={() => setThemeMode(option.mode)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: isSelected ? theme.colors.subduedBrand : theme.colors.inputBackground }]}>
                  <IconComponent size={22} color={isSelected ? theme.colors.primary : theme.colors.textSecondary} />
                </View>

                <View style={styles.optionDetails}>
                  <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>
                  <Text style={[styles.optionDesc, { color: theme.colors.textSecondary }]}>{option.description}</Text>
                </View>

                {isSelected && (
                  <View style={[styles.checkWrapper, { backgroundColor: theme.colors.primary }]}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            Choosing &quot;System Default&quot; will sync the app appearance automatically whenever your device changes between light and dark mode.
          </Text>
        </View>

        {/* Account Settings Section */}
        {user && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 28 }]}>ACCOUNT</Text>

            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {settingsOptions.map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.settingRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => router.push(option.route as any)}
                  >
                    <View style={[styles.settingIconWrapper, { backgroundColor: isDark ? `${option.color}20` : `${option.color}12` }]}>
                      <IconComponent size={20} color={option.color} />
                    </View>

                    <View style={styles.settingDetails}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{option.label}</Text>
                      <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>{option.description}</Text>
                    </View>

                    <ChevronRight size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Danger Zone */}
            <Text style={[styles.sectionTitle, { color: '#ef4444', marginTop: 28 }]}>DANGER ZONE</Text>

            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }]}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => { setShowResetModal(true); setResetSuccess(false); setResetError(''); }}
              >
                <View style={[styles.settingIconWrapper, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}>
                  <RotateCcw size={20} color="#ef4444" />
                </View>

                <View style={styles.settingDetails}>
                  <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Reset Database</Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>Clear all orders, transactions, wishlist & cart</Text>
                </View>

                <ChevronRight size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={[styles.dangerInfoBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : '#fef2f2' }]}>
              <Text style={[styles.dangerInfoText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
                ⚠️ Resetting will permanently clear all your app data. Your account and login credentials will be preserved.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => !resetting && setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.resetModalContainer, { backgroundColor: theme.colors.card }]}>
            {resetSuccess ? (
              /* Success State */
              <>
                <View style={[styles.resetIconCircle, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                  <Check size={36} color="#10b981" />
                </View>
                <Text style={[styles.resetTitle, { color: theme.colors.text }]}>Data Reset Complete!</Text>
                <Text style={[styles.resetDescription, { color: theme.colors.textSecondary }]}>
                  All your app data has been cleared successfully. Your account and login credentials are safe.
                </Text>
                <TouchableOpacity
                  style={[styles.resetDoneButton, { backgroundColor: '#10b981' }]}
                  onPress={() => setShowResetModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resetDoneButtonText}>DONE</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Confirmation State */
              <>
                <View style={[styles.resetIconCircle, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}>
                  <ShieldAlert size={36} color="#ef4444" />
                </View>
                <Text style={[styles.resetTitle, { color: theme.colors.text }]}>Reset All Data?</Text>
                <Text style={[styles.resetDescription, { color: theme.colors.textSecondary }]}>
                  This will permanently delete all your:
                </Text>
                <View style={styles.resetList}>
                  {['Orders & receipts', 'Transactions history', 'Wishlist items', 'Cart items', 'Notifications', 'Browsing history'].map((item) => (
                    <View key={item} style={styles.resetListItem}>
                      <Trash2 size={13} color="#ef4444" />
                      <Text style={[styles.resetListText, { color: theme.colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.resetWarningBox, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb' }]}>
                  <AlertTriangle size={16} color="#f59e0b" />
                  <Text style={[styles.resetWarningText, { color: isDark ? '#fcd34d' : '#b45309' }]}>
                    Your account and login credentials will NOT be deleted.
                  </Text>
                </View>

                {resetError ? (
                  <Text style={styles.resetErrorText}>{resetError}</Text>
                ) : null}

                <View style={styles.resetButtonRow}>
                  <TouchableOpacity
                    style={[styles.resetCancelButton, { borderColor: theme.colors.border }]}
                    onPress={() => setShowResetModal(false)}
                    disabled={resetting}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resetCancelText, { color: theme.colors.text }]}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resetConfirmButton, { backgroundColor: resetting ? '#999' : '#ef4444' }]}
                    onPress={handleReset}
                    disabled={resetting}
                    activeOpacity={0.85}
                  >
                    {resetting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.resetConfirmText}>RESET DATA</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
  },
  checkWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  infoBox: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  // Account settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
  },
  dangerInfoBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dangerInfoText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resetModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  resetIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resetTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  resetDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 12,
  },
  resetList: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  resetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  resetListText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resetWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  resetWarningText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  resetErrorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  resetButtonRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  resetCancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  resetCancelText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetConfirmButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetDoneButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetDoneButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
