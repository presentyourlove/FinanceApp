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
import i18n from '@/src/i18n';
import { CURRENCIES } from '@/src/constants/currencies';

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
            Alert.alert(i18n.t('budget.errorTitle'), i18n.t('budget.saveFail'));
        }
    };

    const handleDeleteBudget = async (id: number) => {
        Alert.alert(i18n.t('budget.deleteTitle'), i18n.t('budget.deleteConfirm'), [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            {
                text: i18n.t('common.delete'),
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
                <Text style={styles.headerTitle}>{i18n.t('budget.title')}</Text>
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
                currencies={CURRENCIES}
            />
        </View>
    );
}

