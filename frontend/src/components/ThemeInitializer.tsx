"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export default function ThemeInitializer() {
  const { init } = useThemeStore();
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
