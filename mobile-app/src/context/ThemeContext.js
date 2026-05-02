import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';
import { createAtomic } from '../constants/atomic';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(true);
  const [theme, setTheme] = useState(darkTheme);
  const [atomic, setAtomic] = useState(createAtomic(darkTheme));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    const currentTheme = isDark ? darkTheme : lightTheme;
    setTheme(currentTheme);
    setAtomic(createAtomic(currentTheme));
  }, [isDark]);

  const loadTheme = async () => {
    try {
      // Default to dark for this high-fidelity mission control look
      setIsDark(true);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    setIsDark(!isDark);
  };

  const themeContextValue = {
    theme,
    atomic,
    isDark,
    toggleTheme,
  };

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
