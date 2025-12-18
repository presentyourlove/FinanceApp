import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionType } from '@/src/types';

import { DEFAULT_CATEGORIES } from '@/src/constants/categories';

const CATEGORIES_KEY = '@finance_categories';


export interface Categories {
    [TransactionType.EXPENSE]: string[];
    [TransactionType.INCOME]: string[];
}

/**
 * 從 AsyncStorage 載入類別
 * 如果不存在則返回預設類別
 */
export const loadCategories = async (): Promise<Categories> => {
    try {
        const stored = await AsyncStorage.getItem(CATEGORIES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // 如果沒有儲存的類別,使用預設值並儲存
        await saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
    } catch (error) {
        console.error('載入類別失敗:', error);
        return DEFAULT_CATEGORIES;
    }
};

/**
 * 儲存類別到 AsyncStorage
 */
export const saveCategories = async (categories: Categories): Promise<void> => {
    try {
        await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
        console.error('儲存類別失敗:', error);
    }
};

/**
 * 新增類別
 */
export const addCategory = async (
    type: TransactionType.INCOME | TransactionType.EXPENSE,
    name: string
): Promise<Categories> => {
    const categories = await loadCategories();
    if (!categories[type].includes(name)) {
        categories[type].push(name);
        await saveCategories(categories);
    }
    return categories;
};

/**
 * 刪除類別
 */
export const deleteCategory = async (
    type: TransactionType.INCOME | TransactionType.EXPENSE,
    name: string
): Promise<Categories> => {
    const categories = await loadCategories();
    categories[type] = categories[type].filter(c => c !== name);
    await saveCategories(categories);
    return categories;
};

/**
 * 移動類別順序
 */
export const moveCategory = async (
    type: TransactionType.INCOME | TransactionType.EXPENSE,
    index: number,
    direction: 'up' | 'down'
): Promise<Categories> => {
    const categories = await loadCategories();
    const list = [...categories[type]];

    if (direction === 'up' && index > 0) {
        [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else if (direction === 'down' && index < list.length - 1) {
        [list[index + 1], list[index]] = [list[index], list[index + 1]];
    }

    categories[type] = list;
    await saveCategories(categories);
    return categories;
};

/**
 * 重置為預設類別
 */
export const resetCategories = async (): Promise<Categories> => {
    await saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
};
