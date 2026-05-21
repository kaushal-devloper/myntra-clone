import { useRouter } from 'expo-router';
import { Heart, Trash2, CheckCircle, MapPin, CreditCard, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

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

const bagItems = [
  {
    id: 1,
    name: 'White Cotton T-Shirt',
    brand: 'H&M',
    size: 'L',
    price: 799,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Blue Denim Jacket',
    brand: 'Levis',
    size: 'M',
    price: 2999,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop',
  }
];

export default function Bag() {
  const router = useRouter();
  const [items, setItems] = useState<BagItem[]>(bagItems);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const totalPrice = useMemo(() => {
    // Simple total: parse rupees-like number from price strings.
    // If your app later uses real cart totals, replace this logic.
    const sum = items.reduce((acc, it) => {
      const n = Number(String(it.price).replace(/[^0-9]/g, ''));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

    return sum;
  }, [items]);

  const { user } = useAuth();
  const isAuthenticated = !!user;

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bag</Text>
        </View>

        <View style={styles.emptyState}>
          <Heart size={64} color="#ff3f6c" />
          <Text style={styles.emptyTitle}>
            Please login to view your bag
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login' as any)}
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
        <Text style={styles.headerTitle}>Bag</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your bag is empty</Text>
          </View>
        ) : (
          <>
            <View style={styles.listGrid}>
              {items.map((item) => (
                <View key={item.id} style={styles.bagItem}>
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
                    onPress={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                  >
                    <Trash2 size={18} color="#ff3f6c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.summaryWrap}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>₹{totalPrice}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                activeOpacity={0.9}
                onPress={() => {
                  setShowDetailModal(true);
                }}
              >
                <Text style={styles.checkoutButtonText}>PLACE ORDER</Text>
              </TouchableOpacity>
            </View>
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
          <View style={styles.detailModalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Order Details</Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.closeModalButton}
              >
                <X size={22} color="#111" />
              </TouchableOpacity>
            </View>

            {/* Scrollable details */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Shipping Address Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MapPin size={20} color="#ff3f6c" style={styles.sectionHeaderIcon} />
                  <Text style={styles.modalSectionTitle}>Delivery Address</Text>
                </View>
                <View style={styles.addressCard}>
                  <Text style={styles.addressName}>John Doe</Text>
                  <Text style={styles.addressText}>123 Main Street, Apt 4B</Text>
                  <Text style={styles.addressText}>New York, NY 10001</Text>
                  <Text style={styles.addressPhone}>Phone: +1 (555) 019-2834</Text>
                </View>
              </View>

              {/* Items Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>Items in Bag ({items.length})</Text>
                </View>
                {items.map((item) => (
                  <View key={item.id} style={styles.detailItemRow}>
                    <Image source={{ uri: item.image }} style={styles.detailItemImage} />
                    <View style={styles.detailItemInfo}>
                      <Text style={styles.detailBrandName}>{item.brand}</Text>
                      <Text style={styles.detailItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.detailItemMeta}>Size: {item.size ?? 'M'}  |  Qty: 1</Text>
                      <Text style={styles.detailItemPrice}>₹{item.price}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Payment Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <CreditCard size={20} color="#ff3f6c" style={styles.sectionHeaderIcon} />
                  <Text style={styles.modalSectionTitle}>Payment Method</Text>
                </View>
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentText}>Cash on Delivery (COD)</Text>
                  <Text style={styles.paymentSubtext}>Pay in cash when order is delivered</Text>
                </View>
              </View>

              {/* Price Details */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Price Details</Text>
                <View style={styles.priceDetailRow}>
                  <Text style={styles.priceDetailLabel}>Total MRP</Text>
                  <Text style={styles.priceDetailValue}>₹{totalPrice}</Text>
                </View>
                <View style={styles.priceDetailRow}>
                  <Text style={styles.priceDetailLabel}>Delivery Charges</Text>
                  <Text style={[styles.priceDetailValue, { color: '#03a685' }]}>FREE</Text>
                </View>
                <View style={styles.priceDetailRow}>
                  <Text style={styles.priceDetailLabel}>Tax & Service Fee (5%)</Text>
                  <Text style={styles.priceDetailValue}>₹{Math.round(totalPrice * 0.05)}</Text>
                </View>
                <View style={[styles.priceDetailRow, styles.finalPriceRow]}>
                  <Text style={styles.finalPriceLabel}>Amount Payable</Text>
                  <Text style={styles.finalPriceValue}>₹{totalPrice + Math.round(totalPrice * 0.05)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Place Order Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.confirmPlaceOrderButton}
                activeOpacity={0.9}
                onPress={() => {
                  setShowDetailModal(false);
                  setShowSuccessModal(true);
                  setItems([]); // Clear bag items
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
          <View style={styles.successContainer}>
            <CheckCircle size={70} color="#03a685" style={styles.successIcon} />
            <Text style={styles.successTitle}>Successfully Placed! 🎉</Text>
            <Text style={styles.successSubtitle}>
              Your order has been confirmed and is being processed. Thank you for shopping with us!
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              activeOpacity={0.9}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>CONTINUE SHOPPING</Text>
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
    backgroundColor: '#fff',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    textAlign: 'center',
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },

  loginButton: {
    marginTop: 8,
    backgroundColor: '#ff3f6c',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    paddingTop: 10,
  },

  listGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12 as any,
  },

  bagItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  itemImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: '#f5f5f5',
  },

  itemInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  brandName: {
    color: '#111',
    fontSize: 13,
    fontWeight: '900',
  },

  itemName: {
    marginTop: 6,
    color: '#444',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  priceRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  price: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111',
  },

  discount: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ff3f6c',
    backgroundColor: 'rgba(255,63,108,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },

  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  summaryWrap: {
    marginTop: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111',
  },

  checkoutButton: {
    backgroundColor: '#ff3f6c',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },

  checkoutButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContainer: {
    height: '85%',
    backgroundColor: '#fff',
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
    borderBottomColor: '#f2f2f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
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
    color: '#111',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 13,
    color: '#777',
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#666',
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f2f2f2',
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
    color: '#111',
  },
  detailItemName: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  detailItemMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  detailItemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111',
    marginTop: 6,
  },
  priceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  priceDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  finalPriceRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  finalPriceLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ff3f6c',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    backgroundColor: '#fff',
  },
  confirmPlaceOrderButton: {
    backgroundColor: '#ff3f6c',
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
    backgroundColor: '#fff',
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
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#ff3f6c',
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
});

