import { useRouter } from "expo-router";
import { Heart, Trash2 } from "lucide-react-native";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

export default function Wishlist() {
  const router = useRouter();

  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { wishlist, removeFromWishlist } = useWishlist();

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wishlist</Text>
        </View>

        <View style={styles.emptyState}>
          <Heart size={64} color="#ff3f6c" />
          <Text style={styles.emptyTitle}>
            Please login to view your wishlist
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
            activeOpacity={0.9}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlist ({wishlist.length})</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            Your wishlist is empty
          </Text>
          <Text style={styles.emptySubtitle}>
            Explore and add items that you love!
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.9}
          >
            <Text style={styles.loginButtonText}>SHOP NOW</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listGrid}>
            {wishlist.map((item) => (
              <View key={item.id} style={styles.wishlistItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />

                <View style={styles.itemInfo}>
                  <Text style={styles.brandName}>{item.brand}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{item.price}</Text>
                    <Text style={styles.discount}>{item.discount}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  activeOpacity={0.85}
                  onPress={() => removeFromWishlist(item.id)}
                >
                  <Trash2 size={18} color="#ff3f6c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    textAlign: "center",
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtitle: {
    textAlign: "center",
    color: "#888",
    fontSize: 12,
    marginTop: -4,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: "#ff3f6c",
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // List
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    paddingTop: 10,
  },

  // Use a grid-ish layout that looks good on both mobile and web/desktop.
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12 as any,
  },

  wishlistItem: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  itemImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
    backgroundColor: "#f5f5f5",
  },

  itemInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  brandName: {
    color: "#111",
    fontSize: 13,
    fontWeight: "900",
  },

  itemName: {
    marginTop: 6,
    color: "#444",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  price: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },

  discount: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ff3f6c",
    backgroundColor: "rgba(255,63,108,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
});

