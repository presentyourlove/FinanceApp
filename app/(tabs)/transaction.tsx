import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
  FlatList,
  Keyboard,
  ScrollView,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations } from '@/src/services/database';
import * as CategoryStorage from '@/src/utils/categoryStorage';
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
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categories, setCategories] = useState<CategoryStorage.Categories>(defaultCategories);
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [isAccountSelectModalVisible, setAccountSelectModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [editSelectionMode, setEditSelectionMode] = useState<'none' | 'category'>('none');
  const [isEditTransferModalVisible, setEditTransferModalVisible] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
  const [editTransferAmount, setEditTransferAmount] = useState('');
  const [editTransferFromAccount, setEditTransferFromAccount] = useState<number | undefined>(undefined);
  const [editTransferToAccount, setEditTransferToAccount] = useState<number | undefined>(undefined);
  const [editTransferDate, setEditTransferDate] = useState(new Date());
  const [editTransferDescription, setEditTransferDescription] = useState('');
  const [showEditTransferDatePicker, setShowEditTransferDatePicker] = useState(false);

  // Date Handlers
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setTransactionDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setTransactionDate(newDate);
    }
  };

  const onEditDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (selectedDate) setEditDate(selectedDate);
  };

  const onEditTransferDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditTransferDatePicker(false);
    if (selectedDate) setEditTransferDate(selectedDate);
  };

  // Logic
  useEffect(() => {
    const loadData = async () => {
      try {
        await dbOperations.initDatabase();
        setDbInitialized(true);
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);
        if (loadedAccounts.length > 0) setSelectedAccountId(loadedAccounts[0].id);
      } catch (e) {
        console.error("Failed to load initial data:", e);
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
        console.error("Failed to load transactions:", e);
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

  const handleTransaction = async (type: TransactionType) => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return Alert.alert("無效輸入", "請輸入有效的正數金額。");
    if (selectedAccountId === undefined) return Alert.alert("錯誤", "請先選擇一個帳本。");

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
      Alert.alert("成功", `${type === TransactionType.INCOME ? '收入' : '支出'} NT$ ${amount.toFixed(2)} 已記錄!`);
    } catch (error) {
      Alert.alert("交易失敗", "處理交易時發生錯誤。");
      console.error("Transaction failed:", error);
    }
  };

  const handleTransfer = async (amount: number, sourceId: number, targetId: number) => {
    if (isNaN(amount) || amount <= 0) return Alert.alert("無效操作", "請輸入有效金額。");
    if (sourceId === undefined || targetId === undefined || sourceId === targetId) return Alert.alert("無效操作", "請確保轉出與轉入帳本不同且已選定。");

    try {
      const sourceAcc = accounts.find(acc => acc.id === sourceId);
      const targetAcc = accounts.find(acc => acc.id === targetId);
      if (!sourceAcc || !targetAcc) throw new Error("Source or Target account not found.");
      if (sourceAcc.currentBalance < amount) return Alert.alert("餘額不足", "轉出帳本餘額不足。");

      await dbOperations.performTransfer(sourceId, targetId, amount, new Date(), `轉帳: ${sourceAcc.name} -> ${targetAcc.name}`);

      const loadedAccounts = await dbOperations.getAccounts();
      setAccounts(loadedAccounts);
      setTransferModalVisible(false);
      Alert.alert("成功", `NT$ ${amount.toFixed(2)} 已從 ${sourceAcc.name} 轉出至 ${targetAcc.name}。`);
    } catch (error) {
      Alert.alert("轉帳失敗", "處理轉帳時發生錯誤。");
      console.error("Transfer failed:", error);
    }
  };

  const filterTransactions = () => {
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
  };

  const openEditModal = (transaction: Transaction) => {
    if (transaction.type === TransactionType.TRANSFER) return Alert.alert("提示", "轉帳記錄目前不支援直接編輯，請刪除後重新建立。");
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditDescription(transaction.description);
    setEditDate(new Date(transaction.date));
    setEditModalVisible(true);
  };

  const openEditTransferModal = (transaction: Transaction) => {
    setEditingTransfer(transaction);
    setEditTransferAmount(transaction.amount.toString());
    setEditTransferFromAccount(transaction.accountId);
    setEditTransferToAccount(transaction.targetAccountId);
    setEditTransferDate(new Date(transaction.date));
    setEditTransferDescription(transaction.description);
    setEditTransferModalVisible(true);
  };

  const handleUpdateTransfer = async () => {
    if (!editingTransfer || !editTransferFromAccount || !editTransferToAccount) return;
    const amount = parseFloat(editTransferAmount);
    if (isNaN(amount) || amount <= 0) return Alert.alert("錯誤", "請輸入有效金額");

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
      Alert.alert("成功", "轉帳記錄已更新");
    } catch (error) {
      console.error("Update transfer failed:", error);
      Alert.alert("錯誤", "更新轉帳失敗");
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !selectedAccountId) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) return Alert.alert("無效輸入", "請輸入有效的正數金額。");

    try {
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found.");

      let revertedBalance = currentAcc.currentBalance;
      revertedBalance += editingTransaction.type === TransactionType.INCOME ? -editingTransaction.amount : editingTransaction.amount;

      const newBalance = revertedBalance + (editingTransaction.type === TransactionType.INCOME ? newAmount : -newAmount);

      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
      await dbOperations.updateTransactionDB(editingTransaction.id, newAmount, editingTransaction.type, editDate, editDescription);

      await refreshData();
      setEditModalVisible(false);
      Alert.alert("成功", "交易已更新!");
    } catch (error) {
      Alert.alert("更新失敗", "處理交易更新時發生錯誤。");
      console.error("Update transaction failed:", error);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction || !selectedAccountId) return;
    Alert.alert(
      "刪除交易",
      "確定要刪除這筆交易嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
              if (currentAcc) {
                const newBalance = currentAcc.currentBalance + (editingTransaction.type === TransactionType.INCOME ? -editingTransaction.amount : editingTransaction.amount);
                await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
              }
              await dbOperations.deleteTransactionDB(editingTransaction.id);
              await refreshData();
              setEditModalVisible(false);
              Alert.alert("成功", "交易已刪除!");
            } catch (error) {
              Alert.alert("刪除失敗", "處理交易刪除時發生錯誤。");
              console.error("Delete transaction failed:", error);
            }
          }
        }
      ]
    );
  };

  // Render Helpers
  const renderItem = ({ item }: { item: Transaction }) => (
    <TransactionListItem
      item={item}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      colors={colors}
      styles={styles}
      onPress={item.type === TransactionType.TRANSFER ? openEditTransferModal : openEditModal}
    />
  );

  const renderListHeader = () => (
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
      <View style={styles.listHeaderRow}><Text style={styles.listHeader}>近期交易 (帳本: {accounts.find(acc => acc.id === selectedAccountId)?.name})</Text></View>
      <View style={styles.filterContainer}>
        {(['all', 'year', 'month', 'day'] as const).map((type) => (
          <TouchableOpacity key={type} style={[styles.filterButton, filterType === type && styles.filterButtonSelected]} onPress={() => setFilterType(type)}>
            <Text style={[styles.filterButtonText, filterType === type && styles.filterButtonTextSelected]}>{type === 'all' ? '全部' : type === 'year' ? '今年' : type === 'month' ? '本月' : '今天'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderEditSelectionList = () => (
    <View style={{ width: '100%', maxHeight: 300 }}>
      <Text style={styles.modalTitle}>請選擇類別</Text>
      <ScrollView style={{ width: '100%' }}>
        {(editingTransaction?.type === TransactionType.INCOME ? categories.income : categories.expense).map((cat) => (
          <TouchableOpacity key={cat} style={styles.modalListItem} onPress={() => { setEditDescription(cat); setEditSelectionMode('none'); }}>
            <Text style={styles.inputText}>{cat}</Text>
            {editDescription === cat && <Ionicons name="checkmark" size={20} color={colors.tint} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10, backgroundColor: colors.expense }]} onPress={() => setEditSelectionMode('none')}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
    </View>
  );

  const renderEditForm = () => (
    <>
      <Text style={styles.modalTitle}>編輯交易</Text>
      <Text style={styles.inputLabel}>日期</Text>
      <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]} onPress={() => setShowEditDatePicker(true)}>
        <Ionicons name="calendar-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
        <Text style={styles.inputText}>{editDate.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showEditDatePicker && <DateTimePicker value={editDate} mode="date" display="default" onChange={onEditDateChange} />}
      <Text style={styles.inputLabel}>金額</Text>
      <TextInput style={styles.input} placeholder="金額" placeholderTextColor={colors.subtleText} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" />
      <Text style={styles.inputLabel}>類別</Text>
      <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setEditSelectionMode('category')}>
        <Text style={{ color: editDescription ? colors.text : colors.subtleText }}>{editDescription || '請選擇類別'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
      </TouchableOpacity>
      <View style={styles.modalButtons}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setEditModalVisible(false)}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.expense }]} onPress={handleDeleteTransaction}><Text style={styles.buttonText}>刪除</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleUpdateTransaction}><Text style={styles.buttonText}>儲存</Text></TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList data={filterTransactions()} renderItem={renderItem} keyExtractor={(item) => item.id.toString()} ListHeaderComponent={renderListHeader()} ListEmptyComponent={<Text style={styles.emptyText}>無交易紀錄</Text>} contentContainerStyle={{ paddingBottom: 100 }} keyboardDismissMode="on-drag" />
      <TransferModal visible={isTransferModalVisible} onClose={() => setTransferModalVisible(false)} onTransfer={handleTransfer} accounts={accounts} colors={colors} styles={styles} />
      <EditTransferModal visible={isEditTransferModalVisible} onClose={() => setEditTransferModalVisible(false)} onUpdate={handleUpdateTransfer} accounts={accounts} amount={editTransferAmount} setAmount={setEditTransferAmount} fromAccount={editTransferFromAccount} setFromAccount={setEditTransferFromAccount} toAccount={editTransferToAccount} setToAccount={setEditTransferToAccount} date={editTransferDate} description={editTransferDescription} setDescription={setEditTransferDescription} showDatePicker={showEditTransferDatePicker} setShowDatePicker={setShowEditTransferDatePicker} onDateChange={onEditTransferDateChange} colors={colors} styles={styles} />
      <AccountSelectModal visible={isAccountSelectModalVisible} onClose={() => setAccountSelectModalVisible(false)} accounts={accounts} onSelectAccount={setSelectedAccountId} colors={colors} styles={styles} />
      <SettingsModal visible={isSettingsModalVisible} onClose={() => setSettingsModalVisible(false)} onRefreshData={refreshData} colors={colors} styles={styles} />
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}><TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.centeredView}><View style={styles.modalView}>{editSelectionMode === 'none' ? renderEditForm() : renderEditSelectionList()}</View></View></TouchableWithoutFeedback></Modal>
    </View>
  );
}