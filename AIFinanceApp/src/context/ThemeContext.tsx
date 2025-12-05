import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { loadTheme, saveTheme, ThemeType } from '@/src/utils/themeStorage';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
  setTheme: (theme: ThemeType) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  // Default to 'Default' theme, not based on colorScheme initially
  const [theme, setThemeState] = useState<ThemeType>('Default');

  useEffect(() => {
    const loadSavedTheme = async () => {
      // If there's a saved theme, use it, otherwise fall back to system setting
      const savedTheme = await loadTheme();
      if (savedTheme) {
        setThemeState(savedTheme);
      } else if (colorScheme === 'dark') {
        setThemeState('Dark');
      }
    };
    loadSavedTheme();
  }, [colorScheme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
  };

  const isDark = theme === 'Dark';
  const currentColors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: currentColors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};