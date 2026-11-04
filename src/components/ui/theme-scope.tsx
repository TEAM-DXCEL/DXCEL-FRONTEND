"use client";

import { createContext, useContext, type ComponentPropsWithoutRef } from "react";

const ThemeContext = createContext<"light" | "dark" | undefined>(undefined);

export const useThemeScope = () => useContext(ThemeContext);

export function ThemeScope({
  theme,
  ...props
}: ComponentPropsWithoutRef<"div"> & { theme: "light" | "dark" }) {
  return (
    <ThemeContext value={theme}>
      <div {...props} data-theme={theme} />
    </ThemeContext>
  );
}
