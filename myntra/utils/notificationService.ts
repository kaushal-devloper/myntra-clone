import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, PermissionsAndroid } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getUserData } from "./storage";
import { useEffect, useRef } from "react";
import { router } from "expo-router";

// Set notification handler to show alerts, play sounds, and set badge counts when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isWeb = Platform.OS === "web";

/**
 * Retrieves or generates a unique, persistent device ID.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (isWeb) {
    try {
      let dId = localStorage.getItem("myntra_deviceId");
      if (!dId) {
        dId = `web-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("myntra_deviceId", dId);
      }
      return dId;
    } catch (e) {
      console.error("localStorage deviceId fetch failed:", e);
      return `web-fallback-${Date.now()}`;
    }
  }

  try {
    let dId = await SecureStore.getItemAsync("myntra_deviceId");
    if (!dId) {
      dId = `${Platform.OS}-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
      await SecureStore.setItemAsync("myntra_deviceId", dId);
    }
    return dId;
  } catch (e) {
    console.error("SecureStore deviceId fetch failed, using fallback:", e);
    return `${Platform.OS}-fallback-${Date.now()}`;
  }
}

/**
 * Reads the registered token for the user from local storage (SecureStore/localStorage)
 */
async function getRegisteredToken(userId: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(`registeredPushToken_${userId}`);
    } catch (e) {
      console.error("localStorage read error:", e);
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(`registeredPushToken_${userId}`);
  } catch (e) {
    console.error("SecureStore read error:", e);
    return null;
  }
}

/**
 * Saves the registered token for the user to local storage (SecureStore/localStorage)
 */
async function saveRegisteredToken(userId: string, token: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(`registeredPushToken_${userId}`, token);
    } catch (e) {
      console.error("localStorage write error:", e);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(`registeredPushToken_${userId}`, token);
  } catch (e) {
    console.error("SecureStore write error:", e);
  }
}

/**
 * Checks, requests permissions, and triggers a welcome local notification if granted for the first time.
 */
export async function requestPermissionsAndInit(): Promise<string> {
  if (Platform.OS === "web") {
    console.log("Push notifications are not supported on web.");
    return "undetermined";
  }

  // 1. Setup channels for Android devices with custom sounds, lights, and vibration patterns
  if (Platform.OS === "android") {
    // General notifications channel
    await Notifications.setNotificationChannelAsync("default", {
      name: "General Updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF3F6C",
      sound: "notification.wav",
    });

    // Order status updates channel (high importance, custom vibration)
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order Updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#00B53F",
      sound: "notification.wav",
    });

    // Reminders & cart abandonment reminders channel
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF9500",
      sound: "notification.wav",
    });
  }

  // 2. Request permissions (works on both simulators and physical devices)
  if (Platform.OS === "android" && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn("Android 13+ POST_NOTIFICATIONS permission denied.");
      }
    } catch (e) {
      console.warn("Error requesting Android POST_NOTIFICATIONS permission natively:", e);
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // 3. Trigger local welcome notification if permission is granted for the first time
  if (finalStatus === "granted") {
    try {
      const welcomeSent = await SecureStore.getItemAsync("welcome_notification_sent");
      if (!welcomeSent) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Myntra Notifications Active! 🔔",
            body: "Great! You will now receive updates on latest fashion trends, sales, and order statuses.",
            sound: true,
          },
          trigger: null, // trigger immediately
        });
        await SecureStore.setItemAsync("welcome_notification_sent", "true");
        console.log("Welcome notification triggered and flag saved.");
      }
    } catch (e) {
      console.error("Error displaying welcome notification:", e);
    }
  }

  return finalStatus;
}

