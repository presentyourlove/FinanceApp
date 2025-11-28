import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme';

export type ThemeType = 'Default' | 'Dark';

export const saveTheme = async (theme: ThemeType) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme.', e);
  }
};

export const loadTheme = async (): Promise<ThemeType | null> => {
  try {
    const theme = await AsyncStorage.getItem(THEME_KEY);
    return theme as ThemeType | null;
  } catch (e) {
    console.error('Failed to load theme.', e);
    return null;
  }
};