import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addItemToCartList,
  calculateCartTotals,
  clampQuantityToStock,
  clearStoredCart,
  findMissingGuestItemsForCart,
  loadStoredCart,
  removeCartItem,
  saveStoredCart,
  updateCartItemQuantity,
} from '../services/cartService';
import {
  defaultWixCartAdapter,
  mapWixCartErrorMessage,
  mapWixCartToCartItems,
} from '../services/wix/wixCartAdapter';
import {
  verifyWixCheckoutReturn,
  type CheckoutReturnResult,
} from '../services/wix/wixCheckoutService';
import {
  trackAdAddToCart,
  trackVerifiedAdPurchase,
} from '../services/analytics/adTrackingService';
import type { CartItem, Product, ProductVariant } from '../types/commerce';
import { useAuth } from './AuthContext';
import { usePersonalization } from './PersonalizationContext';

interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  syncing: boolean;
  cartError: string | null;
  checkoutReturnNotice: CheckoutReturnResult | null;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCartError: () => void;
  clearCheckoutReturnNotice: () => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  syncWithWix: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function cleanCheckoutReturnParamsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ['checkout', 'orderId', 'checkoutId']) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // ignore URL rewrite errors
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, authEpoch } = useAuth();
  const { recordBehaviorEvent } = usePersonalization();
  const [items, setItems] = useState<CartItem[]>(() => loadStoredCart());
  const [wixSubtotal, setWixSubtotal] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [checkoutReturnNotice, setCheckoutReturnNotice] =
    useState<CheckoutReturnResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  const knownProductsRef = useRef<Map<string, Product>>(new Map());
  const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);
  const initialSyncedRef = useRef(false);
  const lastAuthEpochRef = useRef<number>(authEpoch);
  const pendingMutationsRef = useRef(0);

  const beginMutation = useCallback(() => {
    pendingMutationsRef.current += 1;
    setSyncing(true);
  }, []);

  const endMutation = useCallback(() => {
    pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    if (pendingMutationsRef.current === 0) {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    saveStoredCart(items);
  }, [items]);

  const applyWixCartState = useCallback(
    (
      wixCart: Awaited<ReturnType<typeof defaultWixCartAdapter.getCurrentCartSafe>>,
      previousSnapshot?: CartItem[]
    ) => {
      const mapped = mapWixCartToCartItems(wixCart, {
        catalogProducts: Array.from(knownProductsRef.current.values()),
        previousItems: previousSnapshot ?? itemsRef.current,
      });
      setItems(mapped);
      setWixSubtotal(null);
      return mapped;
    },
    []
  );

  const syncWithWix = useCallback(async () => {
    beginMutation();
    try {
      const mapped = await defaultWixCartAdapter.enqueue(async () => {
        const activeCart = await defaultWixCartAdapter.getCurrentCartSafe();
        const currentSnapshot = itemsRef.current;

        if (activeCart?.lineItems && activeCart.lineItems.length > 0) {
          return applyWixCartState(activeCart, currentSnapshot);
        }

        // Migra apenas itens locais que nunca foram sincronizados na Wix
        const unsyncedLocalItems = currentSnapshot.filter(
          (entry) => !entry.wixLineItemId
        );
        if (unsyncedLocalItems.length > 0) {
          const updatedCart = await defaultWixCartAdapter.addItems(
            unsyncedLocalItems.map((entry) => ({
              productId: entry.productId,
              variantId: entry.variantId,
              choices: entry.choices,
              manageVariants: entry.manageVariants,
              quantity: entry.quantity,
            }))
          );
          return applyWixCartState(updatedCart, currentSnapshot);
        }

        setItems([]);
        setWixSubtotal(null);
        return [];
      });

      if (mapped.length > 0) {
        const estimate = await defaultWixCartAdapter.estimateTotalsSafe();
        if (estimate && Number.isFinite(estimate.subtotalAmount)) {
          setWixSubtotal(estimate.subtotalAmount);
        }
      }
    } catch (error) {
      setCartError(mapWixCartErrorMessage(error));
    } finally {
      endMutation();
    }
  }, [applyWixCartState, beginMutation, endMutation]);

  // Hidratação inicial do carrinho + verificação de retorno do checkout após auth pronta
  useEffect(() => {
    if (authLoading || initialSyncedRef.current) return;
    initialSyncedRef.current = true;
    wasAuthenticatedRef.current = isAuthenticated;
    lastAuthEpochRef.current = authEpoch;

    (async () => {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (search) {
        try {
          const returnCheck = await defaultWixCartAdapter.enqueue(() =>
            verifyWixCheckoutReturn(search, {
              getCart: () => defaultWixCartAdapter.getCurrentCartSafe(),
            })
          );
          if (returnCheck.handled) {
            setCheckoutReturnNotice(returnCheck);
            if (returnCheck.status === 'order-recorded') {
              const params = new URLSearchParams(search);
              const orderRef = params.get('orderId') || params.get('checkoutId') || undefined;
              const { snapshot } = trackVerifiedAdPurchase(orderRef);
              if (snapshot) {
                for (const item of snapshot.items) {
                  recordBehaviorEvent('purchase_verified', {
                    product: {
                      id: item.productId,
                      categoryId: '',
                      collectionSlugs: [],
                    } as unknown as Product,
                  });
                }
              }
            }
            if (returnCheck.clearLocalCart) {
              clearStoredCart();
              setItems([]);
              setWixSubtotal(null);
            }
            cleanCheckoutReturnParamsFromUrl();
          }
        } catch {
          // Segue para sincronização padrão caso a verificação falhe
        }
      }
      await syncWithWix();
    })();
  }, [authEpoch, authLoading, isAuthenticated, syncWithWix]);

  // Reconciliação em transições de login / logout
  useEffect(() => {
    if (authLoading || !initialSyncedRef.current) return;
    if (authEpoch === lastAuthEpochRef.current) return;

    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    lastAuthEpochRef.current = authEpoch;

    if (wasAuthenticated && !isAuthenticated) {
      // Logout: limpa imediatamente o espelho local para não vazar itens do membro anterior
      clearStoredCart();
      setItems([]);
      setWixSubtotal(null);
      setCartError(null);
      void syncWithWix();
      return;
    }

    if (!wasAuthenticated && isAuthenticated) {
      // Login: preserva itens adicionados como visitante sem duplicar os do membro
      const guestSnapshot = itemsRef.current;
      beginMutation();
      (async () => {
        try {
          await defaultWixCartAdapter.enqueue(async () => {
            const memberCart = await defaultWixCartAdapter.getCurrentCartSafe();
            const currentMemberItems = mapWixCartToCartItems(memberCart, {
              catalogProducts: Array.from(knownProductsRef.current.values()),
              previousItems: guestSnapshot,
            });
            const missingGuestItems = findMissingGuestItemsForCart(
              guestSnapshot,
              currentMemberItems
            );
            if (missingGuestItems.length > 0) {
              const mergedCart = await defaultWixCartAdapter.addItems(
                missingGuestItems.map((entry) => ({
                  productId: entry.productId,
                  variantId: entry.variantId,
                  choices: entry.choices,
                  manageVariants: entry.manageVariants,
                  quantity: entry.quantity,
                }))
              );
              applyWixCartState(mergedCart, [...currentMemberItems, ...guestSnapshot]);
            } else {
              setItems(currentMemberItems);
              setWixSubtotal(null);
            }
          });
        } catch (error) {
          setCartError(mapWixCartErrorMessage(error));
        } finally {
          endMutation();
        }
      })();
    }
  }, [
    applyWixCartState,
    authEpoch,
    authLoading,
    beginMutation,
    endMutation,
    isAuthenticated,
    syncWithWix,
  ]);

  const totals = useMemo(() => calculateCartTotals(items), [items]);
  const subtotal = wixSubtotal !== null && items.length > 0 ? wixSubtotal : totals.subtotal;

  const addItem = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      if (!variant.inStock) {
        setCartError('Esta combinação está esgotada no momento.');
        setIsDrawerOpen(true);
        return;
      }

      knownProductsRef.current.set(product.id, product);
      setCartError(null);
      setWixSubtotal(null);
      setItems((prev) => addItemToCartList(prev, product, variant, quantity));
      setIsDrawerOpen(true);

      const safeQty = clampQuantityToStock(
        quantity,
        variant.trackQuantity ? variant.stockCount : undefined
      );

      recordBehaviorEvent('add_to_cart', { product });
      trackAdAddToCart(product, variant, safeQty);

      beginMutation();
      void defaultWixCartAdapter
        .enqueue(async () => {
          const updatedCart = await defaultWixCartAdapter.addItems([
            {
              productId: product.id,
              variantId: variant.id,
              choices: variant.choices,
              manageVariants: product.manageVariants,
              quantity: safeQty,
            },
          ]);
          applyWixCartState(updatedCart);
        })
        .catch(async (error) => {
          setCartError(mapWixCartErrorMessage(error));
          try {
            const recovered = await defaultWixCartAdapter.getCurrentCartSafe();
            applyWixCartState(recovered);
          } catch {
            // Mantém estado seguro em memória caso falhe a recuperação
          }
        })
        .finally(() => {
          endMutation();
        });
    },
    [applyWixCartState, beginMutation, endMutation, recordBehaviorEvent]
  );

  const removeItem = useCallback(
    (lineId: string) => {
      const target = itemsRef.current.find((item) => item.lineId === lineId);
      setCartError(null);
      setWixSubtotal(null);
      setItems((prev) => removeCartItem(prev, lineId));

      if (!target?.wixLineItemId) return;
      const wixLineId = target.wixLineItemId;

      beginMutation();
      void defaultWixCartAdapter
        .enqueue(async () => {
          const updatedCart = await defaultWixCartAdapter.removeLineItems([wixLineId]);
          applyWixCartState(updatedCart);
        })
        .catch(async (error) => {
          setCartError(mapWixCartErrorMessage(error));
          try {
            const recovered = await defaultWixCartAdapter.getCurrentCartSafe();
            applyWixCartState(recovered);
          } catch {
            // ignore recovery error
          }
        })
        .finally(() => {
          endMutation();
        });
    },
    [applyWixCartState, beginMutation, endMutation]
  );

  const updateQuantity = useCallback(
    (lineId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(lineId);
        return;
      }

      const target = itemsRef.current.find((item) => item.lineId === lineId);
      if (!target) return;

      const safeQty = clampQuantityToStock(quantity, target.stockCount);
      setCartError(null);
      setWixSubtotal(null);
      setItems((prev) => updateCartItemQuantity(prev, lineId, safeQty));

      if (!target.wixLineItemId) return;
      const wixLineId = target.wixLineItemId;

      beginMutation();
      void defaultWixCartAdapter
        .enqueue(async () => {
          const updatedCart = await defaultWixCartAdapter.updateLineItemQuantity(
            wixLineId,
            safeQty
          );
          const mapped = applyWixCartState(updatedCart);
          const updatedLine = mapped.find(
            (entry) => entry.wixLineItemId === wixLineId || entry.lineId === lineId
          );
          if (updatedLine && updatedLine.quantity < safeQty) {
            setCartError(
              `Quantidade ajustada para ${updatedLine.quantity} unidade(s) conforme estoque disponível.`
            );
          }
        })
        .catch(async (error) => {
          setCartError(mapWixCartErrorMessage(error));
          try {
            const recovered = await defaultWixCartAdapter.getCurrentCartSafe();
            applyWixCartState(recovered);
          } catch {
            // ignore recovery error
          }
        })
        .finally(() => {
          endMutation();
        });
    },
    [applyWixCartState, beginMutation, endMutation, removeItem]
  );

  const clearCart = useCallback(() => {
    setCartError(null);
    setWixSubtotal(null);
    setItems([]);
    clearStoredCart();

    beginMutation();
    void defaultWixCartAdapter
      .enqueue(async () => {
        await defaultWixCartAdapter.clearCurrentCartSafe();
      })
      .catch((error) => {
        setCartError(mapWixCartErrorMessage(error));
      })
      .finally(() => {
        endMutation();
      });
  }, [beginMutation, endMutation]);

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        totalItems: totals.totalItems,
        syncing,
        cartError,
        checkoutReturnNotice,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        clearCartError: () => setCartError(null),
        clearCheckoutReturnNotice: () => setCheckoutReturnNotice(null),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        syncWithWix,
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
