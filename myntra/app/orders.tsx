import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  RotateCcw,
  ShoppingBag,
  ReceiptText,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchOrders, Order } from '@/utils/orderApi';

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; light: string; dark: string; textLight: string; textDark: string }> = {
  confirmed:  { label: 'Confirmed',  light: '#e6f4ff', dark: '#0a1e2e', textLight: '#1565c0', textDark: '#64b5f6' },
  processing: { label: 'Processing', light: '#fff8e1', dark: '#2a1f00', textLight: '#f57f17', textDark: '#ffcc02' },
  shipped:    { label: 'Shipped',    light: '#e8f5e9', dark: '#0a2010', textLight: '#2e7d32', textDark: '#66bb6a' },
  delivered:  { label: 'Delivered',  light: '#e8f5e9', dark: '#0a2010', textLight: '#1b5e20', textDark: '#43a047' },
  cancelled:  { label: 'Cancelled',  light: '#fce4ec', dark: '#2d0a10', textLight: '#c62828', textDark: '#ef9a9a' },
  refunded:   { label: 'Refunded',   light: '#ede7f6', dark: '#1a0a2e', textLight: '#4527a0', textDark: '#9575cd' },
  pending:    { label: 'Pending',    light: '#fff3e0', dark: '#2d1500', textLight: '#e65100', textDark: '#ffb74d' },
};

function StatusBadge({ status, theme }: { status: string; theme: any }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isDark = theme.dark;
  return (
    <View style={[styles.badge, { backgroundColor: isDark ? cfg.dark : cfg.light }]}>
      <Text style={[styles.badgeText, { color: isDark ? cfg.textDark : cfg.textLight }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard({ theme }: { theme: any }) {
  const bg = theme.dark ? '#2a2a2a' : '#e8e8e8';
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
      <View style={[styles.skRow, { backgroundColor: bg, height: 18, width: '60%', borderRadius: 6 }]} />
      <View style={[styles.skRow, { backgroundColor: bg, height: 14, width: '40%', borderRadius: 6, marginTop: 8 }]} />
      <View style={[styles.skRow, { backgroundColor: bg, height: 70, width: '100%', borderRadius: 10, marginTop: 12 }]} />
    </View>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────

function OrderCard({ order, theme, router }: { order: Order; theme: any; router: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
      {/* Header row */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.orderId, { color: theme.colors.text }]}>{order.orderId}</Text>
          <Text style={[styles.orderDate, { color: theme.colors.textMuted }]}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <StatusBadge status={order.status} theme={theme} />
          {expanded
            ? <ChevronUp size={18} color={theme.colors.textSecondary} />
            : <ChevronDown size={18} color={theme.colors.textSecondary} />}
        </View>
      </TouchableOpacity>

      {/* Items preview */}
      <View style={styles.itemsRow}>
        {order.items.slice(0, 3).map((item, i) => (
          <Image
            key={i}
            source={{ uri: item.image || '' }}
            style={[styles.itemThumb, { backgroundColor: theme.colors.inputBackground }]}
          />
        ))}
        {order.items.length > 3 && (
          <View style={[styles.moreItems, { backgroundColor: theme.colors.inputBackground }]}>
            <Text style={[styles.moreItemsText, { color: theme.colors.textSecondary }]}>
              +{order.items.length - 3}
            </Text>
          </View>
        )}
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: theme.colors.borderLight }]}>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemDetailRow, { borderBottomColor: theme.colors.borderLight }]}>
              <Image
                source={{ uri: item.image || '' }}
                style={[styles.itemDetailImg, { backgroundColor: theme.colors.inputBackground }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemBrand, { color: theme.colors.primary }]} numberOfLines={1}>{item.brand}</Text>
                <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={2}>{item.name}</Text>
                {item.size ? <Text style={[styles.itemMeta, { color: theme.colors.textMuted }]}>Size: {item.size}  ·  Qty: {item.quantity}</Text> : null}
                <Text style={[styles.itemPrice, { color: theme.colors.text }]}>
                  ₹{(item.discountedPrice || item.price).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.priceValue, { color: theme.colors.text }]}>₹{order.subtotal.toLocaleString('en-IN')}</Text>
            </View>
            {order.tax > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Tax</Text>
                <Text style={[styles.priceValue, { color: theme.colors.text }]}>₹{order.tax.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total Paid</Text>
              <Text style={[styles.totalValue, { color: theme.colors.primary }]}>₹{order.total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <View style={[styles.payModeBadge, { backgroundColor: theme.colors.subduedBrand || theme.colors.inputBackground }]}>
              <Text style={[styles.payModeText, { color: theme.colors.primary }]}>{order.paymentMode}</Text>
            </View>
            {order.transactionId && (
              <TouchableOpacity
                style={[styles.receiptBtn, { borderColor: theme.colors.primary }]}
                onPress={() => router.push(`/transaction-detail?id=${order.transactionId}`)}
              >
                <ReceiptText size={14} color={theme.colors.primary} />
                <Text style={[styles.receiptBtnText, { color: theme.colors.primary }]}>View Receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function Orders() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageNum = 1, append = false, refresh = false) => {
    if (!user) { setLoading(false); return; }
    if (!append && !refresh) setLoading(true);
    if (append) setLoadingMore(true);
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetchOrders(pageNum, 20);
      setOrders((prev) => append ? [...prev, ...res.data] : res.data);
      setHasNext(res.pagination.hasNextPage);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const handleRefresh = () => load(1, false, true);
  const handleLoadMore = () => { if (hasNext && !loadingMore) load(page + 1, true); };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Orders</Text>
      </View>

      {!user ? (
        <View style={styles.centered}>
          <ShoppingBag size={64} color={theme.colors.textMuted} strokeWidth={1.2} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Login to view orders</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.replace('/login' as any)}
          >
            <Text style={styles.retryBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.listPad}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} theme={theme} />)}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <XCircle size={56} color={theme.colors.error} strokeWidth={1.2} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Something went wrong</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => load(1)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o, index) => o._id || o.orderId || String(index)}
          contentContainerStyle={orders.length === 0 ? styles.centered : styles.listPad}
          renderItem={({ item }) => <OrderCard order={item} theme={theme} router={router} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Package size={72} color={theme.colors.textMuted} strokeWidth={1.2} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text, marginTop: 20 }]}>No orders yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Your orders will appear here after purchase.
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ margin: 20 }} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {},
  headerTitle: { fontSize: 20, fontWeight: '800' },
  listPad: { padding: 14, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  orderId: { fontSize: 14, fontWeight: '800' },
  orderDate: { fontSize: 12, marginTop: 3 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  itemsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  itemThumb: { width: 56, height: 70, borderRadius: 8, resizeMode: 'cover' },
  moreItems: { width: 56, height: 70, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  moreItemsText: { fontSize: 13, fontWeight: '700' },
  expandedSection: { borderTopWidth: 1, padding: 14 },
  itemDetailRow: { flexDirection: 'row', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
  itemDetailImg: { width: 60, height: 75, borderRadius: 10, resizeMode: 'cover' },
  itemBrand: { fontSize: 12, fontWeight: '800' },
  itemName: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  itemMeta: { fontSize: 11, marginTop: 3 },
  itemPrice: { fontSize: 13, fontWeight: '800', marginTop: 5 },
  priceSummary: { gap: 8, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 13 },
  priceValue: { fontSize: 13, fontWeight: '600' },
  totalRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalValue: { fontSize: 15, fontWeight: '900' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  payModeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payModeText: { fontSize: 12, fontWeight: '700' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  receiptBtnText: { fontSize: 12, fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  skRow: {},
});
