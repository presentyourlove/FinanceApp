import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Budget } from '@/src/services/database';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useBudgets } from '@/src/hooks/useBudgets';
import { getStyles } from './styles';
import { BudgetList } from './BudgetList';
import { BudgetFormModal } from './BudgetFormModal';

export default function BudgetView({ style }: { style?: any }) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);

    // Custom Hook
    const {
        budgets,
        spendingMap,
        availableCategories,
        refresh,
        addBudget,
        updateBudget,
        deleteBudget
    } = useBudgets();

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

    const currencies = ['TWD', 'USD', 'JPY', 'EUR', 'KRW', 'CNY'];

    useFocusEffect(
        React.useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handleSaveBudget = async (category: string, amount: string, period: string, currency: string) => {
        try {
            if (editingBudget) {
                await updateBudget(editingBudget.id, category, parseFloat(amount), period, currency);
            } else {
                await addBudget(category, parseFloat(amount), period, currency);
            }
            setModalVisible(false);
            setEditingBudget(null);
        } catch (error) {
            console.error(error);
            Alert.alert('錯誤', '儲存預算失敗');
        }
    };

    const handleDeleteBudget = async (id: number) => {
        Alert.alert('刪除預算', '確定要刪除這個預算嗎？', [
            { text: '取消', style: 'cancel' },
            {
                text: '刪除',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteBudget(id);
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        ]);
    };

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>預算管理</Text>
                <TouchableOpacity onPress={() => {
                    setEditingBudget(null);
                    setModalVisible(true);
                }}>
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <BudgetList
                budgets={budgets}
                spendingMap={spendingMap}
                colors={colors}
                styles={styles}
                isDark={isDark}
                onEdit={(budget) => {
                    setEditingBudget(budget);
                    setModalVisible(true);
                }}
                onDelete={handleDeleteBudget}
            />

            <BudgetFormModal
                visible={isModalVisible}
                editingBudget={editingBudget}
                onClose={() => {
                    setModalVisible(false);
                    setEditingBudget(null);
                }}
                onSave={handleSaveBudget}
                availableCategories={availableCategories}
                colors={colors}
                styles={styles}
                currencies={currencies}
            />
        </View>
    );
}
