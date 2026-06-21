import React, { useRef, useMemo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Receipt,
  ReceiptText,
  Search,
  X,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Wallet,
  Globe,
  Banknote,
  TrendingUp,
  SlidersHorizontal,
  IndianRupee,
  Download,
} from "lucide-react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { Transaction, generateTransactionExport } from "@/utils/transactionApi";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";
import { useTransactions, PAGE_LIMIT } from "@/hooks/useTransactions";
import { getUserData } from "@/utils/storage";
import { downloadFile } from "../utils/downloader";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "✓ Success", value: "success" },
  { label: "⏳ Pending", value: "pending" },
  { label: "✗ Failed", value: "failed" },
  { label: "↩ Refunded", value: "refunded" },
] as const;

const MODE_FILTERS = [
  { label: "All Modes", value: "all" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "Card" },
  { label: "Wallet", value: "Wallet" },
  { label: "Net Banking", value: "NetBanking" },
  { label: "COD", value: "COD" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest First", value: "date_desc" },
  { label: "Oldest First", value: "date_asc" },
  { label: "Amount ↑", value: "amount_asc" },
  { label: "Amount ↓", value: "amount_desc" },
] as const;

type SortValue = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = "INR") {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PaymentModeIcon({
  mode,
  color,
}: {
  mode: Transaction["paymentMode"];
  color: string;
}) {
  const size = 18;
  switch (mode) {
    case "UPI":
      return <Smartphone size={size} color={color} />;
    case "Card":
      return <CreditCard size={size} color={color} />;
    case "Wallet":
      return <Wallet size={size} color={color} />;
    case "NetBanking":
      return <Globe size={size} color={color} />;
    case "COD":
      return <Banknote size={size} color={color} />;
    default:
      return <ShoppingBag size={size} color={color} />;
  }
}

function StatusChip({
  status,
  theme,
}: {
  status: Transaction["paymentStatus"];
  theme: any;
}) {
  const config = {
    success: {
      bg: "#e6f9f0",
      text: "#0a7a4c",
      darkBg: "#0a2e1e",
      darkText: "#34d399",
      icon: <CheckCircle2 size={13} color={theme.dark ? "#34d399" : "#0a7a4c"} />,
      label: "Success",
    },
    pending: {
      bg: "#fff7e6",
      text: "#b45309",
      darkBg: "#2d1f00",
      darkText: "#fbbf24",
      icon: <Clock size={13} color={theme.dark ? "#fbbf24" : "#b45309"} />,
      label: "Pending",
    },
    failed: {
      bg: "#fee2e2",
      text: "#b91c1c",
      darkBg: "#2d0909",
      darkText: "#f87171",
      icon: <XCircle size={13} color={theme.dark ? "#f87171" : "#b91c1c"} />,
      label: "Failed",
    },
    refunded: {
      bg: "#ede9fe",
      text: "#5b21b6",
      darkBg: "#1a0d3a",
      darkText: "#a78bfa",
      icon: <RefreshCw size={13} color={theme.dark ? "#a78bfa" : "#5b21b6"} />,
      label: "Refunded",
    },
  };
  const c = config[status] || config.pending;
  const isDark = theme.dark;

  return (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: isDark ? c.darkBg : c.bg },
      ]}
    >
      {c.icon}
      <Text
        style={[
          styles.statusChipText,
          { color: isDark ? c.darkText : c.text },
        ]}
      >
        {c.label}
      </Text>
    </View>
  );
}

