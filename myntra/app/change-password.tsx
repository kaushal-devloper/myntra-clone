import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { changePassword } from '@/utils/settingsApi';
import * as Notifications from 'expo-notifications';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (pwd.length < 6) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (pwd.length < 8) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const extras = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (extras >= 2 && pwd.length >= 10) return { label: 'Strong', color: '#10b981', width: '100%' };
    if (extras >= 1) return { label: 'Good', color: '#3b82f6', width: '75%' };
    return { label: 'Fair', color: '#f59e0b', width: '50%' };
  };

  const strength = passwordStrength(newPassword);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(result.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Trigger native system notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Password Changed Successfully 🔒',
            body: 'Your account password has been updated. If this wasn\'t you, please contact support immediately.',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (notifErr) {
        console.error('Error sending password change notification:', notifErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Change Password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon Header */}
          <View style={styles.iconHeader}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,63,108,0.15)' : 'rgba(255,63,108,0.08)' }]}>
              <ShieldCheck size={40} color={theme.colors.primary} />
            </View>
            <Text style={[styles.pageDescription, { color: theme.colors.textSecondary }]}>
              Keep your account secure by updating your password regularly
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={[styles.messageBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }]}>
              <AlertCircle size={18} color="#ef4444" />
              <Text style={[styles.messageText, { color: '#ef4444' }]}>{error}</Text>
            </View>
          ) : null}

          {/* Success Message */}
          {success ? (
            <View style={[styles.messageBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5', borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#a7f3d0' }]}>
              <CheckCircle size={18} color="#10b981" />
              <Text style={[styles.messageText, { color: '#10b981' }]}>{success}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Current Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Current Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.colors.text }]}
                  value={currentPassword}
                  onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
                  {showCurrent ? <EyeOff size={18} color={theme.colors.textMuted} /> : <Eye size={18} color={theme.colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.colors.text }]}
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(''); }}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
                  {showNew ? <EyeOff size={18} color={theme.colors.textMuted} /> : <Eye size={18} color={theme.colors.textMuted} />}
                </TouchableOpacity>
              </View>
              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={[styles.strengthTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f1f1' }]}>
                    <View style={[styles.strengthBar, { width: strength.width as any, backgroundColor: strength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.colors.text }]}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  {showConfirm ? <EyeOff size={18} color={theme.colors.textMuted} /> : <Eye size={18} color={theme.colors.textMuted} />}
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.mismatchText}>Passwords do not match</Text>
              )}
              {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 6 && (
                <Text style={styles.matchText}>Passwords match ✓</Text>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: loading ? (isDark ? '#555' : '#ccc') : theme.colors.primary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>UPDATE PASSWORD</Text>
            )}
          </TouchableOpacity>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe' }]}>
            <Text style={[styles.tipsTitle, { color: isDark ? '#93c5fd' : '#2563eb' }]}>Password Tips</Text>
            <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>• At least 6 characters long</Text>
            <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>• Include uppercase and lowercase letters</Text>
            <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>• Add numbers and special characters</Text>
            <Text style={[styles.tipItem, { color: theme.colors.textSecondary }]}>• Avoid using common words or patterns</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pageDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 42,
  },
  mismatchText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 2,
    marginTop: 2,
  },
  matchText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 2,
    marginTop: 2,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tipsCard: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  tipItem: {
    fontSize: 12,
    lineHeight: 18,
  },
});
