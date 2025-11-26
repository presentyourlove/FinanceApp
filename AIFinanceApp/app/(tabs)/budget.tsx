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
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Budget } from '../database';
import { useFocusEffect } from 'expo-router';

export default function BudgetScreen() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Selection Mode: 'none' (form), 'category', 'period'
    const [selectionMode, setSelectionMode] = useState<'none' | 'category' | 'period'>('none');

    // 新增狀態
    const [spending, setSpending] = useState<{ [key: string]: number }>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    const loadBudgets = async () => {
        try {
            const budgetData = await dbOperations.getBudgets();
            setBudgets(budgetData);

            // 取得本月支出
            const now = new Date();
            const spendingData = await dbOperations.getCategorySpending(now.getFullYear(), now.getMonth() + 1);
            setSpending(spendingData);

            // 取得可用類別 (預設 + 已使用)
            const usedCats = await dbOperations.getDistinctCategories();
            const defaultCats = ['餐飲', '交通', '購物', '娛樂', '居住', '教育', '醫療', '投資', '其他'];
            // 合併並去重
            const allCats = Array.from(new Set([...defaultCats, ...usedCats]));
            setAvailableCategories(allCats);

            // 如果還沒選類別，預設選第一個
            if (!category && allCats.length > 0) {
                setCategory(allCats[0]);
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
                await dbOperations.updateBudget(editingId, category, parseFloat(amount), period);
            } else {
                await dbOperations.addBudget(category, parseFloat(amount), period);
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
        setEditingId(null);
        setSelectionMode('none');
        setModalVisible(false);
    };

    const openEditModal = (budget: Budget) => {
        setCategory(budget.category);
        setAmount(budget.amount.toString());
        setPeriod(budget.period);
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
        const currentSpent = spending[item.category] || 0;
        const progress = item.amount > 0 ? Math.min(currentSpent / item.amount, 1) : 0;
        const percent = item.amount > 0 ? (currentSpent / item.amount * 100).toFixed(2) : '0.00';
        const barColor = parseFloat(percent) > 100 ? '#FF3B30' : '#34C759';

        const periodLabel = item.period === 'monthly' ? '每月' :
            item.period === 'weekly' ? '每週' :
                item.period === 'yearly' ? '每年' : item.period;

        return (
            <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
                <View style={styles.cardHeader}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    <TouchableOpacity onPress={() => handleDeleteBudget(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.amountText}>預算: ${item.amount}</Text>
                <Text style={styles.periodText}>週期: {periodLabel}</Text>

                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.progressText}>目前花費: ${currentSpent} ({percent}%)</Text>
            </TouchableOpacity>
        );
    };

    const renderSelectionList = () => {
        const items = selectionMode === 'category' ? availableCategories : ['monthly', 'weekly', 'yearly'];
        const onSelect = (item: string) => {
            if (selectionMode === 'category') setCategory(item);
            else setPeriod(item);
            setSelectionMode('none');
        };

        return (
            <View style={{ width: '100%', maxHeight: 300 }}>
                <Text style={styles.modalTitle}>
                    請選擇{selectionMode === 'category' ? '類別' : '週期'}
                </Text>
                <ScrollView style={{ width: '100%' }}>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={styles.selectionItem}
                            onPress={() => onSelect(item)}
                        >
                            <Text style={styles.selectionText}>
                                {selectionMode === 'period' ?
                                    (item === 'monthly' ? '每月' : item === 'weekly' ? '每週' : '每年')
                                    : item}
                            </Text>
                            {(selectionMode === 'category' ? category === item : period === item) && (
                                <Ionicons name="checkmark" size={20} color="#007AFF" />
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
            <Text style={styles.modalTitle}>{editingId ? '修改預算' : '新增預算'}</Text>

            <Text style={styles.label}>類別</Text>
            <TouchableOpacity
                style={[styles.dropdownButton, editingId && styles.disabledButton]}
                onPress={() => !editingId && setSelectionMode('category')}
                disabled={!!editingId}
            >
                <Text style={styles.dropdownText}>{category || '選擇類別'}</Text>
                {!editingId && <Ionicons name="chevron-down" size={20} color="#666" />}
            </TouchableOpacity>

            <Text style={styles.label}>週期</Text>
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setSelectionMode('period')}
            >
                <Text style={styles.dropdownText}>
                    {period === 'monthly' ? '每月' : period === 'weekly' ? '每週' : '每年'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Text style={styles.label}>金額</Text>
            <TextInput
                style={styles.input}
                placeholder="金額"
                placeholderTextColor="#666"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={closeModal}>
                    <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleSaveBudget}>
                    <Text style={styles.buttonText}>儲存</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>預算管理</Text>
                <TouchableOpacity onPress={() => {
                    setEditingId(null);
                    setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
                    setAmount('');
                    setPeriod('monthly');
                    setSelectionMode('none');
                    setModalVisible(true);
                }}>
                    <Ionicons name="add-circle-outline" size={30} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無預算設定</Text>}
            />

            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {selectionMode === 'none' ? renderForm() : renderSelectionList()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold' },
    listContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    categoryText: { fontSize: 18, fontWeight: '600' },
    amountText: { fontSize: 16, color: '#666' },
    periodText: { fontSize: 14, color: '#999', marginBottom: 10 },
    progressBarContainer: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
    progressBar: { height: '100%', backgroundColor: '#34C759' },
    progressText: { fontSize: 12, color: '#666' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    label: { alignSelf: 'flex-start', marginBottom: 5, color: '#333', fontWeight: '500' },
    input: { width: '100%', padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
    dropdownButton: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    disabledButton: { backgroundColor: '#f0f0f0' },
    dropdownText: { fontSize: 16, color: '#333' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    fullWidthButton: { width: '100%', padding: 10, borderRadius: 8, alignItems: 'center' },
    cancelButton: { backgroundColor: '#FF3B30' },
    confirmButton: { backgroundColor: '#007AFF' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    selectionItem: {
        width: '100%',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    selectionText: { fontSize: 16 }
});
