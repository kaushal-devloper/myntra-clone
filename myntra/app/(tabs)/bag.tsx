import { useRouter } from 'expo-router';
import { Heart, Trash2, CheckCircle, MapPin, CreditCard, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { useAppTheme } from '@/context/ThemeContext';
import { getDiscountedPrice, formatPriceDetail, getProductDiscount } from '@/utils/priceFormatter';
import { useAlert } from '@/context/AlertContext';
import { createOrder } from '@/utils/orderApi';
import { clearTransactionsCache } from '@/hooks/useTransactions';
import * as Notifications from 'expo-notifications';
import { getAddress, Address } from '@/utils/settingsApi';

type BagItem = {
  id: number;
  name: string;
  brand: string;
  size?: string;
  price: number;
  quantity?: number;
  discount?: string;
  image: string;
};

const bagItems: BagItem[] = [];

export default function Bag() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { showAlert } = useAlert();
  const [items, setItems] = useState<BagItem[]>([]);
  const [savedItems, setSavedItems] = useState<BagItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<Address | null>(null);

  const totalPrice = useMemo(() => {
    const total = items.reduce((acc, item) => {
      const discount = item.discount || getProductDiscount(item);
      const discountedItemPrice = getDiscountedPrice(item.price, discount);
      return acc + (discountedItemPrice * (item.quantity || 1));
    }, 0);
    return Math.round(total);
  }, [items]);

  const { user } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchCart = async () => {
        setLoading(true);
        try {
          const apiBaseUrl = getApiBaseUrl();
          const userId = (user as any)._id || (user as any).id;
          const res = await axios.get(`${apiBaseUrl}/api/bag/${userId}`);
          
          if (res.data?.success && res.data.data?.activeItems) {
            const mapped = res.data.data.activeItems
              .filter((item: any) => item.productId)
              .map((item: any) => ({
                id: item.productId?._id || item.productId?.id || Math.random(),
                name: item.productId?.name || 'Unknown Product',
                brand: item.productId?.brand || 'Unknown',
                price: item.productId?.price || item.price,
                quantity: item.quantity,
                size: item.size,
                image: item.productId?.image || (item.productId?.images && item.productId?.images[0]) || '',
                discount: item.productId?.discount
              }));
            setItems(mapped);
          }
          if (res.data?.success && res.data.data?.savedItems) {
            const mappedSaved = res.data.data.savedItems
              .filter((item: any) => item.productId)
              .map((item: any) => ({
                id: item.productId?._id || item.productId?.id || Math.random(),
                name: item.productId?.name || 'Unknown Product',
                brand: item.productId?.brand || 'Unknown',
                price: item.productId?.price || item.price,
                quantity: item.quantity,
                size: item.size,
                image: item.productId?.image || (item.productId?.images && item.productId?.images[0]) || '',
                discount: item.productId?.discount
              }));
            setSavedItems(mappedSaved);
          }
        } catch (error) {
          console.error("Error fetching cart:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchCart();

      // Fetch user's saved address
      getAddress()
        .then(addr => setUserAddress(addr))
        .catch(err => console.error('Error fetching address:', err));
    }
  }, [isAuthenticated, user]);

  const handleSaveForLater = async (item: BagItem) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.post(`${apiBaseUrl}/api/bag/save-for-later`, {
        userId,
        productId: item.id,
        size: item.size
      });
      setItems(prev => prev.filter(x => x.id !== item.id || x.size !== item.size));
      setSavedItems(prev => {
        const existing = prev.find(x => x.id === item.id && x.size === item.size);
        if (existing) {
          return prev.map(x => x.id === item.id && x.size === item.size ? { ...x, quantity: (x.quantity || 1) + (item.quantity || 1) } : x);
        }
        return [...prev, item];
      });
    } catch (error) {
      console.error("Error saving for later:", error);
    }
  };

  const handleMoveToBag = async (item: BagItem) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.post(`${apiBaseUrl}/api/bag/move-to-bag`, {
        userId,
        productId: item.id,
        size: item.size
      });
      setSavedItems(prev => prev.filter(x => x.id !== item.id || x.size !== item.size));
      setItems(prev => {
        const existing = prev.find(x => x.id === item.id && x.size === item.size);
        if (existing) {
          return prev.map(x => x.id === item.id && x.size === item.size ? { ...x, quantity: (x.quantity || 1) + (item.quantity || 1) } : x);
        }
        return [...prev, item];
      });
    } catch (error) {
      console.error("Error moving to bag:", error);
    }
  };

  const handleRemoveSaved = async (item: BagItem) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.post(`${apiBaseUrl}/api/bag/remove-saved`, {
        userId,
        productId: item.id,
        size: item.size
      });
      setSavedItems(prev => prev.filter(x => x.id !== item.id || x.size !== item.size));
    } catch (error) {
      console.error("Error removing saved item:", error);
    }
  };

  const handleRemoveActive = async (item: BagItem) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.post(`${apiBaseUrl}/api/bag/remove`, {
        userId,
        productId: item.id,
        size: item.size
      });
      setItems(prev => prev.filter(x => x.id !== item.id || x.size !== item.size));
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const handleUpdateQuantity = async (item: BagItem, newQty: number) => {
    if (!user) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      
      const res = await axios.post(`${apiBaseUrl}/api/bag/update-quantity`, {
        userId,
        productId: item.id,
        size: item.size,
        quantity: newQty
      });

      if (res.data?.success) {
        if (newQty <= 0) {
          setItems(prev => prev.filter(x => !(x.id === item.id && x.size === item.size)));
        } else {
          setItems(prev => prev.map(x => (x.id === item.id && x.size === item.size) ? { ...x, quantity: newQty } : x));
        }
      }
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      if (error.response?.data?.message) {
        showAlert({
          title: "Update Failed",
          message: error.response.data.message,
          type: "error"
        });
      } else {
        showAlert({
          title: "Update Failed",
          message: "Failed to update quantity. Out of stock or connection issue.",
          type: "error"
        });
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Bag</Text>
        </View>

        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.subduedBrand }]}>
            <Heart size={52} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Please login to view your bag
          </Text>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/login' as any)}
            activeOpacity={0.9}
          >
            <Text style={styles.loginButtonText}>LOGIN / SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Bag</Text>
        {items.length > 0 && (
          <View style={[{ backgroundColor: theme.colors.subduedBrand, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }]}>
            <Text style={[styles.headerCount, { color: theme.colors.primary }]}>{items.length} item{items.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 && savedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>Your bag is empty</Text>
          </View>
        ) : (
          <>
            {items.length > 0 ? (
              <>
                <View style={styles.listGrid}>
                  {items.map((item, index) => (
                    <View key={`${item.id}-${item.size || ""}-${index}`} style={[styles.bagItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      {/* Tappable area: image + info → product detail */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => router.push(`/product/${item.id}` as any)}
                        style={{ flex: 0 }}
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

                          <View style={styles.quantityRow}>
                            <TouchableOpacity
                              style={[styles.qtyBtn, { backgroundColor: theme.colors.inputBackground }]}
                              onPress={() => handleUpdateQuantity(item, (item.quantity || 1) - 1)}
                            >
                              <Text style={[styles.qtyBtnText, { color: theme.colors.text }]}>-</Text>
                            </TouchableOpacity>
                            <Text style={[styles.qtyValue, { color: theme.colors.text }]}>{item.quantity || 1}</Text>
                            <TouchableOpacity
                              style={[styles.qtyBtn, { backgroundColor: theme.colors.inputBackground }]}
                              onPress={() => handleUpdateQuantity(item, (item.quantity || 1) + 1)}
                            >
                              <Text style={[styles.qtyBtnText, { color: theme.colors.text }]}>+</Text>
                            </TouchableOpacity>
                            {item.size ? (
                              <Text style={[styles.sizeTag, { backgroundColor: theme.colors.inputBackground, color: theme.colors.textSecondary }]}>Size: {item.size}</Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButtonContainer, { backgroundColor: theme.colors.inputBackground, borderTopColor: theme.colors.borderLight }]}
                        activeOpacity={0.8}
                        onPress={() => handleSaveForLater(item)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>SAVE FOR LATER</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)', borderColor: theme.colors.border }]}
                        activeOpacity={0.85}
                        onPress={() => handleRemoveActive(item)}
                      >
                        <Trash2 size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={[styles.summaryWrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>PRICE DETAILS</Text>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>MRP ({items.length} item{items.length > 1 ? 's' : ''})</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>₹{totalPrice}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
                    <Text style={[styles.summaryValue, { color: '#03a685' }]}>FREE</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: theme.colors.borderLight }]} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryFinalLabel, { color: theme.colors.text }]}>Total Amount</Text>
                    <Text style={styles.summaryFinalValue}>₹{totalPrice}</Text>
                  </View>
                  <View style={[styles.trustRow, { borderTopColor: theme.colors.borderLight }]}>
                    <View style={styles.trustItem}>
                      <Text style={{ fontSize: 20 }}>🔒</Text>
                      <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>Secure{"\n"}Payment</Text>
                    </View>
                    <View style={styles.trustItem}>
                      <Text style={{ fontSize: 20 }}>🚚</Text>
                      <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>Free{"\n"}Delivery</Text>
                    </View>
                    <View style={styles.trustItem}>
                      <Text style={{ fontSize: 20 }}>↩️</Text>
                      <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>Easy{"\n"}Returns</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.9}
                    onPress={() => { setShowDetailModal(true); }}
                  >
                    <Text style={styles.checkoutButtonText}>PLACE ORDER</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>Your bag is empty</Text>
              </View>
            )}

            {savedItems.length > 0 && (
              <View style={[styles.savedSection, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.savedSectionTitle, { color: theme.colors.text }]}>Saved for Later ({savedItems.length})</Text>
                <View style={styles.listGrid}>
                  {savedItems.map((item, index) => (
                    <View key={`${item.id}-${item.size || ""}-${index}`} style={[styles.bagItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      {/* Tappable area: image + info → product detail */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => router.push(`/product/${item.id}` as any)}
                        style={{ flex: 0 }}
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

                      <TouchableOpacity
                        style={[styles.actionButtonContainer, { backgroundColor: theme.colors.inputBackground, borderTopColor: theme.colors.borderLight }]}
                        activeOpacity={0.8}
                        onPress={() => handleMoveToBag(item)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>MOVE TO BAG</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)', borderColor: theme.colors.border }]}
                        activeOpacity={0.85}
                        onPress={() => handleRemoveSaved(item)}
                      >
                        <Trash2 size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Details & Review Order Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Confirm Order Details</Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.closeModalButton}
              >
                <X size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Scrollable details */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Shipping Address Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MapPin size={20} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Delivery Address</Text>
                </View>
                <View style={[styles.addressCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  {userAddress && userAddress.fullName ? (
                    <>
                      <Text style={[styles.addressName, { color: theme.colors.text }]}>{userAddress.fullName}</Text>
                      <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{userAddress.addressLine}</Text>
                      <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{userAddress.city}, {userAddress.state} - {userAddress.pincode}</Text>
                      <Text style={[styles.addressPhone, { color: theme.colors.textMuted }]}>Phone: {userAddress.mobile}</Text>
                    </>
                  ) : (
                    <Text style={[styles.addressText, { color: theme.colors.textMuted, fontStyle: 'italic' }]}>No address saved. Add one in Settings → Manage Address</Text>
                  )}
                </View>
              </View>

              {/* Items Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Items in Bag ({items.length})</Text>
                </View>
                {items.map((item, index) => (
                  <View key={`${item.id}-${item.size || ""}-${index}`} style={[styles.detailItemRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Image source={{ uri: item.image }} style={styles.detailItemImage} />
                    <View style={styles.detailItemInfo}>
                      <Text style={[styles.detailBrandName, { color: theme.colors.text }]}>{item.brand}</Text>
                      <Text style={[styles.detailItemName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.detailItemMeta, { color: theme.colors.textMuted }]}>Size: {item.size ?? 'M'}  |  Qty: {item.quantity || 1}</Text>
                      <Text style={[styles.detailItemPrice, { color: theme.colors.text }]}>
                        {formatPriceDetail(item.price, item.discount || getProductDiscount(item)).formattedText}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Payment Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <CreditCard size={20} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Payment Method</Text>
                </View>
                <View style={[styles.paymentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.paymentText, { color: theme.colors.text }]}>Cash on Delivery (COD)</Text>
                  <Text style={[styles.paymentSubtext, { color: theme.colors.textSecondary }]}>Pay in cash when order is delivered</Text>
                </View>
              </View>

              {/* Price Details */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Price Details</Text>
                <View style={styles.priceDetailRow}>
                  <Text style={[styles.priceDetailLabel, { color: theme.colors.textSecondary }]}>Total MRP</Text>
                  <Text style={[styles.priceDetailValue, { color: theme.colors.text }]}>₹{totalPrice}</Text>
                </View>
                <View style={styles.priceDetailRow}>
                  <Text style={[styles.priceDetailLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
                  <Text style={[styles.priceDetailValue, { color: '#03a685' }]}>FREE</Text>
                </View>
                <View style={styles.priceDetailRow}>
                  <Text style={[styles.priceDetailLabel, { color: theme.colors.textSecondary }]}>Tax & Service Fee (5%)</Text>
                  <Text style={[styles.priceDetailValue, { color: theme.colors.text }]}>₹{Math.round(totalPrice * 0.05)}</Text>
                </View>
                <View style={[styles.priceDetailRow, styles.finalPriceRow, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.finalPriceLabel, { color: theme.colors.text }]}>Amount Payable</Text>
                  <Text style={styles.finalPriceValue}>₹{totalPrice + Math.round(totalPrice * 0.05)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Place Order Button */}
            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={[styles.confirmPlaceOrderButton, { backgroundColor: placing ? '#aaa' : theme.colors.primary }]}
                activeOpacity={0.9}
                disabled={placing}
                onPress={async () => {
                  if (placing) return;
                  setPlacing(true);
                  try {
                    const tax = Math.round(totalPrice * 0.05);
                    const finalTotal = totalPrice + tax;
                    const orderItems = items.map((item) => {
                      const discountedPrice = Math.round(
                        getDiscountedPrice(item.price, item.discount || getProductDiscount(item)) * (item.quantity || 1)
                      );
                      return {
                        productId: String(item.id),
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        size: item.size || '',
                        price: item.price,
                        discountedPrice: Math.round(getDiscountedPrice(item.price, item.discount || getProductDiscount(item))),
                        discount: item.discount || getProductDiscount(item),
                        quantity: item.quantity || 1,
                      };
                    });
                    const result = await createOrder({
                      items: orderItems,
                      subtotal: totalPrice,
                      tax,
                      deliveryCharge: 0,
                      total: finalTotal,
                      shippingAddress: userAddress?.fullName ? `${userAddress.fullName}, ${userAddress.addressLine}, ${userAddress.city}, ${userAddress.state} ${userAddress.pincode}, Phone: ${userAddress.mobile}` : 'default',
                      paymentMode: 'COD',
                    });
                    setLastOrderId(result.order._id);
                    setLastTransactionId(result.transaction._id);
                    clearTransactionsCache();

                    // Trigger native system-level notification in the notification bar
                    try {
                      // 1. Payment success notification
                      Notifications.scheduleNotificationAsync({
                        content: {
                          title: "Payment Successful! 💳",
                          body: `Payment of ₹${finalTotal} confirmed successfully via COD.`,
                          sound: true,
                          priority: Notifications.AndroidNotificationPriority.MAX,
                        },
                        trigger: null,
                      }).catch(err => console.error("Error sending payment notification:", err));

                      // 2. Order placement notification with 1.2s delay
                      setTimeout(() => {
                        Notifications.scheduleNotificationAsync({
                          content: {
                            title: "Order Placed Successfully! 🎉",
                            body: `Thank you for shopping! Your order ${result.order.orderId || ''} is being processed.`,
                            sound: true,
                            priority: Notifications.AndroidNotificationPriority.MAX,
                          },
                          trigger: null,
                        }).catch(err => console.error("Error sending order confirmation notification:", err));
                      }, 1200);
                    } catch (e) {
                      console.error("Failed to schedule local notification:", e);
                    }

                    // Clear bag
                    if (user) {
                      try {
                        const apiBaseUrl = getApiBaseUrl();
                        const userId = (user as any)._id || (user as any).id;
                        await axios.post(`${apiBaseUrl}/api/bag/clear`, { userId });
                      } catch (e) { console.error('Error clearing bag:', e); }
                    }
                    setItems([]);
                    setShowDetailModal(false);
                    setShowSuccessModal(true);
                  } catch (err: any) {
                    showAlert({ title: 'Order Failed', message: err.message || 'Failed to place order. Please try again.', type: 'error' });
                  } finally {
                    setPlacing(false);
                  }
                }}
              >
                <Text style={styles.confirmPlaceOrderButtonText}>CONFIRM & PLACE ORDER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Popup Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successContainer, { backgroundColor: theme.colors.card }]}>
            <CheckCircle size={70} color="#03a685" style={styles.successIcon} />
            <Text style={[styles.successTitle, { color: theme.colors.text }]}>Successfully Placed! 🎉</Text>
            <Text style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
              Your order has been confirmed and is being processed. Thank you for shopping with us!
            </Text>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: theme.colors.primary, marginBottom: 12 }]}
              activeOpacity={0.9}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/orders');
              }}
            >
              <Text style={styles.successButtonText}>VIEW ORDERS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.successButtonSecondary, { borderColor: theme.colors.primary, borderWidth: 1 }]}
              activeOpacity={0.9}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={[styles.successButtonTextSecondary, { color: theme.colors.primary }]}>CONTINUE SHOPPING</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
    flex: 1,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  loginButton: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
    paddingTop: 12,
  },
  listGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14 as any,
  },
  bagItem: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  itemImage: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },
  itemInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  itemName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  priceRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ff3f6c',
  },
  discount: {
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,63,108,0.25)',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
  },
  sizeTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  summaryWrap: {
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 10,
  },
  summaryFinalLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  summaryFinalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ff3f6c',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  trustItem: {
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkoutButton: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 14,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  actionButtonContainer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyStateContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSection: {
    marginTop: 24,
    borderTopWidth: 1,
    paddingTop: 20,
  },
  savedSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContainer: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeModalButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderIcon: {
    marginRight: 8,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  addressCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 13,
    marginTop: 8,
  },
  paymentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  paymentSubtext: {
    fontSize: 12,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  detailItemImage: {
    width: 60,
    height: 75,
    borderRadius: 8,
    resizeMode: 'cover',
    marginRight: 14,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailBrandName: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailItemName: {
    fontSize: 13,
    marginTop: 2,
  },
  detailItemMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  detailItemPrice: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },
  priceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceDetailLabel: {
    fontSize: 13,
  },
  priceDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  finalPriceRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  finalPriceLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmPlaceOrderButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPlaceOrderButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successContainer: {
    width: '90%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  successButtonSecondary: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  successButtonTextSecondary: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 16,
    textAlign: 'center',
  },
  sizeTag: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
    fontWeight: '600',
  },
});
