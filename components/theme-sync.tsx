"use client";

import { useLayoutEffect } from "react";

import { applyStoredTheme } from "@/lib/theme";

export function ThemeSync() {
  useLayoutEffect(() => {
    applyStoredTheme();
  }, []);
  return null;
}
