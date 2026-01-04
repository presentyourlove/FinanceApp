import { initDatabase, addDataChangeListener, removeDataChangeListener, notifyListeners, runSqlSync } from './core';
import { getAccounts, updateAccountBalanceDB, addAccountDB, deleteAccountDB, importAccountDB, updateAccountOrderDB } from './accounts';
import { addTransactionDB, updateTransactionDB, deleteTransactionDB, performTransfer, updateTransfer, getTransactionsByAccountDB, getTransactionsWithAccount, getAllTransactionsDB, importTransactionDB, getCategorySpending, getDistinctCategories } from './transactions';
import { getBudgets, addBudget, updateBudget, deleteBudget, importBudgetDB } from './budgets';
import { getGoals, addGoal, updateGoalAmount, updateGoal, deleteGoal, importGoalDB } from './goals';
import { addInvestment, getInvestments, updateInvestment, processInvestmentAction, updateStockPrice, getAllInvestmentsDB, importInvestmentDB } from './investments';

// 為了方便除錯，可以新增清除所有數據的函數
const clearAllData = async () => {
    runSqlSync(`DROP TABLE IF EXISTS transactions;`);
    runSqlSync(`DROP TABLE IF EXISTS accounts;`);
    runSqlSync(`DROP TABLE IF EXISTS budgets;`);
    runSqlSync(`DROP TABLE IF EXISTS goals;`);
    runSqlSync(`DROP TABLE IF EXISTS investments;`);
    await initDatabase(true);
    notifyListeners();
};

export const dbOperations = {
    initDatabase,
    getAccounts,
    updateAccountBalanceDB,
    addTransactionDB,
    updateTransactionDB,
    deleteTransactionDB,
    performTransfer,
    updateTransfer,
    getTransactionsByAccountDB,
    getTransactionsWithAccount,
    addAccountDB,
    deleteAccountDB,
    updateAccountOrderDB,
    // Budgets
    getBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    // Goals
    getGoals,
    addGoal,
    updateGoalAmount,
    updateGoal,
    deleteGoal,
    // Stats
    getCategorySpending,
    getDistinctCategories,
    // Investments
    addInvestment,
    getInvestments,
    updateInvestment,
    processInvestmentAction,
    updateStockPrice,
    clearAllData,
    // Backup helpers
    getAllTransactionsDB,
    getAllInvestmentsDB,
    // Import helpers (Preserve IDs)
    importAccountDB,
    importTransactionDB,
    importBudgetDB,
    importGoalDB,
    importInvestmentDB,
    // Observer
    addDataChangeListener,
    removeDataChangeListener,
};

// Re-export types for convenience
export type { Account, Transaction, Budget, Goal, Investment } from '@/src/types';
