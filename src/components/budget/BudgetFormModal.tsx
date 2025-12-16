import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget } from '@/src/services/database';
import i18n from '@/src/i18n';
import { ModalPage } from '@/src/components/common/ModalPage';

interface BudgetFormModalProps {
    visible: boolean;
    editingBudget: Budget | null;
    onClose: () => void;
    onSave: (category: string, amount: string, period: string, currency: string) => void;
    availableCategories: string[];
    colors: any;
    styles: any;
    currencies: string[];
}

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
    visible,
    editingBudget,
    onClose,
    onSave,
    availableCategories,
    colors,
    styles,
    currencies
}) => {
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [currency, setCurrency] = useState('TWD');
    const [selectionMode, setSelectionMode] = useState<'none' | 'category' | 'period' | 'currency'>('none');

    useEffect(() => {
        if (visible) {
            if (editingBudget) {
                setCategory(editingBudget.category);
                setAmount(editingBudget.amount.toString());
                setPeriod(editingBudget.period);
                setCurrency(editingBudget.currency || 'TWD');
            } else {
                setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
                setAmount('');
                setPeriod('monthly');
                setCurrency('TWD');
            }
            setSelectionMode('none');
        }
    }, [visible, editingBudget, availableCategories]);

    const handleSave = () => {
        if (!category || !amount) {
            Alert.alert(i18n.t('budget.errorTitle'), i18n.t('budget.errorMissingFields'));
            return;
        }
        onSave(category, amount, period, currency);
    };

    const renderSelectionList = () => {
        let items: string[] = [];
        let onSelect: (item: string) => void = () => { };
        let currentSelected = '';

        if (selectionMode === 'category') {
            items = availableCategories;
            onSelect = (item) => { setCategory(item); setSelectionMode('none'); };
            currentSelected = category;
        } else if (selectionMode === 'period') {
            items = ['monthly', 'weekly', 'yearly'];
            onSelect = (item) => { setPeriod(item); setSelectionMode('none'); };
            currentSelected = period;
        } else if (selectionMode === 'currency') {
            items = currencies;
            onSelect = (item) => { setCurrency(item); setSelectionMode('none'); };
            currentSelected = currency;
        }

        return (
            <View style={{ width: '100%', flex: 1 }}>
                <Text style={styles.label}>
                    {i18n.t('budget.pleaseSelect')}{selectionMode === 'category' ? i18n.t('budget.category') : selectionMode === 'period' ? i18n.t('budget.period') : i18n.t('budget.currency')}
                </Text>
                <ScrollView style={{ width: '100%' }}>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.selectionItem, { borderBottomColor: colors.borderColor }]}
                            onPress={() => onSelect(item)}
                        >
                            <Text style={[styles.selectionText, { color: colors.text }]}>
                                {selectionMode === 'period' ?
                                    (item === 'monthly' ? i18n.t('budget.monthly') : item === 'weekly' ? i18n.t('budget.weekly') : i18n.t('budget.yearly'))
                                    : item}
                            </Text>
                            {currentSelected === item && (
                                <Ionicons name="checkmark" size={20} color={colors.tint} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.button, styles.cancelButton, { marginTop: 10 }]} onPress={() => setSelectionMode('none')}>
                    <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderForm = () => (
        <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>{i18n.t('budget.category')}</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground },
                    editingBudget ? styles.disabledButton : null
                ]}
                onPress={() => !editingBudget && setSelectionMode('category')}
                disabled={!!editingBudget}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>{category || i18n.t('budget.selectCategory')}</Text>
                {!editingBudget && <Ionicons name="chevron-down" size={20} color={colors.subtleText} />}
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('budget.period')}</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }
                ]}
                onPress={() => setSelectionMode('period')}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {period === 'monthly' ? i18n.t('budget.monthly') : period === 'weekly' ? i18n.t('budget.weekly') : i18n.t('budget.yearly')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('budget.currency')}</Text>
            <TouchableOpacity
                style={[
                    styles.dropdownButton,
                    { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }
                ]}
                onPress={() => setSelectionMode('currency')}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]}>{currency}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('budget.amount')}</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        borderColor: colors.borderColor,
                        backgroundColor: colors.inputBackground,
                        color: colors.text
                    }
                ]}
                placeholder={i18n.t('budget.amountPlaceholder')}
                placeholderTextColor={colors.subtleText}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF', marginTop: 20 }]} onPress={handleSave}>
                <Text style={styles.buttonText}>{i18n.t('common.save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 50 }} />
        </ScrollView>
    );

    return (
        <ModalPage
            visible={visible}
            onClose={onClose}
            title={editingBudget ? i18n.t('budget.editTitle') : i18n.t('budget.addTitle')}
        >
            {selectionMode === 'none' ? renderForm() : (
                <View style={{ padding: 20, flex: 1 }}>
                    {renderSelectionList()}
                </View>
            )}
        </ModalPage>
    );
};
