import React, { useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { syncPushToken, requestPermissionsAndInit } from "@/utils/notificationService";
import * as SecureStore from "expo-secure-store";
import { Bell } from "lucide-react-native";

/**
 * Empty wrapper component that manages push notification subscriptions
 * and registers device push tokens when a user is authenticated.
 * It also prompts for notification permissions on initial app load if not already set.
 */
export default function NotificationHandler() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [sessionPrompted, setSessionPrompted] = useState(false);

  // Prompt for notification permissions on initial launch (first time)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        let choice = null;
        if (Platform.OS === "web") {
          choice = localStorage.getItem("notification_choice");
        } else {
          choice = await SecureStore.getItemAsync("notification_choice");
        }

        console.log(`[NotificationHandler] Notification choice: ${choice}`);

        if (choice === "allowed") {
          // User already allowed notifications. Initialize system permissions and sync token
          const status = await requestPermissionsAndInit();
          if (status === "granted" && isAuthenticated && user?._id) {
            console.log(`[NotificationHandler] Syncing push token for user: ${user.email}`);
            await syncPushToken(user._id);
          }
        } else if (choice === "disabled") {
          // User manually disabled notifications. Respect their setting
          console.log("[NotificationHandler] Notifications manually disabled. Skipping launch prompt.");
        } else {
          // choice is null (first open) or choice is 'denied' (declined previously).
          // Prompt again only on next app launch, meaning we show it once per app session.
          if (!sessionPrompted) {
            console.log("[NotificationHandler] Showing custom notification permission prompt...");
            setShowPromptModal(true);
            setSessionPrompted(true);
          }
        }
      } catch (error) {
        console.error("[NotificationHandler] Error initializing notifications on launch:", error);
      }
    };
    
    // Check after a short delay to let the app screen render first
    const timer = setTimeout(initNotifications, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user?._id]);

  // Sync token whenever the user logs in or authentication state changes
  useEffect(() => {
    async function checkAndSync() {
      let choice = null;
      if (Platform.OS === "web") {
        choice = localStorage.getItem("notification_choice");
      } else {
        choice = await SecureStore.getItemAsync("notification_choice");
      }

      if (choice === "allowed" && isAuthenticated && user?._id) {
        console.log(`[NotificationHandler] Authentication status changed. Syncing push token...`);
        await syncPushToken(user._id);
      }
    }
    checkAndSync();
  }, [isAuthenticated, user?._id]);

  // Dynamic Token Refresh Handling
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    if (Platform.OS === "web") return; // Web push doesn't refresh tokens this way

    console.log("[NotificationHandler] Registering push token refresh listener...");
    const subscription = Notifications.addPushTokenListener(async (token) => {
      let choice = null;
      if (Platform.OS === "web") {
        choice = localStorage.getItem("notification_choice");
      } else {
        choice = await SecureStore.getItemAsync("notification_choice");
      }

      if (choice === "allowed") {
        console.log("[NotificationHandler] Push token refreshed dynamically:", token.data);
        try {
          await syncPushToken(user._id);
        } catch (error) {
          console.error("[NotificationHandler] Error syncing refreshed push token:", error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?._id]);

  // AppState change listener for offline recovery (sync token when returning from offline/background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      let choice = null;
      if (Platform.OS === "web") {
        choice = localStorage.getItem("notification_choice");
      } else {
        choice = await SecureStore.getItemAsync("notification_choice");
      }

      if (nextAppState === "active" && choice === "allowed" && isAuthenticated && user?._id) {
        console.log("[NotificationHandler] App became active. Checking/syncing push token for offline recovery...");
        try {
          await syncPushToken(user._id);
        } catch (error) {
          console.error("[NotificationHandler] Error syncing push token on app active:", error);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?._id]);

  // Periodic fallback sync check (runs every 5 minutes if online)
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const interval = setInterval(async () => {
      let choice = null;
      if (Platform.OS === "web") {
        choice = localStorage.getItem("notification_choice");
      } else {
        choice = await SecureStore.getItemAsync("notification_choice");
      }

      if (choice === "allowed") {
        console.log("[NotificationHandler] Periodic push token sync check...");
        try {
          await syncPushToken(user._id);
        } catch (error) {
          console.error("[NotificationHandler] Error running periodic token sync:", error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, user?._id]);

  const handleAllowNotifications = async () => {
    setShowPromptModal(false);
    try {
      console.log("[NotificationHandler] User accepted custom popup. Requesting system permission...");
      const status = await requestPermissionsAndInit();
      
      if (status === "granted") {
        if (Platform.OS === "web") {
          localStorage.setItem("notification_choice", "allowed");
        } else {
          await SecureStore.setItemAsync("notification_choice", "allowed");
        }
        console.log("[NotificationHandler] Notification permissions granted.");

        if (isAuthenticated && user?._id) {
          await syncPushToken(user._id);
        }
      } else {
        // System permission was denied/blocked
        if (Platform.OS === "web") {
          localStorage.setItem("notification_choice", "denied");
        } else {
          await SecureStore.setItemAsync("notification_choice", "denied");
        }
        console.warn("[NotificationHandler] System notification permissions denied.");
      }
    } catch (error) {
      console.error("[NotificationHandler] Error in allow permission workflow:", error);
    }
  };

  const handleDenyNotifications = async () => {
    setShowPromptModal(false);
    console.log("[NotificationHandler] User denied notifications custom popup.");
    try {
      if (Platform.OS === "web") {
        localStorage.setItem("notification_choice", "denied");
      } else {
        await SecureStore.setItemAsync("notification_choice", "denied");
      }
    } catch (error) {
      console.error("[NotificationHandler] Error saving deny choice:", error);
    }
  };

  return (
    <Modal
      visible={showPromptModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDenyNotifications}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Top Icon Circle */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.subduedBrand }]}>
            <Bell size={28} color={theme.colors.primary} />
          </View>

          {/* Texts */}
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Enable Notifications?</Text>
          <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
            Get real-time updates regarding order shipments, payments status, and exclusive discount offers.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.allowButton, { backgroundColor: theme.colors.primary }]} onPress={handleAllowNotifications}>
              <Text style={styles.allowButtonText}>Allow Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.denyButton, { backgroundColor: theme.colors.inputBackground }]} onPress={handleDenyNotifications}>
              <Text style={[styles.denyButtonText, { color: theme.colors.text }]}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: Dimensions.get("window").width * 0.85,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: "100%",
    gap: 10,
  },
  allowButton: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  allowButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  denyButton: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