function TransactionCard({
  item,
  theme,
}: {
  item: Transaction;
  theme: any;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          shadowColor: theme.dark ? "#000" : "#888",
        },
      ]}
      onPress={() => {
        router.push({
          pathname: "/transaction-detail",
          params: { id: item._id },
        });
      }}
    >
      {/* Top Row */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardLeft}>
          {/* Mode badge */}
          <View
            style={[
              styles.modeBadge,
              { backgroundColor: theme.colors.subduedBrand || theme.colors.inputBackground },
            ]}
          >
            <PaymentModeIcon mode={item.paymentMode} color={theme.colors.primary} />
            <Text style={[styles.modeText, { color: theme.colors.primary }]}>
              {item.paymentMode}
            </Text>
          </View>

          {/* Description */}
          {!!item.description && (
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              {
                color:
                  item.paymentStatus === "failed"
                    ? theme.colors.error
                    : item.paymentStatus === "refunded"
                      ? theme.colors.textSecondary
                      : theme.colors.text,
              },
            ]}
          >
            {item.paymentStatus === "refunded" ? "+" : ""}
            {formatAmount(item.amount)}
          </Text>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={styles.cardBottomRow}>
        <StatusChip status={item.paymentStatus} theme={theme} />

        <View style={styles.dateTimeContainer}>
          <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
            {formatDate(item.createdAt)}
          </Text>
          <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Receipt Button */}
        <View
          style={[
            styles.receiptButton,
            { borderColor: theme.colors.primary },
          ]}
        >
          <ReceiptText size={14} color={theme.colors.primary} />
          <Text style={[styles.receiptText, { color: theme.colors.primary }]}>
            Details
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard({ theme }: { theme: any }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const skBg = theme.dark ? "#2a2a2a" : "#e8e8e8";
  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderLight,
          opacity,
        },
      ]}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[styles.skeletonLine, { width: 90, height: 28, backgroundColor: skBg }]}
        />
        <View
          style={[styles.skeletonLine, { width: 70, height: 22, backgroundColor: skBg }]}
        />
      </View>
      <View style={[styles.cardBottomRow, { marginTop: 12 }]}>
        <View
          style={[styles.skeletonLine, { width: 70, height: 24, backgroundColor: skBg }]}
        />
        <View
          style={[styles.skeletonLine, { width: 100, height: 16, backgroundColor: skBg }]}
        />
        <View
          style={[styles.skeletonLine, { width: 60, height: 24, backgroundColor: skBg }]}
        />
      </View>
    </Animated.View>
  );
}

