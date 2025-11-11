// app/(tabs)/transaction.tsx

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  FlatList,
  Keyboard, // 新增：用於在交易後關閉鍵盤
} from 'react-native';

// 【更新】交易數據的結構：新增 description
interface Transaction {
  id: string; 
  amount: number; 
  type: 'income' | 'expense'; 
  date: Date; 
  description: string; // ✨ 新增：交易備註欄位
}

export default function TransactionScreen() {
  // 1. 狀態：總餘額
  const [balance, setBalance] = useState(0); 
  // 2. 狀態：輸入框內容 (金額)
  const [amountInput, setAmountInput] = useState(''); 
  // 3. 狀態：輸入框內容 (備註)
  const [descriptionInput, setDescriptionInput] = useState(''); // ✨ 新增：備註狀態
  // 4. 交易記錄清單 (陣列)
  const [transactions, setTransactions] = useState<Transaction[]>([]); 

  // 處理交易邏輯的核心函數
  const handleTransaction = (type: 'income' | 'expense') => {
    const amount = parseFloat(amountInput);
    
    // 驗證輸入
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("無效輸入", "請輸入有效的正數金額。");
      return;
    }

    // 1. 計算新餘額
    const newBalance = type === 'income' ? balance + amount : balance - amount;

    // 2. 建立新的交易物件 (包含備註)
    const newTransaction: Transaction = {
      id: Date.now().toString(), 
      amount: amount,
      type: type,
      date: new Date(),
      description: descriptionInput || (type === 'income' ? '無備註收入' : '無備註支出'), // ✨ 新增：如果備註為空，給予預設值
    };
    
    // 3. 更新交易清單
    setTransactions([newTransaction, ...transactions]); 

    // 4. 更新狀態與清理
    setBalance(newBalance);
    setAmountInput('');
    setDescriptionInput(''); // ✨ 清空備註輸入框
    Keyboard.dismiss(); // ✨ 交易完成後關閉鍵盤
  };

  // 渲染清單中每個項目的函數
  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const amountSign = isIncome ? '+' : '-';
    const amountColor = isIncome ? '#4CD964' : '#FF3B30';

    return (
      <View style={styles.listItem}>
        <View style={styles.listItemTextContainer}>
          {/* ✨ 顯示備註，如果備註存在則顯示，否則顯示交易類型 */}
          <Text style={styles.listItemType} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.listItemDate}>
            {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
          </Text>
        </View>
        <Text style={[styles.listItemAmount, { color: amountColor }]}>
          {amountSign} NT$ {item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 總餘額顯示區 */}
      <View style={styles.header}>
        <Text style={styles.title}>您的當前餘額</Text>
        <Text style={[styles.balanceText, { color: balance >= 0 ? '#007AFF' : '#FF3B30' }]}>
          NT$ {balance.toFixed(2)} 
        </Text>
      </View>
      
      {/* 輸入框與按鈕區 */}
      <View style={styles.inputArea}>
        {/* 金額輸入框 */}
        <TextInput
          style={[styles.input, { marginBottom: 10 }]}
          placeholder="請輸入金額 (例如: 500)"
          keyboardType="numeric" 
          value={amountInput}
          onChangeText={setAmountInput}
        />
        
        {/* ✨ 備註輸入框 */}
        <TextInput
          style={styles.input}
          placeholder="請輸入備註 (例如: 午餐、薪水)"
          value={descriptionInput}
          onChangeText={setDescriptionInput} // 將輸入的值存入 descriptionInput 狀態
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.incomeButton]}
            onPress={() => handleTransaction('income')}
          >
            <Text style={styles.buttonText}>收入 (＋)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.expenseButton]}
            onPress={() => handleTransaction('expense')}
          >
            <Text style={styles.buttonText}>支出 (－)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 交易清單顯示區 */}
      <Text style={styles.listHeader}>近期交易</Text>
      <FlatList
        style={styles.list}
        data={transactions} 
        renderItem={renderItem} 
        keyExtractor={item => item.id} 
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>目前沒有交易記錄</Text>
        )}
      />

    </View>
  );
}

// 樣式表 (Styles) - 調整了輸入框和清單項目的樣式以適應備註
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', 
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#666',
    marginBottom: 5,
  },
  balanceText: {
    fontSize: 48,
    fontWeight: '800',
  },
  inputArea: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    width: '90%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  buttonContainer: {
    flexDirection: 'row', 
    width: '90%',
    justifyContent: 'space-between',
    marginTop: 15, // 調整間距
  },
  button: {
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  incomeButton: {
    backgroundColor: '#4CD964', 
  },
  expenseButton: {
    backgroundColor: '#FF3B30', 
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#eee',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, // 調整垂直間距
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  listItemTextContainer: { // ✨ 新增：備註和日期的容器
    flex: 1,
    marginRight: 10,
  },
  listItemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  }
});