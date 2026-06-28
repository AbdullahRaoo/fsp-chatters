import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  init: () => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",

  init: () => {
    const saved = (localStorage.getItem("fsp_theme") as Theme | null) ?? "light";
    set({ theme: saved });
    document.documentElement.classList.toggle("dark", saved === "dark");
  },

  toggle: () => {
    const next: Theme = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    localStorage.setItem("fsp_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  },
}));
