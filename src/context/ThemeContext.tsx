"use client";

import type React from "react";
import { createContext, useContext, useEffect } from "react";

type Theme = "light"; // Only light mode is supported

type ThemeContextType = {
  theme: Theme; // Always light mode
  toggleTheme: () => void; // This will be a no-op since dark mode is disabled
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = "light"; // Always light mode

  const toggleTheme = () => {
    // Dark mode toggle is no longer needed
    console.warn("Dark mode is disabled, this function does nothing.");
  };

  // Remove any dark class on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("dark"); // Remove dark mode class if it exists
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
