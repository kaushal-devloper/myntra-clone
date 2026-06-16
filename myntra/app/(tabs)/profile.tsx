import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Heart,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  User,
  Bell,
  Info,
} from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

const menuItems = [
  { icon: Package, label: "Orders", route: "/orders" },
  { icon: ReceiptText, label: "My Transactions", route: "/transaction-history" },
  { icon: Heart, label: "Wishlist", route: "/wishlist" },
  { icon: Bell, label: "Notification Center", route: "/notification-center" },
  { icon: Info, label: "App Info", route: "/app-info" },
  { icon: Settings, label: "Settings", route: "/settings" },
];

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme } = useAppTheme();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        </View>

        <View style={styles.emptyState}>
          <User size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Please login to view your profile</Text>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.userInfo, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <User size={40} color="#fff" />
          </View>

          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{user.name || "User"}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user.email || ""}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={`${item.label}-${index}`}
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <item.icon size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.menuItemLabel, { color: theme.colors.text }]}>{item.label}</Text>
              </View>
              <ChevronRight size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={24} color={theme.colors.primary} />
          <Text style={[styles.logoutText, { color: theme.colors.primary }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  loginButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  menuSection: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 16,
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
});
