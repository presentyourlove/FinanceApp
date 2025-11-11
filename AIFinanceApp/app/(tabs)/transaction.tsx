// app/(tabs)/transaction.tsx

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons'; 

// ===================================================
// ✨ 數據結構定義 (保持不變)
// ===================================================

interface Account {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
}

interface Transaction {
  id: string; 
  amount: number; 
  type: 'income' | 'expense' | 'transfer'; 
  date: Date; 
  description: string;
  accountId: string; 
  targetAccountId?: string; 
}

// ===================================================
// ✨ 預設數據 (保持不變)
// ===================================================

const initialAccounts: Account[] = [
  { id: '1', name: '錢包', initialBalance: 500, currentBalance: 500 },
  { id: '2', name: '銀行戶口', initialBalance: 50000, currentBalance: 50000 },
  { id: '3', name: '信用卡', initialBalance: 0, currentBalance: 0 },
];

const defaultCategories = {
  expense: [
    '午餐', '晚餐', '交通', '購物', '娛樂', '水電費', '客戶A專案尾款 - 測試'
  ],
  income: [
    '薪水', '兼職', '投資收益', '禮金', '客戶B專案尾款 - 測試自適應' 
  ],
};


// ===================================================
// ✨ 主元件 (核心邏輯保持不變)
// ===================================================

