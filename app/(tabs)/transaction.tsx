import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Text,
  View,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import i18n from '@/src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations } from '@/src/services/database';
import * as CategoryStorage from '@/src/services/storage/categoryStorage';
import { Account, Transaction, TransactionType } from '@/src/types';

import TransferModal from '@/src/components/transaction/TransferModal';
import AccountSelectModal from '@/src/components/transaction/AccountSelectModal';
import EditTransferModal from '@/src/components/transaction/EditTransferModal';
import SettingsModal from '@/src/components/settings/SettingsModal';

// New Components
import { getStyles } from '@/src/components/transaction/styles';
import { TransactionListItem } from '@/src/components/transaction/TransactionListItem';
import { TransactionHeader } from '@/src/components/transaction/TransactionHeader';
import { TransactionForm } from '@/src/components/transaction/TransactionForm';
import { TransactionFilters } from '@/src/components/transaction/TransactionFilters';
import { EditTransactionModal } from '@/src/components/transaction/EditTransactionModal';
import { ErrorHandler } from '@/src/utils/errorHandler';

const defaultCategories = {
  expense: [
    '餐飲', '交通', '服飾', '居住', '購物', '醫療', '保險', '教育', '娛樂', '旅遊', '運動'
  ],
  income: [
    '薪水', '津貼', '兼職', '接案', '股利', '利息', '資本利得', '租金', '稿費', '版稅', '禮金', '退稅', '補助'
  ],
};

