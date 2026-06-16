import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";
import { getUserData } from "@/utils/storage";
import { router } from "expo-router";
import { trackNotificationEvent } from "@/utils/notificationService";

export type NotificationLog = {
  _id: string;
  title: string;
  body: string;
  type: "order_update" | "payment_status" | "delivery_alert" | "cart_reminder" | "promotional" | "security_alert";
  status: string;
  read: boolean;
  createdAt: string;
  errorLogs?: string[];
};

type NotificationContextType = {
  notifications: NotificationLog[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (logId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (logId: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Helper to fetch notifications from the backend
  const fetchNotifications = async () => {
    if (!isAuthenticated || !user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();

      const headers: any = { "bypass-tunnel-reminder": "true" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.get(`${apiBaseUrl}/api/notifications/logs/${user._id}`, { headers });
      if (response.data?.success) {
        const logs: NotificationLog[] = response.data.data;
        setNotifications(logs);
        // Calculate unread count
        const unread = logs.filter(log => !log.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("[NotificationContext] Error fetching notification logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark a single notification as read
  const markAsRead = async (logId: string) => {
    let wasUnread = false;

    // Optimistic UI update
    setNotifications(prev => {
      const target = prev.find(n => n._id === logId);
      if (target && !target.read) {
        wasUnread = true;
      }
      return prev.map(n => (n._id === logId ? { ...n, read: true } : n));
    });

    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();

      const headers: any = { "bypass-tunnel-reminder": "true" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await axios.put(`${apiBaseUrl}/api/notifications/logs/${logId}/read`, {}, { headers });
    } catch (error) {
      console.error("[NotificationContext] Error marking notification as read:", error);
      // Rollback optimistic update
      if (wasUnread) {
        setNotifications(prev =>
          prev.map(n => (n._id === logId ? { ...n, read: false } : n))
        );
        setUnreadCount(prev => prev + 1);
      }
    }
  };

  // Mark all notifications as read for current user
  const markAllAsRead = async () => {
    if (!user?._id) return;
    
    // Save original state for potential rollback
    const originalNotifications = [...notifications];
    const originalUnreadCount = unreadCount;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();

      const headers: any = { "bypass-tunnel-reminder": "true" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await axios.put(`${apiBaseUrl}/api/notifications/logs/user/${user._id}/read-all`, {}, { headers });
    } catch (error) {
      console.error("[NotificationContext] Error marking all notifications as read:", error);
      // Rollback
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
    }
  };

  // Clear all notifications for current user (History deletion)
  const clearAll = async () => {
    if (!user?._id) return;

    // Save original state for potential rollback
    const originalNotifications = [...notifications];
    const originalUnreadCount = unreadCount;

    // Optimistic UI update
    setNotifications([]);
    setUnreadCount(0);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();

      const headers: any = { "bypass-tunnel-reminder": "true" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await axios.delete(`${apiBaseUrl}/api/notifications/logs/user/${user._id}`, { headers });
    } catch (error) {
      console.error("[NotificationContext] Error clearing notifications:", error);
      // Rollback
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
    }
  };

  // Delete a single notification
  const deleteNotification = async (logId: string) => {
    let deletedItem: NotificationLog | undefined;
    let wasUnread = false;

    // Optimistic UI update
    setNotifications(prev => {
      const item = prev.find(n => n._id === logId);
      if (item) {
        deletedItem = item;
        wasUnread = !item.read;
      }
      return prev.filter(n => n._id !== logId);
    });

    if (wasUnread) {
      setUnreadCount(c => Math.max(0, c - 1));
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();

      const headers: any = { "bypass-tunnel-reminder": "true" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await axios.delete(`${apiBaseUrl}/api/notifications/logs/${logId}`, { headers });
    } catch (error) {
      console.error("[NotificationContext] Error deleting notification:", error);
      // Rollback
      if (deletedItem) {
        const itemToRestore = deletedItem;
        setNotifications(prev => {
          const restored = [...prev, itemToRestore];
          return restored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        if (wasUnread) {
          setUnreadCount(c => c + 1);
        }
      }
    }
  };


  // Sync notifications on authentication change
  useEffect(() => {
    fetchNotifications();
  }, [user?._id, isAuthenticated]);

  // Synchronize device badge count when unreadCount changes
  useEffect(() => {
    if (Platform.OS !== "web") {
      Notifications.getBadgeCountAsync().then((badgeCount) => {
        if (badgeCount !== unreadCount) {
          Notifications.setBadgeCountAsync(unreadCount).catch((err) => {
            console.warn("[NotificationContext] Failed to sync badge count:", err);
          });
        }
      }).catch((err) => {
        console.warn("[NotificationContext] Error getting badge count:", err);
      });
    }
  }, [unreadCount]);

  // Handle notification click routing and tracking safely
  const handleNotificationClick = (response: Notifications.NotificationResponse, isColdBoot = false) => {
    console.log("[NotificationContext] User clicked notification:", response);
    const data = response.notification.request.content.data as any;
    if (!data) return;

    // Track clicked event analytics with backend in background
    if (data.logId) {
      trackNotificationEvent(data.logId as string, "clicked").catch(console.error);
    }

    let route = "";
    let params: any = {};

    // Standardize deep links routing paths
    if (data.route) {
      route = data.route as string;
    } else if (data.notificationType === "cart_reminder" || data.notificationType === "cart") {
      route = "/(tabs)/bag";
    } else if (data.notificationType === "promotional" || data.notificationType === "offer" || data.notificationType === "offers") {
      route = "/(tabs)/index";
    } else if (data.notificationType === "delivery_alert" || data.notificationType === "tracking") {
      route = "/orders";
      params = { orderId: data.orderId || "ORD123456" };
    } else if (data.notificationType === "order_update" || data.notificationType === "payment_status") {
      route = "/orders";
      params = { orderId: data.orderId || "ORD123456" };
    } else if (data.productId) {
      route = `/product/${data.productId}`;
    } else if (data.routePath) {
      route = data.routePath as string;
    }

    if (route) {
      console.log(`[NotificationContext] Safely navigating to: ${route} with params:`, params, "isColdBoot:", isColdBoot);
      
      const navigate = () => {
        try {
          if (Object.keys(params).length > 0) {
            router.push({ pathname: route, params } as any);
          } else {
            router.push(route as any);
          }
        } catch (error) {
          console.error("[NotificationContext] Safe router navigation failed:", error);
        }
      };

      if (isColdBoot) {
        // Wait for router/view tree to fully mount, preventing crashes on cold boot launches
        setTimeout(navigate, 500);
      } else {
        // Run immediately for hot launches / foreground clicks
        navigate();
      }
    }
  };

  // Setup Notification Event Listeners (Foreground, Taps, and Terminated Startup state)
  useEffect(() => {
    // 1. Listen for incoming notifications in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[NotificationContext] Foreground push notification received:", notification);
      
      // Track delivered event analytics in background
      const logId = notification.request.content.data?.logId as string;
      if (logId) {
        trackNotificationEvent(logId, "delivered").catch(console.error);
      }

      // Automatically refresh history to get the new notification and update the badge count
      fetchNotifications();
    });

    // 2. Listen for clicks/taps on notifications (active background/foreground states)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationClick(response, false);
    });

    // 3. Handle notification click that launched the app from terminated/closed state (cold boot)
    const checkTerminatedStartupNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          console.log("[NotificationContext] Closed/Terminated startup notification click detected:", response);
          handleNotificationClick(response, true);
        }
      } catch (error) {
        console.error("[NotificationContext] Error reading startup notification:", error);
      }
    };
    
    checkTerminatedStartupNotification();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, user?._id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
