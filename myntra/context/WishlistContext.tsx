import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

export interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: string | number;
  discount: string;
  image: string;
}

type WishlistContextType = {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  isInWishlist: (itemId: string) => boolean;
  clearWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchWishlist = async () => {
        try {
          const apiBaseUrl = getApiBaseUrl();
          const userId = (user as any)._id || (user as any).id;
          const res = await axios.get(`${apiBaseUrl}/api/users/wishlist/${userId}`);
          
          if (Array.isArray(res.data)) {
            const mapped = res.data
              .filter((item: any) => item.productId)
              .map((item: any) => ({
                id: String(item.productId._id || item.productId.id || ''),
                name: item.productId.name,
                brand: item.productId.brand,
                price: item.productId.price,
                discount: item.productId.discount || '',
                image: item.productId.image || (item.productId.images && item.productId.images[0]) || '',
              }));
            setWishlist(mapped);
          }
        } catch (error) {
          console.error("Error fetching wishlist:", error);
        }
      };
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user, isAuthenticated]);

  const addToWishlist = async (item: WishlistItem) => {
    if (!isAuthenticated || !user) return;
    const itemId = String(item.id || (item as any)._id || '');
    const exists = wishlist.some((i) => String(i.id || (i as any)._id) === itemId);
    if (!exists) {
      // Optimistic update
      setWishlist((prev) => [...prev, { ...item, id: itemId }]);
      try {
        const apiBaseUrl = getApiBaseUrl();
        const userId = (user as any)._id || (user as any).id;
        await axios.post(`${apiBaseUrl}/api/users/wishlist/add`, {
          userId,
          productId: itemId,
        });
      } catch (error) {
        console.error("Error adding to wishlist:", error);
        // Revert on failure
        setWishlist((prev) => prev.filter((i) => String(i.id || (i as any)._id) !== itemId));
      }
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    if (!isAuthenticated || !user) return;
    const id = String(itemId);
    const itemToRemove = wishlist.find((i) => String(i.id || (i as any)._id) === id);
    // Optimistic update — remove immediately for instant UI feedback
    setWishlist((prev) => prev.filter((i) => String(i.id || (i as any)._id) !== id));
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = (user as any)._id || (user as any).id;
      await axios.delete(`${apiBaseUrl}/api/users/wishlist/remove`, {
        data: { userId, productId: id },
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      // Revert on failure
      if (itemToRemove) {
        setWishlist((prev) => [...prev, itemToRemove]);
      }
    }
  };

  const isInWishlist = (itemId: string) => {
    const id = String(itemId);
    return wishlist.some((i) => String(i.id || (i as any)._id) === id);
  };

  const clearWishlist = async () => {
    setWishlist([]);
    // The backend doesn't have a clear wishlist API currently, but typically not needed
    // except if we want a clear button.
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
