import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "@/context/ThemeContext";
import { formatPriceDetail, getProductDiscount } from "@/utils/priceFormatter";
import { useAlert } from "@/context/AlertContext";

declare global {
  var isAuthenticated: boolean;
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = Dimensions.get("window");
  const { theme, isDark } = useAppTheme();
  const { showAlert } = useAlert();

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentImageIndexRef = useRef(currentImageIndex);
  currentImageIndexRef.current = currentImageIndex;

  const [product, setProduct] = useState<any>(null);
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const apiBaseUrl = getApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/product/${id}`);
        const fetchedProduct = res.data;
        if (fetchedProduct.image && (!fetchedProduct.images || fetchedProduct.images.length === 0)) {
          fetchedProduct.images = [fetchedProduct.image];
        }
        if (!fetchedProduct.images) fetchedProduct.images = [];
        
        const nameLower = (fetchedProduct.name || "").toLowerCase();
        if (nameLower.match(/shoe|sneaker|boot|sandal|heel|flip flop/)) {
          fetchedProduct.sizes = ["6", "7", "8", "9", "10", "11"];
        } else if (nameLower.match(/watch|belt|wallet|bag|glass|accessory|ring|necklace/)) {
          fetchedProduct.sizes = [];
        } else {
          if (!fetchedProduct.sizes || fetchedProduct.sizes.length === 0) {
            fetchedProduct.sizes = ["S", "M", "L", "XL"];
          }
        }

        fetchedProduct.discount = fetchedProduct.discount || getProductDiscount(fetchedProduct);
        setProduct(fetchedProduct);
      } catch (error) {
        console.log("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const saveRecentlyViewed = async () => {
      try {
        const storageKey = user ? `recentlyViewed_${(user as any)._id || (user as any).id}` : 'recentlyViewed';
        const stored = await AsyncStorage.getItem(storageKey);
        let recents = stored ? JSON.parse(stored) : [];
        const prodId = product._id || product.id;
        recents = recents.filter((item: any) => (item._id || item.id) !== prodId);
        recents.unshift(product);
        if (recents.length > 20) recents = recents.slice(0, 20);
        await AsyncStorage.setItem(storageKey, JSON.stringify(recents));

        if (user && prodId) {
          const apiBaseUrl = getApiBaseUrl();
          axios.post(`${apiBaseUrl}/api/recommendations/track`, {
            userId: (user as any)._id || (user as any).id,
            productId: prodId,
          }).catch(err => console.log("Error tracking view on server", err));
        }
      } catch (err) {
        console.log("Error saving recently viewed", err);
      }
    };
    saveRecentlyViewed();
  }, [product, user]);

  const startAutoScroll = () => {
    if (!product?.images?.length || product.images.length <= 1) return;

    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

    autoScrollTimer.current = setInterval(() => {
      const p = product;
      const ref = scrollViewRef.current;
      if (!p || !ref) return;

      const nextIndex =
        (currentImageIndexRef.current + 1) % (p.images?.length ?? 1);

      ref.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentImageIndex(nextIndex);
    }, 3000);
  };

  useEffect(() => {
    if (!product) return;
    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
    };
  }, [product, width]);

  const handleWishlistPress = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!product) return;

    const itemId = String(product._id || product.id || '');
    if (isInWishlist(itemId)) {
      removeFromWishlist(itemId);
    } else {
      addToWishlist({
        id: itemId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        discount: product.discount || '',
        image: product.images ? product.images[0] : product.image,
      });
    }
  };

  const handleAddToBag = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (product.sizes?.length > 0 && !selectedSize) {
      showAlert({
        title: "Select Size",
        message: "Please select a size to proceed.",
        type: "warning"
      });
      return;
    }
    try {
      const apiBaseUrl = getApiBaseUrl();
      await axios.post(`${apiBaseUrl}/api/bag/add`, {
        userId: (user as any)._id || (user as any).id,
        productId: product._id || product.id,
        quantity: quantity,
        size: selectedSize || undefined,
      });
      router.push("/bag");
    } catch (error) {
      console.error("Error adding to bag:", error);
      showAlert({
        title: "Add Failed",
        message: "Failed to add to bag. Please try again.",
        type: "error"
      });
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event?.nativeEvent?.contentOffset;
    const x = contentOffsetX?.x ?? 0;
    const imageIndex = Math.round(x / width);

    setCurrentImageIndex(imageIndex);

    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    startAutoScroll();
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.notFoundText, { color: theme.colors.textSecondary }]}>Product Not Found</Text>
      </View>
    );
  }

  const { formattedText } = formatPriceDetail(product.price, product.discount);

  const wishlistIcon = product && isInWishlist(String(product._id || product.id || ''));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={(r) => {
              scrollViewRef.current = r;
            }}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {(product.images || []).map((image: string, index: number) => (
              <Image
                key={image + index}
                source={{ uri: image }}
                style={[styles.productImage, { width }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          <View style={styles.pagination}>
            {product.images.map((_: string, index: number) => (
              <View
                key={index}
                style={
                  index === currentImageIndex
                    ? [styles.paginationDotActive, { backgroundColor: theme.colors.primary }]
                    : styles.paginationDot
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>{product.brand}</Text>
              <Text style={[styles.name, { color: theme.colors.text }]}>{product.name}</Text>
            </View>

            <TouchableOpacity
              style={[styles.wishlistButton, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : '#fff', borderColor: theme.colors.border }]}
              activeOpacity={0.8}
              onPress={handleWishlistPress}
            >
              <Heart
                size={20}
                color={theme.colors.primary}
                fill={wishlistIcon ? theme.colors.primary : "transparent"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: theme.colors.primary }]}>
              {formattedText}
            </Text>
          </View>
          
          <View style={styles.stockRow}>
            <Text style={styles.stockText}>
              {product.stock !== undefined ? `Stock: ${product.stock}` : "In Stock"}
            </Text>
            {product.discontinued && (
              <View style={styles.discontinuedBadge}>
                <Text style={styles.discontinuedText}>Discontinued</Text>
              </View>
            )}
          </View>

          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{product.description}</Text>

          {product.sizes?.length > 0 && (
            <View style={styles.sizeSection}>
              <Text style={[styles.sizeTitle, { color: theme.colors.text }]}>Select Size</Text>
              <View style={styles.sizeGrid}>
                {product.sizes.map((size: string) => {
                  const selected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      onPress={() => setSelectedSize(size)}
                      style={[
                        styles.sizeButton,
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        selected && [styles.selectedSize, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          { color: theme.colors.text },
                          selected && styles.selectedSizeText,
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.quantitySection}>
            <Text style={[styles.sizeTitle, { color: theme.colors.text }]}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.qtyButton, { backgroundColor: theme.colors.inputBackground }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={[styles.qtyText, { color: theme.colors.text }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.qtyValue, { color: theme.colors.text }]}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyButton, { backgroundColor: theme.colors.inputBackground }]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={[styles.qtyText, { color: theme.colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={[styles.addToBagButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddToBag}>
          <Text style={styles.addToBagText}>Add to Bag</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: "600",
  },
  carouselContainer: {
    position: "relative",
  },
  productImage: {
    height: 330,
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  brand: {
    fontSize: 14,
    fontWeight: "600",
  },
  name: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priceContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  sizeSection: {
    marginTop: 18,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedSize: {},
  sizeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  selectedSizeText: {
    color: "#fff",
  },
  stockRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stockText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#03a685",
  },
  discontinuedBadge: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discontinuedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  quantitySection: {
    marginTop: 20,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 20,
    fontWeight: "600",
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: 1,
  },
  addToBagButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addToBagText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