export default function TransactionScreen() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts); 
  const [transactions, setTransactions] = useState<Transaction[]>([]); 
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0].id);

  const [amountInput, setAmountInput] = useState(''); 
  const [descriptionInput, setDescriptionInput] = useState(''); 
  const [categories, setCategories] = useState(defaultCategories); 

  const [isTransferModalVisible, setTransferModalVisible] = useState(false); 
  const [transferAmount, setTransferAmount] = useState(''); 
  const [sourceAccountId, setSourceAccountId] = useState(initialAccounts[0].id); 
  const [targetAccountId, setTargetAccountId] = useState(initialAccounts.length > 1 ? initialAccounts[1].id : initialAccounts[0].id); 

  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false); 
  const [newAccountName, setNewAccountName] = useState(''); 
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState(''); 
  const [newCategoryInput, setNewCategoryInput] = useState(''); 
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense'); 


  const currentBalance = useMemo(() => {
    return accounts.find(acc => acc.id === selectedAccountId)?.currentBalance || 0;
  }, [accounts, selectedAccountId]);

  // 交易處理邏輯 (省略... 保持不變)
  const updateAccountBalance = useCallback((accountId: string, amount: number, isAddition: boolean) => {
    return accounts.map(account => {
      if (account.id === accountId) {
        const newBalance = isAddition 
          ? account.currentBalance + amount 
          : account.currentBalance - amount;
        return { ...account, currentBalance: newBalance };
      }
      return account;
    });
  }, [accounts]);


  const handleTransaction = (type: 'income' | 'expense') => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("無效輸入", "請輸入有效的正數金額。");
      return;
    }

    const updatedAccounts = updateAccountBalance(
      selectedAccountId, 
      amount, 
      type === 'income'
    );
    setAccounts(updatedAccounts);

    const newTransaction: Transaction = {
      id: Date.now().toString(), 
      amount: amount,
      type: type,
      date: new Date(),
      description: descriptionInput || (type === 'income' ? '無備註收入' : '無備註支出'),
      accountId: selectedAccountId,
    };
    
    setTransactions([newTransaction, ...transactions]); 

    setAmountInput('');
    setDescriptionInput('');
    Keyboard.dismiss(); 
  };
  
  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    
    if (isNaN(amount) || amount <= 0 || sourceAccountId === targetAccountId) {
      Alert.alert("無效操作", "請輸入有效金額，並確保轉出與轉入帳本不同。");
      return;
    }

    const sourceAccount = accounts.find(acc => acc.id === sourceAccountId);
    if (!sourceAccount || sourceAccount.currentBalance < amount) {
      Alert.alert("餘額不足", "轉出帳本餘額不足。");
      return;
    }

    let updatedAccounts = accounts;
    updatedAccounts = updatedAccounts.map(acc => 
      acc.id === sourceAccountId ? { ...acc, currentBalance: acc.currentBalance - amount } : acc
    );
    updatedAccounts = updatedAccounts.map(acc => 
      acc.id === targetAccountId ? { ...acc, currentBalance: acc.currentBalance + amount } : acc
    );
    
    setAccounts(updatedAccounts);

    const transferOut: Transaction = {
      id: Date.now().toString() + '-out', 
      amount: amount,
      type: 'transfer',
      date: new Date(),
      description: `轉出至 ${accounts.find(acc => acc.id === targetAccountId)?.name}`,
      accountId: sourceAccountId,
      targetAccountId: targetAccountId,
    };
    const transferIn: Transaction = {
      id: Date.now().toString() + '-in', 
      amount: amount,
      type: 'transfer',
      date: new Date(),
      description: `轉入自 ${sourceAccount.name}`,
      accountId: targetAccountId, 
      targetAccountId: sourceAccount.id, // 使用 sourceAccount.id 作為轉入交易的目標帳本 ID
    };
    
    setTransactions([transferOut, transferIn, ...transactions]); 

    setTransferAmount('');
    setTransferModalVisible(false);
  };

  // 自定義設定邏輯 (省略... 保持不變)
  const handleAddAccount = () => {
    const initialBalance = parseFloat(newAccountInitialBalance || '0');

    if (!newAccountName) {
      Alert.alert("名稱無效", "請輸入新的帳本名稱。");
      return;
    }
    if (isNaN(initialBalance)) {
        Alert.alert("金額無效", "請輸入有效的初始資金。");
        return;
    }

    const newAccount: Account = {
      id: Date.now().toString(),
      name: newAccountName,
      initialBalance: initialBalance, 
      currentBalance: initialBalance, 
    };

    setAccounts([...accounts, newAccount]);
    setNewAccountName('');
    setNewAccountInitialBalance(''); 
    Alert.alert("成功", `帳本「${newAccount.name}」已新增，初始資金 NT$${initialBalance.toFixed(0)}。`);
  };

  const handleDeleteAccount = (id: string) => {
    if (transactions.some(t => t.accountId === id)) {
      Alert.alert("無法刪除", "此帳本仍有交易記錄，請先清空。");
      return;
    }
    setAccounts(accounts.filter(acc => acc.id !== id));
    if (selectedAccountId === id && accounts.length > 1) {
        setSelectedAccountId(accounts.find(acc => acc.id !== id)?.id || accounts[0].id);
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

  // 渲染元件 (省略... 保持不變)
  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const isTransfer = item.type === 'transfer';
    
    const amountSign = isTransfer ? (item.accountId === sourceAccountId ? '-' : '+') : (isIncome ? '+' : '-');
    const amountColor = isTransfer ? '#FF9500' : (isIncome ? '#4CD964' : '#FF3B30'); 
    
    const accountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';

    return (
      <View style={styles.listItem}>
        <View style={styles.listItemTextContainer}>
          <Text style={[styles.listItemType, { color: isTransfer ? '#FF9500' : '#333' }]} numberOfLines={1}>
            {isTransfer ? '轉帳' : item.description}
          </Text>
          <Text style={styles.listItemDate}>
            {accountName} · {item.date.toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.listItemAmount, { color: amountColor }]}>
          {amountSign} NT$ {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };
  
  // 彈窗元件 (省略... 保持不變)
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
              onValueChange={(itemValue) => setSourceAccountId(itemValue)}
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
              onValueChange={(itemValue) => setTargetAccountId(itemValue)}
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
            <Text style={styles.settingSectionTitle}>B. 常用備註管理</Text>
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
                {categories.expense.map(cat => (
                  <View key={cat} style={styles.categoryPill}>
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
                {categories.income.map(cat => (
                  <View key={cat} style={styles.categoryPill}>
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


  // ---------------------------------------------------
  // 主介面渲染
  // ---------------------------------------------------
  return (
    <View style={styles.container}>
      
      {/* 頂部 Header 區 (修正了 Picker.Item 的變數名稱) */}
      <View style={styles.header}>
        <Picker
          selectedValue={selectedAccountId}
          onValueChange={(itemValue) => setSelectedAccountId(itemValue)}
          style={styles.picker}
        >
          {accounts.map(account => (
            // ✨ 修正這裡，使用 account.id 和 account.name
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
        
        {/* 2. 交易操作區 (垂直排列，每行包含按鈕和備註) */}
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

      {/* 交易清單顯示區 (保持不變) */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>近期交易 (帳本: {accounts.find(acc => acc.id === selectedAccountId)?.name})</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{padding: 5}}>
            <Ionicons name="cog-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <FlatList
        style={styles.list}
        data={transactions.filter(t => t.accountId === selectedAccountId)} 
        renderItem={renderItem} 
        keyExtractor={item => item.id} 
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>此帳本目前沒有交易記錄</Text>
        )}
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
    header: { alignItems: 'center', paddingTop: 60, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    picker: { width: '50%', height: 40, marginBottom: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'normal', color: '#666', marginBottom: 5 },
    balanceText: { fontSize: 40, fontWeight: '800' },
    
    inputArea: { alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    input: { padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 15 },
    
    // ✨ 交易操作區塊樣式
    buttonContainer: { width: '90%', paddingBottom: 5 }, 
    transactionRow: { 
        flexDirection: 'row', 
        alignItems: 'center', // 垂直置中對齊 (維持)
        justifyContent: 'flex-start', 
    },
    mainButton: { 
        padding: 10, 
        borderRadius: 8, 
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%', 
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
    
    // --- Modal 樣式 --- (保持不變)
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

    // --- 設定區塊樣式 --- (保持不變)
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