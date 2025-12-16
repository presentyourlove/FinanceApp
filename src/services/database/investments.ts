import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Investment, TransactionType } from '@/src/types';
import { addTransactionDB } from './transactions';

export const addInvestment = async (
    data: Omit<Investment, 'id' | 'status'>,
    syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }
) => {
    const {
        name, type, amount, costPrice, currentPrice, currency, date,
        maturityDate, interestRate, interestFrequency, handlingFee,
        purchaseMethod, notes
    } = data;

    let linkedTransactionId: number | undefined = undefined;

    // 1. 同步記帳邏輯
    if (syncOptions.syncToTransaction && syncOptions.sourceAccountId) {
        let totalExpense = 0;
        if (type === 'stock') {
            totalExpense = (costPrice || 0) + (handlingFee || 0);
        } else {
            totalExpense = amount + (handlingFee || 0);
        }

        if (totalExpense > 0) {
            const transId = await addTransactionDB({
                amount: totalExpense,
                type: TransactionType.EXPENSE,
                date: new Date(date),
                description: `投資: ${name}`,
                accountId: syncOptions.sourceAccountId,
            });
            linkedTransactionId = transId;

            const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.sourceAccountId]) as any[];
            if (accRows && accRows.length > 0) {
                const newBalance = accRows[0].currentBalance - totalExpense;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.sourceAccountId]);
            }
        }
    }

    // 2. 新增投資紀錄
    const res = runSqlSync(
        `INSERT INTO investments (
      name, type, amount, costPrice, currentPrice, currency, date,
      maturityDate, interestRate, interestFrequency, handlingFee,
      purchaseMethod, notes, sourceAccountId, linkedTransactionId, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active');`,
        [
            name, type, amount, costPrice, currentPrice, currency, date,
            maturityDate, interestRate, interestFrequency, handlingFee,
            purchaseMethod, notes, syncOptions.sourceAccountId, linkedTransactionId
        ]
    );
    const result = res && res.lastInsertRowId;
    notifyListeners();
    return result;
};

export const getInvestments = async (): Promise<Investment[]> => {
    const rows = getRowsSync(`SELECT * FROM investments WHERE status = 'active' ORDER BY date DESC;`) as any[];
    return rows.map((row: any) => ({
        ...row,
        amount: Number(row.amount),
        costPrice: row.costPrice ? Number(row.costPrice) : undefined,
        currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
        interestRate: row.interestRate ? Number(row.interestRate) : undefined,
        handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
    }));
};

export const updateInvestment = async (id: number, data: Partial<Investment>) => {
    const fields = Object.keys(data).filter(k => k !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (data as any)[f]);

    runSqlSync(`UPDATE investments SET ${setClause} WHERE id = ?;`, [...values, id]);
    notifyListeners();
};

export const processInvestmentAction = async (
    id: number,
    actionType: 'sell' | 'close' | 'withdraw',
    data: {
        amount?: number;
        returnAmount?: number;
        date: string;
    },
    syncOptions: { syncToTransaction: boolean; targetAccountId?: number }
) => {
    const rows = getRowsSync(`SELECT * FROM investments WHERE id = ?;`, [id]) as any[];
    if (!rows || rows.length === 0) throw new Error("Investment not found");
    const inv = rows[0];

    let newStatus = inv.status;
    let newAmount = inv.amount;

    if (inv.type === 'stock' && actionType === 'sell') {
        const sellShares = data.amount || 0;
        newAmount = inv.amount - sellShares;
        if (newAmount <= 0) {
            newAmount = 0;
            newStatus = 'sold';
        }
        runSqlSync(`UPDATE investments SET amount = ?, status = ? WHERE id = ?;`, [newAmount, newStatus, id]);

    } else if (actionType === 'close' || actionType === 'withdraw') {
        if (inv.type === 'fixed_deposit') {
            newStatus = 'closed';
            newAmount = 0;
        } else if (inv.type === 'savings') {
            const withdrawAmount = data.amount || 0;
            newAmount = inv.amount - withdrawAmount;
            if (newAmount <= 0) {
                newAmount = 0;
                newStatus = 'closed';
            }
        }
        runSqlSync(`UPDATE investments SET amount = ?, status = ? WHERE id = ?;`, [newAmount, newStatus, id]);
    }

    if (syncOptions.syncToTransaction && syncOptions.targetAccountId && data.returnAmount && data.returnAmount > 0) {
        await addTransactionDB({
            amount: data.returnAmount,
            type: TransactionType.INCOME,
            date: new Date(data.date),
            description: `投資回收: ${inv.name} (${actionType})`,
            accountId: syncOptions.targetAccountId,
        });

        const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.targetAccountId]) as any[];
        if (accRows && accRows.length > 0) {
            const newBalance = accRows[0].currentBalance + data.returnAmount;
            runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.targetAccountId]);
        }
    }
    notifyListeners();
};

export const updateStockPrice = async (name: string, price: number) => {
    runSqlSync(`UPDATE investments SET currentPrice = ? WHERE name = ? AND type = 'stock' AND status = 'active';`, [price, name]);
    notifyListeners();
};

export const getAllInvestmentsDB = async () => {
    const rows = getRowsSync(`SELECT * FROM investments;`) as any[];
    return rows.map((row: any) => ({
        ...row,
        amount: Number(row.amount),
        costPrice: row.costPrice ? Number(row.costPrice) : undefined,
        currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
        interestRate: row.interestRate ? Number(row.interestRate) : undefined,
        handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
    }));
};

export const importInvestmentDB = async (inv: any) => {
    runSqlSync(
        `INSERT INTO investments (
    id, name, type, amount, costPrice, currentPrice, currency, date,
    maturityDate, interestRate, interestFrequency, handlingFee,
    purchaseMethod, notes, sourceAccountId, linkedTransactionId, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
            inv.id, inv.name, inv.type, inv.amount, inv.costPrice, inv.currentPrice, inv.currency, inv.date,
            inv.maturityDate, inv.interestRate, inv.interestFrequency, inv.handlingFee,
            inv.purchaseMethod, inv.notes, inv.sourceAccountId, inv.linkedTransactionId, inv.status
        ]
    );
};
