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
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// 引入資料庫操作 (正確路徑)
import { dbOperations } from '../database';

// ===================================================
// ✨ 數據結構定義
// ===================================================

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
  date: string; // 從資料庫讀取是 string
  description: string;
  accountId: number;
  targetAccountId?: number;
}

// 預設分類 
const defaultCategories = {
  expense: [
    '餐飲', '交通', '服飾', '居住', '購物', '醫療', '保險', '教育', '娛樂', '旅遊', '運動'
  ],
  income: [
    '薪水', '津貼', '兼職', '接案', '股利', '利息', '資本利得', '租金', '稿費', '版稅', '禮金', '退稅', '補助'
  ],
};


// ===================================================
// ✨ 主元件
// ===================================================

export default function TransactionScreen() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 狀態管理
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [categories, setCategories] = useState(defaultCategories);

  // 彈窗狀態
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isAccountSelectModalVisible, setAccountSelectModalVisible] = useState(false);

  // 日期時間選擇狀態
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 篩選狀態
  const [filterType, setFilterType] = useState<'all' | 'day' | 'month' | 'year'>('all');

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setTransactionDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(transactionDate);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setTransactionDate(newDate);
    }
  };

  // --- 資料庫讀取邏輯 ---

  // 1. 初始化資料庫並載入帳本 (App 第一次啟動)
  useEffect(() => {
    const loadData = async () => {
      try {
        await dbOperations.initDatabase();
        setDbInitialized(true);
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);

        // 設置初始選定的帳本和轉帳帳本
        if (loadedAccounts.length > 0) {
          const initialId = loadedAccounts[0].id;
          setSelectedAccountId(initialId);
        }
      } catch (e) {
        console.error("Failed to load initial data:", e);
      }
    };
    loadData();
  }, []);

  // 2. 載入特定帳本的交易記錄 (選定的帳本改變時)
  useEffect(() => {
    if (selectedAccountId === undefined || !dbInitialized) return;

    const loadTransactions = async () => {
      try {
        // 載入與該帳本相關的所有交易 (作為源頭或目標)
        const loadedTransactions = await dbOperations.getTransactionsByAccountDB(selectedAccountId);
        setTransactions(loadedTransactions);
      } catch (e) {
        console.error("Failed to load transactions:", e);
      }
    };
    loadTransactions();
  }, [selectedAccountId, dbInitialized]);

  // 當前餘額的計算 
  const currentBalance = useMemo(() => {
    return accounts.find(acc => acc.id === selectedAccountId)?.currentBalance || 0;
  }, [accounts, selectedAccountId]);

  // 輔助函數：重新從資料庫載入帳本和交易
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
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("無效輸入", "請輸入有效的正數金額。");
      return;
    }
    if (selectedAccountId === undefined) {
      Alert.alert("錯誤", "請先選擇一個帳本。");
      return;
    }

    try {
      // 1. 計算新的餘額
      const currentAcc = accounts.find(acc => acc.id === selectedAccountId);
      if (!currentAcc) throw new Error("Account not found.");

      const isAddition = type === 'income';
      const newBalance = isAddition
        ? currentAcc.currentBalance + amount
        : currentAcc.currentBalance - amount;

      // 2. 更新資料庫中的帳本餘額
      await dbOperations.updateAccountBalanceDB(selectedAccountId, newBalance);

      // 3. 新增交易記錄
      await dbOperations.addTransactionDB({
        amount: amount,
        type: type,
        date: transactionDate,
        description: descriptionInput || (type === 'income' ? '無備註收入' : '無備註支出'),
        accountId: selectedAccountId,
      });

      // 4. 刷新 App 狀態
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
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("無效操作", "請輸入有效金額。");
      return;
    }
    if (sourceId === undefined || targetId === undefined || sourceId === targetId) {
      Alert.alert("無效操作", "請確保轉出與轉入帳本不同且已選定。");
      return;
    }

    try {
      const sourceAcc = accounts.find(acc => acc.id === sourceId);
      const targetAcc = accounts.find(acc => acc.id === targetId);

      if (!sourceAcc || !targetAcc) throw new Error("Source or Target account not found.");

      if (sourceAcc.currentBalance < amount) {
        Alert.alert("餘額不足", "轉出帳本餘額不足。");
        return;
      }

      // 1. 計算新的餘額
      const newSourceBalance = sourceAcc.currentBalance - amount;
      const newTargetBalance = targetAcc.currentBalance + amount;

      // 2. 更新資料庫中的帳本餘額 
      await dbOperations.updateAccountBalanceDB(sourceId, newSourceBalance);
      await dbOperations.updateAccountBalanceDB(targetId, newTargetBalance);

      const now = new Date();

      // 3. 新增轉出交易記錄
      await dbOperations.addTransactionDB({
        amount: amount,
        type: 'transfer',
        date: now,
        description: `轉出至 ${targetAcc.name} `,
        accountId: sourceId,
        targetAccountId: targetId,
      });

      // 4. 新增轉入交易記錄 (記錄在目標帳本的交易列表中)
      await dbOperations.addTransactionDB({
        amount: amount,
        type: 'transfer',
        date: now,
        description: `轉入自 ${sourceAcc.name} `,
        accountId: targetId,
        targetAccountId: sourceId, // 這裡的 targetAccountId 實際上是轉帳的來源 ID
      });

      // 5. 刷新 App 狀態
      const loadedAccounts = await dbOperations.getAccounts();
      setAccounts(loadedAccounts);


      setTransferModalVisible(false);
      Alert.alert("成功", `NT$ ${amount.toFixed(2)} 已從 ${sourceAcc.name} 轉出至 ${targetAcc.name}。`);

    } catch (error) {
      Alert.alert("轉帳失敗", "處理轉帳時發生錯誤。");
      console.error("Transfer failed:", error);
    }
  };

  // --- 自定義設定邏輯 ---

  const handleAddAccount = async (name: string, balance: number, currency: string) => {
    if (!name) {
      Alert.alert("名稱無效", "請輸入新的帳本名稱。");
      return;
    }
    if (isNaN(balance)) {
      Alert.alert("金額無效", "請輸入有效的初始資金。");
      return;
    }

    try {
      const newId = await dbOperations.addAccountDB(name, balance, currency);

      // 刷新 App 狀態
      const loadedAccounts = await dbOperations.getAccounts();
      setAccounts(loadedAccounts);

      // 設置選定的帳本
      if (selectedAccountId === undefined) {
        setSelectedAccountId(newId);
      }


      setAccountSelectModalVisible(false);
      Alert.alert("成功", `帳本「${name}」已新增。`);
    } catch {
      Alert.alert("新增失敗", "新增帳本時發生錯誤。");
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (accounts.length <= 1) {
      Alert.alert("無法刪除", "至少需要保留一個帳本。");
      return;
    }

    try {
      await dbOperations.deleteAccountDB(id);

      // 刷新 App 狀態
      const loadedAccounts = await dbOperations.getAccounts();
      setAccounts(loadedAccounts);

      // 如果刪除的是選定的帳本，則將選定 ID 轉移到第一個帳本
      if (selectedAccountId === id) {
        const newSelectedId = loadedAccounts[0]?.id;
        setSelectedAccountId(newSelectedId);
      }


      Alert.alert("成功", "帳本已刪除。");
    } catch (error: any) {
      if (error.message.includes("transactions")) {
        Alert.alert("無法刪除", "此帳本仍有交易記錄，請先清除相關交易。");
      } else {
        Alert.alert("刪除失敗", "刪除帳本時發生錯誤。");
      }
    }
  };


  const handleAddCategory = (type: 'income' | 'expense', name: string) => {
    if (!name) return;
    setCategories(prev => ({
      ...prev,
      [type]: [...prev[type], name],
    }));
    Alert.alert("成功", `備註「${name}」已加入${type === 'income' ? '收入' : '支出'} 列表！`);
  };



  const filterTransactions = useCallback(() => {
    if (!selectedAccountId) return [];

    let filtered = transactions.filter(t => t.accountId === selectedAccountId || (t.type === 'transfer' && t.targetAccountId === selectedAccountId));

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

  const handleDeleteCategory = (type: 'income' | 'expense', category: string) => {
    setCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== category),
    }));
  };

  const moveCategory = (type: 'income' | 'expense', index: number, direction: 'up' | 'down') => {
    const list = [...categories[type]];
    if (direction === 'up') {
      if (index === 0) return;
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else {
      if (index === list.length - 1) return;
      [list[index + 1], list[index]] = [list[index], list[index + 1]];
    }
    setCategories(prev => ({ ...prev, [type]: list }));
  };

  // 渲染元件 
  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const isTransfer = item.type === 'transfer';

    // 判斷交易方向來決定是加號還是減號
    let amountSign: string;
    let amountColor: string;
    let descriptionText: string;

    // 找出轉出帳本和轉入帳本的名稱
    const sourceAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';
    const targetAccountName = accounts.find(acc => acc.id === item.targetAccountId)?.name || '未知帳本';


    if (isTransfer) {
      // 如果是轉帳，判斷它是「轉出」（accountId）還是「轉入」（targetAccountId）
      if (item.accountId === selectedAccountId) {
        // 當前選定帳本是轉出方
        amountSign = '-';
        descriptionText = `轉出至 ${targetAccountName} `;
      } else {
        // 當前選定帳本是轉入方 (item.targetAccountId 儲存的是來源 ID)
        amountSign = '+';
        descriptionText = `轉入自 ${sourceAccountName} `;
      }
      amountColor = '#FF9500';
    } else {
      amountSign = isIncome ? '+' : '-';
      amountColor = isIncome ? '#4CD964' : '#FF3B30';
      descriptionText = item.description;
    }

    // 交易清單顯示的帳本始終是該筆記錄的帳本ID
    const displayAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';

    // 將 date 字符串轉為 Date 物件以格式化
    const dateObject = new Date(item.date);


    // 取得該帳本的幣別
    const accountCurrency = accounts.find(acc => acc.id === item.accountId)?.currency || 'TWD';

    return (
      <View style={styles.listItem}>
        <View style={styles.listItemTextContainer}>
          <Text style={[styles.listItemType, { color: isTransfer ? '#333' : '#333' }]} numberOfLines={1}>
            {descriptionText}
          </Text>
          <Text style={styles.listItemDate}>
            {displayAccountName} · {dateObject.toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.listItemAmount, { color: amountColor }]}>
          {amountSign} {accountCurrency} {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      {/* 頂部 Header 區 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setAccountSelectModalVisible(true)}
        >
          <Text style={styles.pickerDisplayText}>
            {accounts.find(acc => acc.id === selectedAccountId)?.name || '選擇帳本'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>當前帳本餘額</Text>
        <Text
          style={[styles.balanceText, { color: currentBalance >= 0 ? '#007AFF' : '#FF3B30' }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          {accounts.find(acc => acc.id === selectedAccountId)?.currency || 'TWD'} {currentBalance.toFixed(2)}
        </Text>
      </View>

      {/* 輸入框與按鈕區 */}
      <View style={styles.inputArea}>
        {/* 日期時間選擇區 */}
        <View style={{ flexDirection: 'row', width: '90%', marginBottom: 10, justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={[styles.input, { flex: 1, marginRight: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, color: '#333' }}>
              {transactionDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.input, { flex: 1, marginLeft: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color="#666" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, color: '#333' }}>
              {transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DateTimePicker Components */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal transparent={true} animationType="slide" visible={showDatePicker}>
            <View style={styles.iosModalOverlay}>
              <View style={styles.iosPickerContent}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.iosPickerDoneText}>完成</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={transactionDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  textColor="#000"
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={transactionDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {Platform.OS === 'ios' && showTimePicker && (
          <Modal transparent={true} animationType="slide" visible={showTimePicker}>
            <View style={styles.iosModalOverlay}>
              <View style={styles.iosPickerContent}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.iosPickerDoneText}>完成</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={transactionDate}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  textColor="#000"
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={transactionDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        <TextInput
          style={[styles.input, { width: '90%', marginBottom: 10 }]}
          placeholder="請輸入金額 (例如: 500)"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amountInput}
          onChangeText={setAmountInput}
        />
        <TextInput
          style={[styles.input, { width: '90%', marginBottom: 15 }]}
          placeholder="請輸入備註 (例如: 午餐、薪水)"
          placeholderTextColor="#999"
          value={descriptionInput}
          onChangeText={setDescriptionInput}
        />

        {/* 2. 交易操作區 */}
        <View style={styles.buttonContainer}>
          {/* 收入行 */}
          <View style={styles.transactionRow}>
            <TouchableOpacity
              style={[styles.mainButton, styles.incomeButton, styles.autoWidthButton]}
              onPress={() => handleTransaction('income')}
            >
              <Text style={styles.buttonText}>收入 (＋)</Text>
            </TouchableOpacity>
            <View style={[styles.categoryZone]}>
              {categories.income.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryButton}
                  onPress={() => setDescriptionInput(category)}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 支出行 */}
          <View style={[styles.transactionRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.mainButton, styles.expenseButton, styles.autoWidthButton]}
              onPress={() => handleTransaction('expense')}
            >
              <Text style={styles.buttonText}>支出 (－)</Text>
            </TouchableOpacity>
            <View style={[styles.categoryZone]}>
              {categories.expense.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryButton}
                  onPress={() => setDescriptionInput(category)}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 轉帳行 */}
          <TouchableOpacity
            style={[styles.mainButton, styles.transferButton, { width: '100%', alignSelf: 'center', marginTop: 15, height: 45 }]}
            onPress={() => setTransferModalVisible(true)}
          >
            <Text style={styles.buttonText}>轉帳</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 交易清單顯示區 */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>近期交易 (帳本: {accounts.find(acc => acc.id === selectedAccountId)?.name})</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{ padding: 5 }}>
          <Ionicons name="cog-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 篩選按鈕區 */}
      <View style={styles.filterContainer}>
        {(['all', 'year', 'month', 'day'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              filterType === type && styles.filterButtonSelected
            ]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[
              styles.filterButtonText,
              filterType === type && styles.filterButtonTextSelected
            ]}>
              {type === 'all' ? '全部' : type === 'year' ? '今年' : type === 'month' ? '本月' : '今天'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filterTransactions()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>無交易紀錄</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardDismissMode="on-drag"
      />

      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        onTransfer={handleTransfer}
        accounts={accounts}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onMoveCategory={moveCategory}
        onDeleteAccount={handleDeleteAccount}
        onAddAccount={handleAddAccount}
        accounts={accounts}
      />

      <AccountSelectModal
        visible={isAccountSelectModalVisible}
        onClose={() => setAccountSelectModalVisible(false)}
        accounts={accounts}
        onSelectAccount={setSelectedAccountId}
        onAddAccount={handleAddAccount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { fontSize: 18, color: '#007AFF', marginTop: 10 },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginBottom: 10,
  },
  pickerDisplayText: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 5 },
  title: { fontSize: 14, color: '#8E8E93', marginBottom: 5, letterSpacing: 1 },
  balanceText: { fontSize: 40, fontWeight: '800', color: '#333', letterSpacing: 0.5 },

  // Input Area
  inputArea: {
    padding: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  // Buttons
  buttonContainer: { marginTop: 10, width: '100%' },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainButton: {
    width: 100,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeButton: { backgroundColor: '#34C759' },
  expenseButton: { backgroundColor: '#FF3B30' },
  transferButton: { backgroundColor: '#FF9500' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  autoWidthButton: { width: 'auto', minWidth: 100, paddingHorizontal: 15 },

  // Categories
  categoryZone: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 12,
  },
  categoryButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryText: { fontSize: 13, color: '#666', fontWeight: '500' },

  // List Header & Filter
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  listHeader: { fontSize: 20, fontWeight: '700', color: '#333' },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  filterButtonTextSelected: { color: '#333', fontWeight: '700' },

  // List Item
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  listItemTextContainer: { flex: 1 },
  listItemType: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  listItemDate: { fontSize: 12, color: '#8E8E93' },
  listItemAmount: { fontSize: 17, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#8E8E93' },

  // Modals
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '90%', backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  settingsModalView: { width: '95%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  accountSelectModalView: { width: '90%', maxHeight: '70%', backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, color: '#333' },

  // Modal Inputs & Buttons
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 10 },
  button: { padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalCloseButton: { backgroundColor: '#E5E5EA', flex: 1 },
  modalConfirmButton: { backgroundColor: '#007AFF', flex: 1 },

  // Settings
  settingSubtitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 10 },
  settingListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  settingItemText: { fontSize: 16, color: '#333' },

  // Account Select
  accountSelectItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  accountSelectItemText: { fontSize: 16, color: '#333', textAlign: 'center' },

  // Date Picker
  iosModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosPickerContent: { backgroundColor: '#fff', paddingBottom: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosPickerHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'flex-end' },
  iosPickerDoneText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },

  // Transfer Modal
  transferPicker: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
});

function TransferModal({ visible, onClose, onTransfer, accounts }: any) {
  const [amount, setAmount] = useState('');
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [targetId, setTargetId] = useState<number | undefined>(undefined);

  const handleSubmit = () => {
    if (!amount || !sourceId || !targetId) {
      Alert.alert('錯誤', '請填寫完整資訊');
      return;
    }
    onTransfer(parseFloat(amount), sourceId, targetId);
    setAmount('');
    setSourceId(undefined);
    setTargetId(undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>轉帳</Text>
          <TextInput
            style={[styles.input, { width: '100%', marginBottom: 15 }]}
            placeholder="金額"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <View style={{ width: '100%', marginBottom: 10 }}>
            <Text>從:</Text>
            <View style={styles.transferPicker}>
              <Picker selectedValue={sourceId} onValueChange={setSourceId}>
                <Picker.Item label="請選擇" value={undefined} />
                {accounts.map((acc: any) => <Picker.Item key={acc.id} label={acc.name} value={acc.id} />)}
              </Picker>
            </View>
          </View>
          <View style={{ width: '100%', marginBottom: 20 }}>
            <Text>到:</Text>
            <View style={styles.transferPicker}>
              <Picker selectedValue={targetId} onValueChange={setTargetId}>
                <Picker.Item label="請選擇" value={undefined} />
                {accounts.map((acc: any) => <Picker.Item key={acc.id} label={acc.name} value={acc.id} />)}
              </Picker>
            </View>
          </View>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity style={[styles.button, styles.modalCloseButton]} onPress={onClose}>
              <Text style={styles.buttonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.modalConfirmButton]} onPress={handleSubmit}>
              <Text style={styles.buttonText}>確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingsModal({ visible, onClose, categories, onAddCategory, onDeleteCategory, onMoveCategory, onDeleteAccount, onAddAccount, accounts }: any) {
  const [newCat, setNewCat] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [manageMode, setManageMode] = useState<'category' | 'account'>('category');

  // 新增帳本狀態
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('TWD');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.settingsModalView}>
          <Text style={styles.modalTitle}>設定</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 15 }}>
            <TouchableOpacity onPress={() => setManageMode('category')} style={{ padding: 10, borderBottomWidth: manageMode === 'category' ? 2 : 0, borderColor: '#007AFF' }}>
              <Text style={{ color: manageMode === 'category' ? '#007AFF' : '#666' }}>分類管理</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManageMode('account')} style={{ padding: 10, borderBottomWidth: manageMode === 'account' ? 2 : 0, borderColor: '#007AFF' }}>
              <Text style={{ color: manageMode === 'account' ? '#007AFF' : '#666' }}>帳本管理</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {manageMode === 'category' ? (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <TouchableOpacity onPress={() => setCatType('expense')} style={[styles.button, { backgroundColor: catType === 'expense' ? '#FF3B30' : '#ddd', marginRight: 10, flex: 1 }]}>
                    <Text style={styles.buttonText}>支出</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCatType('income')} style={[styles.button, { backgroundColor: catType === 'income' ? '#4CD964' : '#ddd', flex: 1 }]}>
                    <Text style={styles.buttonText}>收入</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="新分類名稱" value={newCat} onChangeText={setNewCat} />
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF' }]} onPress={() => { onAddCategory(catType, newCat); setNewCat(''); }}>
                    <Text style={styles.buttonText}>新增</Text>
                  </TouchableOpacity>
                </View>
                {categories[catType].map((cat: string, index: number) => (
                  <View key={index} style={styles.settingListItem}>
                    <Text style={styles.settingItemText}>{cat}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => onMoveCategory(catType, index, 'up')}><Ionicons name="arrow-up" size={20} color="#666" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onMoveCategory(catType, index, 'down')}><Ionicons name="arrow-down" size={20} color="#666" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onDeleteCategory(catType, cat)}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 }}>
                  <Text style={styles.settingSubtitle}>新增帳本</Text>
                  <TextInput
                    style={[styles.input, { width: '100%', marginBottom: 10, color: '#333' }]}
                    placeholder="帳本名稱"
                    placeholderTextColor="#666"
                    value={newAccName}
                    onChangeText={setNewAccName}
                  />
                  <TextInput
                    style={[styles.input, { width: '100%', marginBottom: 10, color: '#333' }]}
                    placeholder="初始餘額"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={newAccBalance}
                    onChangeText={setNewAccBalance}
                  />

                  {/* Custom Dropdown for Currency */}
                  <View style={{ width: '100%', marginBottom: 10, zIndex: 1000 }}>
                    <TouchableOpacity
                      style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }]}
                      onPress={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    >
                      <Text style={{ color: '#333' }}>
                        {(() => {
                          switch (newAccCurrency) {
                            case 'TWD': return 'TWD - 新台幣';
                            case 'USD': return 'USD - 美金';
                            case 'JPY': return 'JPY - 日圓';
                            case 'CNY': return 'CNY - 人民幣';
                            case 'HKD': return 'HKD - 港幣';
                            case 'MOP': return 'MOP - 澳門幣';
                            case 'GBP': return 'GBP - 英鎊';
                            case 'KRW': return 'KRW - 韓元';
                            default: return newAccCurrency;
                          }
                        })()}
                      </Text>
                      <Ionicons name={isCurrencyDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>

                    {isCurrencyDropdownOpen && (
                      <View style={{
                        position: 'absolute',
                        top: 50,
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        maxHeight: 200,
                      }}>
                        <ScrollView nestedScrollEnabled={true}>
                          {['TWD', 'USD', 'JPY', 'CNY', 'HKD', 'MOP', 'GBP', 'KRW'].map((curr) => (
                            <TouchableOpacity
                              key={curr}
                              style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                              onPress={() => {
                                setNewAccCurrency(curr);
                                setIsCurrencyDropdownOpen(false);
                              }}
                            >
                              <Text style={{ color: '#333' }}>
                                {(() => {
                                  switch (curr) {
                                    case 'TWD': return 'TWD - 新台幣';
                                    case 'USD': return 'USD - 美金';
                                    case 'JPY': return 'JPY - 日圓';
                                    case 'CNY': return 'CNY - 人民幣';
                                    case 'HKD': return 'HKD - 港幣';
                                    case 'MOP': return 'MOP - 澳門幣';
                                    case 'GBP': return 'GBP - 英鎊';
                                    case 'KRW': return 'KRW - 韓元';
                                    default: return curr;
                                  }
                                })()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#4CD964' }]}
                    onPress={() => {
                      if (newAccName && newAccBalance) {
                        onAddAccount(newAccName, parseFloat(newAccBalance), newAccCurrency);
                        setNewAccName('');
                        setNewAccBalance('');
                        setNewAccCurrency('TWD');
                      } else {
                        Alert.alert('錯誤', '請輸入名稱和初始餘額');
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>新增帳本</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.settingSubtitle}>現有帳本</Text>
                {accounts?.map((acc: any) => (
                  <View key={acc.id} style={styles.settingListItem}>
                    <Text style={styles.settingItemText}>{acc.name} ({acc.currency})</Text>
                    <TouchableOpacity onPress={() => onDeleteAccount(acc.id)}>
                      <Ionicons name="trash" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 15, flex: 0, paddingVertical: 8 }]} onPress={onClose}>
            <Text style={styles.buttonText}>關閉</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AccountSelectModal({ visible, onClose, accounts, onSelectAccount, onAddAccount }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('TWD');

  const handleAdd = () => {
    onAddAccount(name, parseFloat(balance), currency);
    setIsAdding(false);
    setName('');
    setBalance('');
    setCurrency('TWD');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.accountSelectModalView}>
          <Text style={styles.modalTitle}>{isAdding ? '新增帳本' : '選擇帳本'}</Text>

          {isAdding ? (
            <>
              <TextInput style={[styles.input, { width: '100%', marginBottom: 10 }]} placeholder="帳本名稱" value={name} onChangeText={setName} />
              <TextInput style={[styles.input, { width: '100%', marginBottom: 10 }]} placeholder="初始餘額" keyboardType="numeric" value={balance} onChangeText={setBalance} />
              <View style={{ width: '100%', marginBottom: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
                <Picker selectedValue={currency} onValueChange={setCurrency}>
                  <Picker.Item label="TWD - 新台幣" value="TWD" />
                  <Picker.Item label="USD - 美金" value="USD" />
                  <Picker.Item label="JPY - 日圓" value="JPY" />
                  <Picker.Item label="CNY - 人民幣" value="CNY" />
                  <Picker.Item label="HKD - 港幣" value="HKD" />
                  <Picker.Item label="MOP - 澳門幣" value="MOP" />
                  <Picker.Item label="GBP - 英鎊" value="GBP" />
                  <Picker.Item label="KRW - 韓元" value="KRW" />
                </Picker>
              </View>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={[styles.button, styles.modalCloseButton]} onPress={() => setIsAdding(false)}>
                  <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.modalConfirmButton]} onPress={handleAdd}>
                  <Text style={styles.buttonText}>新增</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ScrollView style={{ maxHeight: 300 }}>
                {accounts.map((acc: any) => (
                  <TouchableOpacity key={acc.id} style={styles.accountSelectItem} onPress={() => { onSelectAccount(acc.id); onClose(); }}>
                    <Text style={styles.accountSelectItemText}>{acc.name} ({acc.currency})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#4CD964', marginTop: 15 }]} onPress={() => setIsAdding(true)}>
                <Text style={styles.buttonText}>+ 新增帳本</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 10, flex: 0, paddingVertical: 8 }]} onPress={onClose}>
                <Text style={styles.buttonText}>關閉</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
