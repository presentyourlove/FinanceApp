import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionType } from '@/src/types';

const CATEGORIES_KEY = '@finance_categories';

// 預設分類
const defaultCategories = {
    [TransactionType.EXPENSE]: [
        '餐飲', '交通', '服飾', '居住', '購物', '醫療', '保險', '教育', '娛樂', '旅遊', '運動'
    ],
    [TransactionType.INCOME]: [
        '薪水', '津貼', '兼職', '接案', '股利', '利息', '資本利得', '租金', '稿費', '版稅', '禮金', '退稅', '補助'
    ],
};

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
        await saveCategories(defaultCategories);
        return defaultCategories;
    } catch (error) {
        console.error('載入類別失敗:', error);
        return defaultCategories;
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
    await saveCategories(defaultCategories);
    return defaultCategories;
};