/**
 * Requests notification permissions and fetches the Expo push token.
 * Supports a mock token fallback for Expo Go and simulators to ensure
 * permission prompts, welcome notifications, and database registration work.
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("Push notifications are not supported on web.");
    return null;
  }

  // Call the permissions request and welcome init logic
  const finalStatus = await requestPermissionsAndInit();

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token for push notifications (permission denied).");
    return null;
  }

  // Bypass native token generation on simulator or Expo Go to prevent SDK 53+ errors
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const isSimulator = !Device.isDevice;

  if (isExpoGo || isSimulator) {
    console.log(
      `[NotificationService] Running in ${isExpoGo ? "Expo Go" : "Simulator"} mode. Using mock token fallback.`
    );
    // Generate a mock token formatted so the backend registers it successfully
    return `ExponentPushToken[Mock-${Platform.OS}-${isExpoGo ? "ExpoGo" : "Simulator"}-${userId || "Guest"}]`;
  }

  // 5. Retrieve project ID from env, expo config (defined in app.json), or easConfig
  const projectId =
    process.env.EXPO_PUBLIC_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("⚠️ Expo Project ID not found. Using fallback mock token.");
    return `ExponentPushToken[Mock-NoProjectId-${userId || "Guest"}]`;
  }

  // 6. Generate Expo Push Token
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Generated Expo Push Token:", token);
    return token;
  } catch (error) {
    console.warn("Error generating Expo Push Token, falling back to mock:", error);
    return `ExponentPushToken[Mock-Error-${userId || "Guest"}]`;
  }
}

/**
 * Registers the device's push token with the backend database
 */
export async function registerPushTokenWithBackend(
  userId: string,
  token: string,
  deviceId: string
): Promise<boolean> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const { token: authToken } = await getUserData();
    const headers: any = {
      "Content-Type": "application/json",
      "bypass-tunnel-reminder": "true",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    const response = await axios.post(
      `${apiBaseUrl}/api/notifications/register`,
      {
        userId,
        token,
        expoPushToken: token,
        platform: Platform.OS,
        deviceId,
        appVersion: "1.0.0"
      },
      { headers }
    );
    if (response.data?.success) {
      console.log("Successfully registered push token with backend API.");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending push token to backend API:", error);
    return false;
  }
}

/**
 * Handles checking, permission requesting, generating, and syncing push token with the backend.
 * Uses secure storage caching to prevent redundant API calls.
 */
export async function syncPushToken(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const token = await registerForPushNotificationsAsync(userId);
    if (!token) {
      console.log("No push token was generated (may be simulator or permission denied).");
      return;
    }

    const deviceId = await getOrCreateDeviceId();

    // Secure Storage Caching & Duplicate Prevention Check
    const previouslyRegistered = await getRegisteredToken(userId);
    if (previouslyRegistered === token) {
      console.log("Push token matches cached token. Skipping backend registration API call.");
      return;
    }

    // Call backend API to associate token with user
    const success = await registerPushTokenWithBackend(userId, token, deviceId);
    if (success) {
      await saveRegisteredToken(userId, token);
    }
  } catch (error) {
    console.error("Error in syncPushToken workflow:", error);
  }
}

/**
 * Unregisters the device's push token with the backend (e.g. on logout)
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const apiBaseUrl = getApiBaseUrl();
    const { token: authToken } = await getUserData();
    const headers: any = {
      "Content-Type": "application/json",
      "bypass-tunnel-reminder": "true",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    console.log(`[NotificationService] Unregistering token for user ${userId} and device ${deviceId}...`);
    await axios.post(
      `${apiBaseUrl}/api/notifications/remove`,
      { userId, deviceId },
      { headers }
    );

    // Clear the local cached registered token to force re-registration on next login
    if (Platform.OS === "web") {
      localStorage.removeItem(`registeredPushToken_${userId}`);
    } else {
      await SecureStore.deleteItemAsync(`registeredPushToken_${userId}`);
    }
    console.log("Successfully unregistered push token from backend.");
  } catch (error) {
    console.error("[NotificationService] Error unregistering token:", error);
  }
}

/**
 * Tracks delivery or click events for a specific notification log
 */
export async function trackNotificationEvent(logId: string, event: "delivered" | "clicked"): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const { token: authToken } = await getUserData();
    const headers: any = {
      "Content-Type": "application/json",
      "bypass-tunnel-reminder": "true",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    console.log(`[NotificationService] Sending track event "${event}" for logId: ${logId}`);
    await axios.post(
      `${apiBaseUrl}/api/notifications/track`,
      { logId, event },
      { headers }
    );
  } catch (error) {
    console.warn(`[NotificationService] Failed to track event "${event}":`, error);
  }
}

