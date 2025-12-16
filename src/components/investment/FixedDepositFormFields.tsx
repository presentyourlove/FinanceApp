import React from 'react';
import { Text, TouchableOpacity, TextInput } from 'react-native';

interface FixedDepositFormFieldsProps {
    maturityDate: Date;
    onDatePress: () => void;
    interestRate: string;
    setInterestRate: (text: string) => void;
    amount: string;
    setAmount: (text: string) => void;
    colors: any;
    styles: any;
}

export const FixedDepositFormFields: React.FC<FixedDepositFormFieldsProps> = ({
    maturityDate,
    onDatePress,
    interestRate,
    setInterestRate,
    amount,
    setAmount,
    colors,
    styles
}) => {
    return (
        <>
            <Text style={styles.label}>本金</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="金額" placeholderTextColor={colors.subtleText} />

            <Text style={styles.label}>到期日</Text>
            <TouchableOpacity style={styles.dateButton} onPress={onDatePress}>
                <Text style={styles.dateButtonText}>{maturityDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>年利率 (%)</Text>
            <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" placeholder="1.5" placeholderTextColor={colors.subtleText} />
        </>
    );
};
