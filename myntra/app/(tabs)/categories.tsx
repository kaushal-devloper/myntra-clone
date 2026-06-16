import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";

import { Search, X } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";
import { useAppTheme } from "@/context/ThemeContext";
import { formatPriceDetail, getProductDiscount } from "@/utils/priceFormatter";

export default function CategoriesScreen() {
  const router = useRouter();
  const { deal, categoryId, brand } = useLocalSearchParams();
  const { theme, isDark } = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    (categoryId as string) || null
  );

  useEffect(() => {
    if (categoryId) {
      setSelectedCategory(categoryId as string);
    }
  }, [categoryId]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [categoriesData, setCategoriesData] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const apiBaseUrl = getApiBaseUrl();
        const res = await axios.get(
          `${apiBaseUrl}/category`
        );

        const apiData = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];

        setCategoriesData(apiData);
      } catch (error) {
        console.log(error);
        setCategoriesData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSearchQuery("");
  };

  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setSearchQuery("");
  };

  const filterCategories = categoriesData;

  const getGlobalSearchedProducts = () => {
    let q = searchQuery.toLowerCase();
    const isUnder599 = deal === 'Under ₹599';
    const isDiscount = deal === '40-70% Off';

    const allProducts = (categoriesData ?? []).reduce((acc: any[], cat: any) => {
      const mappedProds = (cat?.productId ?? cat?.products ?? []).map((p: any) => ({
         ...p,
         discount: p.discount || getProductDiscount(p)
      }));
      return [...acc, ...mappedProds];
    }, []);
    
    const uniqueMap = new Map();
    allProducts.forEach((p: any) => uniqueMap.set(p._id || p.id, p));
    let uniqueProducts = Array.from(uniqueMap.values());
    
    if (isUnder599) {
      uniqueProducts = uniqueProducts.filter(p => {
         const priceStr = String(p.price || "");
         const pVal = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
         return pVal < 599;
      });
    }
    
    if (isDiscount) {
      uniqueProducts = uniqueProducts.filter(p => {
         if (!p.discount) return false;
         const val = parseInt(p.discount.replace(/[^0-9]/g, '')) || 0;
         return val >= 40 && val <= 70;
      });
    }

    if (brand) {
      const brandLower = String(brand).toLowerCase();
      uniqueProducts = uniqueProducts.filter(p => {
        return (p.brand || "").toLowerCase() === brandLower;
      });
    }

    if (!searchQuery && !deal && !brand) return [];
    
    if (searchQuery) {
      uniqueProducts = uniqueProducts.filter((product: any) => {
        const name = (product?.name ?? "").toLowerCase();
        const brand = (product?.brand ?? "").toLowerCase();
        const desc = (product?.description ?? "").toLowerCase();
        return name.includes(q) || brand.includes(q) || desc.includes(q);
      });
    }

    return uniqueProducts;
  };

  const selectedCategoryData = selectedCategory
    ? categoriesData?.find((cat: any) => String(cat?._id ?? cat?.id) === selectedCategory)
    : null;

  const getFilteredProducts = () => {
    if (!selectedCategoryData) return [];
    const products = (selectedCategoryData?.productId ?? selectedCategoryData?.products ?? []).map((p: any) => ({
      ...p,
      discount: p.discount || getProductDiscount(p)
    }));
    if (!selectedSubcategory || selectedSubcategory === "All") {
      return products;
    }
    const subQuery = selectedSubcategory.toLowerCase();
    return products.filter((product: any) => {
      if (product?.subcategory && String(product.subcategory).toLowerCase() === subQuery) {
        return true;
      }
      const name = (product?.name ?? "").toLowerCase();
      const brand = (product?.brand ?? "").toLowerCase();
      const desc = (product?.description ?? "").toLowerCase();
      const subSingular = subQuery.endsWith('s') ? subQuery.slice(0, -1) : subQuery;
      
      return (
        name.includes(subQuery) ||
        name.includes(subSingular) ||
        brand.includes(subQuery) ||
        desc.includes(subQuery) ||
        desc.includes(subSingular)
      );
    });
  };

  const renderProducts = (products: any[]) => {
    return (products ?? []).map((product: any) => {
      const { formattedText } = formatPriceDetail(product?.price, product?.discount);
      return (
        <TouchableOpacity
          key={String(product?._id ?? product?.id)}
          style={[styles.productCard, { backgroundColor: theme.colors.card }]}
          onPress={() => router.push(`/product/${product?._id ?? product?.id}`)}
        >
          <Image
            source={{ uri: product?.images?.[0] ?? product?.image }}
            style={styles.productImage}
          />

          <View style={styles.productInfo}>
            <Text style={[styles.brandName, { color: theme.colors.textSecondary }]}>{product?.brand ?? ""}</Text>
            <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={2}>{product?.name ?? ""}</Text>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: theme.colors.text }]} numberOfLines={1}>
                {formattedText}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!categoriesData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Categories not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Categories</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.inputBackground }]}>
          <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for products, brands and more"
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Navigation Bar */}
      <View style={[styles.categoryNavBarContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryNavBarScroll}
        >
          <TouchableOpacity
            style={[
              styles.navCategoryButton,
              { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
              !selectedCategory && [styles.activeNavCategoryButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
            ]}
            onPress={() => {
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              setSearchQuery("");
            }}
          >
            <Text
              style={[
                styles.navCategoryButtonText,
                { color: theme.colors.textSecondary },
                !selectedCategory && styles.activeNavCategoryButtonText,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {(categoriesData ?? []).map((cat: any, index: number) => {
            const catId = String(cat?._id ?? cat?.id ?? index);
            const isSelected = selectedCategory === catId;
            return (
              <TouchableOpacity
                key={catId}
                style={[
                  styles.navCategoryButton,
                  { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
                  isSelected && [styles.activeNavCategoryButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
                ]}
                onPress={() => handleCategorySelect(catId)}
              >
                <Text
                  style={[
                    styles.navCategoryButtonText,
                    { color: theme.colors.textSecondary },
                    isSelected && styles.activeNavCategoryButtonText,
                  ]}
                >
                  {cat?.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {(searchQuery !== "" || deal || brand) ? (
          <View style={styles.categoryDetail}>
            <View style={styles.categoryHeader}>
               {(deal || brand) ? (
                  <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
                    <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← Back to Home</Text>
                  </TouchableOpacity>
               ) : null}
               <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
                 {deal ? deal : brand ? `Brand: ${brand}` : 'Search Results'}
               </Text>
            </View>
            <View style={styles.productsGrid}>
              {getGlobalSearchedProducts().length > 0 ? (
                renderProducts(getGlobalSearchedProducts())
              ) : (
                <View style={styles.noProductsContainer}>
                  <Text style={[styles.noProductsText, { color: theme.colors.textSecondary }]}>No products found</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {!selectedCategoryData && !searchQuery && !deal && (
          <View style={styles.categoriesGrid}>
            {(filterCategories ?? []).map((category: any, index: number) => (
              <TouchableOpacity
                key={String(category?._id ?? category?.id ?? index)}
                style={[styles.categoryCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleCategorySelect(String(category?._id ?? category?.id))}
              >
                <Image
                  source={{ uri: category?.image }}
                  style={styles.categoryImage}
                />

                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category?.name}</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    <View style={styles.subcategories}>
                      {(category?.subcategory ?? []).map((sub: any, index: any) => (
                        <TouchableOpacity
                          key={String(index)}
                          style={[styles.subcategoryTag, { backgroundColor: theme.colors.inputBackground }]}
                          onPress={() => handleSubcategorySelect(String(sub))}
                        >
                          <Text style={[styles.subcategoryText, { color: theme.colors.textSecondary }]}>{String(sub)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedCategoryData && !searchQuery && !deal && (
          <View style={styles.categoryDetail}>
            <View style={styles.categoryHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← Back to Categories</Text>
              </TouchableOpacity>

              <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{selectedCategoryData?.name}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subcategoriesScroll}
            >
              <TouchableOpacity
                style={[
                  styles.subcategoryButton,
                  { backgroundColor: theme.colors.inputBackground },
                  (!selectedSubcategory || selectedSubcategory === "All") && [styles.selectedSubcategory, { backgroundColor: theme.colors.primary }],
                ]}
                onPress={() => setSelectedSubcategory(null)}
              >
                <Text
                  style={[
                    styles.subcategoryButtonText,
                    { color: theme.colors.text },
                    (!selectedSubcategory || selectedSubcategory === "All") && styles.selectedSubcategoryText,
                  ]}
                >
                  All Products
                </Text>
              </TouchableOpacity>

              {(selectedCategoryData?.subcategory ?? []).map((sub: any, index: any) => (
                <TouchableOpacity
                  key={String(index)}
                  style={[
                    styles.subcategoryButton,
                    { backgroundColor: theme.colors.inputBackground },
                    selectedSubcategory === sub && [styles.selectedSubcategory, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => handleSubcategorySelect(String(sub))}
                >
                  <Text
                    style={[
                      styles.subcategoryButtonText,
                      { color: theme.colors.text },
                      selectedSubcategory === sub && styles.selectedSubcategoryText,
                    ]}
                  >
                    {String(sub)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.productsGrid}>
              {getFilteredProducts().length > 0 ? (
                renderProducts(getFilteredProducts())
              ) : (
                <View style={styles.noProductsContainer}>
                  <Text style={[styles.noProductsText, { color: theme.colors.textSecondary }]}>No products found in this subcategory</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
  },
  categoryCard: {
    width: Platform.OS === 'web' ? '45%' : '100%',
    minWidth: 280,
    flexGrow: 1,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  categoryImage: {
    width: "100%",
    height: 150,
  },
  categoryInfo: {
    padding: 15,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subcategories: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  subcategoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 14,
  },
  categoryDetail: {
    flex: 1,
    padding: 15,
  },
  categoryHeader: {
    marginBottom: 15,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subcategoriesScroll: {
    marginBottom: 15,
  },
  subcategoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedSubcategory: {},
  subcategoryButtonText: {
    fontSize: 14,
  },
  selectedSubcategoryText: {
    color: "#fff",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  productCard: {
    width: Platform.OS === 'web' ? '30%' : '47%',
    minWidth: 160,
    flexGrow: 1,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 10,
  },
  brandName: {
    fontSize: 14,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  discount: {
    fontSize: 14,
  },
  noProductsContainer: {
    flex: 1,
    width: "100%",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noProductsText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  categoryNavBarContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  categoryNavBarScroll: {
    paddingHorizontal: 15,
    flexDirection: "row",
    gap: 10,
  },
  navCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  activeNavCategoryButton: {},
  navCategoryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  activeNavCategoryButtonText: {
    color: "#fff",
  },
});
