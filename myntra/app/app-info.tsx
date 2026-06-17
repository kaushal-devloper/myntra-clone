import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Info, Bell, Shield, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useAlert } from "@/context/AlertContext";
import * as SecureStore from "expo-secure-store";
import {
  requestPermissionsAndInit,
  syncPushToken,
  unregisterPushToken,
} from "@/utils/notificationService";

export default function AppInfo() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();
  const { showAlert } = useAlert();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function loadNotificationChoice() {
      try {
        if (Platform.OS === "web") {
          const choice = localStorage.getItem("notification_choice");
          setNotificationsEnabled(choice === "allowed");
        } else {
          const choice = await SecureStore.getItemAsync("notification_choice");
          setNotificationsEnabled(choice === "allowed");
        }
      } catch (error) {
        console.error("Error loading notification choice:", error);
      } finally {
        setLoading(false);
      }
    }
    loadNotificationChoice();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (toggling) return;
    setToggling(true);

    try {
      if (value) {
        // User turned notifications ON
        console.log("[AppInfo] User requesting to enable push notifications...");
        const status = await requestPermissionsAndInit();
        
        if (status === "granted") {
          if (Platform.OS === "web") {
            localStorage.setItem("notification_choice", "allowed");
          } else {
            await SecureStore.setItemAsync("notification_choice", "allowed");
          }
          setNotificationsEnabled(true);

          if (isAuthenticated && user?._id) {
            await syncPushToken(user._id);
          }
          showAlert({
            title: "Success",
            message: "Notifications enabled successfully! You will now receive order status and exclusive discount alerts.",
            type: "success"
          });
        } else {
          // Permission was denied
          showAlert({
            title: "Permission Denied",
            message: "Please enable notification permissions for Myntra in your phone's system settings to receive push notifications.",
            type: "warning"
          });
          setNotificationsEnabled(false);
        }
      } else {
        // User turned notifications OFF
        console.log("[AppInfo] User manually disabling push notifications...");
        if (Platform.OS === "web") {
          localStorage.setItem("notification_choice", "disabled");
        } else {
          await SecureStore.setItemAsync("notification_choice", "disabled");
        }
        setNotificationsEnabled(false);

        if (isAuthenticated && user?._id) {
          await unregisterPushToken(user._id);
        }
        showAlert({
          title: "Notifications Disabled",
          message: "You have successfully opted out of push notifications. You can still check your logs in the Notification Center.",
          type: "info"
        });
      }
    } catch (error) {
      console.error("[AppInfo] Error toggling notifications setting:", error);
      showAlert({
        title: "Error",
        message: "Failed to update notification settings. Please try again.",
        type: "error"
      });
    } finally {
      setToggling(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>App Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo Banner */}
        <View style={styles.appBanner}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}>Myntra Clone</Text>
          <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>Version 1.0.0 (Production)</Text>
        </View>

        {/* Notifications Switch Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Bell size={20} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Push Notifications</Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            Get real-time updates regarding order shipments, payments status, and high discount fashion sales.
          </Text>

          <View style={[styles.settingRow, { borderTopColor: theme.colors.borderLight }]}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Enable Notifications</Text>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={toggling}
                trackColor={{ false: theme.colors.border, true: theme.colors.subduedBrand }}
                thumbColor={notificationsEnabled ? theme.colors.primary : "#f4f3f4"}
                ios_backgroundColor={theme.colors.border}
              />
            )}
          </View>
        </View>

        {/* System & Privacy Info Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Shield size={20} color="#03a685" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Security & Privacy</Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            We securely encrypt device identifiers. The application will never track your physical location or share login details with external services.
          </Text>
          
          <View style={[styles.staticRow, { borderTopColor: theme.colors.borderLight }]}>
            <Text style={[styles.staticLabel, { color: theme.colors.textSecondary }]}>Device Registered</Text>
            <Text style={[styles.staticValue, { color: theme.colors.text }]}>{Platform.OS === "web" ? "Web Browser" : `${Platform.OS} Device`}</Text>
          </View>
          <View style={[styles.staticRow, { borderTopColor: theme.colors.borderLight }]}>
            <Text style={[styles.staticLabel, { color: theme.colors.textSecondary }]}>Data Encryption</Text>
            <Text style={[styles.staticValue, { color: theme.colors.text }]}>AES-256 Bit</Text>
          </View>
        </View>

        {/* About Info Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Info size={20} color="#007aff" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>About Application</Text>
          </View>
          <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
            This application is a highly optimized React Native client with a scalable Node.js/MongoDB event-driven backend.
          </Text>
          
          <TouchableOpacity 
            style={[styles.linkRow, { borderTopColor: theme.colors.borderLight }]}
            onPress={() => showAlert({
              title: "Licenses",
              message: "This clone is built using React Native, Expo, and open source Lucide-Icons packages.",
              type: "info"
            })}
          >
            <Text style={[styles.linkLabel, { color: theme.colors.textSecondary }]}>Third-Party Licenses</Text>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 55 : 45,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 16, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 16 },
  appBanner: {
    alignItems: "center",
    marginVertical: 24,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#ff3f6c",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoText: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "bold",
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  appVersion: {
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  staticRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  staticLabel: {
    fontSize: 13,
  },
  staticValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
