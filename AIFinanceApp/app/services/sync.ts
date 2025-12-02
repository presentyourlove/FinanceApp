import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { dbOperations } from './database';
import * as CategoryStorage from '../utils/categoryStorage';

/**
 * 上傳備份至雲端 (Firestore)
 * 路徑: users/{userId}/backups/latest
 */
export const backupToCloud = async (userId: string, data: BackupData): Promise<void> => {
  try {
    if (!userId) throw new Error("User ID is required for backup.");

    const backupRef = doc(db, "users", userId, "backups", "latest");

    // Firestore 不支援直接儲存自定義物件 (如 Date)，需轉為 JSON 或 Timestamp
    // 這裡我們假設 BackupData 內的資料已經是 JSON 友善的格式 (exportData 已處理)
    // 但若有 undefined 欄位，Firestore 會報錯，需注意 (JSON.stringify 會移除 undefined)
    const cleanData = JSON.parse(JSON.stringify(data));

    await setDoc(backupRef, cleanData);
    console.log('Backup uploaded successfully.');
  } catch (error) {
    console.error('Backup upload failed:', error);
    throw error;
  }
};

/**
 * 從雲端還原資料 (Firestore)
 * 路徑: users/{userId}/backups/latest
 */
export const restoreFromCloud = async (userId: string): Promise<void> => {
  try {
    if (!userId) throw new Error("User ID is required for restore.");

    const backupRef = doc(db, "users", userId, "backups", "latest");
    const docSnap = await getDoc(backupRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as BackupData;
      console.log("Backup found, starting restore...");
      await importData(data);
      console.log("Restore completed successfully.");
    } else {
      console.log("No backup found!");
      throw new Error("No backup found in cloud.");
    }
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};


export interface BackupData {
  timestamp: number;
  version: number;
  accounts: any[];
  transactions: any[];
  budgets: any[];
  goals: any[];
  investments: any[];
  categories: CategoryStorage.Categories;
}

const BACKUP_VERSION = 1;

/**
 * 匯出所有資料為 JSON 物件
 */
export const exportData = async (): Promise<BackupData> => {
  try {
    const accounts = await dbOperations.getAccounts();
    const transactions = await dbOperations.getAllTransactionsDB();
    const budgets = await dbOperations.getBudgets();
    const goals = await dbOperations.getGoals();
    const investments = await dbOperations.getAllInvestmentsDB();
    const categories = await CategoryStorage.loadCategories();

    return {
      timestamp: Date.now(),
      version: BACKUP_VERSION,
      accounts,
      transactions,
      budgets,
      goals,
      investments,
      categories,
    };
  } catch (error) {
    console.error('Export data failed:', error);
    throw error;
  }
};

/**
 * 從 JSON 物件匯入資料 (還原)
 * 注意：這會清除現有所有資料！
 */
export const importData = async (data: BackupData): Promise<void> => {
  try {
    // 1. 清除現有資料
    await dbOperations.clearAllData();

    // 2. 還原帳本
    for (const acc of data.accounts) {
      await dbOperations.importAccountDB(acc);
    }

    // 3. 還原交易
    for (const t of data.transactions) {
      await dbOperations.importTransactionDB(t);
    }

    // 4. 還原預算
    if (data.budgets) {
      for (const b of data.budgets) {
        await dbOperations.importBudgetDB(b);
      }
    }

    // 5. 還原存錢目標
    if (data.goals) {
      for (const g of data.goals) {
        await dbOperations.importGoalDB(g);
      }
    }

    // 6. 還原投資
    if (data.investments) {
      for (const inv of data.investments) {
        await dbOperations.importInvestmentDB(inv);
      }
    }

    // 7. 還原分類
    if (data.categories) {
      await CategoryStorage.saveCategories(data.categories);
    }

    console.log('Data import completed successfully.');
  } catch (error) {
    console.error('Import data failed:', error);
    throw error;
  }
};
