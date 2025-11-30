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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Budget } from '../services/database';
import { useFocusEffect } from 'expo-router';
import * as CategoryStorage from '../utils/categoryStorage';
import * as CurrencyStorage from '../utils/currencyStorage';
import { useTheme } from '../context/ThemeContext';

export default function BudgetScreen() {
    const { colors, isDark } = useTheme();
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
                            // AmountInMain = Amount * AccRate
                            // AmountInBudget = AmountInMain / BudgetRate
                            const accRate = rates[t.accountCurrency] || 1;
                            const amountInBudget = (t.amount * accRate) / budgetRate;
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
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => openEditModal(item)}
            >
                <View style={styles.cardHeader}>
                    <Text style={[styles.categoryText, { color: colors.text }]}>{item.category}</Text>
                    <TouchableOpacity onPress={() => handleDeleteBudget(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.amountText, { color: colors.subtleText }]}>預算: {item.currency} ${item.amount}</Text>
                <Text style={[styles.periodText, { color: colors.subtleText }]}>週期: {periodLabel}</Text>

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
            <View style={{ width: '100%', maxHeight: 300 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
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
                <TouchableOpacity style={[styles.fullWidthButton, styles.cancelButton, { marginTop: 10 }]} onPress={() => setSelectionMode('none')}>
                    <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderForm = () => (
        <>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? '修改預算' : '新增預算'}</Text>

            <Text style={[styles.label, { color: colors.text }]}>類別</Text>
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

            <Text style={[styles.label, { color: colors.text }]}>週期</Text>
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

            <Text style={[styles.label, { color: colors.text }]}>幣別</Text>
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

            <Text style={[styles.label, { color: colors.text }]}>金額</Text>
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

            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={closeModal}>
                    <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF' }]} onPress={handleSaveBudget}>
                    <Text style={styles.buttonText}>儲存</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>預算管理</Text>
                <TouchableOpacity onPress={() => {
                    setEditingId(null);
                    setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
                    setAmount('');
                    setPeriod('monthly');
                    setCurrency('TWD');
                    setSelectionMode('none');
                    setModalVisible(true);
                }}>
                    <Ionicons name="add-circle-outline" size={30} color={colors.tint} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.subtleText }]}>尚無預算設定</Text>}
            />

            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centeredView}>
                        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                            {selectionMode === 'none' ? renderForm() : renderSelectionList()}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold' },
    listContent: { padding: 20 },
    card: { borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    categoryText: { fontSize: 18, fontWeight: '600' },
    amountText: { fontSize: 16 },
    periodText: { fontSize: 14, marginBottom: 10 },
    progressBarContainer: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
    progressBar: { height: '100%' },
    progressText: { fontSize: 12 },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '80%', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    label: { alignSelf: 'flex-start', marginBottom: 5, fontWeight: '500' },
    input: { width: '100%', padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 15 },
    dropdownButton: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    disabledButton: { opacity: 0.6 },
    dropdownText: { fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    fullWidthButton: { width: '100%', padding: 10, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#FF3B30' },
    buttonText: { color: 'white', fontWeight: 'bold' },
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
