import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbOperations } from '@/src/services/database';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '@/src/context/ThemeContext';
import * as CurrencyStorage from '@/src/utils/currencyStorage';
import { TransactionType } from '@/src/types';

type AnalysisPeriod = 'month' | 'year';

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
}

export default function AnalysisScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const insets = useSafeAreaInsets();

    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [topCategories, setTopCategories] = useState<{ name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number; }[]>([]);
    const [advice, setAdvice] = useState<string[]>([]);
    const [period, setPeriod] = useState<AnalysisPeriod>('month');
    const [mainCurrency, setMainCurrency] = useState('TWD');

    const chartConfig = {
        backgroundGradientFromOpacity: 0,
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => `rgba(${hexToRgb(colors.text)}, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false
    };

    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                try {
                    const now = new Date();
                    let startDate, endDate;

                    if (period === 'month') {
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        startDate = start.toISOString().split('T')[0];
                        endDate = end.toISOString().split('T')[0];
                    } else {
                        const start = new Date(now.getFullYear(), 0, 1);
                        const end = new Date(now.getFullYear(), 11, 31);
                        startDate = start.toISOString().split('T')[0];
                        endDate = end.toISOString().split('T')[0];
                    }

                    const [currencySettings, transactions] = await Promise.all([
                        CurrencyStorage.loadCurrencySettings(),
                        dbOperations.getTransactionsWithAccount(startDate, endDate)
                    ]);

                    setMainCurrency(currencySettings.mainCurrency);
                    const rates = currencySettings.exchangeRates;

                    let income = 0, expense = 0;
                    const categoryMap = new Map<string, number>();

                    for (const t of transactions) {
                        // Get account currency rate relative to main currency
                        const accRate = rates[t.accountCurrency] || 1;

                        // Convert amount to main currency
                        // Rate: 1 Main = X AccountCurrency
                        // AmountMain = AmountAccount / Rate
                        const amountInMain = t.amount / accRate;

                        if (t.type === TransactionType.INCOME) {
                            income += amountInMain;
                        } else if (t.type === TransactionType.EXPENSE) {
                            expense += amountInMain;
                            const cat = t.description?.split(' ')[0] || '其他';
                            categoryMap.set(cat, (categoryMap.get(cat) || 0) + amountInMain);
                        }
                    }

                    setTotalIncome(income);
                    setTotalExpense(expense);

                    const sortedCategories = Array.from(categoryMap.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, amount], index) => ({
                            name: category,
                            amount: Math.round(amount), // Round for display
                            color: colors.charts[index % colors.charts.length],
                            legendFontColor: colors.subtleText,
                            legendFontSize: 12
                        }));
                    setTopCategories(sortedCategories);

                    const newAdvice = [];
                    const periodText = period === 'month' ? '本月' : '今年';
                    if (expense > income) newAdvice.push(`⚠️ ${periodText}支出已超過收入，建議檢視非必要開銷。`);
                    else if (expense > income * 0.8) newAdvice.push(`⚠️ ${periodText}支出已達收入的 80%，請注意控制預算。`);
                    else newAdvice.push(`✅ ${periodText}財務狀況良好，繼續保持！`);
                    if (sortedCategories.length > 0) newAdvice.push(`💡 您在「${sortedCategories[0].name}」類別花費最多，建議設定預算上限。`);
                    setAdvice(newAdvice);

                } catch (error) {
                    console.error(error);
                }
            };

            loadData();
        }, [period, colors]) // Reload when period or theme changes
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.title}>財務分析 ({mainCurrency})</Text>
                <TouchableOpacity style={styles.periodButton} onPress={() => setPeriod(p => p === 'month' ? 'year' : 'month')}>
                    <Ionicons name="calendar-outline" size={20} color={colors.accent} style={{ marginRight: 5 }} />
                    <Text style={styles.periodButtonText}>{period === 'month' ? '切換至年檢視' : '切換至月檢視'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.overviewContainer}>
                    <View style={styles.card}><Text style={styles.cardLabel}>{period === 'month' ? '當月收入' : '當年收入'}</Text><Text style={styles.cardValueIncome}>${totalIncome.toFixed(0)}</Text></View>
                    <View style={styles.card}><Text style={styles.cardLabel}>{period === 'month' ? '當月支出' : '當年支出'}</Text><Text style={styles.cardValueExpense}>${totalExpense.toFixed(0)}</Text></View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>支出佔比</Text>
                    <View style={styles.chartCard}>
                        {topCategories.length > 0 ? (
                            <PieChart data={topCategories} width={Dimensions.get("window").width - 80} height={220} chartConfig={chartConfig} accessor={"amount"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />
                        ) : (<Text style={styles.emptyText}>尚無支出資料可顯示圖表</Text>)}
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>理財建議</Text>
                    <View style={styles.adviceCard}>
                        {advice.map((item, index) => (
                            <View key={index} style={styles.adviceItem}><Ionicons name="bulb-outline" size={24} color={colors.charts[2]} style={{ marginRight: 10 }} /><Text style={styles.adviceText}>{item}</Text></View>
                        ))}
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>最高花費類別 ({period === 'month' ? '本月' : '今年'})</Text>
                    <View style={styles.categoryCard}>
                        {topCategories.length > 0 ? (
                            topCategories.slice(0, 5).map((item, index) => (
                                <View key={index} style={styles.categoryItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                                        <Text style={styles.categoryName}>{index + 1}. {item.name}</Text>
                                    </View>
                                    <Text style={styles.categoryAmount}>${item.amount}</Text>
                                </View>
                            ))
                        ) : (<Text style={styles.emptyText}>尚無支出資料</Text>)}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    periodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    periodButtonText: { color: colors.accent, fontWeight: '600' },
    overviewContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: { flex: 0.48, padding: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
    cardLabel: { fontSize: 14, color: colors.subtleText, marginBottom: 5 },
    cardValueIncome: { fontSize: 20, fontWeight: 'bold', color: colors.income },
    cardValueExpense: { fontSize: 20, fontWeight: 'bold', color: colors.expense },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: colors.text },
    chartCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, alignItems: 'center' },
    adviceCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
    adviceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    adviceText: { fontSize: 16, color: colors.text, flex: 1 },
    categoryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
    categoryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    categoryName: { fontSize: 16, color: colors.text },
    categoryAmount: { fontSize: 16, fontWeight: 'bold', color: colors.expense },
    emptyText: { textAlign: 'center', color: colors.subtleText, padding: 10 },
});