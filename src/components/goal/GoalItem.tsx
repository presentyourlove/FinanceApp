import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '@/src/services/database';
import i18n from '@/src/i18n';

interface GoalItemProps {
    item: Goal;
    colors: any;
    styles: any;
    isDark: boolean;
    onEdit: (goal: Goal) => void;
    onDelete: (id: number) => void;
    onAdjust: (goal: Goal, type: 'add' | 'subtract') => void;
}

export const GoalItem: React.FC<GoalItemProps> = ({ item, colors, styles, isDark, onEdit, onDelete, onAdjust }) => {
    const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
    const currencySymbol = item.currency || 'TWD';

    const suggestion = useMemo(() => {
        if (!item.deadline) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(item.deadline);
        deadlineDate.setHours(0, 0, 0, 0);

        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysRemaining < 0) return i18n.t('goal.expired');
        if (daysRemaining === 0) return i18n.t('goal.dueToday');

        const remainingAmount = item.targetAmount - item.currentAmount;
        if (remainingAmount <= 0) return i18n.t('goal.completed');

        const dailyAmount = Math.ceil(remainingAmount / daysRemaining);
        return `${i18n.t('goal.dailySuggestion')}: ${item.currency || 'TWD'} $${dailyAmount.toLocaleString()}`;
    }, [item.deadline, item.targetAmount, item.currentAmount, item.currency]);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onEdit(item)}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="flag" size={24} color={colors.tint} style={{ marginRight: 10 }} />
                    <Text style={styles.goalName}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => onDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
            </View>
            <Text style={styles.amountText}>{i18n.t('goal.targetLabel')}: {currencySymbol} ${item.targetAmount}</Text>
            {item.deadline && <Text style={styles.deadlineText}>{i18n.t('goal.deadlinePrefix')}: {item.deadline}</Text>}

            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
                <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
            </View>

            {suggestion && (
                <Text style={[styles.suggestionText, { color: colors.tint }]}>{suggestion}</Text>
            )}

            <View style={styles.progressRow}>
                <Text style={[styles.progressText, { color: colors.subtleText }]}>{i18n.t('goal.currentAmount')}: {currencySymbol} ${item.currentAmount} ({progress.toFixed(1)}%)</Text>
                <View style={styles.adjustButtons}>
                    <TouchableOpacity
                        style={[styles.adjustButton, styles.minusButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onAdjust(item, 'subtract');
                        }}
                    >
                        <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.adjustButton, styles.plusButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onAdjust(item, 'add');
                        }}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};
