import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";

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

// Mock product data - in a real app, this would come from an API
const products = {
  "1": {
    id: 1,
    name: "Casual White T-Shirt",
    brand: "Roadster",
    price: 499,
    discount: "60% OFF",
    description:
      "Classic white t-shirt made from premium cotton. Perfect for everyday wear with a comfortable regular fit.",
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop",
    ],
  },
  "2": {
    id: 2,
    name: "Denim Jacket",
    brand: "Levis",
    price: 2499,
    discount: "40% OFF",
    description:
      "Classic denim jacket with a modern twist. Features premium quality denim and comfortable fit.",
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=500&auto=format&fit=crop",
    ],
  },
  "3": {
    id: 3,
    name: "Summer Dress",
    brand: "ONLY",
    price: 1299,
    discount: "50% OFF",
    description:
      "Flowy summer dress perfect for warm weather. Made from lightweight fabric with a flattering cut.",
    sizes: ["XS", "S", "M", "L"],
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1623609163859-ca93c959b98a?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop",
    ],
  },
  "4": {
    id: 4,
    name: "Classic Sneakers",
    brand: "Nike",
    price: 3499,
    discount: "30% OFF",
    description:
      "Versatile sneakers that combine style and comfort. Perfect for both casual wear and light exercise.",
    sizes: ["UK6", "UK7", "UK8", "UK9", "UK10"],
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop",
    ],
  },
} as const;

declare global {
  // set in app/_layout.tsx
  var isAuthenticated: boolean;
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = Dimensions.get("window");

  const [selectedSize, setSelectedSize] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentImageIndexRef = useRef(0);
  currentImageIndexRef.current = currentImageIndex;

  const product = useMemo(() => {
    if (!id) return undefined;
    return (products as Record<string, (typeof products)[keyof typeof products]>)[
      id
    ];
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const startAutoScroll = () => {
    if (!product?.images?.length) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, width]);

  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const handleWishlistPress = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!product) return;

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: `₹${product.price}`,
        discount: product.discount,
        image: product.images[0],
      });
    }
  };

  const handleAddToBag = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    router.push("/bag");
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event?.nativeEvent?.contentOffset;
    const x = contentOffsetX?.x ?? 0;
    const imageIndex = Math.round(x / width);

    setCurrentImageIndex(imageIndex);

    // reset auto-scroll timer on manual scroll
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    startAutoScroll();
  };

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Product Not Found</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            {product.images.map((image, index) => (
              <Image
                key={image + index}
                source={{ uri: image }}
                style={[styles.productImage, { width }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          <View style={styles.pagination}>
            {product.images.map((_, index) => (
              <View
                key={index}
                style={
                  index === currentImageIndex
                    ? styles.paginationDotActive
                    : styles.paginationDot
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.wishlistButton}
              activeOpacity={0.8}
              onPress={handleWishlistPress}
            >
              <Heart
                size={20}
                color="#ff3f6c"
                fill={isInWishlist(product.id) ? "#ff3f6c" : "transparent"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.price}</Text>
            <Text style={styles.discount}>${product.discount}</Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.sizeSection}>
            <Text style={styles.sizeTitle}>Select Size</Text>
            <View style={styles.sizeGrid}>
              {product.sizes.map((size) => {
                const selected = selectedSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    style={[styles.sizeButton, selected && styles.selectedSize]}
                  >
                    <Text
                      style={[
                        styles.sizeText,
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addToBagButton} onPress={handleAddToBag}>
          <Text style={styles.addToBagText}>Add to Bag</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 96,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  notFoundText: {
    fontSize: 16,
    color: "#3e3e3e",
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
    backgroundColor: "#ff3f6c",
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
    color: "#3e3e3e",
  },
  name: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  priceContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },
  discount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff3f6c",
  },

  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
  },

  sizeSection: {
    marginTop: 18,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3e3e3e",
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
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#fff",
  },
  selectedSize: {
    backgroundColor: "#ff3f6c",
    borderColor: "#ff3f6c",
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3e3e3e",
  },
  selectedSizeText: {
    color: "#fff",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  addToBagButton: {
    backgroundColor: "#ff3f6c",
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

