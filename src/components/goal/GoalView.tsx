import React, { useState } from 'react';
import { View, Text, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations, Goal } from '@/src/services/database';
import { TransactionType } from '@/src/types';
import { useTheme } from '@/src/context/ThemeContext';
import { getStyles } from '@/src/components/goal/styles';

// Components
import { GoalItem } from '@/src/components/goal/GoalItem';
import { GoalFormModal } from '@/src/components/goal/GoalFormModal';
import { GoalDepositModal } from '@/src/components/goal/GoalDepositModal';

export default function GoalView({ style }: { style?: any }) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [accounts, setAccounts] = useState<{ id: number; name: string; currentBalance: number }[]>([]);

    // Form Modal State
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Deposit Modal State
    const [isDepositVisible, setDepositVisible] = useState(false);
    const [adjustingGoal, setAdjustingGoal] = useState<Goal | null>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

    const currencies = ['TWD', 'USD', 'JPY', 'EUR', 'KRW'];

    const loadData = async () => {
        try {
            const [loadedGoals, loadedAccounts] = await Promise.all([
                dbOperations.getGoals(),
                dbOperations.getAccounts(),
            ]);
            setAccounts(loadedAccounts);

            const sortedGoals = loadedGoals.sort((a: Goal, b: Goal) => {
                const aCompleted = a.currentAmount >= a.targetAmount;
                const bCompleted = b.currentAmount >= b.targetAmount;
                if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
                if (!aCompleted) {
                    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    if (a.deadline) return -1;
                    if (b.deadline) return 1;
                    return 0;
                }
                return 0;
            });
            setGoals(sortedGoals);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleSaveGoal = async (name: string, amount: string, deadline: string, currency: string) => {
        try {
            if (editingGoal) {
                await dbOperations.updateGoal(editingGoal.id, name, parseFloat(amount), deadline, currency);
            } else {
                await dbOperations.addGoal(name, parseFloat(amount), deadline, currency);
            }
            setFormVisible(false);
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', editingGoal ? '更新目標失敗' : '新增目標失敗');
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
                        loadData();
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        ]);
    };

    const handleAdjustConfirm = async (amountStr: string, isSync: boolean, fromId: number | null, toId: number | null) => {
        if (!adjustingGoal || !amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('錯誤', '請輸入有效的金額');
            return;
        }

        let newAmount = adjustingGoal.currentAmount;
        if (adjustType === 'add') newAmount += amount;
        else {
            newAmount -= amount;
            if (newAmount < 0) newAmount = 0;
        }

        try {
            if (isSync && adjustType === 'add') {
                const date = new Date();
                const description = adjustingGoal.name;
                if (fromId && toId) {
                    await dbOperations.performTransfer(fromId, toId, amount, date, description);
                } else if (fromId && !toId) {
                    await dbOperations.addTransactionDB({
                        amount, type: TransactionType.EXPENSE, date, description, accountId: fromId
                    });
                    const acc = accounts.find(a => a.id === fromId);
                    if (acc) await dbOperations.updateAccountBalanceDB(acc.id, acc.currentBalance - amount);
                } else if (!fromId && toId) {
                    await dbOperations.addTransactionDB({
                        amount, type: TransactionType.INCOME, date, description, accountId: toId
                    });
                    const acc = accounts.find(a => a.id === toId);
                    if (acc) await dbOperations.updateAccountBalanceDB(acc.id, acc.currentBalance + amount);
                }
            }
            await dbOperations.updateGoalAmount(adjustingGoal.id, newAmount);
            setDepositVisible(false);
            loadData();
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '更新失敗');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }, style]}>
            <View style={[styles.header, { paddingTop: 20 }]}>
                <Text style={styles.headerTitle}>存錢目標</Text>
                <TouchableOpacity onPress={() => { setEditingGoal(null); setFormVisible(true); }}>
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={goals}
                renderItem={({ item }) => (
                    <GoalItem
                        item={item}
                        colors={colors}
                        styles={styles}
                        isDark={isDark}
                        onEdit={(goal) => { setEditingGoal(goal); setFormVisible(true); }}
                        onDelete={handleDeleteGoal}
                        onAdjust={(goal, type) => { setAdjustingGoal(goal); setAdjustType(type); setDepositVisible(true); }}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無存錢目標</Text>}
            />

            <GoalFormModal
                visible={isFormVisible}
                editingGoal={editingGoal}
                onClose={() => setFormVisible(false)}
                onSave={handleSaveGoal}
                colors={colors}
                styles={styles}
                isDark={isDark}
                currencies={currencies}
            />

            <GoalDepositModal
                visible={isDepositVisible}
                goal={adjustingGoal}
                type={adjustType}
                onClose={() => setDepositVisible(false)}
                onConfirm={handleAdjustConfirm}
                accounts={accounts}
                colors={colors}
                styles={styles}
            />
        </View>
    );
}
