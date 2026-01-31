import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Budget } from '@/src/services/database';
import i18n from '@/src/i18n';

interface BudgetListProps {
    budgets: Budget[];
    spendingMap: { [key: number]: number };
    colors: any;
    styles: any;
    isDark: boolean;
    onEdit: (budget: Budget) => void;
    onDelete: (id: number) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
    budgets,
    spendingMap,
    colors,
    styles,
    isDark,
    onEdit,
    onDelete
}) => {
    const renderItem = ({ item }: { item: Budget }) => {
        const currentSpent = spendingMap[item.id] || 0;
        const progress = item.amount > 0 ? Math.min(currentSpent / item.amount, 1) : 0;
        const percent = item.amount > 0 ? (currentSpent / item.amount * 100).toFixed(2) : '0.00';
        const barColor = parseFloat(percent) > 100 ? '#FF3B30' : '#34C759';

        const periodLabel = item.period === 'monthly' ? i18n.t('budget.monthly') :
            item.period === 'weekly' ? i18n.t('budget.weekly') :
                item.period === 'yearly' ? i18n.t('budget.yearly') : item.period;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => onEdit(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="pie-chart" size={24} color={colors.tint} style={{ marginRight: 10 }} />
                        <Text style={styles.cardTitle}>{item.category}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onDelete(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.cardAmount}>{i18n.t('budget.amount')}: {item.currency} ${item.amount}</Text>
                <Text style={styles.cardDetails}>{i18n.t('budget.period')}: {periodLabel}</Text>

                <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.subtleText }]}>{i18n.t('budget.currentSpent')}: ${currentSpent} ({percent}%)</Text>
            </TouchableOpacity>
        );
    };

    return (
        <FlashList
            data={budgets}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('budget.emptyList')}</Text>}
            estimatedItemSize={150}
        />
    );
};
