import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Goal } from '../database';
import { useFocusEffect } from 'expo-router';

export default function GoalScreen() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');

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

    const handleAddGoal = async () => {
        if (!name || !targetAmount) {
            Alert.alert('錯誤', '請輸入目標名稱和金額');
            return;
        }
        try {
            await dbOperations.addGoal(name, parseFloat(targetAmount), deadline);
            setName('');
            setTargetAmount('');
            setDeadline('');
            setModalVisible(false);
            loadGoals();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '新增目標失敗');
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

    const handleUpdateAmount = async (goal: Goal) => {
        Alert.prompt(
            '更新進度',
            `目前金額: ${goal.currentAmount}`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '更新',
                    onPress: async (amount: string | undefined) => {
                        if (amount) {
                            try {
                                await dbOperations.updateGoalAmount(goal.id, parseFloat(amount));
                                loadGoals();
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    },
                },
            ],
            'plain-text',
            goal.currentAmount.toString(),
            'numeric'
        );
    };

    const renderItem = ({ item }: { item: Goal }) => {
        const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;

        return (
            <TouchableOpacity style={styles.card} onPress={() => handleUpdateAmount(item)}>
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
                <Text style={styles.progressText}>目前存入: ${item.currentAmount} ({progress.toFixed(1)}%)</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>存錢目標</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
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

            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>新增目標</Text>

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

                        <TextInput
                            style={styles.input}
                            placeholder="截止日期 (選填)"
                            placeholderTextColor="#666"
                            value={deadline}
                            onChangeText={setDeadline}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleAddGoal}>
                                <Text style={styles.buttonText}>新增</Text>
                            </TouchableOpacity>
                        </View>
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
    goalName: { fontSize: 18, fontWeight: '600' },
    amountText: { fontSize: 16, color: '#666' },
    deadlineText: { fontSize: 14, color: '#999', marginBottom: 10 },
    progressBarContainer: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
    progressBar: { height: '100%', backgroundColor: '#FF9500' },
    progressText: { fontSize: 12, color: '#666' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    input: { width: '100%', padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    cancelButton: { backgroundColor: '#FF3B30' },
    confirmButton: { backgroundColor: '#007AFF' },
    buttonText: { color: 'white', fontWeight: 'bold' },
});
