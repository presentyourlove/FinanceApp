import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_SETTINGS_KEY = '@finance_currency_settings';

export interface CurrencySettings {
    mainCurrency: string;
    exchangeRates: { [key: string]: number };
}

const defaultSettings: CurrencySettings = {
    mainCurrency: 'TWD',
    exchangeRates: {
        'TWD': 1,
        'USD': 31.39126,
        'JPY': 0.20099,
        'CNY': 4.43754,
        'HKD': 4.03226,
        'MOP': 3.90900,
        'GBP': 41.54549,
        'KRW': 0.02139
    }
};

/**
 * Load currency settings from AsyncStorage
 */
export const loadCurrencySettings = async (): Promise<CurrencySettings> => {
    try {
        const stored = await AsyncStorage.getItem(CURRENCY_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with default rates to ensure all currencies exist if new ones are added
            return {
                mainCurrency: parsed.mainCurrency || defaultSettings.mainCurrency,
                exchangeRates: { ...defaultSettings.exchangeRates, ...parsed.exchangeRates }
            };
        }
        await saveCurrencySettings(defaultSettings);
        return defaultSettings;
    } catch (error) {
        console.error('Failed to load currency settings:', error);
        return defaultSettings;
    }
};

/**
 * Save currency settings to AsyncStorage
 */
export const saveCurrencySettings = async (settings: CurrencySettings): Promise<void> => {
    try {
        await AsyncStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save currency settings:', error);
    }
};
