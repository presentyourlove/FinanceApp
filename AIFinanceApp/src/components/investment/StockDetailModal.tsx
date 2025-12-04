import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Investment } from '@/src/services/database';

interface StockDetailModalProps {
    visible: boolean;
    onClose: () => void;
    stockName: string;
    investments: Investment[];
    onUpdatePrice: () => void;
    onSelectInvestment: (inv: Investment) => void;
    colors: any;
}

export default function StockDetailModal({
    visible,
    onClose,
    stockName,
    investments,
    onUpdatePrice,
    onSelectInvestment,
    colors
}: StockDetailModalProps) {
    const styles = getStyles(colors);
    const stockInvestments = investments.filter(i => i.name === stockName && i.type === 'stock');

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{stockName} 持倉明細</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={{ padding: 15 }}>
                    <TouchableOpacity style={styles.updatePriceButton} onPress={onUpdatePrice}>
                        <Text style={styles.updatePriceButtonText}>更新現價</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={stockInvestments}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => onSelectInvestment(item)}>
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{new Date(item.date).toLocaleDateString()}</Text>
                                    <Text style={styles.cardAmount}>{item.amount} 股</Text>
                                </View>
                                <Text style={styles.cardDetails}>成本: {item.costPrice} | 單價: {item.currentPrice?.toFixed(2)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    modalContainer: {
        flex: 1,
        paddingTop: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text
    },
    updatePriceButton: {
        backgroundColor: colors.accent,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10
    },
    updatePriceButtonText: {
        color: '#fff',
        fontWeight: 'bold'
    },
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
