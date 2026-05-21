import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { ChevronRight, Heart } from 'lucide-react-native';
import React from 'react';
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

const categories = [
  {
    id: 1,
    name: 'Men',
    image:
      'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Women',
    image:
      'https://images.unsplash.com/photo-1618244972963-dbad0c4abf18?w=500&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Kids',
    image:
      'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'Beauty',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop',
  },
];

const products = [
  {
    id: 1,
    name: 'Casual White T-Shirt',
    brand: 'Roadster',
    price: '₹499',
    discount: '60% OFF',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Denim Jacket',
    brand: 'Levis',
    price: '₹2499',
    discount: '40% OFF',
    image:
      'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Summer Dress',
    brand: 'ONLY',
    price: '₹1299',
    discount: '50% OFF',
    image:
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'Classic Sneakers',
    brand: 'Nike',
    price: '₹3499',
    discount: '30% OFF',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop',
  },
];

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

  const handleSearchPress = (productID: number) => {
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
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#ffffff', dark: '#ffffff' }}
      headerImage={
        <Image
          source={require('@/assets/images/myntra.png')}
          style={styles.reactLogo}
        />
      }
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <Text style={styles.logo}>MYNTRA</Text>
      </ThemedView>

      {/* SHOP BY CATEGORY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SHOP BY CATEGORY</Text>

          <TouchableOpacity style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={20} color="#ff3f6c" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => route.push('/(tabs)/categories' as any)}
            >
              <Image
                source={{ uri: category.image }}
                style={styles.categoryImage}
              />

              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FEATURED */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText
            type="defaultSemiBold"
            style={styles.sectionTitle}
          >
            Featured
          </ThemedText>

          <TouchableOpacity style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={20} color="#ff3f6c" />
          </TouchableOpacity>
        </View>

        <ThemedView style={styles.placeholderSection}>
          <ThemedText>
            {`Products: ${products.length} • Deals: ${deals.length}`}
          </ThemedText>
        </ThemedView>
      </View>

      {/* DEALS OF THE DAY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DEALS OF THE DAY</Text>
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
              style={styles.dealCard}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.dealImage}
              />

              {/* glow + overlay */}
              <View style={styles.dealGlow} />
              <View style={styles.dealOverlay}>
                <Text style={styles.dealTitle}>{item.title}</Text>
                <View style={styles.dealBadge}>
                  <Text style={styles.dealBadgeText}>Limited</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>


      {/* TRENDING NOW */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRENDING NOW</Text>
        </View>

        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.productCard}
              onPress={() => handleSearchPress(item.id)}
            >
              <View style={styles.productImageWrap}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                />
                <View style={styles.productDiscountPill}>
                  <Text style={styles.productDiscountPillText}>
                    {item.discount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.productWishlistBtn}
                  activeOpacity={0.8}
                  onPress={() => handleWishlistPress(item)}
                >
                  <Heart
                    size={18}
                    color={isInWishlist(item.id) ? '#ff3f6c' : '#888'}
                    fill={isInWishlist(item.id) ? '#ff3f6c' : 'transparent'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productBrand}>{item.brand}</Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>{item.price}</Text>
                  <Text style={styles.buyNowText}>Buy</Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ff3f6c',
  },

  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },

  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewAllText: {
    color: '#ff3f6c',
    fontWeight: '600',
    marginRight: 4,
  },

  categoriesScroll: {
    marginTop: 4,
  },

  categoryCard: {
    width: 120,
    marginRight: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },

  categoryImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
  },

  categoryName: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 15,
    color: '#111',
    textAlign: 'center',
  },

  placeholderSection: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  horizontalListContent: {
    paddingRight: 16,
    gap: 14,
  },

  dealCard: {
    width: 220,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // subtle glow behind title
  dealGlow: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 160,
    backgroundColor: 'rgba(255,63,108,0.28)',
    transform: [{ rotate: '-12deg' }],
  },

  dealOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  dealTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  dealBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,63,108,0.92)',
  },

  dealBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },

  productCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },

  productImageWrap: {
    width: '100%',
    position: 'relative',
  },

  productImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },

  productDiscountPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,63,108,0.95)',
  },

  productDiscountPillText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  productInfo: {
    padding: 10,
  },

  productBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  productName: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    lineHeight: 18,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },

  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111',
  },

  buyNowText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ff3f6c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,63,108,0.08)',
  },

  productWishlistBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
})
