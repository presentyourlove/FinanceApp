import { Platform } from 'react-native';
import { IAccountRepository, ITransactionRepository, IBudgetRepository, IGoalRepository, IInvestmentRepository } from './interfaces';

import { SqliteAccountRepository } from './sqlite/AccountRepository';
import { SqliteTransactionRepository } from './sqlite/TransactionRepository';
import { SqliteBudgetRepository } from './sqlite/BudgetRepository';
import { SqliteGoalRepository } from './sqlite/GoalRepository';
import { SqliteInvestmentRepository } from './sqlite/InvestmentRepository';

import { WebAccountRepository } from './web/AccountRepository';
import { WebTransactionRepository } from './web/TransactionRepository';
import { WebBudgetRepository } from './web/BudgetRepository';
import { WebGoalRepository } from './web/GoalRepository';
import { WebInvestmentRepository } from './web/InvestmentRepository';

const isWeb = Platform.OS === 'web';

export const accountRepository: IAccountRepository = isWeb ? new WebAccountRepository() : new SqliteAccountRepository();
export const transactionRepository: ITransactionRepository = isWeb ? new WebTransactionRepository() : new SqliteTransactionRepository();
export const budgetRepository: IBudgetRepository = isWeb ? new WebBudgetRepository() : new SqliteBudgetRepository();
export const goalRepository: IGoalRepository = isWeb ? new WebGoalRepository() : new SqliteGoalRepository();
export const investmentRepository: IInvestmentRepository = isWeb ? new WebInvestmentRepository() : new SqliteInvestmentRepository();
