import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CART_STORAGE_KEY,
  addItemToCartList,
  calculateCartTotals,
  removeCartItem,
  updateCartItemQuantity,
} from '../services/cartService';
import type { CartItem, Product, ProductVariant } from '../types/commerce';

interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const totals = useMemo(() => calculateCartTotals(items), [items]);

  const addItem = (product: Product, variant: ProductVariant, quantity = 1) => {
    setItems((prev) => addItemToCartList(prev, product, variant, quantity));
    setIsDrawerOpen(true);
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    setItems((prev) => updateCartItemQuantity(prev, lineId, quantity));
  };

  const removeItem = (lineId: string) => {
    setItems((prev) => removeCartItem(prev, lineId));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal: totals.subtotal,
        totalItems: totals.totalItems,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser utilizado dentro de CartProvider');
  return ctx;
}
