import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, MapPin, User, Phone, Home, Building2, Map, Hash, AlertCircle, CheckCircle, Edit3 } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { getAddress, updateAddress, Address } from '@/utils/settingsApi';
import * as Notifications from 'expo-notifications';

export default function ManageAddressScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    fetchAddress();
  }, []);

  const fetchAddress = async () => {
    setLoading(true);
    try {
      const addr = await getAddress();
      if (addr && addr.fullName) {
        setFullName(addr.fullName);
        setMobile(addr.mobile);
        setAddressLine(addr.addressLine);
        setCity(addr.city);
        setState(addr.state);
        setPincode(addr.pincode);
        setHasExisting(true);
        setIsEditing(false);
      } else {
        setIsEditing(true);
        setHasExisting(false);
      }
    } catch (err: any) {
      setIsEditing(true);
      setHasExisting(false);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) { setError('Full name is required.'); return false; }
    if (!mobile.trim() || !/^\d{10}$/.test(mobile.replace(/\D/g, ''))) { setError('Enter a valid 10-digit mobile number.'); return false; }
    if (!addressLine.trim()) { setError('Address line is required.'); return false; }
    if (!city.trim()) { setError('City is required.'); return false; }
    if (!state.trim()) { setError('State is required.'); return false; }
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) { setError('Enter a valid 6-digit pincode.'); return false; }
    return true;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setSaving(true);
    try {
      const result = await updateAddress({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });
      setSuccess(result.message || 'Address saved successfully!');
      setHasExisting(true);
      setIsEditing(false);

      // Trigger native system notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Address Updated Successfully 📍',
            body: `Delivery address saved for ${fullName.trim()}, ${city.trim()}. This will be used for all future orders.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (notifErr) {
        console.error('Error sending address update notification:', notifErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Manage Address</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Manage Address</Text>
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
              <MapPin size={40} color={theme.colors.primary} />
            </View>
            <Text style={[styles.pageDescription, { color: theme.colors.textSecondary }]}>
              {hasExisting
                ? 'Your delivery address used for all orders'
                : 'Add your delivery address for seamless checkout'
              }
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

          {/* View Mode - Show saved address */}
          {hasExisting && !isEditing ? (
            <View style={[styles.addressCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.addressCardHeader}>
                <View style={[styles.addressBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                  <CheckCircle size={14} color="#10b981" />
                  <Text style={[styles.addressBadgeText, { color: '#10b981' }]}>Saved Address</Text>
                </View>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: isDark ? 'rgba(255,63,108,0.12)' : 'rgba(255,63,108,0.08)' }]}
                  onPress={() => { setIsEditing(true); setSuccess(''); setError(''); }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={14} color={theme.colors.primary} />
                  <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addressDetailRow}>
                <User size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.addressDetailText, { color: theme.colors.text }]}>{fullName}</Text>
              </View>
              <View style={styles.addressDetailRow}>
                <Phone size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.addressDetailText, { color: theme.colors.text }]}>{mobile}</Text>
              </View>
              <View style={styles.addressDetailRow}>
                <Home size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.addressDetailText, { color: theme.colors.text }]}>{addressLine}</Text>
              </View>
              <View style={styles.addressDetailRow}>
                <Building2 size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.addressDetailText, { color: theme.colors.text }]}>{city}, {state} - {pincode}</Text>
              </View>

              <View style={[styles.addressInfoNote, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff' }]}>
                <Text style={[styles.addressInfoText, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                  This address will be automatically used for all your orders
                </Text>
              </View>
            </View>
          ) : null}

          {/* Edit Mode - Form */}
          {isEditing ? (
            <>
              <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <User size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.colors.text }]}
                      value={fullName}
                      onChangeText={(t) => { setFullName(t); setError(''); }}
                      placeholder="Enter full name"
                      placeholderTextColor={theme.colors.textMuted}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Mobile */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Mobile Number</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <Phone size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.colors.text }]}
                      value={mobile}
                      onChangeText={(t) => { setMobile(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* Address Line */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Address Line</Text>
                  <View style={[styles.inputWrapper, styles.inputMultiline, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <Home size={18} color={theme.colors.textMuted} style={[styles.inputIcon, { marginTop: 14 }]} />
                    <TextInput
                      style={[styles.textInput, styles.multilineInput, { color: theme.colors.text }]}
                      value={addressLine}
                      onChangeText={(t) => { setAddressLine(t); setError(''); }}
                      placeholder="House/flat no., street, area"
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>

                {/* City & State - Row */}
                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>City</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                      <Building2 size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { color: theme.colors.text }]}
                        value={city}
                        onChangeText={(t) => { setCity(t); setError(''); }}
                        placeholder="City"
                        placeholderTextColor={theme.colors.textMuted}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>State</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                      <Map size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { color: theme.colors.text }]}
                        value={state}
                        onChangeText={(t) => { setState(t); setError(''); }}
                        placeholder="State"
                        placeholderTextColor={theme.colors.textMuted}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                {/* Pincode */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Pincode</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <Hash size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.colors.text }]}
                      value={pincode}
                      onChangeText={(t) => { setPincode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                      placeholder="6-digit pincode"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>
              </View>

              {/* Save / Cancel Buttons */}
              <View style={styles.buttonRow}>
                {hasExisting && (
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                    onPress={() => { setIsEditing(false); setError(''); fetchAddress(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>CANCEL</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { flex: hasExisting ? 1 : undefined },
                    {
                      backgroundColor: saving ? (isDark ? '#555' : '#ccc') : theme.colors.primary,
                      opacity: saving ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {hasExisting ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // View mode
  addressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  addressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addressDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressDetailText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  addressInfoNote: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  addressInfoText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  // Form mode
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 18,
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
  inputMultiline: {
    height: 80,
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 0.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
