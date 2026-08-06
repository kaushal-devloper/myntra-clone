import { useRouter } from "expo-router";
import { Heart, Trash2, ShoppingBag, Sparkles } from "lucide-react-native";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAppTheme } from "@/context/ThemeContext";
import { formatPriceDetail, getProductDiscount } from "@/utils/priceFormatter";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

export default function Wishlist() {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { wishlist, removeFromWishlist } = useWishlist();
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 768;
  const cardWidth = isDesktop ? "31%" : "48%";

  const handleMoveToBag = async (item: any) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.post(`${apiBaseUrl}/api/bag/add`, {
        userId,
        productId: item.id,
        size: "M",
        quantity: 1,
      });
      removeFromWishlist(item.id);
    } catch (e) {
      console.error("Error moving to bag:", e);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Wishlist</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.subduedBrand }]}>
            <Heart size={52} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Login to view your wishlist</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Save items you love and shop them anytime
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/login")}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaButtonText}>LOGIN / SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Wishlist</Text>
          {wishlist.length > 0 && (
            <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
              {wishlist.length} item{wishlist.length > 1 ? "s" : ""} saved
            </Text>
          )}
        </View>
        {wishlist.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: theme.colors.subduedBrand }]}>
            <Heart size={14} color={theme.colors.primary} fill={theme.colors.primary} />
            <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>{wishlist.length}</Text>
          </View>
        )}
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.subduedBrand }]}>
            <Heart size={52} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Explore collections and tap ♡ to save items you love
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.9}
          >
            <Sparkles size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.ctaButtonText}>EXPLORE NOW</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.listGrid, isDesktop && styles.listGridDesktop]}>
            {wishlist.map((item) => {
              const priceInfo = formatPriceDetail(item.price, item.discount || getProductDiscount(item));
              return (
                <View
                  key={item.id}
                  style={[
                    styles.wishlistItem,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border, width: cardWidth as any },
                  ]}
                >
                  {/* Image + delete */}
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => router.push(`/product/${item.id}` as any)}
                    style={styles.imageWrap}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={[styles.itemImage, { backgroundColor: theme.colors.inputBackground }]}
                      resizeMode="cover"
                    />
                    {item.discount && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{item.discount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Remove button */}
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: isDark ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.92)", borderColor: theme.colors.border }]}
                    onPress={() => removeFromWishlist(item.id)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={16} color={theme.colors.primary} />
                  </TouchableOpacity>

                  {/* Info */}
                  <View style={styles.itemInfo}>
                    <Text style={[styles.brandName, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.brand}
                    </Text>
                    <Text style={[styles.itemName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.priceText, { color: theme.colors.text }]} numberOfLines={1}>
                      {priceInfo.formattedText}
                    </Text>
                  </View>

                  {/* Move to Bag */}
                  <TouchableOpacity
                    style={[styles.moveToBagBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleMoveToBag(item)}
                    activeOpacity={0.88}
                  >
                    <ShoppingBag size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.moveToBagText}>MOVE TO BAG</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", letterSpacing: 0.3 },
  headerSub: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  countBadgeText: { fontSize: 13, fontWeight: "800" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, fontWeight: "400" },
  ctaButton: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  ctaButtonText: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  listContent: { padding: 14, paddingBottom: 32 },
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14 as any,
  },
  listGridDesktop: { gap: 18 as any },
  wishlistItem: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  imageWrap: { position: "relative" },
  itemImage: { width: "100%", height: 200, resizeMode: "cover" },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#ff3f6c",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  discountBadgeText: { color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 10,
  },
  itemInfo: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  brandName: { fontSize: 13, fontWeight: "900", letterSpacing: 0.3 },
  itemName: { marginTop: 4, fontSize: 12, fontWeight: "500", lineHeight: 16, marginBottom: 6 },
  priceText: { fontSize: 14, fontWeight: "900" },
  moveToBagBtn: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  moveToBagText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});
