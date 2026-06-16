import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useNotifications, NotificationLog } from "@/context/NotificationContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useAlert } from "@/context/AlertContext";
import {
  Bell,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Truck,
  Clock,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  Trash2,
  CheckCheck,
  ChevronRight,
} from "lucide-react-native";

export default function NotificationCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();
  const { showAlert } = useAlert();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotifications();

  // Filters state
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const getFilteredNotifications = () => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "orders") {
      return notifications.filter(
        (n) => n.type === "order_update" || n.type === "delivery_alert"
      );
    }
    if (activeFilter === "payments") {
      return notifications.filter((n) => n.type === "payment_status");
    }
    if (activeFilter === "security") {
      return notifications.filter((n) => n.type === "security_alert");
    }
    if (activeFilter === "offers") {
      return notifications.filter(
        (n) => n.type === "promotional" || n.type === "cart_reminder"
      );
    }
    return notifications;
  };

  const getCategoryStyles = (type: string) => {
    switch (type) {
      case "order_update":
        return {
          icon: <Truck size={18} color={theme.colors.primary} />,
          bgColor: isDark ? 'rgba(255, 63, 108, 0.15)' : "#ffe6ec",
          label: "Order Update",
        };
      case "delivery_alert":
        return {
          icon: <Truck size={18} color="#007aff" />,
          bgColor: isDark ? 'rgba(0, 122, 255, 0.15)' : "#e3f2fd",
          label: "Delivery Alert",
        };
      case "payment_status":
        return {
          icon: <CreditCard size={18} color="#00b53f" />,
          bgColor: isDark ? 'rgba(0, 181, 63, 0.15)' : "#e8f5e9",
          label: "Payment Success",
        };
      case "cart_reminder":
        return {
          icon: <ShoppingBag size={18} color="#ff9500" />,
          bgColor: isDark ? 'rgba(255, 149, 0, 0.15)' : "#fff3e0",
          label: "Bag Reminder",
        };
      case "security_alert":
        return {
          icon: <ShieldAlert size={18} color="#d9383a" />,
          bgColor: isDark ? 'rgba(217, 56, 58, 0.15)' : "#fdf0f0",
          label: "Security Alert",
        };
      case "promotional":
      default:
        return {
          icon: <TrendingUp size={18} color="#5856d6" />,
          bgColor: isDark ? 'rgba(88, 86, 214, 0.15)' : "#f3e5f5",
          label: "Special Offer",
        };
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleNotificationPress = (item: NotificationLog) => {
    if (!item.read) {
      markAsRead(item._id);
    }

    // Deep link redirection based on types
    const routePath = item.type === "cart_reminder" 
      ? "/(tabs)/bag"
      : (item.type === "order_update" || item.type === "payment_status" || item.type === "delivery_alert")
      ? "/orders"
      : "/(tabs)/index";

    router.push(routePath as any);
  };

  const handleDeleteNotification = (logId: string) => {
    showAlert({
      title: "Delete Notification",
      message: "Are you sure you want to delete this notification from history?",
      type: "warning",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNotification(logId),
        },
      ]
    });
  };

  const filteredData = getFilteredNotifications();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} unread messages</Text>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity
                onPress={markAllAsRead}
                style={[styles.actionBtn, { backgroundColor: theme.colors.inputBackground }]}
              >
                <CheckCheck size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearAll}
                style={[styles.actionBtn, styles.deleteBtn]}
              >
                <Trash2 size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {["all", "orders", "payments", "security", "offers"].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.tabButton,
                { backgroundColor: theme.colors.inputBackground },
                activeFilter === filter && [styles.activeTabButton, { backgroundColor: theme.colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.textSecondary },
                  activeFilter === filter && styles.activeTabText,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Live Notification Logs */}
        <View style={styles.logsHeaderRow}>
          <Text style={[styles.logsSectionTitle, { color: theme.colors.text }]}>Notification History</Text>
          <TouchableOpacity onPress={fetchNotifications} style={[styles.refreshBtn, { backgroundColor: isDark ? 'rgba(255, 63, 108, 0.15)' : '#ffe6ec' }]}>
            <RefreshCw size={14} color={theme.colors.primary} />
            <Text style={[styles.refreshText, { color: theme.colors.primary }]}>Sync</Text>
          </TouchableOpacity>
        </View>

        {loading && notifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Bell size={42} color={theme.colors.border} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nothing to see here</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              You don&apos;t have any notifications under this filter at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {filteredData.map((log, index) => {
              const config = getCategoryStyles(log.type);
              return (
                <TouchableOpacity
                  key={log._id || index}
                  style={[
                    styles.logItem,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: log.read ? theme.colors.border : theme.colors.primary,
                    },
                    !log.read && { backgroundColor: isDark ? 'rgba(255, 63, 108, 0.05)' : '#fffcfd' }
                  ]}
                  onPress={() => handleNotificationPress(log)}
                  activeOpacity={0.85}
                >
                  <View style={styles.logLeft}>
                    {/* Icon Badge */}
                    <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                      {config.icon}
                    </View>

                    {/* Texts */}
                    <View style={styles.textContainer}>
                      <View style={styles.logItemHeader}>
                        <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>{config.label}</Text>
                        <View style={styles.timeContainer}>
                          <Clock size={11} color={theme.colors.textMuted} style={styles.clockIcon} />
                          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>{formatTime(log.createdAt)}</Text>
                        </View>
                      </View>

                      <Text style={[styles.logTitleText, { color: theme.colors.text }, !log.read && styles.unreadTitleText]}>
                        {log.title}
                      </Text>
                      <Text style={[styles.logBodyText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                        {log.body}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(log._id);
                      }}
                      style={styles.singleDeleteBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <ChevronRight size={16} color={theme.colors.border} style={styles.chevronIcon} />
                  </View>

                  {/* Unread Indicator Dot */}
                  {!log.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 55 : 45,
    paddingBottom: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerSubtitle: { fontSize: 12, color: "#ff3f6c", fontWeight: "500", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { padding: 8, borderRadius: 8 },
  deleteBtn: { backgroundColor: "#ffebee" },
  tabContainer: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  activeTabButton: {},
  tabText: { fontSize: 13, fontWeight: "600" },
  activeTabText: { color: "#fff" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  logsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logsSectionTitle: { fontSize: 16, fontWeight: "bold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  refreshText: { fontSize: 12, fontWeight: "bold" },
  centerContainer: { paddingVertical: 40, alignItems: "center", justifyContent: "center" },
  emptyCard: { borderRadius: 14, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", marginTop: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  logsList: { gap: 12 },
  logItem: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  logLeft: { flexDirection: "row", alignItems: "flex-start", flex: 1, paddingRight: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  textContainer: { flex: 1 },
  logItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  categoryLabel: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 },
  timeContainer: { flexDirection: "row", alignItems: "center" },
  clockIcon: { marginRight: 3 },
  timeText: { fontSize: 10 },
  logTitleText: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  unreadTitleText: { fontWeight: "bold" },
  logBodyText: { fontSize: 12, lineHeight: 16 },
  logRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  singleDeleteBtn: { padding: 6, borderRadius: 6 },
  chevronIcon: { alignSelf: "center" },
  unreadDot: { position: "absolute", top: 12, right: 12, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ff3f6c" },
});
