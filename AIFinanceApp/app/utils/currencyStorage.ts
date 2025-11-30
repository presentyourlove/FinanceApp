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
        'USD': 0.031856,
        'JPY': 4.975311,
        'CNY': 0.225357,
        'HKD': 0.480073,
        'MOP': 0.255819,
        'GBP': 0.024070,
        'KRW': 46.75543
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

            // Check if rates seem to be in the old format (e.g. USD ~ 30 instead of ~0.03)
            // If USD rate is > 1, it's likely the old format (TWD per USD), so we reset to default.
            // This is a one-time migration fix.
            if (parsed.exchangeRates['USD'] > 1) {
                console.log('Detected old exchange rate format, resetting to defaults.');
                await saveCurrencySettings(defaultSettings);
                return defaultSettings;
            }

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
