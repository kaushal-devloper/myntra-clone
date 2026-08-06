import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { ChevronRight, Heart, Bell } from 'lucide-react-native';
import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAppTheme } from '@/context/ThemeContext';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { formatPriceDetail, getProductDiscount } from '@/utils/priceFormatter';

const deals = [
  {
    id: 1,
    title: 'Under ₹599',
    image:
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop',
  },
  {
    id: 2,
    title: '40-70% Off',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop',
  },
];

export default function HomeScreen() {
  const route = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { unreadCount } = useNotifications();
  const { theme, isDark } = useAppTheme();

  const [recentlyViewed, setRecentlyViewed] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [discountedProducts, setDiscountedProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [recommendations, setRecommendations] = React.useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = React.useState(false);

  React.useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const catRes = await axios.get(`${apiBaseUrl}/category`);
        setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data?.data ?? []);

        const prodRes = await axios.get(`${apiBaseUrl}/product`);
        const allProds = (prodRes.data ?? []).map((p: any) => ({
          ...p,
          discount: p.discount || getProductDiscount(p)
        }));
        setProducts(allProds.slice(0, 10)); // Top 10 products for trending

        const discount40to70 = allProds.filter((p: any) => {
          if (!p.discount) return false;
          const val = parseInt(p.discount.replace(/[^0-9]/g, '')) || 0;
          return val >= 40 && val <= 70;
        });
        setDiscountedProducts(discount40to70.slice(0, 10));

        const targetBrands = ["Adidas", "Roadster", "H&M", "Gucci"];
        const brandLogos: Record<string, string> = {
          "Adidas": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
          "Roadster": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop",
          "H&M": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop",
          "Gucci": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop"
        };
        const uniqueBrands = targetBrands.map(brandName => ({
          id: brandName,
          name: brandName,
          image: brandLogos[brandName]
        }));
        setBrands(uniqueBrands);
      } catch (err) {
        console.error("Error fetching home data", err);
      }
    };
    fetchHomeData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const fetchRecent = async () => {
        try {
          const storageKey = user ? `recentlyViewed_${(user as any)._id || (user as any).id}` : 'recentlyViewed';
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            setRecentlyViewed(parsed.map((p: any) => ({
              ...p,
              discount: p.discount || getProductDiscount(p)
            })));
          } else {
            setRecentlyViewed([]);
          }
        } catch (e) {
          console.log("Error fetching recently viewed", e);
        }
      };
      fetchRecent();

      const fetchRecommendations = async () => {
        setLoadingRecommendations(true);
        try {
          const apiBaseUrl = getApiBaseUrl();
          let url = `${apiBaseUrl}/api/recommendations/?t=${Date.now()}`;
          if (user) {
            const userId = (user as any)._id || (user as any).id;
            url = `${apiBaseUrl}/api/recommendations/${userId}?t=${Date.now()}`;
          }
          const res = await axios.get(url, { timeout: 8000 });
          if (res.data?.success) {
            const mappedRecs = (res.data.recommendations || []).map((p: any) => ({
              ...p,
              discount: p.discount || getProductDiscount(p)
            }));
            setRecommendations(mappedRecs);
          } else {
            setRecommendations([]);
          }
        } catch (e) {
          console.error("Error fetching recommendations", e);
          setRecommendations([]);
        } finally {
          setLoadingRecommendations(false);
        }
      };
      fetchRecommendations();
    }, [user])
  );

  const handleSearchPress = (productID: any) => {
    if (!isAuthenticated) {
      route.push('/login' as any);
      return;
    }
    route.push(`/product/${productID}` as any);
  };

  const handleWishlistPress = (item: any) => {
    if (!isAuthenticated) {
      route.push('/login' as any);
      return;
    }
    const itemId = String(item._id || item.id || '');
    if (isInWishlist(itemId)) {
      removeFromWishlist(itemId);
    } else {
      addToWishlist({
        id: itemId,
        name: item.name,
        brand: item.brand,
        price: item.price,
        discount: item.discount || '',
        image: item.image || (item.images && item.images[0]) || '',
      });
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: theme.colors.card, dark: theme.colors.card }}
      headerImage={
        <Image
          source={require('../../assets/images/myntra.png')}
          style={[styles.reactLogo, { backgroundColor: theme.colors.card }]}
        />
      }
    >
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
        <Text style={styles.logo}>MYNTRA</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.notificationButton, { backgroundColor: theme.colors.inputBackground }]}
          onPress={() => route.push('/notification-center' as any)}
        >
          <Bell size={24} color={theme.colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ThemedView>

      {/* SHOP BY CATEGORY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>SHOP BY CATEGORY</Text>

          <TouchableOpacity style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {categories.map((category: any, index: number) => (
            <TouchableOpacity
              key={category._id || category.id || `category-${index}`}
              style={[styles.categoryCard, { backgroundColor: theme.colors.card }]}
              onPress={() => route.push(`/(tabs)/categories?categoryId=${category._id || category.id}` as any)}
            >
              <Image
                source={{ uri: category.image }}
                style={styles.categoryImage}
              />
              <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* BRANDS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>SHOP BY BRAND</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {brands.map((brand: any, index: number) => (
            <TouchableOpacity
              key={brand.id || `brand-${index}`}
              style={styles.brandCard}
              onPress={() => route.push(`/(tabs)/categories?brand=${encodeURIComponent(brand.name)}` as any)}
            >
              <View style={[styles.brandImageContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <Image
                  source={{ uri: brand.image }}
                  style={styles.brandImage}
                />
              </View>
              <Text style={[styles.brandName, { color: theme.colors.text }]}>{brand.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* DEALS OF THE DAY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>DEALS OF THE DAY</Text>
        </View>

        <FlatList
          data={deals}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.dealCard, { backgroundColor: theme.colors.card }]}
              onPress={() => route.push(`/(tabs)/categories?deal=${encodeURIComponent(item.title)}` as any)}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.dealImage}
              />
              <View style={styles.dealGlow} />
              <View style={styles.dealOverlay}>
                <Text style={styles.dealTitle}>{item.title}</Text>
                <View style={[styles.dealBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.dealBadgeText}>Limited</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* RECENTLY VIEWED PRODUCTS */}
      {recentlyViewed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>RECENTLY VIEWED</Text>
            <TouchableOpacity
              onPress={async () => {
                const storageKey = user ? `recentlyViewed_${(user as any)._id || (user as any).id}` : 'recentlyViewed';
                await AsyncStorage.removeItem(storageKey);
                setRecentlyViewed([]);
              }}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={recentlyViewed}
            keyExtractor={(item, index) => String(item._id || item.id || `recent-${index}`)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.recentProductCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => handleSearchPress(item._id || item.id)}
              >
                <View style={[styles.recentImageContainer, { backgroundColor: theme.colors.inputBackground }]}>
                  <Image
                    source={{ uri: item.image || (item.images && item.images[0]) }}
                    style={styles.recentImage}
                    resizeMode="cover"
                  />
                  {item.discount && (
                    <View style={[styles.productDiscountPill, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.productDiscountPillText}>{item.discount}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.recentInfo}>
                  <Text style={[styles.recentBrand, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.brand}</Text>
                  <Text style={[styles.recentName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.recentPrice, { color: theme.colors.primary }]}>
                    {formatPriceDetail(item.price, item.discount).formattedText}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 40-70% OFF DEALS */}
      {discountedProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>40-70% OFF DEALS</Text>
            <TouchableOpacity style={styles.viewAll} onPress={() => route.push('/(tabs)/categories?deal=40-70% Off' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={discountedProducts}
            keyExtractor={(item, index) => String(item._id || item.id || `discount-${index}`)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.productCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleSearchPress(item._id || item.id)}
              >
                <View style={styles.productImageWrap}>
                  <Image
                    source={{ uri: item.image || (item.images && item.images[0]) }}
                    style={styles.productImage}
                  />
                  <View style={[styles.productDiscountPill, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.productDiscountPillText}>
                      {item.discount}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.productWishlistBtn, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      handleWishlistPress(item);
                    }}
                  >
                    <Heart
                      size={18}
                      color={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : theme.colors.textSecondary}
                      fill={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                  <Text style={[styles.productBrand, { color: theme.colors.text }]}>{item.brand}</Text>
                  <Text style={[styles.productName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={[styles.productPrice, { color: theme.colors.text }]} numberOfLines={1}>
                      {formatPriceDetail(item.price, item.discount).formattedText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* YOU MAY ALSO LIKE */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>YOU MAY ALSO LIKE</Text>
        </View>

        {loadingRecommendations ? (
          <View style={[styles.placeholderSection, { backgroundColor: theme.colors.inputBackground }]}>
            <Text style={{ color: theme.colors.textSecondary }}>Loading recommendations...</Text>
          </View>
        ) : recommendations.length === 0 ? (
          <View style={[styles.placeholderSection, { backgroundColor: theme.colors.inputBackground }]}>
            <Text style={{ color: theme.colors.textSecondary }}>Check back later for personalized recommendations!</Text>
          </View>
        ) : (
          <FlatList
            data={recommendations}
            keyExtractor={(item, index) => String(item._id || item.id || `recs-${index}`)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.productCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleSearchPress(item._id || item.id)}
              >
                <View style={styles.productImageWrap}>
                  <Image
                    source={{ uri: item.image || (item.images && item.images[0]) }}
                    style={styles.productImage}
                  />
                  {item.discount && (
                    <View style={[styles.productDiscountPill, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.productDiscountPillText}>
                        {item.discount}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.productWishlistBtn, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      handleWishlistPress(item);
                    }}
                  >
                    <Heart
                      size={18}
                      color={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : theme.colors.textSecondary}
                      fill={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                  <Text style={[styles.productBrand, { color: theme.colors.text }]}>{item.brand}</Text>
                  <Text style={[styles.productName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={[styles.productPrice, { color: theme.colors.text }]} numberOfLines={1}>
                      {formatPriceDetail(item.price, item.discount).formattedText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* TRENDING NOW */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>TRENDING NOW</Text>
        </View>

        <FlatList
          data={products}
          keyExtractor={(item, index) => String(item._id || item.id || `trending-${index}`)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.productCard, { backgroundColor: theme.colors.card }]}
              onPress={() => handleSearchPress(item._id || item.id)}
            >
              <View style={styles.productImageWrap}>
                <Image
                  source={{ uri: item.image || (item.images && item.images[0]) }}
                  style={styles.productImage}
                />
                <View style={[styles.productDiscountPill, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.productDiscountPillText}>
                    {item.discount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.productWishlistBtn, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}
                  activeOpacity={0.8}
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    handleWishlistPress(item);
                  }}
                >
                  <Heart
                    size={18}
                    color={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : theme.colors.textSecondary}
                    fill={isInWishlist(String(item._id || item.id || '')) ? theme.colors.primary : 'transparent'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.productInfo}>
                <Text style={[styles.productBrand, { color: theme.colors.text }]}>{item.brand}</Text>
                <Text style={[styles.productName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={[styles.productPrice, { color: theme.colors.text }]} numberOfLines={1}>
                    {formatPriceDetail(item.price, item.discount).formattedText}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ff3f6c',
    letterSpacing: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,63,108,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  viewAllText: {
    color: '#ff3f6c',
    fontWeight: '700',
    marginRight: 2,
    fontSize: 12,
  },
  clearText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoriesScroll: {
    marginTop: 6,
  },
  categoryCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 16,
    padding: 8,
    elevation: 4,
    shadowColor: '#ff3f6c',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,63,108,0.15)',
  },
  categoryName: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  brandCard: {
    width: 90,
    marginRight: 14,
    alignItems: 'center',
  },
  brandImageContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,63,108,0.2)',
    elevation: 4,
    shadowColor: '#ff3f6c',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  brandImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandName: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  placeholderSection: {
    padding: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed' as any,
    borderColor: 'rgba(255,63,108,0.2)',
  },
  horizontalListContent: {
    paddingRight: 16,
    paddingLeft: 2,
    gap: 14,
  },
  dealCard: {
    width: 240,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#ff3f6c',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealGlow: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 240,
    height: 160,
    backgroundColor: 'rgba(255,63,108,0.3)',
    transform: [{ rotate: '-12deg' }],
  },
  dealOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dealTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dealBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dealBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  productCard: {
    width: 190,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  productImageWrap: {
    width: '100%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  productDiscountPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  productDiscountPillText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  recentProductCard: {
    width: 148,
    marginRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  recentImageContainer: {
    width: '100%',
    height: 170,
    position: 'relative',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  recentInfo: {
    padding: 10,
  },
  recentBrand: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  recentName: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
    lineHeight: 16,
  },
  recentPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ff3f6c',
  },
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ff3f6c',
  },
  buyNowText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ff3f6c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,63,108,0.1)',
  },
  productWishlistBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff3f6c',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
