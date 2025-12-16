import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

interface StockFormFieldsProps {
    stockInputMode: 'shares' | 'cost';
    setStockInputMode: (mode: 'shares' | 'cost') => void;
    setHandlingFee: (fee: string) => void;
    unitPrice: string;
    handleUnitPriceChange: (text: string) => void;
    amount: string;
    handleAmountChange: (text: string) => void;
    handlingFee: string;
    handleHandlingFeeChange: (text: string) => void;
    costPrice: string;
    handleCostPriceChange: (text: string) => void;
    colors: any;
    styles: any;
}

export const StockFormFields: React.FC<StockFormFieldsProps> = ({
    stockInputMode,
    setStockInputMode,
    setHandlingFee,
    unitPrice,
    handleUnitPriceChange,
    amount,
    handleAmountChange,
    handlingFee,
    handleHandlingFeeChange,
    costPrice,
    handleCostPriceChange,
    colors,
    styles
}) => {
    return (
        <>
            <View style={{ flexDirection: 'row', marginBottom: 15, marginTop: 10, backgroundColor: colors.inputBackground, borderRadius: 8, padding: 2 }}>
                <TouchableOpacity
                    style={{ flex: 1, padding: 8, alignItems: 'center', borderRadius: 6, backgroundColor: stockInputMode === 'shares' ? colors.card : 'transparent' }}
                    onPress={() => { setStockInputMode('shares'); setHandlingFee(''); }}
                >
                    <Text style={{ color: stockInputMode === 'shares' ? colors.accent : colors.subtleText, fontWeight: 'bold' }}>填寫股數</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, padding: 8, alignItems: 'center', borderRadius: 6, backgroundColor: stockInputMode === 'cost' ? colors.card : 'transparent' }}
                    onPress={() => { setStockInputMode('cost'); setHandlingFee(''); }}
                >
                    <Text style={{ color: stockInputMode === 'cost' ? colors.accent : colors.subtleText, fontWeight: 'bold' }}>填寫總成本</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>成交單價</Text>
            <TextInput style={styles.input} value={unitPrice} onChangeText={handleUnitPriceChange} keyboardType="numeric" placeholder="單股價格" placeholderTextColor={colors.subtleText} />

            {stockInputMode === 'shares' ? (
                <>
                    <Text style={styles.label}>股數</Text>
                    <TextInput style={styles.input} value={amount} onChangeText={handleAmountChange} keyboardType="numeric" placeholder="購買股數" placeholderTextColor={colors.subtleText} />

                    <Text style={styles.label}>手續費 (選填)</Text>
                    <TextInput style={styles.input} value={handlingFee} onChangeText={handleHandlingFeeChange} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtleText} />

                    <Text style={styles.label}>總成本 (自動計算)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card }]} value={costPrice} editable={false} placeholder="自動計算" placeholderTextColor={colors.subtleText} />
                </>
            ) : (
                <>
                    <Text style={styles.label}>總成本 (含手續費)</Text>
                    <TextInput style={styles.input} value={costPrice} onChangeText={handleCostPriceChange} keyboardType="numeric" placeholder="總花費金額" placeholderTextColor={colors.subtleText} />

                    <Text style={styles.label}>股數 (自動計算)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card }]} value={amount} editable={false} placeholder="自動計算" placeholderTextColor={colors.subtleText} />
                </>
            )}
        </>
    );
};
