import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, Keyboard, Alert, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Investment, dbOperations } from '@/src/services/database';
import i18n from '@/src/i18n';

interface Account {
    id: number;
    name: string;
    currency: string;
    currentBalance: number;
}

interface InvestmentActionModalProps {
    visible: boolean;
    onClose: () => void;
    investment: Investment | null;
    accounts: Account[];
    onSuccess: () => void;
    colors: any;
}

export default function InvestmentActionModal({
    visible,
    onClose,
    investment,
    accounts,
    onSuccess,
    colors
}: InvestmentActionModalProps) {
    const styles = getStyles(colors);

    const [actionAmount, setActionAmount] = useState('');
    const [actionPrice, setActionPrice] = useState('');
    const [actionDate, setActionDate] = useState(new Date());
    const [actionSync, setActionSync] = useState(false);
    const [actionTargetAccountId, setActionTargetAccountId] = useState<number | undefined>(undefined);
    const [actionFinalInterest, setActionFinalInterest] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (investment && visible) {
            setActionAmount(investment.amount.toString());
            setActionPrice('');
            setActionDate(new Date());
            setActionSync(false);
            setActionFinalInterest('');
            if (accounts.length > 0) setActionTargetAccountId(accounts[0].id);
        }
    }, [investment, visible, accounts]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || actionDate;
        setShowDatePicker(Platform.OS === 'ios');
        setActionDate(currentDate);
    };

    const handleAction = async () => {
        if (!investment) return;

        const actionType = investment.type === 'stock' ? 'sell'
            : investment.type === 'fixed_deposit' ? 'close'
                : 'withdraw';

        const data: any = {
            date: actionDate.toISOString(),
        };

        if (actionType === 'sell') {
            if (!actionPrice || !actionAmount) return Alert.alert(i18n.t('common.error'), i18n.t('investment.missingActionInfo'));
            data.sellPrice = parseFloat(actionPrice);
            data.quantity = parseFloat(actionAmount);
        } else if (actionType === 'close') {
            if (actionFinalInterest) data.finalInterest = parseFloat(actionFinalInterest);
        } else if (actionType === 'withdraw') {
            if (!actionAmount) return Alert.alert(i18n.t('common.error'), i18n.t('investment.missingWithdrawAmount'));
            data.amount = parseFloat(actionAmount);
        }

        try {
            await dbOperations.processInvestmentAction(investment.id, actionType, data, {
                syncToTransaction: actionSync,
                targetAccountId: actionSync ? actionTargetAccountId : undefined
            });
            Alert.alert(i18n.t('common.success'), i18n.t('investment.updateSuccess'));
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            Alert.alert(i18n.t('common.error'), e.message || i18n.t('investment.updateFail'));
        }
    };

    if (!investment) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>
                            {investment.type === 'stock' ? i18n.t('investment.sellStock') :
                                investment.type === 'fixed_deposit' ? i18n.t('investment.closeDeposit') :
                                    i18n.t('investment.withdraw')}
                        </Text>

                        <Text style={styles.label}>{i18n.t('common.date')}</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                            <Text style={styles.dateButtonText}>{actionDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>

                        {investment.type === 'stock' && (
                            <>
                                <Text style={styles.label}>{i18n.t('investment.sellPrice')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.subtleText}
                                    keyboardType="numeric"
                                    value={actionPrice}
                                    onChangeText={setActionPrice}
                                />
                                <Text style={styles.label}>{i18n.t('investment.quantity')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.subtleText}
                                    keyboardType="numeric"
                                    value={actionAmount}
                                    onChangeText={setActionAmount}
                                />
                            </>
                        )}

                        {investment.type === 'fixed_deposit' && (
                            <>
                                <Text style={styles.label}>{i18n.t('investment.finalInterest')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.subtleText}
                                    keyboardType="numeric"
                                    value={actionFinalInterest}
                                    onChangeText={setActionFinalInterest}
                                />
                            </>
                        )}

                        {investment.type === 'fund' && (
                            <>
                                <Text style={styles.label}>{i18n.t('investment.withdrawAmount')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.subtleText}
                                    keyboardType="numeric"
                                    value={actionAmount}
                                    onChangeText={setActionAmount}
                                />
                            </>
                        )}

                        <View style={styles.syncContainer}>
                            <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>{i18n.t('investment.syncToTransaction')}</Text>
                            <Switch
                                value={actionSync}
                                onValueChange={setActionSync}
                                trackColor={{ false: "#767577", true: "#81b0ff" }}
                                thumbColor={actionSync ? "#007AFF" : "#f4f3f4"}
                            />
                        </View>

                        {actionSync && (
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={actionTargetAccountId}
                                    onValueChange={(itemValue) => setActionTargetAccountId(itemValue)}
                                    style={{ color: colors.text }}
                                    dropdownIconColor={colors.text}
                                >
                                    {accounts.map(acc => (
                                        <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                                <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleAction}>
                                <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            Platform.OS === 'ios' ? (
                                <View style={[styles.centeredView, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10 }]}>
                                    <View style={[styles.modalView, { backgroundColor: colors.card, padding: 20, width: '90%' }]}>
                                        <DateTimePicker
                                            value={actionDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={onDateChange}
                                            style={{ width: '100%', height: 200 }}
                                        />
                                        <TouchableOpacity
                                            style={[styles.button, styles.confirmButton, { marginTop: 20, width: '100%' }]}
                                            onPress={() => setShowDatePicker(false)}
                                        >
                                            <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <DateTimePicker
                                    value={actionDate}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: {
        width: '85%',
        borderRadius: 20,
        backgroundColor: colors.card,
        padding: 25,
        alignItems: "stretch",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: colors.text
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.subtleText,
        marginBottom: 8,
        marginTop: 10
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.borderColor,
        width: '100%'
    },
    dateButton: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borderColor,
        alignItems: 'center',
        width: '100%'
    },
    dateButtonText: {
        fontSize: 16,
        color: colors.text
    },
    pickerContainer: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderColor,
        overflow: 'hidden',
        width: '100%'
    },
    syncContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        width: '100%'
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
        gap: 10
    },
    button: {
        borderRadius: 10,
        padding: 12,
        elevation: 2,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: "#8E8E93"
    },
    confirmButton: {
        backgroundColor: "#007AFF"
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16
    },
});
