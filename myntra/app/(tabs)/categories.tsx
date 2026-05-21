import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { Search, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";


export default function CategoriesScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [categoriesData, setCategoriesData] = useState<any[] | null>(null);
  

  const fallbackCategories = [
    {
      id: 1,
      name: "Men",
      subcategories: [
        "T-Shirts",
        "Shirts",
        "Jeans",
        "Trousers",
        "Suits",
        "Activewear",
      ],
      image:
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&auto=format&fit=crop",
      products: [
        {
          id: 1,
          name: "Casual White T-Shirt",
          brand: "Roadster",
          price: 499,
          discount: "60% OFF",
          image:
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop",
        },
        {
          id: 2,
          name: "Denim Jacket",
          brand: "Levis",
          price: 2499,
          discount: "40% OFF",
          image:
            "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop",
        },
      ],
    },
    {
      id: 2,
      name: "Women",
      subcategories: [
        "Dresses",
        "Tops",
        "Ethnic Wear",
        "Western Wear",
        "Activewear",
      ],
      image:
        "https://images.unsplash.com/photo-1618244972963-dbad0c4abf18?w=500&auto=format&fit=crop",
      products: [
        {
          id: 3,
          name: "Summer Dress",
          brand: "ONLY",
          price: 1299,
          discount: "50% OFF",
          image:
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop",
        },
      ],
    },
    {
      id: 3,
      name: "Kids",
      subcategories: [
        "Boys Clothing",
        "Girls Clothing",
        "Infants",
        "Toys",
        "School Essentials",
      ],
      image:
        "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&auto=format&fit=crop",
      products: [],
    },
    {
      id: 4,
      name: "Beauty",
      subcategories: [
        "Makeup",
        "Skincare",
        "Haircare",
        "Fragrances",
        "Personal Care",
      ],
      image:
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop",
      products: [],
    },
    {
      id: 5,
      name: "Accessories",
      subcategories: [
        "Watches",
        "Bags",
        "Jewellery",
        "Sunglasses",
        "Belts",
      ],
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop",
      products: [],
    },
  ];

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

        // If API returns empty, use fallback categories
        setCategoriesData(
          Array.isArray(apiData) && apiData.length > 0
            ? apiData
            : fallbackCategories
        );
      } catch (error) {
        console.log(error);
        setCategoriesData(fallbackCategories);
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

  const filterCategories = categoriesData?.filter((category: any) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (category?.name ?? "").toLowerCase().includes(q);
    const subMatch = (category?.subcategory ?? []).some((sub: any) =>
      String(sub).toLowerCase().includes(q)
    );
    const productMatch = (category?.productId ?? []).some((product: any) => {
      const pName = (product?.name ?? "").toLowerCase();
      const pBrand = (product?.brand ?? "").toLowerCase();
      return pName.includes(q) || pBrand.includes(q);
    });

    return nameMatch || subMatch || productMatch;
  });

  const selectedCategoryData = selectedCategory
    ? categoriesData?.find((cat: any) => String(cat?._id ?? cat?.id) === selectedCategory)
    : null;

  const getFilteredProducts = () => {
    if (!selectedCategoryData) return [];
    const products = selectedCategoryData?.productId ?? selectedCategoryData?.products ?? [];
    if (!selectedSubcategory || selectedSubcategory === "All") {
      return products;
    }
    const subQuery = selectedSubcategory.toLowerCase();
    return products.filter((product: any) => {
      // If product has an explicit subcategory property, match exactly
      if (product?.subcategory && String(product.subcategory).toLowerCase() === subQuery) {
        return true;
      }
      // Otherwise, match in name, brand, or description
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
    return (products ?? []).map((product: any) => (
      <TouchableOpacity
        key={String(product?._id ?? product?.id)}
        style={styles.productCard}
        onPress={() => router.push(`/product/${product?._id ?? product?.id}`)}
      >
        <Image
          source={{ uri: product?.images?.[0] ?? product?.image }}
          style={styles.productImage}
        />

        <View style={styles.productInfo}>
          <Text style={styles.brandName}>{product?.brand ?? ""}</Text>
          <Text style={styles.productName}>{product?.name ?? ""}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product?.price ?? ""}</Text>
            {!!product?.discount && (
              <Text style={styles.discount}>{product.discount}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ));
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff3f6c" />
      </View>
    );
  }

  if (!categoriesData) {
    return (
      <View style={styles.container}>
        <Text>Categories not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products, brands and more"
            value={searchQuery}
            onChangeText={handleSearch}
          />

          {searchQuery !== "" && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Navigation Bar */}
      <View style={styles.categoryNavBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryNavBarScroll}
        >
          <TouchableOpacity
            style={[
              styles.navCategoryButton,
              !selectedCategory && styles.activeNavCategoryButton,
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
                !selectedCategory && styles.activeNavCategoryButtonText,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {(categoriesData ?? []).map((cat: any) => {
            const catId = String(cat?._id ?? cat?.id);
            const isSelected = selectedCategory === catId;
            return (
              <TouchableOpacity
                key={catId}
                style={[
                  styles.navCategoryButton,
                  isSelected && styles.activeNavCategoryButton,
                ]}
                onPress={() => handleCategorySelect(catId)}
              >
                <Text
                  style={[
                    styles.navCategoryButtonText,
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
        {!selectedCategoryData && (
          <View style={styles.categoriesGrid}>
            {(filterCategories ?? []).map((category: any) => (
              <TouchableOpacity
                key={String(category?._id ?? category?.id)}
                style={styles.categoryCard}
                onPress={() => handleCategorySelect(String(category?._id ?? category?.id))}
              >
                <Image
                  source={{ uri: category?.image }}
                  style={styles.categoryImage}
                />

                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category?.name}</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    <View style={styles.subcategories}>
                      {(category?.subcategory ?? []).map((sub: any, index: any) => (
                        <TouchableOpacity
                          key={String(index)}
                          style={styles.subcategoryTag}
                          onPress={() => handleSubcategorySelect(String(sub))}
                        >
                          <Text style={styles.subcategoryText}>{String(sub)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedCategoryData && (
          <View style={styles.categoryDetail}>
            <View style={styles.categoryHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={styles.backButtonText}>← Back to Categories</Text>
              </TouchableOpacity>

              <Text style={styles.categoryTitle}>{selectedCategoryData?.name}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subcategoriesScroll}
            >
              <TouchableOpacity
                style={[
                  styles.subcategoryButton,
                  (!selectedSubcategory || selectedSubcategory === "All") && styles.selectedSubcategory,
                ]}
                onPress={() => setSelectedSubcategory(null)}
              >
                <Text
                  style={[
                    styles.subcategoryButtonText,
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
                    selectedSubcategory === sub && styles.selectedSubcategory,
                  ]}
                  onPress={() => handleSubcategorySelect(String(sub))}
                >
                  <Text
                    style={[
                      styles.subcategoryButtonText,
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
                  <Text style={styles.noProductsText}>No products found in this subcategory</Text>
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
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  searchContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#3e3e3e",
  },
  content: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 15,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    color: "#3e3e3e",
    marginBottom: 10,
  },
  subcategories: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  subcategoryTag: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 14,
    color: "#666",
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
    color: "#ff3f6c",
    fontSize: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  subcategoriesScroll: {
    marginBottom: 15,
  },
  subcategoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 10,
  },
  selectedSubcategory: {
    backgroundColor: "#ff3f6c",
  },
  subcategoryButtonText: {
    fontSize: 14,
    color: "#3e3e3e",
  },
  selectedSubcategoryText: {
    color: "#fff",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    color: "#666",
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    color: "#3e3e3e",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginRight: 8,
  },
  discount: {
    fontSize: 14,
    color: "#ff3f6c",
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
    color: "#888",
    textAlign: "center",
    fontWeight: "500",
  },
  categoryNavBarContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 8,
  },
  activeNavCategoryButton: {
    backgroundColor: "#ff3f6c",
    borderColor: "#ff3f6c",
  },
  navCategoryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  activeNavCategoryButtonText: {
    color: "#fff",
  },
});

