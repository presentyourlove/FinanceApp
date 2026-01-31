import localforage from 'localforage';
import { notifyListeners } from './observer';
export { addDataChangeListener, removeDataChangeListener, notifyListeners } from './observer';

// Web Impl: No direct SQL support
export const runSqlSync = (sql: string, params: any[] = []) => {
  // throw new Error("runSqlSync is not supported on Web. Use Repository Pattern.");
  console.warn("runSqlSync called on Web. Ignored.", sql);
  return { lastInsertRowId: Date.now() }; // Mock return
};

export const getRowsSync = (sql: string, params: any[] = []) => {
  // throw new Error("getRowsSync is not supported on Web. Use Repository Pattern.");
  console.warn("getRowsSync called on Web. Ignored.", sql);
  return []; // Mock return
};

// Web initialization: Seed default data if empty
export const initDatabase = async (skipDefaultData: boolean = false) => {
  if (skipDefaultData) return;

  try {
    const accounts = await localforage.getItem<any[]>('accounts');
    if (!accounts || accounts.length === 0) {
      console.info("No initial accounts found (Web). Inserting default data...");
      await localforage.setItem('accounts', [
        { id: 1, name: '錢包', initialBalance: 500, currentBalance: 500, currency: 'TWD', sortIndex: 0 },
        { id: 2, name: '銀行戶口', initialBalance: 50000, currentBalance: 50000, currency: 'TWD', sortIndex: 1 },
        { id: 3, name: '信用卡', initialBalance: 0, currentBalance: 0, currency: 'TWD', sortIndex: 2 },
      ]);
    }

    const budgets = await localforage.getItem<any[]>('budgets');
    if (!budgets || budgets.length === 0) {
      console.info("No initial budgets found (Web). Inserting default data...");
      await localforage.setItem('budgets', [
        { id: 1, category: '餐飲', amount: 6000, period: 'monthly', currency: 'TWD' }
      ]);
    }

    const goals = await localforage.getItem<any[]>('goals');
    if (!goals || goals.length === 0) {
      console.info("No initial goals found (Web). Inserting default data...");
      await localforage.setItem('goals', [
        { id: 1, name: '新手機', targetAmount: 30000, currentAmount: 5000, deadline: '2025-12-31', currency: 'TWD' }
      ]);
    }

    notifyListeners();
  } catch (e) {
    console.error("Error initializing Web DB:", e);
  }
};
