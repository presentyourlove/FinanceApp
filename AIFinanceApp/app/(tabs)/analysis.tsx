import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dbOperations } from '../services/database';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

type AnalysisPeriod = 'month' | 'year';

export default function AnalysisScreen() {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [topCategories, setTopCategories] = useState<{ category: string; amount: number; color: string; legendFontColor: string; legendFontSize: number }[]>([]);
    const [advice, setAdvice] = useState<string[]>([]);
    const [period, setPeriod] = useState<AnalysisPeriod>('month');

    const chartConfig = {
        backgroundGradientFrom: "#1E2923",
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: "#08130D",
        backgroundGradientToOpacity: 0.5,
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
        strokeWidth: 2, // optional, default 3
        barPercentage: 0.5,
        useShadowColorFromDataset: false // optional
    };

    const colors = [
        '#FF3B30', // Red
        '#FF9500', // Orange
        '#FFCC00', // Yellow
        '#4CD964', // Green
        '#5AC8FA', // Light Blue
        '#007AFF', // Blue
        '#5856D6', // Purple
        '#FF2D55', // Pink
    ];

    const loadData = async () => {
        try {
            const accounts = await dbOperations.getAccounts();
            let income = 0;
            let expense = 0;
            const categoryMap = new Map<string, number>();

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-indexed

            for (const acc of accounts) {
                const transactions = await dbOperations.getTransactionsByAccountDB(acc.id);
                for (const t of transactions) {
                    const tDate = new Date(t.date);
                    const tYear = tDate.getFullYear();
                    const tMonth = tDate.getMonth();

                    // Filter based on period
                    if (tYear !== currentYear) continue;
                    if (period === 'month' && tMonth !== currentMonth) continue;

                    if (t.type === 'income') {
                        income += t.amount;
                    } else if (t.type === 'expense') {
                        expense += t.amount;
                        const cat = t.description ? t.description.split(' ')[0] : '其他';
                        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
                    }
                }
            }

            setTotalIncome(income);
            setTotalExpense(expense);

            // Sort categories and prepare for Pie Chart
            const sortedCategories = Array.from(categoryMap.entries())
                .map(([category, amount], index) => ({
                    name: category,
                    amount,
                    category, // Keep original name for list
                    color: colors[index % colors.length],
                    legendFontColor: "#7F7F7F",
                    legendFontSize: 12
                }))
                .sort((a, b) => b.amount - a.amount);

            setTopCategories(sortedCategories);

            // Generate Advice
            const newAdvice = [];
            const periodText = period === 'month' ? '本月' : '今年';

            if (expense > income) {
                newAdvice.push(`⚠️ ${periodText}支出已超過收入，建議檢視非必要開銷。`);
            } else if (expense > income * 0.8) {
                newAdvice.push(`⚠️ ${periodText}支出已達收入的 80%，請注意控制預算。`);
            } else {
                newAdvice.push(`✅ ${periodText}財務狀況良好，繼續保持！`);
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
        }, [period]) // Reload when period changes
    );

    const togglePeriod = () => {
        setPeriod(prev => prev === 'month' ? 'year' : 'month');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>財務分析</Text>
                    <TouchableOpacity style={styles.periodButton} onPress={togglePeriod}>
                        <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{ marginRight: 5 }} />
                        <Text style={styles.periodButtonText}>
                            {period === 'month' ? '切換至年檢視' : '切換至月檢視'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Overview Cards */}
                <View style={styles.overviewContainer}>
                    <View style={[styles.card, styles.incomeCard]}>
                        <Text style={styles.cardLabel}>
                            {period === 'month' ? '當月收入' : '當年收入'}
                        </Text>
                        <Text style={styles.cardValue}>${totalIncome}</Text>
                    </View>
                    <View style={[styles.card, styles.expenseCard]}>
                        <Text style={styles.cardLabel}>
                            {period === 'month' ? '當月支出' : '當年支出'}
                        </Text>
                        <Text style={styles.cardValue}>${totalExpense}</Text>
                    </View>
                </View>

                {/* Pie Chart */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>支出佔比</Text>
                    <View style={styles.chartCard}>
                        {topCategories.length > 0 ? (
                            <PieChart
                                data={topCategories}
                                width={Dimensions.get("window").width - 80}
                                height={220}
                                chartConfig={chartConfig}
                                accessor={"amount"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                center={[10, 0]}
                                absolute
                            />
                        ) : (
                            <Text style={styles.emptyText}>尚無支出資料可顯示圖表</Text>
                        )}
                    </View>
                </View>

                {/* Advice */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>理財建議</Text>
                    <View style={styles.adviceCard}>
                        {advice.map((item, index) => (
                            <View key={index} style={styles.adviceItem}>
                                <Ionicons name="bulb-outline" size={24} color="#FFD60A" style={{ marginRight: 10 }} />
                                <Text style={styles.adviceText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Top Spending Categories List */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>最高花費類別 ({period === 'month' ? '本月' : '今年'})</Text>
                    <View style={styles.categoryCard}>
                        {topCategories.length > 0 ? (
                            topCategories.slice(0, 5).map((item, index) => (
                                <View key={index} style={styles.categoryItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                                        <Text style={styles.categoryName}>{index + 1}. {item.category}</Text>
                                    </View>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#000' },
    periodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5F1FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    periodButtonText: { color: '#007AFF', fontWeight: '600' },
    overviewContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: { flex: 0.48, padding: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    incomeCard: { backgroundColor: '#E8F5E9' },
    expenseCard: { backgroundColor: '#FFEBEE' },
    cardLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
    cardValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, alignItems: 'center' },
    adviceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    adviceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    adviceText: { fontSize: 16, color: '#333', flex: 1 },
    categoryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    categoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    categoryName: { fontSize: 16, color: '#333' },
    categoryAmount: { fontSize: 16, fontWeight: 'bold', color: '#FF3B30' },
    emptyText: { textAlign: 'center', color: '#999', padding: 10 },
});
