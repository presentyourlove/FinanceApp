import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Budget } from '@/app/services/database';
import { useFocusEffect } from 'expo-router';
import * as CategoryStorage from '@/app/utils/categoryStorage';
import * as CurrencyStorage from '@/app/utils/currencyStorage';
import { useTheme } from '@/app/context/ThemeContext';

export default function BudgetView({ style }: { style?: any }) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [currency, setCurrency] = useState('TWD');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Selection Mode: 'none' (form), 'category', 'period', 'currency'
    const [selectionMode, setSelectionMode] = useState<'none' | 'category' | 'period' | 'currency'>('none');

    // Spending map: budgetId -> amount
    const [spendingMap, setSpendingMap] = useState<{ [key: number]: number }>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    const currencies = ['TWD', 'USD', 'JPY', 'EUR', 'KRW', 'CNY'];

    const loadBudgets = async () => {
        try {
            // Fetch data in parallel
            // Fetch transactions from the start of the current year to cover all budget periods (weekly, monthly, yearly)
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

            const [budgetData, currencySettings, transactions] = await Promise.all([
                dbOperations.getBudgets(),
                CurrencyStorage.loadCurrencySettings(),
                dbOperations.getTransactionsWithAccount(startOfYear)
            ]);

            setBudgets(budgetData);
            const rates = currencySettings.exchangeRates;

            const newSpendingMap: { [key: number]: number } = {};
            const now = new Date();

            // Pre-calculate start dates for different periods
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYearDate = new Date(now.getFullYear(), 0, 1);

            budgetData.forEach(budget => {
                const budgetRate = rates[budget.currency] || 1;
                let totalSpent = 0;

                let startDate;
                if (budget.period === 'weekly') startDate = startOfWeek;
                else if (budget.period === 'monthly') startDate = startOfMonth;
                else startDate = startOfYearDate;

                transactions.forEach(t => {
                    if (t.type === 'expense' && (t.description?.startsWith(budget.category))) {
                        const tDate = new Date(t.date);
                        if (tDate >= startDate && tDate <= now) {
                            // Convert amount: Acc -> Main -> Budget
                            // Rate is defined as: 1 Main = X Currency
                            // AmountInMain = Amount / AccRate
                            // AmountInBudget = AmountInMain * BudgetRate
                            const accRate = rates[t.accountCurrency] || 1;
                            const amountInBudget = (t.amount / accRate) * budgetRate;
                            totalSpent += amountInBudget;
                        }
                    }
                });

                newSpendingMap[budget.id] = Math.round(totalSpent);
            });

            setSpendingMap(newSpendingMap);

            // Load categories
            const cats = await CategoryStorage.loadCategories();
            const expenseCategories = cats.expense;
            setAvailableCategories(expenseCategories);
            if (!category && expenseCategories.length > 0) {
                setCategory(expenseCategories[0]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadBudgets();
        }, [])
    );

    const handleSaveBudget = async () => {
        if (!category || !amount) {
            Alert.alert('錯誤', '請輸入類別和金額');
            return;
        }
        try {
            if (editingId) {
                await dbOperations.updateBudget(editingId, category, parseFloat(amount), period, currency);
            } else {
                await dbOperations.addBudget(category, parseFloat(amount), period, currency);
            }

            closeModal();
            loadBudgets();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '儲存預算失敗');
        }
    };

    const closeModal = () => {
        setCategory('');
        setAmount('');
        setPeriod('monthly');
        setCurrency('TWD');
        setEditingId(null);
        setSelectionMode('none');
        setModalVisible(false);
    };

    const openEditModal = (budget: Budget) => {
        setCategory(budget.category);
        setAmount(budget.amount.toString());
        setPeriod(budget.period);
        setCurrency(budget.currency || 'TWD');
        setEditingId(budget.id);
        setSelectionMode('none');
        setModalVisible(true);
    };

    const handleDeleteBudget = async (id: number) => {
        Alert.alert('刪除預算', '確定要刪除這個預算嗎？', [
            { text: '取消', style: 'cancel' },
            {
                text: '刪除',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await dbOperations.deleteBudget(id);
                        loadBudgets();
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: Budget }) => {
        const currentSpent = spendingMap[item.id] || 0;
        const progress = item.amount > 0 ? Math.min(currentSpent / item.amount, 1) : 0;
        const percent = item.amount > 0 ? (currentSpent / item.amount * 100).toFixed(2) : '0.00';
        const barColor = parseFloat(percent) > 100 ? '#FF3B30' : '#34C759';

        const periodLabel = item.period === 'monthly' ? '每月' :
            item.period === 'weekly' ? '每週' :
                item.period === 'yearly' ? '每年' : item.period;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => openEditModal(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="pie-chart" size={24} color={colors.tint} style={{ marginRight: 10 }} />
                        <Text style={styles.cardTitle}>{item.category}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteBudget(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.cardAmount}>預算: {item.currency} ${item.amount}</Text>
                <Text style={styles.cardDetails}>週期: {periodLabel}</Text>

                <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.subtleText }]}>目前花費: ${currentSpent} ({percent}%)</Text>
            </TouchableOpacity>
        );
    };

    const renderSelectionList = () => {
        let items: string[] = [];
        let onSelect: (item: string) => void = () => { };
        let currentSelected = '';

        if (selectionMode === 'category') {
            items = availableCategories;
            onSelect = (item) => { setCategory(item); setSelectionMode('none'); };
            currentSelected = category;
        } else if (selectionMode === 'period') {
            items = ['monthly', 'weekly', 'yearly'];
            onSelect = (item) => { setPeriod(item); setSelectionMode('none'); };
            currentSelected = period;
        } else if (selectionMode === 'currency') {
            items = currencies;
            onSelect = (item) => { setCurrency(item); setSelectionMode('none'); };
            currentSelected = currency;
        }

        return (
            <View style={{ width: '100%', flex: 1 }}>
                <Text style={styles.label}>
                    請選擇{selectionMode === 'category' ? '類別' : selectionMode === 'period' ? '週期' : '幣別'}
                </Text>
                <ScrollView style={{ width: '100%' }}>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.selectionItem, { borderBottomColor: colors.borderColor }]}
                            onPress={() => onSelect(item)}
                        >
                            <Text style={[styles.selectionText, { color: colors.text }]}>
                                {selectionMode === 'period' ?
                                    (item === 'monthly' ? '每月' : item === 'weekly' ? '每週' : '每年')
                                    : item}
                            </Text>
                            {currentSelected === item && (
                                <Ionicons name="checkmark" size={20} color={colors.tint} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.button, styles.cancelButton, { marginTop: 10 }]} onPress={() => setSelectionMode('none')}>
                    <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderForm = () => (
        <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>類別</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground },
                    editingId ? styles.disabledButton : null
                ]}
                onPress={() => !editingId && setSelectionMode('category')}
                disabled={!!editingId}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>{category || '選擇類別'}</Text>
                {!editingId && <Ionicons name="chevron-down" size={20} color={colors.subtleText} />}
            </TouchableOpacity>

            <Text style={styles.label}>週期</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }
                ]}
                onPress={() => setSelectionMode('period')}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {period === 'monthly' ? '每月' : period === 'weekly' ? '每週' : '每年'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <Text style={styles.label}>幣別</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }
                ]}
                onPress={() => setSelectionMode('currency')}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>{currency}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <Text style={styles.label}>金額</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        borderColor: colors.borderColor,
                        backgroundColor: colors.inputBackground,
                        color: colors.text
                    }
                ]}
                placeholder="金額"
                placeholderTextColor={colors.subtleText}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF', marginTop: 20 }]} onPress={handleSaveBudget}>
                <Text style={styles.buttonText}>儲存</Text>
            </TouchableOpacity>
            <View style={{ height: 50 }} />
        </ScrollView>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }, style]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>預算管理</Text>
                <TouchableOpacity onPress={() => {
                    setEditingId(null);
                    setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
                    setAmount('');
                    setPeriod('monthly');
                    setCurrency('TWD');
                    setSelectionMode('none');
                    setModalVisible(true);
                }}>
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無預算設定</Text>}
            />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{editingId ? '修改預算' : '新增預算'}</Text>
                        <TouchableOpacity onPress={closeModal}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    {selectionMode === 'none' ? renderForm() : (
                        <View style={{ padding: 20, flex: 1 }}>
                            {renderSelectionList()}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    listContent: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 15, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cardAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
    cardDetails: { fontSize: 14, color: colors.subtleText, marginBottom: 4 },
    progressBarContainer: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 5, marginTop: 5 },
    progressBar: { height: '100%' },
    progressText: { fontSize: 12 },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.subtleText },
    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    formContainer: { padding: 20 },
    label: { fontSize: 14, fontWeight: '500', color: colors.subtleText, marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
    dropdownButton: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    disabledButton: { opacity: 0.6 },
    dropdownText: { fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cancelButton: { backgroundColor: '#FF3B30' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    selectionItem: {
        width: '100%',
        padding: 15,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    selectionText: { fontSize: 16 }
});
