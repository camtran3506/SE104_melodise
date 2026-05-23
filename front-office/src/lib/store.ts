import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Track = {
  id: string;
  title: string;
  artist: string;
  artistBio?: string;
  cover: string;
  audio?: string;
  price: number;
  genre: string;
  mood: string;
  bpm: number;
  duration: string;
  tags: string[];
  description?: string;
};

// Runtime cache populated by useTracks() — used by non-React code (e.g. checkout total).
export let TRACKS: Track[] = [];
export function setTracksCache(arr: Track[]) {
  TRACKS = arr;
}

type CartItem = { trackId: string };
// Trong store.ts, thêm cấu trúc này vào:
export type License = {
  license_code: string;
  license_scope: string;
  license_term: string;
  issued_at: string;
};

// Cập nhật type Order trong store.ts
type Order = { 
  id: string; 
  trackIds: string[]; 
  total: number; 
  createdAt: number; 
  status: "pending" | "approved"; 
  licenses?: License[]; // <--- BẮT BUỘC THÊM DÒNG NÀY
};

type User = { name: string; email: string; phone: string; role: "Khách hàng" | "Nhân viên Sản xuất" | "Quản lý cấp cao" | "Nhân viên Kinh doanh" };

type Store = {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  login: (u: User) => void;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  checkout: () => string;
  approveOrder: (id: string) => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      cart: [],
      orders: [],
      login: (u) => set({ user: u }),
      logout: () => set({ user: null, cart: [] }),
      updateUser: (u) => set((s) => ({ user: s.user ? { ...s.user, ...u } : s.user })),
      addToCart: (id) => set((s) => (s.cart.some((c) => c.trackId === id) ? s : { cart: [...s.cart, { trackId: id }] })),
      removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.trackId !== id) })),
      clearCart: () => set({ cart: [] }),
      checkout: () => {
        const cart = get().cart;
        const total = cart.reduce((sum, c) => sum + (TRACKS.find((t) => t.id === c.trackId)?.price ?? 0), 0);
        const id = `ORD-${Date.now().toString(36).toUpperCase()}`;
        set((s) => ({ orders: [...s.orders, { id, trackIds: cart.map((c) => c.trackId), total, createdAt: Date.now(), status: "pending" }], cart: [] }));
        return id;
      },
      approveOrder: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "approved" } : o)) })),
    }),
    { name: "melodise-store" },
  ),
);

export const formatVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";
