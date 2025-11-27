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
    Keyboard
} from 'react-native';
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

    const loadGoals = async () => {
        try {
            const data = await dbOperations.getGoals();
            setGoals(data);
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
            await dbOperations.updateGoalAmount(adjustingGoal.id, newAmount);
            setAmountModalVisible(false);
            loadGoals();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '更新進度失敗');
        }
    };

    const renderItem = ({ item }: { item: Goal }) => {
        const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;

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
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centeredView}>
                        <TouchableWithoutFeedback>
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
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Adjust Amount Modal */}
            <Modal visible={isAmountModalVisible} animationType="fade" transparent={true}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centeredView}>
                        <TouchableWithoutFeedback>
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

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setAmountModalVisible(false)}>
                                        <Text style={styles.buttonText}>取消</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmAdjust}>
                                        <Text style={styles.buttonText}>確認</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
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
});
