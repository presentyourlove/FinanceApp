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

import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations } from '@/src/services/database';
import * as CategoryStorage from '@/src/utils/categoryStorage';
import * as CurrencyStorage from '@/src/utils/currencyStorage';
import { ThemeType } from '@/src/utils/themeStorage';
import { TransactionType } from '@/src/types';
import SwipeView from '@/src/components/common/SwipeView';
import SyncSettingsView from '@/src/components/settings/SyncSettingsView';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';

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
    const [catType, setCatType] = useState<TransactionType.INCOME | TransactionType.EXPENSE>(TransactionType.EXPENSE);

    // manageMode now includes 'main' for the list view
    const [manageMode, setManageMode] = useState<'main' | 'category' | 'account' | 'currency' | 'theme' | 'sync'>('main');

    // 新增帳本狀態
    const [newAccName, setNewAccName] = useState('');
    const [newAccBalance, setNewAccBalance] = useState('');
    const [newAccCurrency, setNewAccCurrency] = useState('TWD');
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    // 匯率管理狀態
    const [currencySettings, setCurrencySettings] = useState<CurrencyStorage.CurrencySettings>({
        mainCurrency: 'TWD',
        exchangeRates: {}
    });
    const [tempRates, setTempRates] = useState<{ [key: string]: string }>({});

    // 載入資料
    const loadData = async () => {
        const loadedAccounts = await dbOperations.getAccounts();
        setAccounts(loadedAccounts);
        const loadedCategories = await CategoryStorage.loadCategories();
        setCategories(loadedCategories);
        const loadedCurrencySettings = await CurrencyStorage.loadCurrencySettings();
        setCurrencySettings(loadedCurrencySettings);

        // Initialize temp rates for editing
        const initialTempRates: { [key: string]: string } = {};
        Object.entries(loadedCurrencySettings.exchangeRates).forEach(([curr, rate]) => {
            initialTempRates[curr] = rate.toString();
        });
        setTempRates(initialTempRates);
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

    const handleReorderCategories = async (type: TransactionType.INCOME | TransactionType.EXPENSE, newData: string[]) => {
        setCategories(prev => ({
            ...prev,
            [type]: newData
        }));
        await CategoryStorage.saveCategories({
            ...categories,
            [type]: newData
        });
    };

    const handleAddCategory = async (type: TransactionType.INCOME | TransactionType.EXPENSE, name: string) => {
        if (!name) return;
        const updatedCategories = await CategoryStorage.addCategory(type, name);
        setCategories(updatedCategories);
        setNewCat('');
        Alert.alert("成功", `備註「${name}」已加入${type === TransactionType.INCOME ? '收入' : '支出'} 列表！`);
    };

    const handleDeleteCategory = async (type: TransactionType.INCOME | TransactionType.EXPENSE, category: string) => {
        const updatedCategories = await CategoryStorage.deleteCategory(type, category);
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

    // Currency Management Functions
    const handleMainCurrencyChange = (newMain: string) => {
        const pivotRateStr = tempRates[newMain];
        const pivotRate = parseFloat(pivotRateStr);

        if (isNaN(pivotRate) || pivotRate <= 0) {
            Alert.alert("錯誤", "新主幣別的匯率無效，無法切換。請先設定有效的匯率。");
            return;
        }

        const newSettings = { ...currencySettings, mainCurrency: newMain };

        // Recalculate all rates relative to the new main currency
        // Formula: NewRate(C) = OldRate(C) / OldRate(NewMain)
        const newTempRates: { [key: string]: string } = {};

        Object.keys(tempRates).forEach(curr => {
            const oldRate = parseFloat(tempRates[curr]);
            if (!isNaN(oldRate)) {
                // Calculate new rate
                let newRate = oldRate / pivotRate;

                // Format: avoid scientific notation for small numbers if possible, but keep precision
                // For display, maybe limit decimals, but for storage keep precision?
                // Let's keep up to 6 decimal places for precision
                newTempRates[curr] = parseFloat(newRate.toFixed(6)).toString();
            } else {
                newTempRates[curr] = tempRates[curr]; // Keep invalid input as is? Or reset?
            }
        });

        // Ensure new main currency is exactly 1
        newTempRates[newMain] = '1';

        setCurrencySettings(newSettings);
        setTempRates(newTempRates);
    };

    const handleRateChange = (currency: string, rate: string) => {
        setTempRates(prev => ({ ...prev, [currency]: rate }));
    };

    const saveCurrencySettings = async () => {
        const newRates: { [key: string]: number } = {};
        let isValid = true;

        Object.entries(tempRates).forEach(([curr, rateStr]) => {
            const rate = parseFloat(rateStr);
            if (isNaN(rate) || rate <= 0) {
                isValid = false;
            }
            newRates[curr] = rate;
        });

        if (!isValid) {
            Alert.alert("錯誤", "請輸入有效的匯率數值（必須大於 0）。");
            return;
        }

        // Ensure main currency rate is 1
        newRates[currencySettings.mainCurrency] = 1;

        const newSettings = {
            mainCurrency: currencySettings.mainCurrency,
            exchangeRates: newRates
        };

        await CurrencyStorage.saveCurrencySettings(newSettings);
        setCurrencySettings(newSettings);
        // Update temp rates to ensure consistency
        const updatedTempRates: { [key: string]: string } = {};
        Object.entries(newRates).forEach(([curr, rate]) => {
            updatedTempRates[curr] = rate.toString();
        });
        setTempRates(updatedTempRates);

        Alert.alert("成功", "匯率設定已儲存。");
    };

    const allCurrencies = ['TWD', 'USD', 'JPY', 'CNY', 'HKD', 'MOP', 'GBP', 'KRW'];

    const getCurrencyLabel = (code: string) => {
        const labels: { [key: string]: string } = {
            'TWD': 'TWD - 新台幣',
            'USD': 'USD - 美金',
            'JPY': 'JPY - 日圓',
            'CNY': 'CNY - 人民幣',
            'HKD': 'HKD - 港幣',
            'MOP': 'MOP - 澳門幣',
            'GBP': 'GBP - 英鎊',
            'KRW': 'KRW - 韓元',
        };
        return labels[code] || code;
    };

    const renderHeader = (title: string, showBack: boolean = false) => (
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            {showBack && (
                <TouchableOpacity onPress={() => setManageMode('main')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.accent} />
                </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{title}</Text>
        </View>
    );

    const renderMainSettings = () => (
        <ScrollView style={{ flex: 1 }}>
            <View style={styles.listContainer}>
                <TouchableOpacity style={styles.listItem} onPress={() => setManageMode('theme')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="color-palette" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>主題設定</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => setManageMode('category')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="list" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>分類管理</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => setManageMode('account')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="wallet" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>帳本管理</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => setManageMode('currency')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="cash" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>匯率管理</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => setManageMode('sync')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="cloud-upload" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>同步備份</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderCategorySettings = () => (
        <SwipeView onBack={() => setManageMode('main')}>
            {/* 移除 ScrollView，改由 DraggableFlatList 負責滾動 */}
            <View style={{ flex: 1 }}>
                <DraggableFlatList
                    data={categories[catType] || []}
                    onDragEnd={({ data }) => {
                        handleReorderCategories(catType, data);
                    }}
                    keyExtractor={(item) => item}
                    ListHeaderComponent={
                        <>
                            <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
                                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                    <TouchableOpacity onPress={() => setCatType(TransactionType.EXPENSE)} style={[styles.bigButton, { backgroundColor: catType === TransactionType.EXPENSE ? colors.expense : colors.card, marginRight: 10, flex: 1, borderWidth: catType !== TransactionType.EXPENSE ? 1 : 0, borderColor: colors.borderColor }]}>
                                        <Text style={[styles.buttonText, { color: catType === TransactionType.EXPENSE ? '#fff' : colors.text }]}>支出</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setCatType(TransactionType.INCOME)} style={[styles.bigButton, { backgroundColor: catType === TransactionType.INCOME ? colors.income : colors.card, flex: 1, borderWidth: catType !== TransactionType.INCOME ? 1 : 0, borderColor: colors.borderColor }]}>
                                        <Text style={[styles.buttonText, { color: catType === TransactionType.INCOME ? '#fff' : colors.text }]}>收入</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.subtitle}>新增{catType === TransactionType.INCOME ? '收入' : '支出'}分類</Text>
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

                            <Text style={styles.subtitle}>現有{catType === TransactionType.INCOME ? '收入' : '支出'}分類 (長按可排序)</Text>
                        </>
                    }
                    containerStyle={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    renderItem={({ item, drag, isActive }: { item: string, drag: () => void, isActive: boolean }) => (
                        <View style={{ paddingHorizontal: 20, marginBottom: 0 }}>
                            {/* 注意：DraggableFlatList 的 Item 最好不要有外層 margin，這裡我只加 padding 調整 */}
                            <TouchableOpacity
                                onLongPress={drag}
                                disabled={isActive}
                                style={[
                                    styles.settingListItem,
                                    { backgroundColor: isActive ? colors.inputBackground : colors.card, marginHorizontal: 0, paddingHorizontal: 15, borderRadius: isActive ? 12 : 0, marginBottom: 0 }
                                ]}
                            >
                                <Text style={styles.settingItemText}>{item}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="menu" size={20} color={colors.subtleText} style={{ marginRight: 10 }} />
                                    <TouchableOpacity onPress={() => handleDeleteCategory(catType, item)} style={{ paddingHorizontal: 5 }}>
                                        <Ionicons name="trash" size={20} color={colors.expense} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </SwipeView>
    );

    const renderAccountSettings = () => (
        <SwipeView onBack={() => setManageMode('main')}>
            <ScrollView style={{ flex: 1 }}>
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
                        style={[styles.input, { marginTop: 10 }]}
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
                                    {allCurrencies.map((curr) => (
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
                        style={[styles.button, { backgroundColor: colors.income, marginTop: 10 }]}
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
                    {accounts?.map((acc: Account) => (
                        <View key={acc.id} style={styles.settingListItem}>
                            <Text style={styles.settingItemText}>{acc.name} ({acc.currency})</Text>
                            <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)}>
                                <Ionicons name="trash" size={20} color={colors.expense} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </SwipeView>
    );

    const renderCurrencySettings = () => (
        <SwipeView onBack={() => setManageMode('main')}>
            <ScrollView style={{ flex: 1 }}>
                <Text style={styles.subtitle}>匯率設定</Text>
                <Text style={[styles.description, { color: colors.subtleText }]}>
                    請選擇主幣別，並設定其他幣別相對於主幣別的匯率。
                    {"\n"}(例如：主幣別為 TWD，USD 匯率設為 0.03)
                </Text>

                <View style={styles.card}>
                    <View style={styles.currencyHeader}>
                        <Text style={[styles.headerText, { color: colors.text, flex: 2 }]}>幣別</Text>
                        <Text style={[styles.headerText, { color: colors.text, flex: 1, textAlign: 'center' }]}>主幣別</Text>
                        <Text style={[styles.headerText, { color: colors.text, flex: 1.5, textAlign: 'right' }]}>匯率</Text>
                    </View>

                    {allCurrencies.map((curr) => {
                        const isMain = currencySettings.mainCurrency === curr;
                        return (
                            <View key={curr} style={styles.currencyRow}>
                                <View style={{ flex: 2 }}>
                                    <Text style={[styles.currencyName, { color: colors.text }]}>{getCurrencyLabel(curr)}</Text>
                                </View>

                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleMainCurrencyChange(curr)}
                                >
                                    <Ionicons
                                        name={isMain ? "radio-button-on" : "radio-button-off"}
                                        size={24}
                                        color={isMain ? colors.tint : colors.subtleText}
                                    />
                                </TouchableOpacity>

                                <View style={{ flex: 1.5 }}>
                                    <TextInput
                                        style={[
                                            styles.rateInput,
                                            {
                                                color: isMain ? colors.subtleText : colors.text,
                                                backgroundColor: isMain ? colors.background : colors.inputBackground,
                                                borderColor: colors.borderColor
                                            }
                                        ]}
                                        value={tempRates[curr] || ''}
                                        onChangeText={(text) => handleRateChange(curr, text)}
                                        keyboardType="numeric"
                                        editable={!isMain}
                                    />
                                </View>
                            </View>
                        );
                    })}

                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, marginTop: 20 }]} onPress={saveCurrencySettings}>
                        <Text style={styles.buttonText}>儲存設定</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </SwipeView>
    );

    const renderThemeSettings = () => (
        <SwipeView onBack={() => setManageMode('main')}>
            <ScrollView style={{ flex: 1 }}>
                <Text style={styles.subtitle}>主題設定</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={[styles.themeOption, { borderBottomColor: colors.borderColor }]} onPress={() => handleSetTheme('Default')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>淺色模式</Text>
                        {theme === 'Default' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.themeOption} onPress={() => handleSetTheme('Dark')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>深色模式</Text>
                        {theme === 'Dark' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SwipeView>
    );

    const renderSyncSettings = () => (
        <SwipeView onBack={() => setManageMode('main')}>
            <ScrollView style={{ flex: 1 }}>
                <SyncSettingsView onRefreshData={loadData} />
            </ScrollView>
        </SwipeView>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                {renderHeader(
                    manageMode === 'main' ? '設定' :
                        manageMode === 'category' ? '分類管理' :
                            manageMode === 'account' ? '帳本管理' :
                                manageMode === 'currency' ? '匯率管理' :
                                    manageMode === 'theme' ? '主題設定' : '同步備份',
                    manageMode !== 'main'
                )}

                {manageMode === 'main' && renderMainSettings()}
                {manageMode === 'category' && renderCategorySettings()}
                {manageMode === 'account' && renderAccountSettings()}
                {manageMode === 'currency' && renderCurrencySettings()}
                {manageMode === 'theme' && renderThemeSettings()}
                {manageMode === 'sync' && renderSyncSettings()}
            </View>
        </GestureHandlerRootView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: 10
    },
    backButton: {
        padding: 5,
        marginRight: 5
    },
    listContainer: {
        marginTop: 20,
        paddingHorizontal: 20
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    listItemIcon: {
        marginRight: 15
    },
    listItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text
    },
    subtitle: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, marginTop: 20, marginBottom: 10, color: colors.text },
    description: { fontSize: 14, paddingHorizontal: 20, marginBottom: 15 },
    card: { marginHorizontal: 20, padding: 15, borderRadius: 12, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    input: { padding: 12, borderRadius: 8, backgroundColor: colors.inputBackground, color: colors.text },
    inputText: { fontSize: 16, color: colors.text },
    button: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    bigButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    settingListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    settingItemText: { fontSize: 16, color: colors.text },
    themeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'transparent' },
    themeText: { fontSize: 16 },
    dropdown: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, maxHeight: 200, zIndex: 1000, elevation: 5 },
    dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    currencyHeader: { flexDirection: 'row', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerText: { fontWeight: 'bold', fontSize: 14 },
    currencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    currencyName: { fontSize: 16 },
    rateInput: { padding: 8, borderRadius: 8, borderWidth: 1, textAlign: 'right' },
    label: { fontSize: 16, color: colors.text, marginBottom: 5 }
});