function EmptyState({ theme, filtered }: { theme: any; filtered: boolean }) {
  return (
    <View style={styles.emptyContainer}>
      <Receipt size={72} color={theme.colors.textMuted} strokeWidth={1.2} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {filtered ? "No transactions found" : "No transactions yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {filtered
          ? "Try changing your filters or search query."
          : "Your transaction history will appear here once you make a purchase."}
      </Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
  theme,
}: {
  message: string;
  onRetry: () => void;
  theme: any;
}) {
  return (
    <View style={styles.emptyContainer}>
      <XCircle size={72} color={theme.colors.error} strokeWidth={1.2} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        onPress={onRetry}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────

function SummaryBar({ total, theme }: { total: number; theme: any }) {
  if (total === 0) return null;
  return (
    <View style={[styles.summaryBar, { backgroundColor: theme.colors.subduedBrand || (theme.dark ? "#3a1520" : "#fff0f3"), borderColor: theme.colors.borderLight }]}>
      <TrendingUp size={14} color={theme.colors.primary} />
      <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
        {total} transaction{total !== 1 ? "s" : ""} found
      </Text>
    </View>
  );
}

// ─── Auth Guard Screen ────────────────────────────────────────────────────────

function NotAuthenticatedScreen({ theme, onLogin }: { theme: any; onLogin: () => void }) {
  return (
    <View style={[styles.emptyContainer, { paddingTop: 120 }]}>
      <IndianRupee size={64} color={theme.colors.textMuted} strokeWidth={1.2} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Login Required</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Please log in to view your transaction history.
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        onPress={onLogin}
      >
        <Text style={styles.retryButtonText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MIME and UTI Helpers for Export ──────────────────────────────────────────

function getMimeType(format: "pdf" | "csv" | "xlsx") {
  switch (format) {
    case "pdf": return "application/pdf";
    case "csv": return "text/csv";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
}

// ─── Analytics Cards Component ───────────────────────────────────────────────

function AnalyticsCards({ summary, theme }: { summary: any; theme: any }) {
  const isDark = theme.dark;

  const cards = [
    {
      title: "Total Spent",
      value: formatAmount(summary?.totalSpent ?? 0),
      subtitle: "Successful payments",
      icon: <IndianRupee size={16} color={theme.colors.primary} />,
      bg: isDark ? "#2c161b" : "#fff0f3",
      border: isDark ? "#4a1c25" : "#ffd1dc"
    },
    {
      title: "Transactions",
      value: String(summary?.totalTransactions ?? 0),
      subtitle: "Total records generated",
      icon: <ReceiptText size={16} color="#3182ce" />,
      bg: isDark ? "#12233c" : "#ebf8ff",
      border: isDark ? "#1d365d" : "#bee3f8"
    },
    {
      title: "Successful",
      value: String(summary?.successful ?? 0),
      subtitle: "Completed payments",
      icon: <CheckCircle2 size={16} color="#38a169" />,
      bg: isDark ? "#112a1f" : "#f0fff4",
      border: isDark ? "#1c4532" : "#c6f6d5"
    },
    {
      title: "Failed / Refund / Pending",
      value: String((summary?.failed ?? 0) + (summary?.refunded ?? 0) + (summary?.pending ?? 0)),
      subtitle: "Unsuccessful payments",
      icon: <XCircle size={16} color="#e53e3e" />,
      bg: isDark ? "#321616" : "#fff5f5",
      border: isDark ? "#522222" : "#fed7d7"
    }
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.analyticsContainer}
      contentContainerStyle={styles.analyticsContent}
    >
      {cards.map((c, i) => (
        <View
          key={i}
          style={[
            styles.analyticsCard,
            {
              backgroundColor: c.bg,
              borderColor: c.border,
            }
          ]}
        >
          <View style={styles.analyticsCardHeader}>
            <Text style={[styles.analyticsCardTitle, { color: theme.colors.textSecondary }]}>{c.title}</Text>
            {c.icon}
          </View>
          <Text style={[styles.analyticsCardValue, { color: theme.colors.text }]}>{c.value}</Text>
          <Text style={[styles.analyticsCardSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const {
    transactions,
    total,
    loading,
    refreshing,
    loadingMore,
    error,
    isAuthenticated,
    hasNextPage,
    statusFilter,
    modeFilter,
    sortValue,
    searchInput,
    searchQuery,
    showSortPicker,
    showModeFilter,
    backendSummary,
    setStatusFilter,
    setModeFilter,
    setSortValue,
    setSearchInput,
    setShowSortPicker,
    setShowModeFilter,
    handleRefresh,
    handleLoadMore,
    handleRetry,
    clearSearch,
    isFiltered,
  } = useTransactions();

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const handleExport = async (format: "pdf" | "csv" | "xlsx") => {
    setExporting(true);
    setExportError(null);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();

      if (dateRangeOption === "7_days") {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        startDate = d.toISOString().split("T")[0];
      } else if (dateRangeOption === "30_days") {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        startDate = d.toISOString().split("T")[0];
      } else if (dateRangeOption === "this_month") {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = d.toISOString().split("T")[0];
      } else if (dateRangeOption === "custom") {
        if (!customStartDate || !customEndDate) {
          throw new Error("Please fill in both start date and end date.");
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(customStartDate) || !dateRegex.test(customEndDate)) {
          throw new Error("Date format must be YYYY-MM-DD.");
        }
        startDate = customStartDate;
        endDate = customEndDate;
      }

      // Generate report on backend
      const res = await generateTransactionExport({
        format,
        status: statusFilter,
        mode: modeFilter,
        sort: sortValue,
        search: searchQuery || undefined,
        startDate,
        endDate,
      });

      if (!res.success || !res.downloadUrl) {
        throw new Error(res.message || "Failed to generate report.");
      }

      const apiBaseUrl = getApiBaseUrl();
      const { token } = await getUserData();
      const downloadUri = `${apiBaseUrl}${res.downloadUrl}${res.downloadUrl.includes("?") ? "&" : "?"}token=${token}`;

      await downloadFile(downloadUri, res.filename, token, getMimeType(format));

      setShowExportModal(false);
    } catch (err: any) {
      setExportError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const keyExtractor = useCallback((item: Transaction, index: number) => item._id || (item as any).id || `tx-${index}`, []);

  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Transactions</Text>
          </View>
        </View>
        <NotAuthenticatedScreen theme={theme} onLogin={() => router.replace("/login" as any)} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            My Transactions
          </Text>
          {total > 0 && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {total} record{total !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: showModeFilter ? theme.colors.primary : theme.colors.inputBackground, marginRight: 8 }]}
          onPress={() => { setShowModeFilter((v) => !v); setShowSortPicker(false); }}
        >
          <SlidersHorizontal size={16} color={showModeFilter ? "#fff" : theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.colors.inputBackground }]}
          onPress={() => { setShowExportModal(true); setExportError(null); }}
        >
          <Download size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight },
        ]}
      >
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: theme.colors.inputBackground },
          ]}
        >
          <Search size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
          />
          {!!searchInput && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort toggle */}
        <TouchableOpacity
          style={[
            styles.sortButton,
            {
              backgroundColor: showSortPicker
                ? theme.colors.primary
                : theme.colors.inputBackground,
            },
          ]}
          onPress={() => { setShowSortPicker((v) => !v); setShowModeFilter(false); }}
        >
          <ArrowUpDown
            size={16}
            color={showSortPicker ? "#fff" : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Mode Filter Row ── */}
      {showModeFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.modeFilterRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight }]}
          contentContainerStyle={styles.modeFilterContent}
        >
          {MODE_FILTERS.map((f) => {
            const active = modeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, { backgroundColor: active ? theme.colors.primary : theme.colors.inputBackground, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setModeFilter(f.value)}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : theme.colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Sort Picker (inline dropdown) ── */}
      {showSortPicker && (
        <View
          style={[
            styles.sortPicker,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.dark ? "#000" : "#888",
            },
          ]}
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.sortOption,
                {
                  backgroundColor:
                    sortValue === opt.value ? theme.colors.subduedBrand || "#ffeef2" : "transparent",
                },
              ]}
              onPress={() => {
                setSortValue(opt.value as SortValue);
                setShowSortPicker(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  {
                    color:
                      sortValue === opt.value
                        ? theme.colors.primary
                        : theme.colors.text,
                    fontWeight: sortValue === opt.value ? "700" : "400",
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Status Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.borderLight }]}
        contentContainerStyle={styles.filterRowContent}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, { backgroundColor: active ? theme.colors.primary : theme.colors.inputBackground, borderColor: active ? theme.colors.primary : theme.colors.border }]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.filterChipText, { color: active ? "#fff" : theme.colors.textSecondary }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Summary Bar ── */}
      {!loading && total > 0 && <SummaryBar total={total} theme={theme} />}

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={styles.listContent}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} theme={theme} />
          ))}
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={handleRetry} theme={theme} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={keyExtractor}
          contentContainerStyle={transactions.length === 0 ? styles.flatListEmpty : styles.listContent}
          ListHeaderComponent={
            total > 0 && backendSummary ? (
              <AnalyticsCards summary={backendSummary} theme={theme} />
            ) : null
          }
          renderItem={({ item }) => <TransactionCard item={item} theme={theme} />}
          ListEmptyComponent={<EmptyState theme={theme} filtered={isFiltered} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={PAGE_LIMIT}
        />
      )}

      {/* ── Export Modal ── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Title */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Export Transactions</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Date Range Selection */}
            <Text style={[styles.modalSubtitle, { color: theme.colors.text }]}>Date Range</Text>
            <View style={styles.optionRow}>
              {[
                { label: "All Time", value: "all" },
                { label: "Last 7 Days", value: "7_days" },
                { label: "Last 30 Days", value: "30_days" },
                { label: "This Month", value: "this_month" },
                { label: "Custom", value: "custom" }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: dateRangeOption === opt.value ? theme.colors.primary : theme.colors.inputBackground,
                      borderColor: dateRangeOption === opt.value ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => setDateRangeOption(opt.value)}
                >
                  <Text style={[styles.optionChipText, { color: dateRangeOption === opt.value ? "#fff" : theme.colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Date Inputs if Custom selected */}
            {dateRangeOption === "custom" && (
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputWrapper}>
                  <Text style={[styles.dateInputLabel, { color: theme.colors.textSecondary }]}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                    placeholder="e.g. 2026-06-01"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={[styles.dateInputLabel, { color: theme.colors.textSecondary }]}>End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                    placeholder="e.g. 2026-06-15"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                  />
                </View>
              </View>
            )}

            {/* Format Selection */}
            <Text style={[styles.modalSubtitle, { color: theme.colors.text, marginTop: 20 }]}>Select Format</Text>

            {exportError && (
              <Text style={[styles.exportErrorText, { color: theme.colors.error }]}>{exportError}</Text>
            )}

            <View style={styles.formatButtonsContainer}>
              {[
                { format: "pdf", label: "PDF Report", desc: "Detailed formatted PDF", color: "#E03E2D" },
                { format: "csv", label: "CSV Sheet", desc: "Standard comma separated sheet", color: "#1D6F42" },
                { format: "xlsx", label: "Excel Sheet", desc: "Full Excel spreadsheet", color: "#107C41" }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.format}
                  disabled={exporting}
                  style={[
                    styles.formatButton,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => handleExport(opt.format as "pdf" | "csv" | "xlsx")}
                >
                  <View style={[styles.formatIconCircle, { backgroundColor: opt.color + "15" }]}>
                    <Download size={20} color={opt.color} />
                  </View>
                  <View style={styles.formatButtonTextContainer}>
                    <Text style={[styles.formatButtonLabel, { color: theme.colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.formatButtonDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {exporting && (
              <View style={styles.exportLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.exportLoadingText, { color: theme.colors.textSecondary }]}>Generating export, please wait...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sortPicker: {
    position: "absolute",
    top: Platform.OS === "ios" ? 170 : 164,
    right: 16,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: {
    fontSize: 14,
  },
  modeFilterRow: {
    borderBottomWidth: 1,
    maxHeight: 52,
  },
  modeFilterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  filterRow: {
    borderBottomWidth: 1,
    maxHeight: 52,
  },
  filterRowContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  flatListEmpty: {
    flex: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
    marginRight: 10,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  modeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateTimeContainer: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  timeText: {
    fontSize: 11,
    marginTop: 1,
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  receiptText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noReceiptPlaceholder: {
    width: 70,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  skeletonLine: {
    borderRadius: 6,
  },
  // Analytics Cards Styles
  analyticsContainer: {
    marginBottom: 14,
    maxHeight: 110,
  },
  analyticsContent: {
    paddingHorizontal: 4,
    gap: 10,
    flexDirection: "row",
  },
  analyticsCard: {
    width: 145,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  analyticsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  analyticsCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  analyticsCardValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  analyticsCardSubtitle: {
    fontSize: 10,
  },

  // Export Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  customDateContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 10,
    marginBottom: 4,
    fontWeight: "500",
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  formatButtonsContainer: {
    gap: 8,
    marginTop: 8,
  },
  formatButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  formatIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  formatButtonTextContainer: {
    flex: 1,
  },
  formatButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  formatButtonDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  exportLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  exportLoadingText: {
    fontSize: 12,
  },
  exportErrorText: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "500",
  },
});
