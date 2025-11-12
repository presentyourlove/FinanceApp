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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons'; 

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
    '午餐', '晚餐', '交通', '購物', '娛樂', '水電費', '客戶A專案尾款 - 測試'
  ],
  income: [
    '薪水', '兼職', '投資收益', '禮金', '客戶B專案尾款 - 測試自適應' 
  ],
};


// ===================================================
// ✨ 主元件
// ===================================================

export default function TransactionScreen() {
  const insets = useSafeAreaInsets();
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
  const [transferAmount, setTransferAmount] = useState(''); 
  const [sourceAccountId, setSourceAccountId] = useState<number | undefined>(undefined); 
  const [targetAccountId, setTargetAccountId] = useState<number | undefined>(undefined); 
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false); 
  const [newAccountName, setNewAccountName] = useState(''); 
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState(''); 
  const [newCategoryInput, setNewCategoryInput] = useState(''); 
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense'); 

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
                setSourceAccountId(initialId);
                
                if (loadedAccounts.length > 1) {
                    setTargetAccountId(loadedAccounts[1].id);
                } else {
                    setTargetAccountId(undefined);
                }
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
        date: new Date(),
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
  
  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("無效操作", "請輸入有效金額。");
      return;
    }
    if (sourceAccountId === undefined || targetAccountId === undefined || sourceAccountId === targetAccountId) {
      Alert.alert("無效操作", "請確保轉出與轉入帳本不同且已選定。");
      return;
    }

    try {
        const sourceAcc = accounts.find(acc => acc.id === sourceAccountId);
        const targetAcc = accounts.find(acc => acc.id === targetAccountId);
        
        if (!sourceAcc || !targetAcc) throw new Error("Source or Target account not found.");

        if (sourceAcc.currentBalance < amount) {
          Alert.alert("餘額不足", "轉出帳本餘額不足。");
          return;
        }

        // 1. 計算新的餘額
        const newSourceBalance = sourceAcc.currentBalance - amount;
        const newTargetBalance = targetAcc.currentBalance + amount;

        // 2. 更新資料庫中的帳本餘額 
        await dbOperations.updateAccountBalanceDB(sourceAccountId, newSourceBalance);
        await dbOperations.updateAccountBalanceDB(targetAccountId, newTargetBalance);
        
        const now = new Date();

        // 3. 新增轉出交易記錄
        await dbOperations.addTransactionDB({
          amount: amount,
          type: 'transfer',
          date: now,
          description: `轉出至 ${targetAcc.name}`,
          accountId: sourceAccountId,
          targetAccountId: targetAccountId,
        });
        
        // 4. 新增轉入交易記錄 (記錄在目標帳本的交易列表中)
        await dbOperations.addTransactionDB({
          amount: amount,
          type: 'transfer',
          date: now,
          description: `轉入自 ${sourceAcc.name}`,
          accountId: targetAccountId, 
          targetAccountId: sourceAccountId, // 這裡的 targetAccountId 實際上是轉帳的來源 ID
        });

        // 5. 刷新 App 狀態
        await refreshData();

        setTransferAmount('');
        setTransferModalVisible(false);
        Alert.alert("成功", `NT$ ${amount.toFixed(2)} 已從 ${sourceAcc.name} 轉出至 ${targetAcc.name}。`);

    } catch (error) {
        Alert.alert("轉帳失敗", "處理轉帳時發生錯誤。");
        console.error("Transfer failed:", error);
    }
  };

  // --- 自定義設定邏輯 ---
  
  const handleAddAccount = async () => {
    const initialBalance = parseFloat(newAccountInitialBalance || '0');

    if (!newAccountName) {
      Alert.alert("名稱無效", "請輸入新的帳本名稱。");
      return;
    }
    if (isNaN(initialBalance)) {
        Alert.alert("金額無效", "請輸入有效的初始資金。");
        return;
    }

    try {
        const newId = await dbOperations.addAccountDB(newAccountName, initialBalance);
        
        // 刷新 App 狀態
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);

        // 設置選定的帳本和轉帳目標
        if (selectedAccountId === undefined) {
            setSelectedAccountId(newId);
            setSourceAccountId(newId);
        }
        if (accounts.length === 1 && loadedAccounts.length > 1) {
             // 如果這是第二個帳本，將其設為目標帳本
             setTargetAccountId(newId);
        }

        setNewAccountName('');
        setNewAccountInitialBalance(''); 
        Alert.alert("成功", `帳本「${newAccountName}」已新增。`);
    } catch (error) {
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
            setSourceAccountId(newSelectedId);
        }
        // 更新轉帳目標ID
        if (targetAccountId === id) {
             setTargetAccountId(loadedAccounts.length > 1 ? loadedAccounts.find(acc => acc.id !== selectedAccountId)?.id : undefined);
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


  const handleAddCategory = () => {
    if (!newCategoryInput) return;

    setCategories(prev => ({
      ...prev,
      [newCategoryType]: [...prev[newCategoryType], newCategoryInput],
    }));

    setNewCategoryInput('');
    Alert.alert("成功", `備註「${newCategoryInput}」已加入${newCategoryType === 'income' ? '收入' : '支出'}列表！`);
  };

  const handleDeleteCategory = (type: 'income' | 'expense', category: string) => {
    setCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== category),
    }));
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
            descriptionText = `轉出至 ${targetAccountName}`; // ✅ 修正這裡：使用 targetAccountName
        } else {
            // 當前選定帳本是轉入方 (item.targetAccountId 儲存的是來源 ID)
            amountSign = '+';
            descriptionText = `轉入自 ${sourceAccountName}`; // ✅ 修正這裡：使用 sourceAccountName
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
          {amountSign} NT$ {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };
  
  // 彈窗元件 (Modal)
  const TransferModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isTransferModalVisible}
      onRequestClose={() => setTransferModalVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>帳本間轉帳</Text>
          
          <View style={styles.transferRow}>
            <Text style={styles.transferLabel}>轉出帳本:</Text>
            <Picker
              selectedValue={sourceAccountId}
              onValueChange={(itemValue: number) => setSourceAccountId(itemValue)}
              style={styles.transferPicker}
            >
              {accounts.map(acc => (
                <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
              ))}
            </Picker>
          </View>
          
          <View style={styles.transferRow}>
            <Text style={styles.transferLabel}>轉入帳本:</Text>
            <Picker
              selectedValue={targetAccountId}
              onValueChange={(itemValue: number) => setTargetAccountId(itemValue)}
              style={styles.transferPicker}
            >
              {accounts.map(acc => (
                <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
              ))}
            </Picker>
          </View>

          <TextInput
            style={[styles.input, { width: '100%', marginVertical: 15 }]}
            placeholder="轉帳金額"
            keyboardType="numeric"
            value={transferAmount}
            onChangeText={setTransferAmount}
          />
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.modalCloseButton]}
              onPress={() => setTransferModalVisible(false)}
            >
              <Text style={styles.buttonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.modalConfirmButton]}
              onPress={handleTransfer}
            >
              <Text style={styles.buttonText}>確認轉帳</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const SettingsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isSettingsModalVisible}
      onRequestClose={() => setSettingsModalVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.settingsModalView}>
          <Text style={styles.modalTitle}>自定義設定</Text>
          <ScrollView style={{ maxHeight: 500 }}>

            {/* A. 帳本管理 */}
            <Text style={styles.settingSectionTitle}>A. 帳本管理</Text>
            <View style={styles.settingsSection}>
              {/* 新增帳本輸入區 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TextInput
                    style={[styles.input, { flex: 1, marginRight: 5 }]}
                    placeholder="新帳本名稱"
                    value={newAccountName}
                    onChangeText={setNewAccountName}
                />
                <TextInput
                    style={[styles.input, { width: '30%', marginRight: 5 }]}
                    placeholder="初始資金"
                    keyboardType="numeric"
                    value={newAccountInitialBalance}
                    onChangeText={setNewAccountInitialBalance}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              {accounts.map(acc => (
                <View key={acc.id} style={styles.settingListItem}>
                  <Text style={styles.settingItemText}>{acc.name} (NT$ {acc.currentBalance.toFixed(0)})</Text>
                  <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)}>
                    <Ionicons name="trash-bin-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* B. 常用備註管理 */}
            <Text style={styles.settingSectionTitle}>B. 常用備註管理 (本地儲存)</Text>
            <View style={styles.settingsSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Picker
                  selectedValue={newCategoryType}
                  onValueChange={(itemValue) => setNewCategoryType(itemValue)}
                  style={styles.categoryTypePicker}
                >
                  <Picker.Item label="支出備註" value="expense" />
                  <Picker.Item label="收入備註" value="income" />
                </Picker>
                <TextInput
                  style={[styles.input, { width: '45%', marginHorizontal: 5 }]}
                  placeholder="新備註"
                  value={newCategoryInput}
                  onChangeText={setNewCategoryInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
                  <Ionicons name="add-circle" size={24} color="#4CD964" />
                </TouchableOpacity>
              </View>

              {/* 顯示支出備註 */}
              <Text style={styles.settingSubtitle}>- 支出備註</Text>
              <View style={styles.categoryListRow}>
                {categories.expense.map((cat, index) => (
                  <View key={index} style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{cat}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCategory('expense', cat)} style={{marginLeft: 5}}>
                       <Ionicons name="close-circle-outline" size={16} color="#333" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* 顯示收入備註 */}
              <Text style={styles.settingSubtitle}>- 收入備註</Text>
               <View style={styles.categoryListRow}>
                {categories.income.map((cat, index) => (
                  <View key={index} style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{cat}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCategory('income', cat)} style={{marginLeft: 5}}>
                      <Ionicons name="close-circle-outline" size={16} color="#333" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, styles.modalCloseButton, { marginTop: 15 }]}
            onPress={() => setSettingsModalVisible(false)}
          >
            <Text style={styles.buttonText}>關閉設定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );


  const renderListHeader = () => (
    <>
      {/* 頂部 Header 區 */}
      <View style={styles.header}>
        <Picker
          selectedValue={selectedAccountId}
          onValueChange={(itemValue: number) => setSelectedAccountId(itemValue)}
          style={styles.picker}
        >
          {accounts.map(account => (
            <Picker.Item key={account.id} label={account.name} value={account.id} />
          ))}
        </Picker>

        <Text style={styles.title}>當前帳本餘額</Text>
        <Text style={[styles.balanceText, { color: currentBalance >= 0 ? '#007AFF' : '#FF3B30' }]}>
          NT$ {currentBalance.toFixed(2)}
        </Text>
      </View>

      {/* 輸入框與按鈕區 */}
      <View style={styles.inputArea}>

        {/* 1. 金額/備註輸入框 (頂部) */}
        <TextInput
          style={[styles.input, { width: '90%', marginBottom: 10 }]}
          placeholder="請輸入金額 (例如: 500)"
          keyboardType="numeric"
          value={amountInput}
          onChangeText={setAmountInput}
        />
        <TextInput
          style={[styles.input, { width: '90%', marginBottom: 15 }]}
          placeholder="請輸入備註 (例如: 午餐、薪水)"
          value={descriptionInput}
          onChangeText={setDescriptionInput}
        />

        {/* 2. 交易操作區 */}
        <View style={styles.buttonContainer}>

            {/* 收入行：按鈕 + 備註 */}
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

            {/* 支出行：按鈕 + 備註 */}
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

            {/* 轉帳行：單獨按鈕 */}
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
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{padding: 5}}>
            <Ionicons name="cog-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </>
  );


  // ---------------------------------------------------
  // 主介面渲染
  // ---------------------------------------------------
  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20,
        }}
        scrollEnabled={true}
        data={transactions}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        renderItem={({ item }) => renderItem({ item })}
        ListHeaderComponent={renderListHeader()}
        ListEmptyComponent={() => <Text style={styles.emptyText}>此帳本目前沒有交易記錄</Text>}
      />

      {/* 彈窗渲染 */}
      <TransferModal />
      <SettingsModal />

    </View>
  );
}

