import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TransactionType } from '@/src/types';
import i18n from '@/src/i18n';

interface TransactionFormProps {
    transactionDate: Date;
    amountInput: string;
    descriptionInput: string;
    showDatePicker: boolean;
    showTimePicker: boolean;
    categories: { income: string[]; expense: string[] };
    colors: any;
    styles: any;
    setAmountInput: (text: string) => void;
    setDescriptionInput: (text: string) => void;
    setShowDatePicker: (show: boolean) => void;
    setShowTimePicker: (show: boolean) => void;
    onDateChange: (event: any, date?: Date) => void;
    onTimeChange: (event: any, date?: Date) => void;
    onTransactionPress: (type: TransactionType) => void;
    onTransferPress: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
    transactionDate,
    amountInput,
    descriptionInput,
    showDatePicker,
    showTimePicker,
    categories,
    colors,
    styles,
    setAmountInput,
    setDescriptionInput,
    setShowDatePicker,
    setShowTimePicker,
    onDateChange,
    onTimeChange,
    onTransactionPress,
    onTransferPress
}) => {
    return (
        <View style={styles.inputArea}>
            <View style={styles.datePickerContainer}>
                <TouchableOpacity style={[styles.input, styles.dateInput, { marginRight: 5 }]} onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
                    <Text style={styles.inputText}>{transactionDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.input, styles.dateInput, { marginLeft: 5 }]} onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}>
                    <Ionicons name="time-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
                    <Text style={styles.inputText}>{transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
            </View>
            {showDatePicker && <DateTimePicker value={transactionDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} textColor={colors.text} />}
            {showTimePicker && <DateTimePicker value={transactionDate} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} textColor={colors.text} />}
            <TextInput style={[styles.input, { width: '90%', marginBottom: 10 }]} placeholder={i18n.t('transaction.amountPlaceholder')} placeholderTextColor={colors.subtleText} keyboardType="numeric" value={amountInput} onChangeText={setAmountInput} />
            <TextInput style={[styles.input, { width: '90%', marginBottom: 15 }]} placeholder={i18n.t('transaction.categoryPlaceholder')} placeholderTextColor={colors.subtleText} value={descriptionInput} onChangeText={setDescriptionInput} />
            <View style={styles.buttonContainer}>
                <View style={styles.transactionRow}>
                    <TouchableOpacity style={[styles.mainButton, styles.incomeButton, styles.autoWidthButton]} onPress={() => onTransactionPress(TransactionType.INCOME)}>
                        <Text style={styles.buttonText}>{i18n.t('transaction.income')} (＋)</Text>
                    </TouchableOpacity>
                    <View style={styles.categoryZone}>
                        {categories.income.map((category, index) => (
                            <TouchableOpacity key={index} style={styles.categoryButton} onPress={() => setDescriptionInput(category)}>
                                <Text style={styles.categoryText}>{category}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={[styles.transactionRow, { marginTop: 8 }]}>
                    <TouchableOpacity style={[styles.mainButton, styles.expenseButton, styles.autoWidthButton]} onPress={() => onTransactionPress(TransactionType.EXPENSE)}>
                        <Text style={styles.buttonText}>{i18n.t('transaction.expense')} (－)</Text>
                    </TouchableOpacity>
                    <View style={styles.categoryZone}>
                        {categories.expense.map((category, index) => (
                            <TouchableOpacity key={index} style={styles.categoryButton} onPress={() => setDescriptionInput(category)}>
                                <Text style={styles.categoryText}>{category}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <TouchableOpacity style={[styles.mainButton, styles.transferButton, { width: '100%', alignSelf: 'center', marginTop: 15, height: 45 }]} onPress={onTransferPress}>
                    <Text style={styles.buttonText}>{i18n.t('transaction.transfer')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
