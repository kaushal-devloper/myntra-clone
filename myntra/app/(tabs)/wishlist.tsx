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
import { useAppTheme } from "@/context/ThemeContext";
import { formatPriceDetail, getProductDiscount } from "@/utils/priceFormatter";

export default function Wishlist() {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { wishlist, removeFromWishlist } = useWishlist();
  const { theme, isDark } = useAppTheme();

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Wishlist</Text>
        </View>

        <View style={styles.emptyState}>
          <Heart size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Please login to view your wishlist
          </Text>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Wishlist ({wishlist.length})</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={64} color={theme.colors.border} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Your wishlist is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Explore and add items that you love!
          </Text>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
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
              <View key={item.id} style={[styles.wishlistItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Tappable area: image + info → navigates to product detail */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push(`/product/${item.id}` as any)}
                  style={{ flex: 1 }}
                >
                  <Image source={{ uri: item.image }} style={[styles.itemImage, { backgroundColor: theme.colors.inputBackground }]} />

                  <View style={styles.itemInfo}>
                    <Text style={[styles.brandName, { color: theme.colors.text }]} numberOfLines={1}>{item.brand}</Text>
                    <Text style={[styles.itemName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {item.name}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={[styles.price, { color: theme.colors.text }]} numberOfLines={1}>
                        {formatPriceDetail(item.price, item.discount || getProductDiscount(item)).formattedText}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Delete button — separate from nav area */}
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)', borderColor: theme.colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => removeFromWishlist(item.id)}
                >
                  <Trash2 size={18} color={theme.colors.primary} />
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
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 12,
    marginTop: -4,
  },
  loginButton: {
    marginTop: 8,
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
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    paddingTop: 10,
  },
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12 as any,
  },
  wishlistItem: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
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
  },
  itemInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  brandName: {
    fontSize: 13,
    fontWeight: "900",
  },
  itemName: {
    marginTop: 6,
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
  },
  discount: {
    fontSize: 11,
    fontWeight: "900",
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