// ===================================================
// ✨ 樣式表 (Styles)
// ===================================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    loadingText: { fontSize: 18, color: '#007AFF' },
    header: { alignItems: 'center', paddingTop: 75, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    picker: { width: '50%', height: 40, marginBottom: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'normal', color: '#666', marginBottom: 5 },
    balanceText: { fontSize: 40, fontWeight: '800' },
    
    inputArea: { alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
    input: { padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 15 },
    
    // ✨ 交易操作區塊樣式
    buttonContainer: { width: '90%', paddingBottom: 5, alignSelf: 'center' }, 
    transactionRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        minHeight: 50,
    },
    mainButton: { 
        padding: 10, 
        borderRadius: 8, 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 45,
    },
    autoWidthButton: {
        paddingHorizontal: 15, 
        marginRight: 10, 
    },
    categoryZone: {
        flex: 1, 
        flexDirection: 'row',
        flexWrap: 'wrap', 
        paddingTop: 0, 
    },
    categoryButton: { 
        backgroundColor: '#e0e0e0', 
        borderRadius: 15, 
        paddingVertical: 6, 
        paddingHorizontal: 12, 
        marginRight: 8, 
        marginBottom: 8, 
    },
    categoryText: { fontSize: 14, color: '#333' },

    // 顏色樣式
    incomeButton: { backgroundColor: '#4CD964' }, 
    expenseButton: { backgroundColor: '#FF3B30' },
    transferButton: { backgroundColor: '#FF9500' }, 
    
    // 通用 button 樣式 
    button: { 
        padding: 10, 
        borderRadius: 8, 
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 15, backgroundColor: '#eee' },
    listHeader: { fontSize: 18, fontWeight: 'bold', padding: 15, color: '#333' },
    list: { flex: 1 },
    
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
    listItemTextContainer: { flex: 1, marginRight: 10 },
    listItemType: { fontSize: 16, fontWeight: '600', color: '#333' },
    listItemDate: { fontSize: 12, color: '#999', marginTop: 2 },
    listItemAmount: { fontSize: 18, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
    
    // --- Modal 樣式 ---
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
    settingsModalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '95%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    
    transferRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginVertical: 8 },
    transferLabel: { fontSize: 16, marginRight: 10, fontWeight: '500' },
    transferPicker: { flex: 1, height: 40, backgroundColor: '#f0f0f0', borderRadius: 8 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    modalCloseButton: { backgroundColor: '#8E8E93', width: '48%' },
    modalConfirmButton: { backgroundColor: '#007AFF', width: '48%' },

    // --- 設定區塊樣式 ---
    settingSectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    settingsSection: { width: '100%', paddingHorizontal: 5, marginBottom: 15 },
    settingListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    settingItemText: { flex: 1, fontSize: 15 },
    addButton: { padding: 5, borderRadius: 5 },

    settingSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 5 },
    categoryTypePicker: { width: '50%', height: 40, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 10 },
    categoryListRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    categoryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
    categoryPillText: { fontSize: 14 },
});