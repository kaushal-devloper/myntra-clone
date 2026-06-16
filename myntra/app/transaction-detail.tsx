import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  Download,
  CreditCard,
  Smartphone,
  Wallet,
  Globe,
  Banknote,
  MapPin,
  ChevronRight,
  TrendingDown,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { fetchTransactionById, Transaction, PaymentMode, PaymentStatus } from "@/utils/transactionApi";
import { fetchOrderById, Order } from "@/utils/orderApi";
import { getUserData } from "@/utils/storage";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

// ─── Constants & Icon helpers ──────────────────────────────────────────────────

function PaymentModeIcon({ mode, size = 16, color }: { mode: PaymentMode; size?: number; color: string }) {
  switch (mode) {
    case "Card":
      return <CreditCard size={size} color={color} />;
    case "UPI":
      return <Smartphone size={size} color={color} />;
    case "Wallet":
      return <Wallet size={size} color={color} />;
    case "NetBanking":
      return <Globe size={size} color={color} />;
    case "COD":
      return <Banknote size={size} color={color} />;
    default:
      return <CreditCard size={size} color={color} />;
  }
}

const STATUS_CONFIGS: Record<PaymentStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string; bgDark: string; textDark: string }> = {
  success: {
    label: "Success",
    icon: <CheckCircle2 size={16} color="#03a685" />,
    color: "#03a685",
    bgColor: "#e8f5e9",
    bgDark: "#0c2b1a",
    textDark: "#81c784",
  },
  pending: {
    label: "Pending",
    icon: <Clock size={16} color="#f57f17" />,
    color: "#f57f17",
    bgColor: "#fff8e1",
    bgDark: "#2d2300",
    textDark: "#ffd54f",
  },
  failed: {
    label: "Failed",
    icon: <XCircle size={16} color="#d32f2f" />,
    color: "#d32f2f",
    bgColor: "#ffebee",
    bgDark: "#2d0b0b",
    textDark: "#ef9a9a",
  },
  refunded: {
    label: "Refunded",
    icon: <Clock size={16} color="#7b1fa2" />,
    color: "#7b1fa2",
    bgColor: "#f3e5f5",
    bgDark: "#220c30",
    textDark: "#ce93d8",
  },
};

