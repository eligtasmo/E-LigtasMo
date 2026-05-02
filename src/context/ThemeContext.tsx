import { createContext, useContext, useEffect, useCallback, useMemo, ReactNode } from "react";

type Theme = "light"; // Only light mode is supported

type ThemeContextType = {
  theme: Theme; // Always light mode
  toggleTheme: () => void; // This will be a no-op since dark mode is disabled
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme: Theme = "light"; // Always light mode

  const toggleTheme = useCallback(() => {
    // Dark mode toggle is no longer needed
    console.warn("Dark mode is disabled, this function does nothing.");
  }, []);

  // Remove any dark class on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("dark"); // Remove dark mode class if it exists
    }
  }, []);

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme
  }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
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
