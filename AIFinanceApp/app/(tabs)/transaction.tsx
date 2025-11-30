import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Keyboard,
  ScrollView,
  Modal,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '@/app/context/ThemeContext';
import { dbOperations } from '@/app/services/database';
import * as CategoryStorage from '@/app/utils/categoryStorage';

interface Account {
  id: number;
  name: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
}

interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  description: string;
  accountId: number;
  targetAccountId?: number;
}

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
  const styles = getStyles(colors);

  const [dbInitialized, setDbInitialized] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categories, setCategories] = useState<CategoryStorage.Categories>(defaultCategories);
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [isAccountSelectModalVisible, setAccountSelectModalVisible] = useState(false);
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

  const handleTransaction = async (type: 'income' | 'expense') => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return Alert.alert("無效輸入", "請輸入有效的正數金額。");
    if (selectedAccountId === undefined) return Alert.alert("錯誤", "請先選擇一個帳本。");

    try {
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found.");
      const newBalance = type === 'income' ? currentAcc.currentBalance + amount : currentAcc.currentBalance - amount;
      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
      await dbOperations.addTransactionDB({ amount, type, date: transactionDate, description: descriptionInput || (type === 'income' ? '無備註收入' : '無備註支出'), accountId: selectedAccountId });
      await refreshData();
      setAmountInput('');
      setDescriptionInput('');
      Keyboard.dismiss();
      Alert.alert("成功", `${type === 'income' ? '收入' : '支出'} NT$ ${amount.toFixed(2)} 已記錄!`);
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

      const newSourceBalance = sourceAcc.currentBalance - amount;
      const newTargetBalance = targetAcc.currentBalance + amount;
      const now = new Date();
      await dbOperations.updateAccountBalanceDB(sourceId, newSourceBalance);
      await dbOperations.updateAccountBalanceDB(targetId, newTargetBalance);
      await dbOperations.addTransactionDB({ amount, type: 'transfer', date: now, description: `轉出至 ${targetAcc.name}`, accountId: sourceId, targetAccountId: targetId });
      await dbOperations.addTransactionDB({ amount, type: 'transfer', date: now, description: `轉入自 ${sourceAcc.name}`, accountId: targetId, targetAccountId: sourceId });

      const loadedAccounts = await dbOperations.getAccounts();
      setAccounts(loadedAccounts);
      setTransferModalVisible(false);
      Alert.alert("成功", `NT$ ${amount.toFixed(2)} 已從 ${sourceAcc.name} 轉出至 ${targetAcc.name}。`);
    } catch (error) {
      Alert.alert("轉帳失敗", "處理轉帳時發生錯誤。");
      console.error("Transfer failed:", error);
    }
  };

  const filterTransactions = useCallback(() => {
    if (!selectedAccountId) return [];
    const filtered = transactions.filter(t => t.accountId === selectedAccountId || (t.type === 'transfer' && t.targetAccountId === selectedAccountId));
    const now = new Date();
    if (filterType === 'day') return filtered.filter(t => new Date(t.date).toDateString() === now.toDateString()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterType === 'month') return filtered.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterType === 'year') return filtered.filter(t => new Date(t.date).getFullYear() === now.getFullYear()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, filterType]);

  const openEditModal = (transaction: Transaction) => {
    if (transaction.type === 'transfer') return Alert.alert("提示", "轉帳記錄目前不支援直接編輯，請刪除後重新建立。");
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
    setEditTransferDescription(transaction.description || '');
    setEditTransferModalVisible(true);
  };

  const handleUpdateTransfer = async () => {
    if (!editingTransfer || !editTransferFromAccount || !editTransferToAccount) return;
    const amount = parseFloat(editTransferAmount);
    if (isNaN(amount) || amount <= 0) return Alert.alert('錯誤', '請輸入有效的金額');
    if (editTransferFromAccount === editTransferToAccount) return Alert.alert('錯誤', '轉出和轉入帳戶不能相同');

    try {
      await dbOperations.updateTransfer(editingTransfer.id, editingTransfer.accountId, editingTransfer.targetAccountId!, editingTransfer.amount, editTransferFromAccount, editTransferToAccount, amount, editTransferDate, editTransferDescription);
      Alert.alert('成功', '轉帳記錄已更新');
      setEditTransferModalVisible(false);
      await refreshData();
    } catch (error) {
      console.error('更新轉帳失敗:', error);
      Alert.alert('錯誤', '更新轉帳記錄失敗');
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !selectedAccountId) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) return Alert.alert("錯誤", "請輸入有效金額");

    try {
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found");

      let revertedBalance = currentAcc.currentBalance;
      revertedBalance += editingTransaction.type === 'income' ? -editingTransaction.amount : editingTransaction.amount;
      const newBalance = revertedBalance + (editingTransaction.type === 'income' ? newAmount : -newAmount);

      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
      await dbOperations.updateTransactionDB(editingTransaction.id, newAmount, editingTransaction.type, editDate, editDescription);

      setEditModalVisible(false);
      await refreshData();
      Alert.alert("成功", "交易已更新");
    } catch (error) {
      console.error(error);
      Alert.alert("錯誤", "更新失敗");
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction || !selectedAccountId) return;
    Alert.alert("確認刪除", "確定要刪除這筆交易嗎？", [{ text: "取消", style: "cancel" }, {
      text: "刪除", style: "destructive", onPress: async () => {
        try {
          const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
          if (!currentAcc) throw new Error("Account not found");
          const newBalance = currentAcc.currentBalance + (editingTransaction.type === 'income' ? -editingTransaction.amount : editingTransaction.amount);
          await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);
          await dbOperations.deleteTransactionDB(editingTransaction.id);
          setEditModalVisible(false);
          await refreshData();
          Alert.alert("成功", "交易已刪除");
        } catch (error) {
          console.error(error);
          Alert.alert("錯誤", "刪除失敗");
        }
      }
    }]);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isTransfer = item.type === 'transfer';
    const sourceAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';
    const targetAccountName = accounts.find(acc => acc.id === item.targetAccountId)?.name || '未知帳本';

    let amountSign: string, amountColor: string, descriptionText: string;
    if (isTransfer) {
      if (item.accountId === selectedAccountId) {
        amountSign = '-';
        descriptionText = `轉出至 ${targetAccountName}`;
      } else {
        amountSign = '+';
        descriptionText = `轉入自 ${sourceAccountName}`;
      }
      amountColor = '#FF9500';
    } else {
      amountSign = item.type === 'income' ? '+' : '-';
      amountColor = item.type === 'income' ? '#4CD964' : '#FF3B30';
      descriptionText = item.description;
    }

    const displayAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';
    const accountCurrency = accounts.find(acc => acc.id === item.accountId)?.currency || 'TWD';

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => isTransfer ? openEditTransferModal(item) : openEditModal(item)}>
        <View style={styles.listItemTextContainer}>
          <Text style={styles.listItemType} numberOfLines={1}>{descriptionText}</Text>
          <Text style={styles.listItemDate}>{displayAccountName} · {new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.listItemAmount, { color: amountColor }]}>{`${amountSign} ${accountCurrency} ${item.amount.toFixed(2)}`}</Text>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setAccountSelectModalVisible(true)}>
          <Text style={styles.pickerDisplayText}>{accounts.find(acc => acc.id === selectedAccountId)?.name || '選擇帳本'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>當前帳本餘額</Text>
        <Text style={[styles.balanceText, { color: currentBalance >= 0 ? '#007AFF' : '#FF3B30' }]} numberOfLines={1} adjustsFontSizeToFit={true}>
          {`${accounts.find(acc => acc.id === selectedAccountId)?.currency || 'TWD'} ${currentBalance.toFixed(2)}`}
        </Text>
      </View>
      <View style={styles.inputArea}>
        <View style={{ flexDirection: 'row', width: '90%', marginBottom: 10, justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.input, { flex: 1, marginRight: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
            <Text style={styles.inputText}>{transactionDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, { flex: 1, marginLeft: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
            <Text style={styles.inputText}>{transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && <DateTimePicker value={transactionDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} textColor={colors.text} />}
        {showTimePicker && <DateTimePicker value={transactionDate} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} textColor={colors.text} />}
        <TextInput style={[styles.input, { width: '90%', marginBottom: 10 }]} placeholder="請輸入金額 (例如: 500)" placeholderTextColor={colors.subtleText} keyboardType="numeric" value={amountInput} onChangeText={setAmountInput} />
        <TextInput style={[styles.input, { width: '90%', marginBottom: 15 }]} placeholder="請輸入類別 (例如: 午餐、薪水)" placeholderTextColor={colors.subtleText} value={descriptionInput} onChangeText={setDescriptionInput} />
        <View style={styles.buttonContainer}>
          <View style={styles.transactionRow}><TouchableOpacity style={[styles.mainButton, styles.incomeButton, styles.autoWidthButton]} onPress={() => handleTransaction('income')}><Text style={styles.buttonText}>收入 (＋)</Text></TouchableOpacity><View style={styles.categoryZone}>{categories.income.map((category, index) => (<TouchableOpacity key={index} style={styles.categoryButton} onPress={() => setDescriptionInput(category)}><Text style={styles.categoryText}>{category}</Text></TouchableOpacity>))}</View></View>
          <View style={[styles.transactionRow, { marginTop: 8 }]}><TouchableOpacity style={[styles.mainButton, styles.expenseButton, styles.autoWidthButton]} onPress={() => handleTransaction('expense')}><Text style={styles.buttonText}>支出 (－)</Text></TouchableOpacity><View style={styles.categoryZone}>{categories.expense.map((category, index) => (<TouchableOpacity key={index} style={styles.categoryButton} onPress={() => setDescriptionInput(category)}><Text style={styles.categoryText}>{category}</Text></TouchableOpacity>))}</View></View>
          <TouchableOpacity style={[styles.mainButton, styles.transferButton, { width: '100%', alignSelf: 'center', marginTop: 15, height: 45 }]} onPress={() => setTransferModalVisible(true)}><Text style={styles.buttonText}>轉帳</Text></TouchableOpacity>
        </View>
      </View>
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
        {(editingTransaction?.type === 'income' ? categories.income : categories.expense).map((cat) => (
          <TouchableOpacity key={cat} style={styles.modalListItem} onPress={() => { setEditDescription(cat); setEditSelectionMode('none'); }}>
            <Text style={styles.inputText}>{cat}</Text>
            {editDescription === cat && <Ionicons name="checkmark" size={20} color={colors.tint} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10, backgroundColor: '#FF3B30' }]} onPress={() => setEditSelectionMode('none')}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
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
        <TouchableOpacity style={[styles.button, { backgroundColor: '#FF3B30' }]} onPress={handleDeleteTransaction}><Text style={styles.buttonText}>刪除</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleUpdateTransaction}><Text style={styles.buttonText}>儲存</Text></TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList data={filterTransactions()} renderItem={renderItem} keyExtractor={(item) => item.id.toString()} ListHeaderComponent={renderListHeader()} ListEmptyComponent={<Text style={styles.emptyText}>無交易紀錄</Text>} contentContainerStyle={{ paddingBottom: 100 }} keyboardDismissMode="on-drag" />
      <TransferModal visible={isTransferModalVisible} onClose={() => setTransferModalVisible(false)} onTransfer={handleTransfer} accounts={accounts} colors={colors} styles={styles} />
      <EditTransferModal visible={isEditTransferModalVisible} onClose={() => setEditTransferModalVisible(false)} onUpdate={handleUpdateTransfer} accounts={accounts} amount={editTransferAmount} setAmount={setEditTransferAmount} fromAccount={editTransferFromAccount} setFromAccount={setEditTransferFromAccount} toAccount={editTransferToAccount} setToAccount={setEditTransferToAccount} date={editTransferDate} setDate={setEditTransferDate} description={editTransferDescription} setDescription={setEditTransferDescription} showDatePicker={showEditTransferDatePicker} setShowDatePicker={setShowEditTransferDatePicker} onDateChange={onEditTransferDateChange} colors={colors} styles={styles} />
      <AccountSelectModal visible={isAccountSelectModalVisible} onClose={() => setAccountSelectModalVisible(false)} accounts={accounts} onSelectAccount={setSelectedAccountId} colors={colors} styles={styles} />
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}><TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.centeredView}><View style={styles.modalView}>{editSelectionMode === 'none' ? renderEditForm() : renderEditSelectionList()}</View></View></TouchableWithoutFeedback></Modal>
    </View>
  );
}

function TransferModal({ visible, onClose, onTransfer, accounts, colors, styles }: any) {
  const [amount, setAmount] = useState('');
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [targetId, setTargetId] = useState<number | undefined>(undefined);
  const [selectionMode, setSelectionMode] = useState<'none' | 'source' | 'target'>('none');

  const handleSubmit = () => {
    if (!amount || !sourceId || !targetId) return Alert.alert('錯誤', '請填寫完整資訊');
    onTransfer(parseFloat(amount), sourceId, targetId);
    setAmount('');
    setSourceId(undefined);
    setTargetId(undefined);
    onClose();
  };

  const renderSelectionList = () => (
    <View style={{ width: '100%', maxHeight: 300 }}>
      <Text style={styles.modalTitle}>請選擇{selectionMode === 'source' ? '轉出' : '轉入'}帳本</Text>
      <ScrollView style={{ width: '100%' }}>
        {accounts.map((acc: any) => (
          <TouchableOpacity key={acc.id} style={styles.modalListItem} onPress={() => { (selectionMode === 'source' ? setSourceId : setTargetId)(acc.id); setSelectionMode('none'); }}>
            <Text style={styles.inputText}>{`${acc.name} (${acc.currency})`}</Text>
            {(selectionMode === 'source' ? sourceId === acc.id : targetId === acc.id) && <Ionicons name="checkmark" size={20} color={colors.tint} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10, backgroundColor: '#FF3B30' }]} onPress={() => setSelectionMode('none')}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
    </View>
  );

  const renderForm = () => (
    <>
      <Text style={styles.modalTitle}>轉帳</Text>
      <TextInput style={[styles.input, { width: '100%', marginBottom: 15 }]} placeholder="金額" placeholderTextColor={colors.subtleText} keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <View style={{ width: '100%', marginBottom: 10 }}>
        <Text style={styles.inputLabel}>從:</Text>
        <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectionMode('source')}>
          <Text style={{ color: sourceId ? colors.text : colors.subtleText }}>{accounts.find((acc: any) => acc.id === sourceId)?.name || '請選擇轉出帳本'}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
        </TouchableOpacity>
      </View>
      <View style={{ width: '100%', marginBottom: 20 }}>
        <Text style={styles.inputLabel}>到:</Text>
        <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectionMode('target')}>
          <Text style={{ color: targetId ? colors.text : colors.subtleText }}>{accounts.find((acc: any) => acc.id === targetId)?.name || '請選擇轉入帳本'}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
        </TouchableOpacity>
      </View>
      <View style={styles.modalButtonContainer}>
        <TouchableOpacity style={[styles.button, styles.modalCloseButton]} onPress={onClose}><Text style={[styles.buttonText, { color: colors.text }]}>取消</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.modalConfirmButton]} onPress={handleSubmit}><Text style={styles.buttonText}>確認</Text></TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}><TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.centeredView}><View style={styles.modalView}>{selectionMode === 'none' ? renderForm() : renderSelectionList()}</View></View></TouchableWithoutFeedback></Modal>
  );
}

