import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./AuthContext";

export interface WishlistItem {
  id: number;
  name: string;
  brand: string;
  price: string;
  discount: string;
  image: string;
}

type WishlistContextType = {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (itemId: number) => Promise<void>;
  isInWishlist: (itemId: number) => boolean;
  clearWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const canUseSecureStore =
  typeof SecureStore?.getItemAsync === "function" &&
  typeof SecureStore?.setItemAsync === "function" &&
  typeof SecureStore?.deleteItemAsync === "function";

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Load wishlist when user changes or logs in
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      (async () => {
        try {
          if (canUseSecureStore) {
            const stored = await SecureStore.getItemAsync(`wishlist_${user._id}`);
            if (stored) {
              setWishlist(JSON.parse(stored));
            } else {
              setWishlist([]);
            }
          }
        } catch (e) {
          console.error("Error loading wishlist from SecureStore:", e);
          setWishlist([]);
        }
      })();
    } else {
      setWishlist([]);
    }
  }, [user, isAuthenticated]);

  const saveWishlist = async (items: WishlistItem[]) => {
    setWishlist(items);
    if (isAuthenticated && user?._id && canUseSecureStore) {
      try {
        await SecureStore.setItemAsync(`wishlist_${user._id}`, JSON.stringify(items));
      } catch (e) {
        console.error("Error saving wishlist to SecureStore:", e);
      }
    }
  };

  const addToWishlist = async (item: WishlistItem) => {
    if (!isAuthenticated) return;
    const exists = wishlist.some((i) => i.id === item.id);
    if (!exists) {
      const updated = [...wishlist, item];
      await saveWishlist(updated);
    }
  };

  const removeFromWishlist = async (itemId: number) => {
    if (!isAuthenticated) return;
    const updated = wishlist.filter((i) => i.id !== itemId);
    await saveWishlist(updated);
  };

  const isInWishlist = (itemId: number) => {
    return wishlist.some((i) => i.id === itemId);
  };

  const clearWishlist = async () => {
    await saveWishlist([]);
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
