import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Button, ScrollView } from 'react-native';
// 假設這是您用來本地儲存的庫
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { StatusBar } from 'expo-status-bar';

// ===========================================
// 區塊 A: 交易輸入組件 (TransactionForm) - 您上次寫的程式碼應該在這裡
// ===========================================
// 您之前寫的處理輸入和保存數據的表單組件
const TransactionForm = ({ onAddTransaction }) => {
  // 提示：這裡應該有 useState 來處理 'amount', 'type', 'category'
  
  // 範例：
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Expense'); // 或 'Income'
  const [category, setCategory] = useState('');
  
  const handleSubmit = () => {
    if (!amount || !category) {
      alert('請輸入金額和類別');
      return;
    }
    
    const newTransaction = {
      id: Date.now().toString(),
      type: type,
      amount: parseFloat(amount),
      category: category,
      date: new Date().toISOString().split('T')[0],
      // 確保將這筆新交易傳回 App 組件
      // onAddTransaction(newTransaction); 
      // 這裡請寫您原本的表單邏輯
    };
    onAddTransaction(newTransaction);
    setAmount(''); // 清空表單
  };
  
  return (
    <View style={styles.formContainer}>
      <Text style={styles.header}>記錄新交易 (請還原您的輸入組件)</Text>
      {/* ⚠️ 這裡需要您恢復您的 <TextInput> 和 <Button> 元件 */}
      <Button title={`紀錄 ${type === 'Expense' ? '支出' : '收入'}`} onPress={handleSubmit} />
    </View>
  );
};

// ===========================================
// 區塊 B: 主應用程式組件 (App) - 整合邏輯
// ===========================================
export default function App() {
  // 狀態：儲存所有交易記錄
  const [transactions, setTransactions] = useState([]);

  // 1. 從 AsyncStorage 載入數據 (您之前寫的 useEffect 邏輯)
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const storedData = await AsyncStorage.getItem('finance_transactions');
        if (storedData) {
          setTransactions(JSON.parse(storedData));
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      }
    };
    loadTransactions();
  }, []);

  // 2. 儲存數據到 AsyncStorage 的邏輯
  useEffect(() => {
    const saveTransactions = async () => {
      try {
        await AsyncStorage.setItem('finance_transactions', JSON.stringify(transactions));
      } catch (error) {
        console.error("Failed to save transactions:", error);
      }
    };
    if (transactions.length > 0) {
        saveTransactions();
    }
  }, [transactions]);
  
  // 3. 處理新交易的函數
  const handleAddTransaction = (newTransaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <ScrollView style={styles.content}>
        
        {/* 交易輸入表單 */}
        <TransactionForm onAddTransaction={handleAddTransaction} />

        {/* 交易列表 - 顯示最近的交易 */}
        <Text style={styles.listHeader}>最近 {transactions.length} 筆交易：</Text>
        {transactions.slice(0, 5).map(t => (
          <Text key={t.id}>{t.date} - {t.category}: {t.amount} ({t.type})</Text>
        ))}
        
      </ScrollView>
      
      {/* ⚠️ 提醒：這裡應該是您未來導航組件的位置 */}
    </View>
  );
}

// 樣式
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50, // 為了避開頂部狀態欄
  },
  content: {
    paddingHorizontal: 15,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
  },
  formContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  }
});