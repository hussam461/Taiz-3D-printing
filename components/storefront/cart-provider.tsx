"use client";

import { useCallback, useContext, useEffect, useMemo, useState, createContext } from "react";
import { CartAddedToast } from "@/components/storefront/cart-added-toast";
import { MAX_CART_QUANTITY } from "@/types/domain";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  colorId: string | null;
  colorName: string;
  materialId: string | null;
  materialName: string;
  basePriceOldYer: number;
  discountPercent: number | null;
};

const STORAGE_KEY = "taiz-printer-cart-v1";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  addItem: (item: CartItem) => void;
  setQuantity: (productId: string, colorId: string | null, materialId: string | null, quantity: number) => void;
  setVariant: (productId: string, colorId: string | null, materialId: string | null, nextColorId: string | null, nextColorName: string, nextMaterialId: string | null, nextMaterialName: string) => void;
  removeItem: (productId: string, colorId: string | null, materialId: string | null) => void;
  replaceWith: (item: CartItem) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): CartItem[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as Partial<CartItem>;
      if (
        typeof row.productId !== "string" || typeof row.slug !== "string" || typeof row.name !== "string" ||
        typeof row.quantity !== "number" || !Number.isFinite(row.quantity) ||
        typeof row.basePriceOldYer !== "number" || !Number.isFinite(row.basePriceOldYer) ||
        (typeof row.colorId !== "string" && row.colorId !== null) ||
        (typeof row.materialId !== "string" && row.materialId !== null)
      ) return [];
      return [{
        productId: row.productId,
        slug: row.slug,
        name: row.name,
        image: typeof row.image === "string" ? row.image : null,
        quantity: Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(row.quantity))),
        colorId: row.colorId,
        colorName: typeof row.colorName === "string" ? row.colorName : "",
        materialId: row.materialId,
        materialName: typeof row.materialName === "string" ? row.materialName : "",
        basePriceOldYer: row.basePriceOldYer,
        discountPercent: typeof row.discountPercent === "number" && Number.isFinite(row.discountPercent) ? row.discountPercent : null,
      }];
    });
  } catch {
    return [];
  }
}

function sameLine(a: CartItem, b: Pick<CartItem, "productId" | "colorId" | "materialId">) {
  return a.productId === b.productId && a.colorId === b.colorId && a.materialId === b.materialId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Keep server and first browser render identical; restore persisted cart after hydration.
  const [items, setItems] = useState<CartItem[]>([]);
  const [addedItem, setAddedItem] = useState<CartItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(readStoredItems());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep the in-memory cart usable when browser storage is unavailable or full.
    }
  }, [items, ready]);

  const addItem = useCallback((item: CartItem) => {
    setItems((current) => {
      const index = current.findIndex((row) => sameLine(row, item));
      if (index === -1) return [...current, item];
      const next = [...current];
      next[index] = {
        ...next[index],
        quantity: Math.min(MAX_CART_QUANTITY, next[index].quantity + item.quantity),
      };
      return next;
    });
    setAddedItem(item);
  }, []);

  const dismissAddedItem = useCallback(() => setAddedItem(null), []);

  const setQuantity = useCallback(
    (productId: string, colorId: string | null, materialId: string | null, quantity: number) => {
      setItems((current) =>
        current
          .map((row) =>
            sameLine(row, { productId, colorId, materialId })
              ? { ...row, quantity: Math.max(1, Math.min(MAX_CART_QUANTITY, quantity)) }
              : row,
          )
          .filter((row) => row.quantity > 0),
      );
    },
    [],
  );

  const setVariant = useCallback((productId: string, colorId: string | null, materialId: string | null, nextColorId: string | null, nextColorName: string, nextMaterialId: string | null, nextMaterialName: string) => {
    setItems((current) => {
      const source = current.find((row) => sameLine(row, { productId, colorId, materialId }));
      if (!source) return current;
      const changed = { ...source, colorId: nextColorId, colorName: nextColorName, materialId: nextMaterialId, materialName: nextMaterialName };
      const existing = current.find((row) => row !== source && sameLine(row, changed));
      if (!existing) return current.map((row) => row === source ? changed : row);
      return current
        .filter((row) => row !== source)
        .map((row) => row === existing ? { ...row, quantity: Math.min(MAX_CART_QUANTITY, row.quantity + source.quantity) } : row);
    });
  }, []);

  const removeItem = useCallback((productId: string, colorId: string | null, materialId: string | null) => {
    setItems((current) => current.filter((row) => !sameLine(row, { productId, colorId, materialId })));
  }, []);

  const replaceWith = useCallback((item: CartItem) => setItems([item]), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      ready,
      addItem,
      setQuantity,
      setVariant,
      removeItem,
      replaceWith,
      clear,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items, ready, addItem, setQuantity, setVariant, removeItem, replaceWith, clear],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartAddedToast item={addedItem} onDismiss={dismissAddedItem} />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
