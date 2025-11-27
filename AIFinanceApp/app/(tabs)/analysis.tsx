import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dbOperations } from '../services/database';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AnalysisScreen() {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [topCategories, setTopCategories] = useState<{ category: string; amount: number }[]>([]);
    const [advice, setAdvice] = useState<string[]>([]);

    const loadData = async () => {
        try {
            const accounts = await dbOperations.getAccounts();
            let income = 0;
            let expense = 0;
            const categoryMap = new Map<string, number>();

            for (const acc of accounts) {
                const transactions = await dbOperations.getTransactionsByAccountDB(acc.id);
                for (const t of transactions) {
                    if (t.type === 'income') {
                        income += t.amount;
                    } else if (t.type === 'expense') {
                        expense += t.amount;
                        // Extract category from description or use a default
                        // Assuming description might contain category info or we need a proper category field in transaction
                        // For now, let's use a simple heuristic or just "General" if not found
                        const cat = t.description ? t.description.split(' ')[0] : '其他';
                        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
                    }
                }
            }

            setTotalIncome(income);
            setTotalExpense(expense);

            // Sort categories
            const sortedCategories = Array.from(categoryMap.entries())
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            setTopCategories(sortedCategories);

            // Generate AI Advice (Rule-based for now)
            const newAdvice = [];
            if (expense > income) {
                newAdvice.push('⚠️ 本月支出已超過收入，建議檢視非必要開銷。');
            } else if (expense > income * 0.8) {
                newAdvice.push('⚠️ 支出已達收入的 80%，請注意控制預算。');
            } else {
                newAdvice.push('✅ 財務狀況良好，繼續保持！');
            }

            if (sortedCategories.length > 0) {
                newAdvice.push(`💡 您在「${sortedCategories[0].category}」類別花費最多，建議設定預算上限。`);
            }

            setAdvice(newAdvice);

        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>AI 財務分析</Text>

                {/* Overview Cards */}
                <View style={styles.overviewContainer}>
                    <View style={[styles.card, styles.incomeCard]}>
                        <Text style={styles.cardLabel}>總收入</Text>
                        <Text style={styles.cardValue}>${totalIncome}</Text>
                    </View>
                    <View style={[styles.card, styles.expenseCard]}>
                        <Text style={styles.cardLabel}>總支出</Text>
                        <Text style={styles.cardValue}>${totalExpense}</Text>
                    </View>
                </View>

                {/* AI Advice */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>AI 建議</Text>
                    <View style={styles.adviceCard}>
                        {advice.map((item, index) => (
                            <View key={index} style={styles.adviceItem}>
                                <Ionicons name="bulb-outline" size={24} color="#FFD60A" style={{ marginRight: 10 }} />
                                <Text style={styles.adviceText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Top Spending Categories */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>最高花費類別</Text>
                    <View style={styles.categoryCard}>
                        {topCategories.length > 0 ? (
                            topCategories.map((item, index) => (
                                <View key={index} style={styles.categoryItem}>
                                    <Text style={styles.categoryName}>{index + 1}. {item.category}</Text>
                                    <Text style={styles.categoryAmount}>${item.amount}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>尚無支出資料</Text>
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    scrollContent: { padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#000' },
    overviewContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: { flex: 0.48, padding: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    incomeCard: { backgroundColor: '#E8F5E9' },
    expenseCard: { backgroundColor: '#FFEBEE' },
    cardLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
    cardValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    adviceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    adviceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    adviceText: { fontSize: 16, color: '#333', flex: 1 },
    categoryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    categoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    categoryName: { fontSize: 16, color: '#333' },
    categoryAmount: { fontSize: 16, fontWeight: 'bold', color: '#FF3B30' },
    emptyText: { textAlign: 'center', color: '#999', padding: 10 },
});
