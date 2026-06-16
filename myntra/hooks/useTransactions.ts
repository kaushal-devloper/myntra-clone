import { useState, useCallback, useRef, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  fetchTransactions,
  computeTransactionSummary,
  Transaction,
  TransactionSummary,
  FetchTransactionsParams,
  SortOption,
  fetchTransactionSummary,
  BackendSummary,
} from "@/utils/transactionApi";
import { getUserData } from "@/utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAGE_LIMIT = 15;
export const DEBOUNCE_MS = 400;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionsState {
  // Data
  transactions: Transaction[];
  summary: TransactionSummary | null;
  backendSummary: BackendSummary | null;
  // Pagination
  page: number;
  total: number;
  hasNextPage: boolean;
  // Loading states
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  // Error
  error: string | null;
  // Auth
  isAuthenticated: boolean;
  // Filters
  statusFilter: string;
  modeFilter: string;
  sortValue: SortOption;
  searchInput: string;
  searchQuery: string;
  showSortPicker: boolean;
  showModeFilter: boolean;
  // Setters / actions
  setStatusFilter: (v: string) => void;
  setModeFilter: (v: string) => void;
  setSortValue: (v: SortOption) => void;
  setSearchInput: (v: string) => void;
  setShowSortPicker: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowModeFilter: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  handleRetry: () => void;
  clearSearch: () => void;
  isFiltered: boolean;
}

// ─── Caching System ───────────────────────────────────────────────────────────

interface CacheEntry {
  transactions: Transaction[];
  total: number;
  hasNextPage: boolean;
  backendSummary: BackendSummary | null;
}

const transactionsCache: Record<string, CacheEntry> = {};

const getCacheKey = (status: string, mode: string, sort: string, search: string) => {
  return `${status}_${mode}_${sort}_${search}`;
};

export function clearTransactionsCache() {
  for (const key in transactionsCache) {
    delete transactionsCache[key];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactions(): TransactionsState {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [backendSummary, setBackendSummary] = useState<BackendSummary | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [sortValue, setSortValue] = useState<SortOption>("date_desc");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [showModeFilter, setShowModeFilter] = useState(false);

  // Debounce ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // ── Recalculate Client-side Summary on Transactions list change ───────────
  useEffect(() => {
    setSummary(computeTransactionSummary(transactions));
  }, [transactions]);

  // ── Core fetch function ────────────────────────────────────────────────────
  const loadTransactions = useCallback(
    async ({
      pageNum = 1,
      append = false,
      refresh = false,
    }: {
      pageNum?: number;
      append?: boolean;
      refresh?: boolean;
    } = {}) => {
      // Auth guard
      const { token } = await getUserData();
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      const cacheKey = getCacheKey(statusFilter, modeFilter, sortValue, searchQuery);

      // Check cache (SWR) for page 1 when not appending or refreshing
      if (pageNum === 1 && !append && !refresh) {
        const cached = transactionsCache[cacheKey];
        if (cached) {
          setTransactions(cached.transactions);
          setTotal(cached.total);
          setHasNextPage(cached.hasNextPage);
          setBackendSummary(cached.backendSummary);
          setLoading(false); // Skip skeleton layout loading state!
        } else {
          setLoading(true);
        }
      } else {
        if (append) setLoadingMore(true);
        if (refresh) setRefreshing(true);
      }
      setError(null);

      try {
        const params: FetchTransactionsParams = {
          page: pageNum,
          limit: PAGE_LIMIT,
          sort: sortValue,
          status: statusFilter,
          mode: modeFilter,
          search: searchQuery || undefined,
        };

        const [result, summaryResult] = await Promise.all([
          fetchTransactions(params),
          fetchTransactionSummary({
            status: statusFilter,
            mode: modeFilter,
            search: searchQuery || undefined
          })
        ]);
        const newData = result.data;

        setTransactions((prev) => {
          const updated = append ? [...prev, ...newData] : newData;
          // Cache the first page for fast subsequent loads
          if (pageNum === 1 && !append) {
            transactionsCache[cacheKey] = {
              transactions: newData,
              total: result.pagination.total,
              hasNextPage: result.pagination.hasNextPage,
              backendSummary: summaryResult.data,
            };
          }
          return updated;
        });

        setHasNextPage(result.pagination.hasNextPage);
        setTotal(result.pagination.total);
        setPage(pageNum);
        setBackendSummary(summaryResult.data);
      } catch (err: any) {
        const msg: string = err?.message || "Failed to load transactions.";
        if (msg.includes("Session expired") || msg.includes("Not authenticated")) {
          setIsAuthenticated(false);
        }
        // Only set error if we don't have any cached transactions on page 1
        if (pageNum === 1 && !append && !transactionsCache[cacheKey]) {
          setError(msg);
        } else if (pageNum > 1 || append || refresh) {
          // Show error as console or alert instead of breaking list, but let's keep it simple
          setError(msg);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, modeFilter, sortValue, searchQuery]
  );

  // ── Reload on screen focus + filter changes ────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadTransactions({ pageNum: 1 });
      // Close any open pickers on re-focus
      setShowSortPicker(false);
      setShowModeFilter(false);
    }, [loadTransactions])
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    loadTransactions({ pageNum: 1, refresh: true });
  }, [loadTransactions]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading) {
      loadTransactions({ pageNum: page + 1, append: true });
    }
  }, [hasNextPage, loadingMore, loading, page, loadTransactions]);

  const handleRetry = useCallback(() => {
    loadTransactions({ pageNum: 1 });
  }, [loadTransactions]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
  }, []);

  const isFiltered = statusFilter !== "all" || modeFilter !== "all" || !!searchQuery;

  return {
    transactions,
    summary,
    backendSummary,
    page,
    total,
    hasNextPage,
    loading,
    refreshing,
    loadingMore,
    error,
    isAuthenticated,
    statusFilter,
    modeFilter,
    sortValue,
    searchInput,
    searchQuery,
    showSortPicker,
    showModeFilter,
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
  };
}
