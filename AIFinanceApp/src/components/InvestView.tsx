import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SectionList
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations, Investment } from '@/src/services/database';
import { loadCurrencySettings } from '@/src/utils/currencyStorage';
import InvestmentCard from '@/src/components/investment/InvestmentCard';
import UpdatePriceModal from '@/src/components/investment/UpdatePriceModal';
import StockDetailModal from '@/src/components/investment/StockDetailModal';
import InvestmentActionModal from '@/src/components/investment/InvestmentActionModal';
import AddInvestmentModal from '@/src/components/investment/AddInvestmentModal';

interface Account {
    id: number;
    name: string;
    currency: string;
    currentBalance: number;
}

interface GroupedInvestment extends Investment {
    averageCost?: number;
    totalShares?: number;
    marketValue?: number;
    unrealizedProfit?: number;
    returnRate?: number;
    estimatedInterest?: number;
}

export default function InvestView({ style }: { style?: any }) {
    // const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [investments, setInvestments] = useState<Investment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currencyOptions, setCurrencyOptions] = useState<string[]>(['TWD']);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Action State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [stockDetailModalVisible, setStockDetailModalVisible] = useState(false);
    const [updatePriceModalVisible, setUpdatePriceModalVisible] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [selectedStockName, setSelectedStockName] = useState<string>('');

    const loadData = async () => {
        try {
            const invs = await dbOperations.getInvestments();
            setInvestments(invs);
            const accs = await dbOperations.getAccounts();
            setAccounts(accs);
            const settings = await loadCurrencySettings();
            setCurrencyOptions(Object.keys(settings.exchangeRates));


        } catch (e) {
            console.error("Failed to load investment data:", e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const groupedInvestments = useMemo(() => {
        const stocksMap: { [key: string]: GroupedInvestment } = {};
        const fixedDeposits: Investment[] = [];
        const savings: Investment[] = [];

        investments.forEach(inv => {
            if (inv.type === 'stock') {
                if (stocksMap[inv.name]) {
                    stocksMap[inv.name].amount += inv.amount;
                    stocksMap[inv.name].costPrice = (stocksMap[inv.name].costPrice || 0) + (inv.costPrice || 0);
                    // Use the latest price found (assuming user updates all or latest entry reflects current)
                    if (new Date(inv.date) > new Date(stocksMap[inv.name].date)) {
                        stocksMap[inv.name].currentPrice = inv.currentPrice;
                    }
                } else {
                    stocksMap[inv.name] = { ...inv };
                }
            } else if (inv.type === 'fixed_deposit') {
                fixedDeposits.push(inv);
            } else if (inv.type === 'savings') {
                savings.push(inv);
            }
        });

        const stocks = Object.values(stocksMap).map(s => {
            const avgCost = s.costPrice ? s.costPrice / s.amount : 0;
            const marketVal = s.amount * (s.currentPrice || 0);
            const profit = marketVal - (s.costPrice || 0);
            const rate = s.costPrice ? (profit / s.costPrice) * 100 : 0;
            return {
                ...s,
                averageCost: avgCost,
                marketValue: marketVal,
                unrealizedProfit: profit,
                returnRate: rate
            };
        });

        const calculateInterest = (inv: Investment) => {
            const days = (new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
            if (days < 0) return 0;
            return inv.amount * ((inv.interestRate || 0) / 100) * (days / 365);
        };

        const fds = fixedDeposits.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));
        const savs = savings.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));

        return [
            { title: '股票', data: stocks },
            { title: '定存', data: fds },
            { title: '活存', data: savs }
        ].filter(section => section.data.length > 0);
    }, [investments]);

    const handleInvestmentPress = (item: GroupedInvestment) => {
        if (item.type === 'stock') {
            setSelectedStockName(item.name);
            setStockDetailModalVisible(true);
        } else {
            setSelectedInvestment(item);
            setActionModalVisible(true);
        }
    };

    const renderInvestmentItem = ({ item }: { item: GroupedInvestment }) => (
        <InvestmentCard item={item} onPress={handleInvestmentPress} colors={colors} />
    );

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.header, { paddingTop: 20 }]}>
                <Text style={styles.headerTitle}>投資組合</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(true)}>
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={groupedInvestments}
                keyExtractor={(item, index) => item.id.toString() + index}
                renderItem={renderInvestmentItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無投資項目</Text>}
                stickySectionHeadersEnabled={false}
            />

            {/* Add Investment Modal */}
            <AddInvestmentModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                accounts={accounts}
                currencyOptions={currencyOptions}
                onSuccess={loadData}
                colors={colors}
            />

            {/* Stock Detail Modal */}
            <StockDetailModal
                visible={stockDetailModalVisible}
                onClose={() => setStockDetailModalVisible(false)}
                stockName={selectedStockName}
                investments={investments}
                onUpdatePrice={() => setUpdatePriceModalVisible(true)}
                onSelectInvestment={(inv) => {
                    setSelectedInvestment(inv);
                    setActionModalVisible(true);
                }}
                colors={colors}
            />

            {/* Update Price Modal */}
            <UpdatePriceModal
                visible={updatePriceModalVisible}
                onClose={() => setUpdatePriceModalVisible(false)}
                stockName={selectedStockName}
                onSuccess={loadData}
                colors={colors}
            />

            {/* Action Modal */}
            <InvestmentActionModal
                visible={actionModalVisible}
                onClose={() => setActionModalVisible(false)}
                investment={selectedInvestment}
                accounts={accounts}
                onSuccess={loadData}
                colors={colors}
            />

        </View >
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    emptyText: { textAlign: 'center', marginTop: 50, color: colors.subtleText, fontSize: 16 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 10, marginLeft: 5 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 15, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cardAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
    cardDetails: { fontSize: 14, color: colors.subtleText, marginBottom: 4 },
    cardDate: { fontSize: 12, color: colors.subtleText, textAlign: 'right' },
    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    formContainer: { padding: 20 },
    typeSelector: { flexDirection: 'row', marginBottom: 20, backgroundColor: colors.inputBackground, borderRadius: 10, padding: 4 },
    typeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    typeButtonText: { fontSize: 14, fontWeight: '600', color: colors.subtleText },
    label: { fontSize: 14, fontWeight: '500', color: colors.subtleText, marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
    dateButton: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' },
    dateButtonText: { fontSize: 16, color: colors.text },
    pickerContainer: { backgroundColor: colors.inputBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' },
    syncContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    submitButton: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '85%', borderRadius: 20, padding: 25, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
    cancelButton: { backgroundColor: "#8E8E93" },
    confirmButton: { backgroundColor: "#007AFF" },
    buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
    updatePriceButton: { backgroundColor: colors.accent, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    updatePriceButtonText: { color: '#fff', fontWeight: 'bold' }
});