function AccountSelectModal({ visible, onClose, accounts, onSelectAccount, colors, styles }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.accountSelectModalView}>
          <Text style={styles.modalTitle}>選擇帳本</Text>
          <ScrollView style={{ maxHeight: 300, width: '100%' }}>
            {accounts.map((acc: any) => (
              <TouchableOpacity key={acc.id} style={styles.accountSelectItem} onPress={() => { onSelectAccount(acc.id); onClose(); }}>
                <Text style={styles.accountSelectItemText}>{`${acc.name} (${acc.currency})`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 10, flex: 0, paddingVertical: 8 }]} onPress={onClose}><Text style={[styles.buttonText, { color: colors.text }]}>關閉</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function EditTransferModal({ visible, onClose, onUpdate, accounts, amount, setAmount, fromAccount, setFromAccount, toAccount, setToAccount, date, onDateChange, description, setDescription, showDatePicker, setShowDatePicker, colors, styles }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>編輯轉帳記錄</Text>
          <Text style={styles.label}>金額</Text>
          <TextInput style={styles.input} placeholder="輸入金額" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholderTextColor={colors.subtleText} />
          <Text style={styles.label}>從 (轉出)</Text>
          <View style={styles.pickerContainer}><Picker selectedValue={fromAccount} onValueChange={setFromAccount} style={{ color: colors.text }} dropdownIconColor={colors.text}><Picker.Item label="選擇帳戶" value={undefined} />{accounts.map((acc: Account) => (<Picker.Item key={acc.id} label={acc.name} value={acc.id} />))}</Picker></View>
          <Text style={styles.label}>到 (轉入)</Text>
          <View style={styles.pickerContainer}><Picker selectedValue={toAccount} onValueChange={setToAccount} style={{ color: colors.text }} dropdownIconColor={colors.text}><Picker.Item label="選擇帳戶" value={undefined} />{accounts.map((acc: Account) => (<Picker.Item key={acc.id} label={acc.name} value={acc.id} />))}</Picker></View>
          <Text style={styles.label}>日期</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}><Text style={{ color: colors.text }}>{date.toLocaleDateString('zh-TW')}</Text></TouchableOpacity>
          {showDatePicker && (<DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />)}
          <Text style={styles.label}>備註</Text>
          <TextInput style={styles.input} placeholder="輸入備註（選填）" value={description} onChangeText={setDescription} placeholderTextColor={colors.subtleText} />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={onUpdate}><Text style={styles.buttonText}>確認</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.card,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    padding: 5,
  },
  pickerDisplayText: {
    fontSize: 50,
    fontWeight: '600',
    color: colors.accent, // Changed from tint to accent
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    color: colors.subtleText,
    marginTop: 5,
  },
  balanceText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  inputArea: {
    backgroundColor: colors.card,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 20,
  },
  input: {
    height: 45,
    borderColor: colors.borderColor,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    width: '100%',
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginBottom: 5,
    fontSize: 14,
    color: colors.subtleText,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '90%',
    marginTop: 5,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  mainButton: {
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  autoWidthButton: {
    flex: 1,
    marginRight: 10,
  },
  incomeButton: {
    backgroundColor: '#34C759',
  },
  expenseButton: {
    backgroundColor: '#FF3B30',
  },
  transferButton: {
    backgroundColor: '#FF9500',
  },
  categoryZone: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  categoryButton: {
    backgroundColor: colors.inputBackground,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    margin: 3,
  },
  categoryText: {
    fontSize: 12,
    color: colors.text,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  listItem: {
    backgroundColor: colors.card,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  listItemDate: {
    fontSize: 12,
    color: colors.subtleText,
  },
  listItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.subtleText,
    marginTop: 20,
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalListItem: {
    width: '100%',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  accountSelectModalView: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: "#8E8E93",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    marginHorizontal: 4,
  },
  filterButtonSelected: {
    backgroundColor: colors.accent, // Changed from tint to accent
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.subtleText,
  },
  filterButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  iosPickerContent: {
    backgroundColor: colors.card,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  iosPickerDoneText: {
    color: colors.accent, // Use accent color for consistency
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10
  },
  modalCloseButton: {
    backgroundColor: colors.inputBackground,
    flex: 1
  },
  modalConfirmButton: {
    backgroundColor: colors.accent,
    flex: 1
  },
  accountSelectItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  accountSelectItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
    marginTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: colors.inputBackground,
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 10,
    backgroundColor: colors.inputBackground,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
});