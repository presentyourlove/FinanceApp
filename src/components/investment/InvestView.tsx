import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, SectionList
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/context/ThemeContext';
import { Investment } from '@/src/services/database';
import { useInvestments } from '@/src/hooks/useInvestments';
import { GroupedInvestment } from '@/src/types';
import InvestmentCard from '@/src/components/investment/InvestmentCard';
import UpdatePriceModal from '@/src/components/investment/UpdatePriceModal';
import StockDetailModal from '@/src/components/investment/StockDetailModal';
import InvestmentActionModal from '@/src/components/investment/InvestmentActionModal';
import AddInvestmentModal from '@/src/components/investment/AddInvestmentModal';



import { getStyles } from '@/src/components/investment/styles';

export default function InvestView({ style }: { style?: any }) {
    // const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    // Custom Hook
    const {
        investments,
        accounts,
        currencyOptions,
        groupedInvestments,
        refresh
    } = useInvestments();

    const [addModalVisible, setAddModalVisible] = useState(false);

    // Action State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [stockDetailModalVisible, setStockDetailModalVisible] = useState(false);
    const [updatePriceModalVisible, setUpdatePriceModalVisible] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [selectedStockName, setSelectedStockName] = useState<string>('');

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

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
                onSuccess={refresh}
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
                onSuccess={refresh}
                colors={colors}
            />

            {/* Action Modal */}
            <InvestmentActionModal
                visible={actionModalVisible}
                onClose={() => setActionModalVisible(false)}
                investment={selectedInvestment}
                accounts={accounts}
                onSuccess={refresh}
                colors={colors}
            />

        </View >
    );
}