export default function TransactionScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors, insets);

  const [dbInitialized, setDbInitialized] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);

  // Form State
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categories, setCategories] = useState<CategoryStorage.Categories>(defaultCategories);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Modals Visibility
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [isAccountSelectModalVisible, setAccountSelectModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'day' | 'month' | 'year'>('all');

  // Edit Transfer Modal State
  const [isEditTransferModalVisible, setEditTransferModalVisible] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
  const [editTransferAmount, setEditTransferAmount] = useState('');
  const [editTransferFromAccount, setEditTransferFromAccount] = useState<number | undefined>(undefined);
  const [editTransferToAccount, setEditTransferToAccount] = useState<number | undefined>(undefined);
  const [editTransferDate, setEditTransferDate] = useState(new Date());
  const [editTransferDescription, setEditTransferDescription] = useState('');
  const [showEditTransferDatePicker, setShowEditTransferDatePicker] = useState(false);

  // --- Handlers ---

  const onDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setTransactionDate(newDate);
    }
  }, [transactionDate]);

  const onTimeChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setTransactionDate(newDate);
    }
  }, [transactionDate]);

  const onEditTransferDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditTransferDatePicker(false);
    if (selectedDate) setEditTransferDate(selectedDate);
  }, []);

  // --- Data Loading ---

  useEffect(() => {
    const loadData = async () => {
      try {
        await dbOperations.initDatabase();
        setDbInitialized(true);
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);
        if (loadedAccounts.length > 0) setSelectedAccountId(loadedAccounts[0].id);
      } catch (e) {
        ErrorHandler.handleError(e, 'loadData');
      }
    };
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadAllData = async () => {
        const cats = await CategoryStorage.loadCategories();
        setCategories(cats);
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);
        if (selectedAccountId !== undefined) {
          const loadedTransactions = await dbOperations.getTransactionsByAccountDB(selectedAccountId);
          setTransactions(loadedTransactions);
        }
      };
      loadAllData();
    }, [selectedAccountId])
  );

  useEffect(() => {
    if (selectedAccountId === undefined || !dbInitialized) return;
    const loadTransactions = async () => {
      try {
        const loadedTransactions = await dbOperations.getTransactionsByAccountDB(selectedAccountId);
        setTransactions(loadedTransactions);
      } catch (e) {
        ErrorHandler.handleError(e, 'loadTransactions');
      }
    };
    loadTransactions();
  }, [selectedAccountId, dbInitialized]);

  const currentBalance = useMemo(() => accounts.find(acc => acc.id === selectedAccountId)?.currentBalance || 0, [accounts, selectedAccountId]);

  const refreshData = useCallback(async () => {
    const loadedAccounts = await dbOperations.getAccounts();
    setAccounts(loadedAccounts);
    if (selectedAccountId !== undefined) {
      const loadedTransactions = await dbOperations.getTransactionsByAccountDB(selectedAccountId);
      setTransactions(loadedTransactions);
    }
  }, [selectedAccountId]);

  // --- Actions ---

  const handleTransaction = useCallback(async (type: TransactionType) => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return Alert.alert(i18n.t('transaction.invalidInput'), i18n.t('transaction.invalidAmount'));
    if (selectedAccountId === undefined) return Alert.alert(i18n.t('transaction.selectAccountError'), i18n.t('transaction.selectAccountErrorMsg'));

    try {
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found.");
      const newBalance = type === TransactionType.INCOME ? currentAcc.currentBalance + amount : currentAcc.currentBalance - amount;
      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
      await dbOperations.addTransactionDB({ amount, type, date: transactionDate, description: descriptionInput || (type === TransactionType.INCOME ? '無備註收入' : '無備註支出'), accountId: selectedAccountId });
      await refreshData();
      setAmountInput('');
      setDescriptionInput('');
      Keyboard.dismiss();
      Alert.alert(i18n.t('transaction.success'), i18n.t('transaction.recordSuccess', { type: type === TransactionType.INCOME ? i18n.t('transaction.income') : i18n.t('transaction.expense'), amount: amount.toFixed(2) }));
    } catch (error) {
      ErrorHandler.handleError(error, 'handleTransaction', true);
    }
  }, [amountInput, selectedAccountId, accounts, transactionDate, descriptionInput, refreshData]);



  // --- Filtering (Performance Optimized) ---

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === undefined) return [];
    let filtered = transactions.filter(t => t.accountId === selectedAccountId || (t.type === TransactionType.TRANSFER && t.targetAccountId === selectedAccountId));

    const now = new Date();
    if (filterType === 'day') {
      filtered = filtered.filter(t => new Date(t.date).toDateString() === now.toDateString());
    } else if (filterType === 'month') {
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (filterType === 'year') {
      filtered = filtered.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, filterType]);

  // --- Edit Handlers ---

  const openAppEditModal = useCallback((transaction: Transaction) => {
    if (transaction.type === TransactionType.TRANSFER) return Alert.alert(i18n.t('transaction.transferEditHint'), i18n.t('transaction.transferEditMsg'));
    setEditingTransaction(transaction);
    setEditModalVisible(true);
  }, []);

  const openEditTransferModal = useCallback((transaction: Transaction) => {
    setEditingTransfer(transaction);
    setEditTransferAmount(transaction.amount.toString());
    setEditTransferFromAccount(transaction.accountId);
    setEditTransferToAccount(transaction.targetAccountId);
    setEditTransferDate(new Date(transaction.date));
    setEditTransferDescription(transaction.description);
    setEditTransferModalVisible(true);
  }, []);

  const handleUpdateTransfer = async () => {
    if (!editingTransfer || !editTransferFromAccount || !editTransferToAccount) return;
    const amount = parseFloat(editTransferAmount);
    if (isNaN(amount) || amount <= 0) return Alert.alert(i18n.t('transaction.invalidInput'), i18n.t('transaction.invalidTransferAmount'));

    try {
      await dbOperations.updateTransfer(
        editingTransfer.id,
        editingTransfer.accountId,
        editingTransfer.targetAccountId!,
        editingTransfer.amount,
        editTransferFromAccount,
        editTransferToAccount,
        amount,
        editTransferDate,
        editTransferDescription
      );
      await refreshData();
      setEditTransferModalVisible(false);
      Alert.alert(i18n.t('transaction.success'), i18n.t('transaction.transferUpdateSuccess'));
    } catch (error) {
      ErrorHandler.handleError(error, 'handleUpdateTransfer', true);
    }
  };

  const handleUpdateTransaction = async (id: number, newAmount: number, type: TransactionType, date: Date, description: string) => {
    if (!editingTransaction || !selectedAccountId) return;
    if (isNaN(newAmount) || newAmount <= 0) return Alert.alert(i18n.t('transaction.invalidInput'), i18n.t('transaction.invalidAmount'));

    try {
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found.");

      let revertedBalance = currentAcc.currentBalance;
      revertedBalance += editingTransaction.type === TransactionType.INCOME ? -editingTransaction.amount : editingTransaction.amount;

      const newBalance = revertedBalance + (editingTransaction.type === TransactionType.INCOME ? newAmount : -newAmount);

      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
      await dbOperations.updateTransactionDB(id, newAmount, type, date, description);

      await refreshData();
      setEditModalVisible(false);
      Alert.alert(i18n.t('transaction.success'), i18n.t('transaction.updateSuccess'));
    } catch (error) {
      ErrorHandler.handleError(error, 'handleUpdateTransaction', true);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!selectedAccountId) return;
    Alert.alert(
      i18n.t('transaction.deleteHeader'),
      i18n.t('transaction.deleteConfirm'),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        {
          text: i18n.t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
              if (currentAcc) {
                const newBalance = currentAcc.currentBalance + (transaction.type === TransactionType.INCOME ? -transaction.amount : transaction.amount);
                await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
              }
              await dbOperations.deleteTransactionDB(transaction.id);
              await refreshData();
              setEditModalVisible(false);
              Alert.alert(i18n.t('transaction.success'), i18n.t('transaction.deleteSuccess'));
            } catch (error) {
              ErrorHandler.handleError(error, 'handleDeleteTransaction', true);
            }
          }
        }
      ]
    );
  };

  // --- Render ---
  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionListItem
      item={item}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      colors={colors}
      styles={styles}
      onPress={item.type === TransactionType.TRANSFER ? openEditTransferModal : openAppEditModal}
    />
  ), [accounts, selectedAccountId, colors, styles, openEditTransferModal, openAppEditModal]);

  const renderListHeader = useCallback(() => (
    <>
      <TransactionHeader
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        currentBalance={currentBalance}
        colors={colors}
        styles={styles}
        onSettingsPress={() => setSettingsModalVisible(true)}
        onAccountSelectPress={() => setAccountSelectModalVisible(true)}
      />
      <TransactionForm
        transactionDate={transactionDate}
        amountInput={amountInput}
        descriptionInput={descriptionInput}
        showDatePicker={showDatePicker}
        showTimePicker={showTimePicker}
        categories={categories}
        colors={colors}
        styles={styles}
        setAmountInput={setAmountInput}
        setDescriptionInput={setDescriptionInput}
        setShowDatePicker={setShowDatePicker}
        setShowTimePicker={setShowTimePicker}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        onTransactionPress={handleTransaction}
        onTransferPress={() => setTransferModalVisible(true)}
      />
      <View style={styles.listHeaderRow}><Text style={styles.listHeader}>{i18n.t('transaction.recentTransactions')} ({i18n.t('account.namePlaceholder')}: {accounts.find(acc => acc.id === selectedAccountId)?.name})</Text></View>
      <TransactionFilters filterType={filterType} onFilterChange={setFilterType} styles={styles} />
    </>
  ), [accounts, selectedAccountId, currentBalance, colors, styles, transactionDate, amountInput, descriptionInput, showDatePicker, showTimePicker, categories, filterType, handleTransaction, onDateChange, onTimeChange]);

  return (
    <View style={styles.container}>
      <FlashList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('transaction.noTransactions')}</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardDismissMode="on-drag"
      />
      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        onSuccess={() => { refreshData(); setTransferModalVisible(false); }}
        accounts={accounts}
      />
      <EditTransferModal visible={isEditTransferModalVisible} onClose={() => setEditTransferModalVisible(false)} onUpdate={handleUpdateTransfer} accounts={accounts} amount={editTransferAmount} setAmount={setEditTransferAmount} fromAccount={editTransferFromAccount} setFromAccount={setEditTransferFromAccount} toAccount={editTransferToAccount} setToAccount={setEditTransferToAccount} date={editTransferDate} description={editTransferDescription} setDescription={setEditTransferDescription} showDatePicker={showEditTransferDatePicker} setShowDatePicker={setShowEditTransferDatePicker} onDateChange={onEditTransferDateChange} colors={colors} styles={styles} />
      <AccountSelectModal visible={isAccountSelectModalVisible} onClose={() => setAccountSelectModalVisible(false)} accounts={accounts} onSelectAccount={setSelectedAccountId} colors={colors} styles={styles} />
      <SettingsModal visible={isSettingsModalVisible} onClose={() => setSettingsModalVisible(false)} onRefreshData={refreshData} colors={colors} styles={styles} />
      <EditTransactionModal visible={isEditModalVisible} transaction={editingTransaction} onClose={() => setEditModalVisible(false)} onUpdate={handleUpdateTransaction} onDelete={handleDeleteTransaction} categories={categories} colors={colors} styles={styles} />
    </View>
  );
}