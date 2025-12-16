import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Goal } from '@/src/services/database';
import i18n from '@/src/i18n';
import { PickerOverlay } from './PickerOverlay';

interface GoalFormModalProps {
    visible: boolean;
    editingGoal: Goal | null;
    onClose: () => void;
    onSave: (name: string, amount: string, deadline: string, currency: string) => void;
    colors: any;
    styles: any;
    isDark: boolean;
    currencies: string[];
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
    visible,
    editingGoal,
    onClose,
    onSave,
    colors,
    styles,
    isDark,
    currencies
}) => {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            if (editingGoal) {
                setName(editingGoal.name);
                setTargetAmount(editingGoal.targetAmount.toString());
                setDeadline(editingGoal.deadline || '');
                setCurrency(editingGoal.currency || 'TWD');
                setSelectedDate(editingGoal.deadline ? new Date(editingGoal.deadline) : new Date());
            } else {
                setName('');
                setTargetAmount('');
                setDeadline('');
                setCurrency('TWD');
                setSelectedDate(new Date());
            }
        }
    }, [visible, editingGoal]);

    const handleDateChange = (event: any, date?: Date) => {
        if (date) {
            setSelectedDate(date);
            setDeadline(date.toISOString().split('T')[0]);
        }
    };

    const handleSave = () => {
        if (!name || !targetAmount) {
            Alert.alert(i18n.t('goal.errorTitle'), i18n.t('goal.errorMissingFields'));
            return;
        }
        onSave(name, targetAmount, deadline, currency);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editingGoal ? i18n.t('goal.editTitle') : i18n.t('goal.addTitle')}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.formContainer}>
                    <Text style={styles.label}>{i18n.t('goal.nameLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={i18n.t('goal.namePlaceholder')}
                        placeholderTextColor={colors.subtleText}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>{i18n.t('goal.targetAmountLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={i18n.t('goal.targetAmountPlaceholder')}
                        placeholderTextColor={colors.subtleText}
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>{i18n.t('goal.currencyLabel')}</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowCurrencyPicker(true)}
                    >
                        <Text style={styles.dateText}>{currency}</Text>
                        <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
                    </TouchableOpacity>

                    <Text style={styles.label}>{i18n.t('goal.deadlineLabel')}</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                        <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
                            {deadline || i18n.t('goal.deadlinePlaceholder')}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.subtleText} />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                                textColor={colors.text}
                                themeVariant={isDark ? 'dark' : 'light'}
                            />
                        </View>
                    )}

                    <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF', marginTop: 20 }]} onPress={handleSave}>
                        <Text style={styles.buttonText}>{editingGoal ? i18n.t('goal.updateButton') : i18n.t('goal.addButton')}</Text>
                    </TouchableOpacity>
                    <View style={{ height: 50 }} />
                </ScrollView>

                <PickerOverlay
                    visible={showCurrencyPicker}
                    onClose={() => setShowCurrencyPicker(false)}
                    onSelect={(curr: string) => {
                        setCurrency(curr);
                        setShowCurrencyPicker(false);
                    }}
                    items={currencies}
                    title={i18n.t('goal.selectCurrency')}
                    colors={colors}
                    styles={styles}
                />
            </View>
        </Modal>
    );
};
