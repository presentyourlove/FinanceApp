import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Pressable, Keyboard, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal } from '@/src/services/database';
import i18n from '@/src/i18n';
import { PickerOverlay } from './PickerOverlay';

interface GoalDepositModalProps {
    visible: boolean;
    goal: Goal | null;
    type: 'add' | 'subtract';
    onClose: () => void;
    onConfirm: (amount: string, isSync: boolean, fromId: number | null, toId: number | null) => void;
    accounts: any[];
    colors: any;
    styles: any;
}

export const GoalDepositModal: React.FC<GoalDepositModalProps> = ({
    visible,
    goal,
    type,
    onClose,
    onConfirm,
    accounts,
    colors,
    styles
}) => {
    const [amount, setAmount] = useState('');
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);
    const [selectedFromAccount, setSelectedFromAccount] = useState<number | null>(null);
    const [selectedToAccount, setSelectedToAccount] = useState<number | null>(null);
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [pickerMode, setPickerMode] = useState<'from' | 'to'>('from');

    useEffect(() => {
        if (visible) {
            setAmount('');
            setIsSyncEnabled(true);
            setSelectedFromAccount(null);
            setSelectedToAccount(null);
        }
    }, [visible]);

    const handleConfirm = () => {
        onConfirm(amount, isSyncEnabled, selectedFromAccount, selectedToAccount);
    };

    const openPicker = (mode: 'from' | 'to') => {
        Keyboard.dismiss();
        setPickerMode(mode);
        setShowPickerModal(true);
    };

    const renderAccountPicker = (selectedValue: number | null, mode: 'from' | 'to') => {
        const selectedAccount = accounts.find(a => a.id === selectedValue);
        return (
            <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.borderColor, backgroundColor: colors.inputBackground }]}
                onPress={() => openPicker(mode)}
            >
                <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                    {selectedAccount ? selectedAccount.name : i18n.t('goal.notApplicable')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.subtleText} />
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={true}>
            <View style={styles.centeredView}>
                <Pressable style={StyleSheet.absoluteFill as any} onPress={Keyboard.dismiss} />
                <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        {type === 'add' ? i18n.t('goal.depositTitle') : i18n.t('goal.withdrawTitle')}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.subtleText }]}>
                        {i18n.t('goal.currentBalance')}: {goal?.currency || 'TWD'} ${goal?.currentAmount}
                    </Text>

                    <TextInput
                        style={[styles.input, { borderColor: colors.borderColor, color: colors.text }]}
                        placeholder={i18n.t('goal.amountPlaceholder')}
                        placeholderTextColor={colors.subtleText}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        autoFocus={true}
                    />

                    {type === 'add' && (
                        <View style={styles.syncContainer}>
                            <View style={styles.syncHeader}>
                                <Text style={[styles.syncLabel, { color: colors.text }]}>{i18n.t('goal.syncLabel')}</Text>
                                <Switch
                                    value={isSyncEnabled}
                                    onValueChange={setIsSyncEnabled}
                                    trackColor={{ false: "#767577", true: "#34C759" }}
                                />
                            </View>

                            {isSyncEnabled && (
                                <View style={styles.pickersContainer}>
                                    <View style={styles.pickerWrapper}>
                                        <Text style={[styles.pickerLabel, { color: colors.subtleText }]}>{i18n.t('goal.fromAccount')}</Text>
                                        {renderAccountPicker(selectedFromAccount, 'from')}
                                    </View>

                                    <Ionicons name="arrow-forward" size={20} color={colors.subtleText} style={{ marginTop: 20 }} />

                                    <View style={styles.pickerWrapper}>
                                        <Text style={[styles.pickerLabel, { color: colors.subtleText }]}>{i18n.t('goal.toAccount')}</Text>
                                        {renderAccountPicker(selectedToAccount, 'to')}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF' }]} onPress={handleConfirm}>
                            <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <PickerOverlay
                    visible={showPickerModal}
                    onClose={() => setShowPickerModal(false)}
                    onSelect={(id: number | null) => {
                        if (pickerMode === 'from') setSelectedFromAccount(id);
                        else setSelectedToAccount(id);
                        setShowPickerModal(false);
                    }}
                    items={[{ id: null, name: i18n.t('goal.notApplicable') }, ...accounts]}
                    title={i18n.t('goal.selectAccount')}
                    colors={colors}
                    styles={styles}
                    renderItemContent={(item) => (
                        <>
                            <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.name}</Text>
                            {item.id !== null && item.currentBalance !== undefined && (
                                <Text style={[styles.pickerItemSubtext, { color: colors.subtleText }]}>
                                    ${item.currentBalance?.toLocaleString()}
                                </Text>
                            )}
                        </>
                    )}
                />
            </View>
        </Modal>
    );
};
