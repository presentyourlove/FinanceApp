import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/app/context/ThemeContext';
import { dbOperations } from '@/app/services/database';
import * as CategoryStorage from '@/app/utils/categoryStorage';
import { ThemeType } from '@/app/utils/themeStorage';


interface Account {
    id: number;
    name: string;
    initialBalance: number;
    currentBalance: number;
    currency: string;
}

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme, setTheme } = useTheme();
    const styles = getStyles(colors);

    const [categories, setCategories] = useState<CategoryStorage.Categories>({ expense: [], income: [] });
    const [accounts, setAccounts] = useState<Account[]>([]);
    
    const [newCat, setNewCat] = useState('');
    const [catType, setCatType] = useState<'income' | 'expense'>('expense');
    const [manageMode, setManageMode] = useState<'category' | 'account' | 'theme'>('category');

    // 新增帳本狀態
    const [newAccName, setNewAccName] = useState('');
    const [newAccBalance, setNewAccBalance] = useState('');
    const [newAccCurrency, setNewAccCurrency] = useState('TWD');
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    // 載入資料
    const loadData = async () => {
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);
        const loadedCategories = await CategoryStorage.loadCategories();
        setCategories(loadedCategories);
    };

    // 初始載入
    useEffect(() => {
        loadData();
    }, []);

    // 每次進入頁面時重新載入
    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleAddCategory = async (type: 'income' | 'expense', name: string) => {
        if (!name) return;
        const updatedCategories = await CategoryStorage.addCategory(type, name);
        setCategories(updatedCategories);
        setNewCat('');
        Alert.alert("成功", `備註「${name}」已加入${type === 'income' ? '收入' : '支出'} 列表！`);
    };

    const handleDeleteCategory = async (type: 'income' | 'expense', category: string) => {
        const updatedCategories = await CategoryStorage.deleteCategory(type, category);
        setCategories(updatedCategories);
    };

    const moveCategory = async (type: 'income' | 'expense', index: number, direction: 'up' | 'down') => {
        const updatedCategories = await CategoryStorage.moveCategory(type, index, direction);
        setCategories(updatedCategories);
    };
    
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
          await dbOperations.addAccountDB(name, balance, currency);
          const loadedAccounts = await dbOperations.getAccounts();
          setAccounts(loadedAccounts);
          setNewAccName('');
          setNewAccBalance('');
          setNewAccCurrency('TWD');
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
          const loadedAccounts = await dbOperations.getAccounts();
          setAccounts(loadedAccounts);
          Alert.alert("成功", "帳本已刪除。");
        } catch (error: any) {
          if (error.message.includes("transactions")) {
            Alert.alert("無法刪除", "此帳本仍有交易記錄，請先清除相關交易。");
          } else {
            Alert.alert("刪除失敗", "刪除帳本時發生錯誤。");
          }
        }
    };
    
    const handleSetTheme = (selectedTheme: ThemeType) => {
        setTheme(selectedTheme);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.title}>設定</Text>
            
            <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setManageMode('category')} style={[styles.tabButton, { borderBottomWidth: manageMode === 'category' ? 2 : 0, borderColor: colors.accent }]}>
                    <Text style={[styles.tabButtonText, { color: manageMode === 'category' ? colors.accent : colors.subtleText }]}>分類管理</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setManageMode('account')} style={[styles.tabButton, { borderBottomWidth: manageMode === 'account' ? 2 : 0, borderColor: colors.accent }]}>
                    <Text style={[styles.tabButtonText, { color: manageMode === 'account' ? colors.accent : colors.subtleText }]}>帳本管理</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setManageMode('theme')} style={[styles.tabButton, { borderBottomWidth: manageMode === 'theme' ? 2 : 0, borderColor: colors.accent }]}>
                    <Text style={[styles.tabButtonText, { color: manageMode === 'theme' ? colors.accent : colors.subtleText }]}>主題管理</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
                {manageMode === 'category' && (
                    <>
                        <View style={{ paddingHorizontal: 15 }}>
                            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <TouchableOpacity onPress={() => setCatType('expense')} style={[styles.bigButton, { backgroundColor: catType === 'expense' ? '#FF3B30' : colors.card, marginRight: 10, flex: 1, borderWidth: catType !== 'expense' ? 1 : 0, borderColor: colors.borderColor }]}>
                                <Text style={[styles.buttonText, {color: catType === 'expense' ? '#fff' : colors.text}]}>支出</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setCatType('income')} style={[styles.bigButton, { backgroundColor: catType === 'income' ? '#4CD964' : colors.card, flex: 1, borderWidth: catType !== 'income' ? 1 : 0, borderColor: colors.borderColor }]}>
                                <Text style={[styles.buttonText, {color: catType === 'income' ? '#fff' : colors.text}]}>收入</Text>
                            </TouchableOpacity>
                            </View>
                        </View>
                        
                        <Text style={styles.subtitle}>新增{catType === 'income' ? '收入' : '支出'}分類</Text>
                        <View style={styles.card}>
                            <View style={{ flexDirection: 'row' }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 10 }]}
                                placeholder="新分類名稱"
                                placeholderTextColor={colors.subtleText}
                                value={newCat}
                                onChangeText={setNewCat}
                            />
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={() => handleAddCategory(catType, newCat)}>
                                <Text style={styles.buttonText}>新增</Text>
                            </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.subtitle}>現有{catType === 'income' ? '收入' : '支出'}分類</Text>
                        <View style={styles.card}>
                            {categories[catType]?.map((cat: string, index: number) => (
                            <View key={index} style={styles.settingListItem}>
                                <Text style={styles.settingItemText}>{cat}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => moveCategory(catType, index, 'up')} style={{ paddingHorizontal: 5 }}><Ionicons name="arrow-up" size={20} color={colors.subtleText} /></TouchableOpacity>
                                <TouchableOpacity onPress={() => moveCategory(catType, index, 'down')} style={{ paddingHorizontal: 5 }}><Ionicons name="arrow-down" size={20} color={colors.subtleText} /></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteCategory(catType, cat)} style={{ paddingHorizontal: 5 }}><Ionicons name="trash" size={20} color="#FF3B30" /></TouchableOpacity>
                                </View>
                            </View>
                            ))}
                        </View>
                    </>
                )}
                
                {manageMode === 'account' && (
                    <>
                        <Text style={styles.subtitle}>新增帳本</Text>
                        <View style={styles.card}>
                            <TextInput
                                style={styles.input}
                                placeholder="帳本名稱"
                                placeholderTextColor={colors.subtleText}
                                value={newAccName}
                                onChangeText={setNewAccName}
                            />
                            <TextInput
                                style={[styles.input, {marginTop: 10}]}
                                placeholder="初始餘額"
                                placeholderTextColor={colors.subtleText}
                                keyboardType="numeric"
                                value={newAccBalance}
                                onChangeText={setNewAccBalance}
                            />
                            
                            <View style={{ width: '100%', marginTop: 10, zIndex: 1000 }}>
                                <TouchableOpacity
                                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                    onPress={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                                >
                                    <Text style={styles.inputText}>{getCurrencyLabel(newAccCurrency)}</Text>
                                    <Ionicons name={isCurrencyDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.subtleText} />
                                </TouchableOpacity>

                                {isCurrencyDropdownOpen && (
                                    <View style={styles.dropdown}>
                                        <ScrollView nestedScrollEnabled={true}>
                                            {['TWD', 'USD', 'JPY', 'CNY', 'HKD', 'MOP', 'GBP', 'KRW'].map((curr) => (
                                                <TouchableOpacity
                                                    key={curr}
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setNewAccCurrency(curr);
                                                        setIsCurrencyDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={{ color: colors.text }}>{getCurrencyLabel(curr)}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: '#4CD964', marginTop: 10 }]}
                                onPress={() => {
                                    if (newAccName && newAccBalance) {
                                        handleAddAccount(newAccName, parseFloat(newAccBalance), newAccCurrency);
                                    } else {
                                        Alert.alert('錯誤', '請輸入名稱和初始餘額');
                                    }
                                }}
                            >
                                <Text style={styles.buttonText}>新增帳本</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.subtitle}>現有帳本</Text>
                        <View style={styles.card}>
                            {accounts?.map((acc: any) => (
                                <View key={acc.id} style={styles.settingListItem}>
                                    <Text style={styles.settingItemText}>{acc.name} ({acc.currency})</Text>
                                    <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)}>
                                        <Ionicons name="trash" size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {manageMode === 'theme' && (
                    <>
                        <Text style={styles.subtitle}>選擇您的 App 主題</Text>
                        <View style={styles.card}>
                            <TouchableOpacity style={styles.themeOption} onPress={() => handleSetTheme('Default')}>
                                <Text style={styles.settingItemText}>預設</Text>
                                {theme === 'Default' && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.themeOption} onPress={() => handleSetTheme('Dark')}>
                                <Text style={styles.settingItemText}>暗黑</Text>
                                {theme === 'Dark' && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function getCurrencyLabel(currency: string) {
    switch (currency) {
        case 'TWD': return 'TWD - 新台幣';
        case 'USD': return 'USD - 美金';
        case 'JPY': return 'JPY - 日圓';
        case 'CNY': return 'CNY - 人民幣';
        case 'HKD': return 'HKD - 港幣';
        case 'MOP': return 'MOP - 澳門幣';
        case 'GBP': return 'GBP - 英鎊';
        case 'KRW': return 'KRW - 韓元';
        default: return currency;
    }
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginVertical: 15,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 15,
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        paddingHorizontal: 15,
    },
    tabButton: {
        padding: 10,
        marginHorizontal: 10,
    },
    tabButtonText: {
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 15,
        marginBottom: 15,
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
    },
    inputText: {
        color: colors.text,
        fontSize: 16,
    },
    button: {
        borderRadius: 10,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        height: 45,
    },
    bigButton: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        justifyContent: 'center',
        alignItems: 'center',
        height: 45,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    settingListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    settingItemText: {
        fontSize: 16,
        color: colors.text,
    },
    dropdown: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 8,
        elevation: 5,
        maxHeight: 200,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    themeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    }
});