// ─── Main Screen Component ─────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams() as { id?: string };
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [token, setToken] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Load user token for download actions
      const { token: userToken } = await getUserData();
      setToken(userToken);

      // 2. Load transaction details
      const txData = await fetchTransactionById(id);
      setTransaction(txData);

      // 3. Load order details if linked
      if (txData.orderId) {
        const ordData = await fetchOrderById(txData.orderId);
        setOrder(ordData);
      }
    } catch (err: any) {
      console.error("[TransactionDetail] Load error:", err);
      setError(err.message || "Failed to load transaction details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadPdf = async () => {
    if (!order?._id || !token) return;
    const url = `${getApiBaseUrl()}/api/orders/${order._id}/receipt/pdf?token=${token}`;
    await WebBrowser.openBrowserAsync(url);
  };

  const handleDownloadImage = async () => {
    if (!order?._id || !token) return;
    const url = `${getApiBaseUrl()}/api/orders/${order._id}/receipt/image?token=${token}`;
    await WebBrowser.openBrowserAsync(url);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary, marginTop: 12 }]}>
          Loading details...
        </Text>
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingHorizontal: 24 }]}>
        <XCircle size={64} color={theme.colors.error} strokeWidth={1.2} />
        <Text style={[styles.errorTitle, { color: theme.colors.text, marginTop: 16 }]}>
          Failed to load details
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {error || "Transaction not found."}
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary, marginTop: 24 }]}
          onPress={loadData}
        >
          <Text style={styles.actionBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedTxDate = transaction
    ? new Date(transaction.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const formattedOrderDate = order
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const statusCfg = STATUS_CONFIGS[transaction.paymentStatus as PaymentStatus] || STATUS_CONFIGS.pending;
  const isDark = theme.dark;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Transaction Top Card */}
        <View style={[styles.txCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
          <Text style={[styles.txAmountLabel, { color: theme.colors.textMuted }]}>TRANSACTION AMOUNT</Text>
          <Text style={[styles.txAmountVal, { color: statusCfg.color }]}>
            ₹{transaction.amount.toLocaleString("en-IN")}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: isDark ? statusCfg.bgDark : statusCfg.bgColor }]}>
            {statusCfg.icon}
            <Text style={[styles.statusText, { color: isDark ? statusCfg.textDark : statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Transaction ID</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]} selectable>
                {transaction._id}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Date & Time</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formattedTxDate}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Payment Mode</Text>
              <View style={styles.modeRow}>
                <PaymentModeIcon mode={transaction.paymentMode} color={theme.colors.primary} />
                <Text style={[styles.infoValue, { color: theme.colors.text, marginLeft: 6 }]}>
                  {transaction.paymentMode}
                </Text>
              </View>
            </View>

            {transaction.description ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Description</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={2}>
                  {transaction.description}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Order Details (if loaded) */}
        {order ? (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Purchased Products</Text>

            {order.items.map((item: any, index: number) => (
              <View
                key={`${item.productId || index}-${index}`}
                style={[
                  styles.productItemRow,
                  { borderBottomColor: index === order.items.length - 1 ? "transparent" : theme.colors.borderLight },
                ]}
              >
                <Image source={{ uri: item.image }} style={styles.productImg} />
                <View style={styles.productInfo}>
                  <Text style={[styles.productBrand, { color: theme.colors.primary }]} numberOfLines={1}>
                    {item.brand}
                  </Text>
                  <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.productMeta, { color: theme.colors.textSecondary }]}>
                    Size: {item.size || "M"}   ·   Qty: {item.quantity}
                  </Text>
                  <Text style={[styles.productPrice, { color: theme.colors.text }]}>
                    ₹{(item.discountedPrice || item.price).toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

            {/* Price Details */}
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.priceVal, { color: theme.colors.text }]}>
                  ₹{order.subtotal.toLocaleString("en-IN")}
                </Text>
              </View>

              {order.tax > 0 ? (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Tax & Service Fee (5%)</Text>
                  <Text style={[styles.priceVal, { color: theme.colors.text }]}>
                    ₹{order.tax.toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}

              {order.deliveryCharge > 0 ? (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
                  <Text style={[styles.priceVal, { color: theme.colors.text }]}>
                    ₹{order.deliveryCharge.toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Delivery Charges</Text>
                  <Text style={[styles.priceVal, { color: "#03a685", fontWeight: "600" }]}>FREE</Text>
                </View>
              )}

              <View style={[styles.priceRow, styles.finalPriceRow, { borderTopColor: theme.colors.borderLight }]}>
                <Text style={[styles.finalPriceLabel, { color: theme.colors.text }]}>Total Paid</Text>
                <Text style={[styles.finalPriceVal, { color: theme.colors.primary }]}>
                  ₹{order.total.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            {/* Delivery address */}
            {order.shippingAddress ? (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
                <View style={styles.addressSection}>
                  <View style={styles.addressHeader}>
                    <MapPin size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.addressTitle, { color: theme.colors.text }]}>Delivery Address</Text>
                  </View>
                  <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                    {order.shippingAddress}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Action Button: Open Receipt */}
        {order ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.9}
            onPress={() => setShowReceiptModal(true)}
          >
            <Receipt size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Download Receipt</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* ── Receipt modal (Print receipt and show) ── */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Receipt Preview</Text>
              <TouchableOpacity
                onPress={() => setShowReceiptModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.receiptScroll} showsVerticalScrollIndicator={false}>
              {/* Stylized Receipt Sheet */}
              <View style={[styles.receiptPaper, { shadowColor: theme.dark ? "#000" : "#444" }]}>
                {/* Jagged border mock at top */}
                <View style={styles.jaggedBorder} />

                {/* Receipt Header */}
                <View style={styles.receiptPaperHeader}>
                  <Text style={styles.receiptBrand}>Myntra</Text>
                  <Text style={styles.receiptSlogan}>Your style, delivered.</Text>
                  <View style={styles.receiptDivider} />
                </View>

                {/* Receipt Metadata */}
                <View style={styles.receiptMetaRow}>
                  <View>
                    <Text style={styles.receiptMetaLabel}>ORDER ID</Text>
                    <Text style={styles.receiptMetaVal}>{order?.orderId}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.receiptMetaLabel}>DATE</Text>
                    <Text style={styles.receiptMetaVal}>
                      {formattedOrderDate}
                    </Text>
                  </View>
                </View>

                <View style={[styles.receiptMetaRow, { marginTop: 12 }]}>
                  <View>
                    <Text style={styles.receiptMetaLabel}>PAYMENT MODE</Text>
                    <Text style={styles.receiptMetaVal}>{order?.paymentMode}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.receiptMetaLabel}>STATUS</Text>
                    <Text style={[styles.receiptMetaVal, { color: "#03a685", fontWeight: "bold" }]}>PAID</Text>
                  </View>
                </View>

                <View style={[styles.receiptDivider, { marginVertical: 16 }]} />

                {/* Items */}
                <Text style={styles.receiptSectionTitle}>ITEMS ORDERED</Text>
                {order?.items.map((item: any, idx: number) => (
                  <View key={`${item.productId || idx}-${idx}`} style={styles.receiptItemRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.receiptItemBrand}>{item.brand}</Text>
                      <Text style={styles.receiptItemName}>{item.name}</Text>
                      {item.size ? <Text style={styles.receiptItemSize}>Size: {item.size}</Text> : null}
                    </View>
                    <Text style={styles.receiptItemQty}>x{item.quantity}</Text>
                    <Text style={styles.receiptItemPrice}>
                      ₹{(item.discountedPrice || item.price).toLocaleString("en-IN")}
                    </Text>
                  </View>
                ))}

                <View style={[styles.receiptDivider, { marginVertical: 16 }]} />

                {/* Price list */}
                <View style={styles.receiptPriceSummary}>
                  <View style={styles.receiptPriceRow}>
                    <Text style={styles.receiptPriceLabel}>Subtotal</Text>
                    <Text style={styles.receiptPriceVal}>₹{order?.subtotal.toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.receiptPriceRow}>
                    <Text style={styles.receiptPriceLabel}>Tax & Service Fee (5%)</Text>
                    <Text style={styles.receiptPriceVal}>₹{order?.tax.toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.receiptPriceRow}>
                    <Text style={styles.receiptPriceLabel}>Delivery Charges</Text>
                    <Text style={styles.receiptPriceVal}>
                      {order && order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : "FREE"}
                    </Text>
                  </View>
                  <View style={[styles.receiptDivider, { marginVertical: 8 }]} />
                  <View style={[styles.receiptPriceRow, { marginTop: 4 }]}>
                    <Text style={styles.receiptPriceTotalLabel}>TOTAL PAID</Text>
                    <Text style={styles.receiptPriceTotalVal}>₹{order?.total.toLocaleString("en-IN")}</Text>
                  </View>
                </View>

                <View style={[styles.receiptDivider, { marginVertical: 16 }]} />

                {/* Barcode Mock */}
                <View style={styles.barcodeWrapper}>
                  <View style={styles.barcodeImage}>
                    {Array.from({ length: 30 }).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: (i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2),
                          backgroundColor: "#333333",
                          height: 40,
                          marginHorizontal: 1,
                        }}
                      />
                    ))}
                  </View>
                  <Text style={styles.barcodeText}>{order?._id}</Text>
                </View>

                {/* Receipt footer */}
                <Text style={styles.receiptFooterText}>
                  Thank you for shopping with Myntra!{"\n"}
                  This is a computer-generated receipt.
                </Text>

                {/* Jagged border mock at bottom */}
                <View style={[styles.jaggedBorder, { bottom: -10 }]} />
              </View>
            </ScrollView>

            {/* Bottom Actions for PDF and Image */}
            <View style={[styles.modalActionsBar, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: "#03a685" }]}
                activeOpacity={0.8}
                onPress={handleDownloadPdf}
              >
                <FileText size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
                onPress={handleDownloadImage}
              >
                <ImageIcon size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.downloadBtnText}>Download Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {},
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  actionBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  txCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  txAmountLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  txAmountVal: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 16,
  },
  infoGrid: {
    width: "100%",
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    maxWidth: "60%",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  productItemRow: {
    flexDirection: "row",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  productImg: {
    width: 60,
    height: 75,
    borderRadius: 10,
    resizeMode: "cover",
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: "800",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },
  productMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  priceSummary: {
    gap: 8,
    marginTop: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 13,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  finalPriceRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  finalPriceLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  finalPriceVal: {
    fontSize: 16,
    fontWeight: "900",
  },
  addressSection: {
    marginTop: 10,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Receipt Modal & Paper Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {},
  receiptScroll: {
    padding: 24,
    alignItems: "center",
  },
  receiptPaper: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 400,
    borderRadius: 8,
    padding: 24,
    position: "relative",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 20,
  },
  jaggedBorder: {
    position: "absolute",
    top: -10,
    left: 0,
    right: 0,
    height: 10,
    // Zigzag mock
    backgroundColor: "transparent",
  },
  receiptPaperHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  receiptBrand: {
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-condensed",
    fontSize: 32,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -1,
  },
  receiptSlogan: {
    fontSize: 12,
    color: "#777777",
    marginTop: 2,
  },
  receiptDivider: {
    height: 1.5,
    width: "100%",
    backgroundColor: "#E0E0E0",
    marginTop: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  receiptMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptMetaLabel: {
    fontSize: 10,
    color: "#999999",
    fontWeight: "800",
  },
  receiptMetaVal: {
    fontSize: 13,
    color: "#222222",
    fontWeight: "700",
    marginTop: 2,
  },
  receiptSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF3F6C",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  receiptItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  receiptItemBrand: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111111",
  },
  receiptItemName: {
    fontSize: 12,
    color: "#555555",
    marginTop: 1,
  },
  receiptItemSize: {
    fontSize: 10,
    color: "#999999",
    marginTop: 1,
  },
  receiptItemQty: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
    width: 30,
    textAlign: "center",
  },
  receiptItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    textAlign: "right",
    width: 80,
  },
  receiptPriceSummary: {
    gap: 8,
  },
  receiptPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptPriceLabel: {
    fontSize: 13,
    color: "#666666",
  },
  receiptPriceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222222",
  },
  receiptPriceTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF3F6C",
  },
  receiptPriceTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FF3F6C",
  },
  barcodeWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  barcodeImage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  barcodeText: {
    fontSize: 9,
    color: "#888888",
    letterSpacing: 1.5,
  },
  receiptFooterText: {
    fontSize: 11,
    color: "#999999",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
  modalActionsBar: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
    justifyContent: "space-between",
  },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
  },
  downloadBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
