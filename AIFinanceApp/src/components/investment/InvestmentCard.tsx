import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Investment } from '@/src/services/database';

interface GroupedInvestment extends Investment {
    averageCost?: number;
    totalShares?: number;
    marketValue?: number;
    unrealizedProfit?: number;
    returnRate?: number;
    estimatedInterest?: number;
}

interface InvestmentCardProps {
    item: GroupedInvestment;
    onPress: (item: GroupedInvestment) => void;
    colors: any;
}

export default function InvestmentCard({ item, onPress, colors }: InvestmentCardProps) {
    const styles = getStyles(colors);

    let details = '';
    let profitInfo = null;

    if (item.type === 'stock') {
        const avgCost = item.averageCost ? item.averageCost.toFixed(2) : '0';
        details = `股數: ${item.amount} | 均價: ${avgCost}`;

        const profit = item.unrealizedProfit || 0;
        const rate = item.returnRate || 0;
        const color = profit >= 0 ? colors.income : colors.expense;

        profitInfo = (
            <View style={{ marginTop: 5 }}>
                <Text style={{ color: colors.subtleText }}>現價: {item.currentPrice}</Text>
                <Text style={{ color, fontWeight: 'bold' }}>
                    損益: {profit.toFixed(0)} ({rate.toFixed(2)}%)
                </Text>
            </View>
        );
    } else {
        const interest = item.estimatedInterest ? item.estimatedInterest.toFixed(0) : '0';
        details = `本金: ${item.amount} | 利率: ${item.interestRate}%`;
        profitInfo = (
            <Text style={{ color: colors.income, marginTop: 5 }}>預估利息: {interest}</Text>
        );
    }

    return (
        <TouchableOpacity onPress={() => onPress(item)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                            name={item.type === 'stock' ? 'trending-up' : item.type === 'fixed_deposit' ? 'time' : 'wallet'}
                            size={24} color={colors.tint} style={{ marginRight: 10 }}
                        />
                        <Text style={styles.cardTitle}>{item.name}</Text>
                    </View>
                    <Text style={styles.cardAmount}>{item.currency} {item.amount}</Text>
                </View>
                <Text style={styles.cardDetails}>{details}</Text>
                {profitInfo}
            </View>
        </TouchableOpacity>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text
    },
    cardDetails: {
        fontSize: 14,
        color: colors.subtleText,
        marginBottom: 4
    },
});
