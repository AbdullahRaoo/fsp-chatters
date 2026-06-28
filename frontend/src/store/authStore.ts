import { create } from "zustand";
import { User } from "@/types";
import { getToken, setToken, removeToken } from "@/utils/token";

const USER_KEY = "fsp_user";

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isInitialized: false,

  setAuth: (user, token) => {
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    removeToken();
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },

  initialize: () => {
    if (get().isInitialized) return;
    const token = getToken();
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      removeToken();
      set({ isInitialized: true });
      return;
    }
    try {
      const user: User = JSON.parse(userStr);
      set({ user, token, isInitialized: true });
    } catch {
      removeToken();
      localStorage.removeItem(USER_KEY);
      set({ isInitialized: true });
    }
  },
}));
