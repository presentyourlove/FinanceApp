import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n from '@/src/i18n';
import { Transaction, TransactionType } from '@/src/types';
import { Categories } from '@/src/services/storage/categoryStorage';

interface EditTransactionModalProps {
    visible: boolean;
    transaction: Transaction | null;
    onClose: () => void;
    onUpdate: (id: number, amount: number, type: TransactionType, date: Date, description: string) => void;
    onDelete: (transaction: Transaction) => void;
    categories: Categories;
    colors: any;
    styles: any;
}

export const EditTransactionModal = ({
    visible,
    transaction,
    onClose,
    onUpdate,
    onDelete,
    categories,
    colors,
    styles
}: EditTransactionModalProps) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'none' | 'category'>('none');

    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setDescription(transaction.description);
            setDate(new Date(transaction.date));
            setSelectionMode('none');
        }
    }, [transaction, visible]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleUpdate = () => {
        if (!transaction) return;
        const newAmount = parseFloat(amount);
        onUpdate(transaction.id, newAmount, transaction.type, date, description);
    };

    const handleDelete = () => {
        if (!transaction) return;
        onDelete(transaction);
    };

    if (!transaction) return null;

    const renderEditSelectionList = () => (
        <View style={{ width: '100%', maxHeight: 300 }}>
            <Text style={styles.modalTitle}>{i18n.t('transaction.selectCategory')}</Text>
            <ScrollView style={{ width: '100%' }}>
                {(transaction.type === TransactionType.INCOME ? categories.income : categories.expense).map((cat: string) => (
                    <TouchableOpacity key={cat} style={styles.modalListItem} onPress={() => { setDescription(cat); setSelectionMode('none'); }}>
                        <Text style={styles.inputText}>{cat}</Text>
                        {description === cat && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10, backgroundColor: colors.expense }]} onPress={() => setSelectionMode('none')}>
                <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEditForm = () => (
        <>
            <Text style={styles.modalTitle}>{i18n.t('transaction.updateHeader')}</Text>
            <Text style={styles.inputLabel}>{i18n.t('transaction.date')}</Text>
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.subtleText} style={{ marginRight: 8 }} />
                <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
            <Text style={styles.inputLabel}>{i18n.t('budget.amount')}</Text>
            <TextInput
                style={styles.input}
                placeholder={i18n.t('budget.amountPlaceholder')}
                placeholderTextColor={colors.subtleText}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />
            <Text style={styles.inputLabel}>{i18n.t('budget.category')}</Text>
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectionMode('category')}>
                <Text style={{ color: description ? colors.text : colors.subtleText }}>
                    {description || i18n.t('transaction.selectCategory')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
            </TouchableOpacity>
            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                    <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.expense }]} onPress={handleDelete}>
                    <Text style={styles.buttonText}>{i18n.t('common.delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleUpdate}>
                    <Text style={styles.buttonText}>{i18n.t('common.save')}</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {selectionMode === 'none' ? renderEditForm() : renderEditSelectionList()}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
