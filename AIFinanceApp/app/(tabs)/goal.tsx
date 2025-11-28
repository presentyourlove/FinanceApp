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
    TouchableWithoutFeedback,
    Keyboard,
    Switch,
    Pressable,
    Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Goal } from '../services/database';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GoalScreen() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);

    // Goal Form States
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Adjust Amount States
    const [isAmountModalVisible, setAmountModalVisible] = useState(false);
    const [adjustingGoal, setAdjustingGoal] = useState<Goal | null>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
    const [adjustAmount, setAdjustAmount] = useState('');

    // Sync to Ledger States
    const [accounts, setAccounts] = useState<{ id: number; name: string; currentBalance: number }[]>([]);
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);
    const [selectedFromAccount, setSelectedFromAccount] = useState<number | null>(null);
    const [selectedToAccount, setSelectedToAccount] = useState<number | null>(null);

    // iOS Picker Modal State
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [pickerMode, setPickerMode] = useState<'from' | 'to'>('from');
    const [tempPickerValue, setTempPickerValue] = useState<number | null>(null);

    const loadGoals = async () => {
        try {
            const loadedGoals = await dbOperations.getGoals();
            const loadedAccounts = await dbOperations.getAccounts();
            setAccounts(loadedAccounts);

            // Sort goals:
            // 1. Active goals first, Completed goals last
            // 2. For active goals: Sort by deadline (closest first), no deadline last
            const sortedGoals = loadedGoals.sort((a: Goal, b: Goal) => {
                const aCompleted = a.currentAmount >= a.targetAmount;
                const bCompleted = b.currentAmount >= b.targetAmount;

                if (aCompleted !== bCompleted) {
                    return aCompleted ? 1 : -1; // Active first
                }

                if (!aCompleted) {
                    // Both are active, sort by deadline
                    if (a.deadline && b.deadline) {
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    }
                    if (a.deadline) return -1; // a has deadline, comes first
                    if (b.deadline) return 1;  // b has deadline, comes first
                    return 0;
                }

                return 0; // Both completed, keep original order
            });

            setGoals(sortedGoals);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadGoals();
        }, [])
    );

    const openAddModal = () => {
        setEditingGoal(null);
        setName('');
        setTargetAmount('');
        setDeadline('');
        setSelectedDate(new Date());
        setModalVisible(true);
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(goal.targetAmount.toString());
        setDeadline(goal.deadline || '');
        if (goal.deadline) {
            setSelectedDate(new Date(goal.deadline));
        } else {
            setSelectedDate(new Date());
        }
        setModalVisible(true);
    };

    const handleSaveGoal = async () => {
        if (!name || !targetAmount) {
            Alert.alert('錯誤', '請輸入目標名稱和金額');
            return;
        }
        try {
            if (editingGoal) {
                await dbOperations.updateGoal(editingGoal.id, name, parseFloat(targetAmount), deadline);
            } else {
                await dbOperations.addGoal(name, parseFloat(targetAmount), deadline);
            }
            setModalVisible(false);
            loadGoals();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', editingGoal ? '更新目標失敗' : '新增目標失敗');
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        if (date) {
            setSelectedDate(date);
            const formattedDate = date.toISOString().split('T')[0];
            setDeadline(formattedDate);
        }
    };

    const handleDeleteGoal = async (id: number) => {
        Alert.alert('刪除目標', '確定要刪除這個目標嗎？', [
            { text: '取消', style: 'cancel' },
            {
                text: '刪除',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await dbOperations.deleteGoal(id);
                        loadGoals();
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        ]);
    };

    const openAdjustModal = (goal: Goal, type: 'add' | 'subtract') => {
        setAdjustingGoal(goal);
        setAdjustType(type);
        setAdjustAmount('');
        // Reset sync states
        setIsSyncEnabled(true);
        setSelectedFromAccount(null);
        setSelectedToAccount(null);
        setAmountModalVisible(true);
    };

    const handleConfirmAdjust = async () => {
        if (!adjustingGoal || !adjustAmount) return;

        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('錯誤', '請輸入有效的金額');
            return;
        }

        let newAmount = adjustingGoal.currentAmount;
        if (adjustType === 'add') {
            newAmount += amount;
        } else {
            newAmount -= amount;
            if (newAmount < 0) newAmount = 0;
        }

        try {
            // Handle Sync to Ledger
            if (isSyncEnabled && adjustType === 'add') {
                const date = new Date();
                const description = adjustingGoal.name;

                if (selectedFromAccount && selectedToAccount) {
                    // Transfer
                    await dbOperations.performTransfer(selectedFromAccount, selectedToAccount, amount, date, description);
                } else if (selectedFromAccount && !selectedToAccount) {
                    // Expense (From Account -> N/A)
                    await dbOperations.addTransactionDB({
                        amount,
                        type: 'expense',
                        date,
                        description,
                        accountId: selectedFromAccount
                    });
                    // Update account balance
                    const acc = (await dbOperations.getAccounts()).find(a => a.id === selectedFromAccount);
                    if (acc) {
                        await dbOperations.updateAccountBalanceDB(acc.id, acc.currentBalance - amount);
                    }
                } else if (!selectedFromAccount && selectedToAccount) {
                    // Income (N/A -> To Account)
                    await dbOperations.addTransactionDB({
                        amount,
                        type: 'income',
                        date,
                        description,
                        accountId: selectedToAccount
                    });
                    // Update account balance
                    const acc = (await dbOperations.getAccounts()).find(a => a.id === selectedToAccount);
                    if (acc) {
                        await dbOperations.updateAccountBalanceDB(acc.id, acc.currentBalance + amount);
                    }
                }
                // If both are null, no transaction is created
            }

            await dbOperations.updateGoalAmount(adjustingGoal.id, newAmount);
            setAmountModalVisible(false);
            loadGoals();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '更新失敗');
        }
    };

    const openPickerModal = (mode: 'from' | 'to') => {
        Keyboard.dismiss();
        setPickerMode(mode);
        setTempPickerValue(mode === 'from' ? selectedFromAccount : selectedToAccount);
        setShowPickerModal(true);
    };

    const handlePickerConfirm = () => {
        if (pickerMode === 'from') {
            setSelectedFromAccount(tempPickerValue);
        } else {
            setSelectedToAccount(tempPickerValue);
        }
        setShowPickerModal(false);
    };

    const renderAccountPicker = (selectedValue: number | null, onValueChange: (val: number | null) => void, mode: 'from' | 'to') => {
        const selectedAccount = accounts.find(a => a.id === selectedValue);
        return (
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => openPickerModal(mode)}
            >
                <Text style={styles.pickerButtonText}>
                    {selectedAccount ? selectedAccount.name : '不適用'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
        );
    };

    const calculateDailySuggestion = (goal: Goal) => {
        if (!goal.deadline) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(goal.deadline);
        deadlineDate.setHours(0, 0, 0, 0);

        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysRemaining < 0) return '已過期';
        if (daysRemaining === 0) return '今天是截止日';

        const remainingAmount = goal.targetAmount - goal.currentAmount;
        if (remainingAmount <= 0) return '已達成';

        const dailyAmount = Math.ceil(remainingAmount / daysRemaining);
        return `每日建議存入: $${dailyAmount.toLocaleString()}`;
    };

    const renderItem = ({ item }: { item: Goal }) => {
        const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
        const suggestion = calculateDailySuggestion(item);

        return (
            <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
                <View style={styles.cardHeader}>
                    <Text style={styles.goalName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteGoal(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.amountText}>目標: ${item.targetAmount}</Text>
                {item.deadline && <Text style={styles.deadlineText}>截止日: {item.deadline}</Text>}

                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
                </View>

                {suggestion && (
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                )}

                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>目前存入: ${item.currentAmount} ({progress.toFixed(1)}%)</Text>
                    <View style={styles.adjustButtons}>
                        <TouchableOpacity
                            style={[styles.adjustButton, styles.minusButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                openAdjustModal(item, 'subtract');
                            }}
                        >
                            <Ionicons name="remove" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.adjustButton, styles.plusButton]}
                            onPress={(e) => {
                                e.stopPropagation();
                                openAdjustModal(item, 'add');
                            }}
                        >
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>存錢目標</Text>
                <TouchableOpacity onPress={openAddModal}>
                    <Ionicons name="add-circle-outline" size={30} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={goals}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無存錢目標</Text>}
            />

            {/* Goal Add/Edit Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={styles.centeredView}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{editingGoal ? '編輯目標' : '新增目標'}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="目標名稱 (例如: 新手機)"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="目標金額"
                            placeholderTextColor="#666"
                            value={targetAmount}
                            onChangeText={setTargetAmount}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(!showDatePicker)}
                        >
                            <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
                                {deadline || '截止日期 (選填)'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#666" />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="compact"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    textColor="#000000"
                                />
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleSaveGoal}>
                                <Text style={styles.buttonText}>{editingGoal ? '更新' : '新增'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Adjust Amount Modal */}
            <Modal visible={isAmountModalVisible} animationType="fade" transparent={true}>
                <View style={styles.centeredView}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>
                            {adjustType === 'add' ? '增加存款' : '減少存款'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            目前金額: ${adjustingGoal?.currentAmount}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="輸入金額"
                            placeholderTextColor="#666"
                            value={adjustAmount}
                            onChangeText={setAdjustAmount}
                            keyboardType="numeric"
                            autoFocus={true}
                        />

                        {adjustType === 'add' && (
                            <View style={styles.syncContainer}>
                                <View style={styles.syncHeader}>
                                    <Text style={styles.syncLabel}>同步記帳</Text>
                                    <Switch
                                        value={isSyncEnabled}
                                        onValueChange={setIsSyncEnabled}
                                        trackColor={{ false: "#767577", true: "#34C759" }}
                                    />
                                </View>

                                {isSyncEnabled && (
                                    <View style={styles.pickersContainer}>
                                        <View style={styles.pickerWrapper}>
                                            <Text style={styles.pickerLabel}>從 (轉出)</Text>
                                            {renderAccountPicker(selectedFromAccount, setSelectedFromAccount, 'from')}
                                        </View>

                                        <Ionicons name="arrow-forward" size={20} color="#666" style={{ marginTop: 20 }} />

                                        <View style={styles.pickerWrapper}>
                                            <Text style={styles.pickerLabel}>到 (轉入)</Text>
                                            {renderAccountPicker(selectedToAccount, setSelectedToAccount, 'to')}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setAmountModalVisible(false)}>
                                <Text style={styles.buttonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmAdjust}>
                                <Text style={styles.buttonText}>確認</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Custom Account Picker Overlay */}
                    <AccountPickerOverlay
                        visible={showPickerModal}
                        onClose={() => setShowPickerModal(false)}
                        onSelect={(id: number | null) => {
                            setTempPickerValue(id);
                            if (pickerMode === 'from') {
                                setSelectedFromAccount(id);
                            } else {
                                setSelectedToAccount(id);
                            }
                            setShowPickerModal(false);
                        }}
                        accounts={accounts}
                    />
                </View>
            </Modal>
        </SafeAreaView >
    );
}

// Custom Account Picker Overlay Component
const AccountPickerOverlay = ({ visible, onClose, onSelect, accounts }: any) => {
    if (!visible) return null;
    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
            <Pressable style={styles.pickerModalOverlay} onPress={onClose}>
                <View style={styles.pickerModalContent}>
                    <View style={styles.pickerModalHeader}>
                        <Text style={styles.pickerModalTitle}>選擇帳戶</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={[{ id: null, name: '不適用' }, ...accounts]}
                        keyExtractor={(item) => item.id?.toString() || 'null'}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.pickerItem}
                                onPress={() => onSelect(item.id)}
                            >
                                <Text style={styles.pickerItemText}>{item.name}</Text>
                                {item.id !== null && (
                                    <Text style={styles.pickerItemSubtext}>
                                        ${item.currentBalance?.toLocaleString()}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold' },
    listContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    goalName: { fontSize: 18, fontWeight: '600' },
    amountText: { fontSize: 16, color: '#666' },
    deadlineText: { fontSize: 14, color: '#999', marginBottom: 10 },
    progressBarContainer: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
    progressBar: { height: '100%', backgroundColor: '#FF9500' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: { fontSize: 12, color: '#666' },
    adjustButtons: { flexDirection: 'row', gap: 10 },
    adjustButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    plusButton: { backgroundColor: '#34C759' },
    minusButton: { backgroundColor: '#FF3B30' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 15 },
    input: { width: '100%', padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
    dateButton: {
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
    dateText: { fontSize: 16, color: '#333' },
    datePlaceholder: { fontSize: 16, color: '#666' },
    datePickerContainer: {
        width: '100%',
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    cancelButton: { backgroundColor: '#FF3B30' },
    confirmButton: { backgroundColor: '#007AFF' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    syncContainer: { width: '100%', marginBottom: 15 },
    syncHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    syncLabel: { fontSize: 16, color: '#333' },
    pickersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    pickerWrapper: { flex: 1, maxWidth: '45%' },
    pickerLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
    pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
    pickerButton: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        backgroundColor: '#fff'
    },
    pickerButtonText: { fontSize: 16, color: '#333' },
    pickerModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    pickerModalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '60%' },
    pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    pickerModalTitle: { fontSize: 18, fontWeight: 'bold' },
    pickerItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerItemText: { fontSize: 16, color: '#333' },
    pickerItemSubtext: { fontSize: 14, color: '#666' },
    suggestionText: { fontSize: 14, color: '#007AFF', marginBottom: 5, fontWeight: '500' }
});
