import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface SavingsFormFieldsProps {
    amount: string;
    setAmount: (text: string) => void;
    interestRate: string;
    setInterestRate: (text: string) => void;
    interestFrequency: 'daily' | 'monthly' | 'yearly';
    setInterestFrequency: (freq: 'daily' | 'monthly' | 'yearly') => void;
    colors: any;
    styles: any;
}

export const SavingsFormFields: React.FC<SavingsFormFieldsProps> = ({
    amount,
    setAmount,
    interestRate,
    setInterestRate,
    interestFrequency,
    setInterestFrequency,
    colors,
    styles
}) => {
    return (
        <>
            <Text style={styles.label}>本金</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="金額" placeholderTextColor={colors.subtleText} />

            <Text style={styles.label}>年利率 (%)</Text>
            <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" placeholder="1.2" placeholderTextColor={colors.subtleText} />

            <Text style={styles.label}>配息頻率</Text>
            <View style={styles.pickerContainer}>
                <Picker selectedValue={interestFrequency} onValueChange={(itemValue) => setInterestFrequency(itemValue)} style={{ color: colors.text }}>
                    <Picker.Item label="每月" value="monthly" /><Picker.Item label="每年" value="yearly" /><Picker.Item label="每日" value="daily" />
                </Picker>
            </View>
        </>
    );
};
