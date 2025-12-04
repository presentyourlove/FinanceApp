import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, Keyboard, Alert, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Investment, dbOperations } from '@/src/services/database';

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

    const handleAction = async () => {
        if (!investment) return;

        const actionType = investment.type === 'stock' ? 'sell'
            : investment.type === 'fixed_deposit' ? 'close'
                : 'withdraw';

        const data: any = {
            date: actionDate.toISOString(),
        };

        if (actionType === 'sell') {
            if (!actionPrice || !actionAmount) return Alert.alert('錯誤', '請輸入價格與數量');
            data.sellPrice = parseFloat(actionPrice);
            data.quantity = parseFloat(actionAmount);
        } else if (actionType === 'close') {
            if (actionFinalInterest) data.finalInterest = parseFloat(actionFinalInterest);
        } else if (actionType === 'withdraw') {
            if (!actionAmount) return Alert.alert('錯誤', '請輸入提領金額');
            data.amount = parseFloat(actionAmount);
        }

        try {
            await dbOperations.processInvestmentAction(investment.id, actionType, data, {
                syncToTransaction: actionSync,
                targetAccountId: actionSync ? actionTargetAccountId : undefined
            });
            Alert.alert('成功', '操作已完成');
            onClose();
            onSuccess();
        } catch (e: any) {
            console.error(e);
            Alert.alert('錯誤', e.message || '操作失敗');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setActionDate(selectedDate);
    };

    if (!investment) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.centeredView}>
                    <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                        <Text style={styles.modalTitle}>
                            {investment.type === 'stock' ? '賣出股票' : investment.type === 'fixed_deposit' ? '定存解約' : '活存提領'}
                        </Text>

                        <Text style={styles.label}>日期</Text>
                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.dateButtonText}>{actionDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>

                        {investment.type === 'stock' && (
                            <>
                                <Text style={styles.label}>賣出價格 (總價)</Text>
                                <TextInput style={styles.input} value={actionPrice} onChangeText={setActionPrice} keyboardType="numeric" placeholder="總賣出金額" placeholderTextColor={colors.subtleText} />
                                <Text style={styles.label}>賣出股數 (持有: {investment.amount})</Text>
                                <TextInput style={styles.input} value={actionAmount} onChangeText={setActionAmount} keyboardType="numeric" placeholder="股數" placeholderTextColor={colors.subtleText} />
                            </>
                        )}

                        {investment.type === 'fixed_deposit' && (
                            <>
                                <Text style={styles.label}>最終利息 (選填)</Text>
                                <TextInput style={styles.input} value={actionFinalInterest} onChangeText={setActionFinalInterest} keyboardType="numeric" placeholder="實際收到利息" placeholderTextColor={colors.subtleText} />
                            </>
                        )}

                        {investment.type === 'savings' && (
                            <>
                                <Text style={styles.label}>提領金額 (餘額: {investment.amount})</Text>
                                <TextInput style={styles.input} value={actionAmount} onChangeText={setActionAmount} keyboardType="numeric" placeholder="金額" placeholderTextColor={colors.subtleText} />
                            </>
                        )}

                        <View style={styles.syncContainer}>
                            <Text style={styles.label}>同步至記帳 (收入)</Text>
                            <Switch value={actionSync} onValueChange={setActionSync} />
                        </View>

                        {actionSync && (
                            <View style={{ width: '100%' }}>
                                <Text style={styles.label}>存入帳戶</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={actionTargetAccountId} onValueChange={(itemValue) => setActionTargetAccountId(itemValue)} style={{ color: colors.text }}>
                                        {accounts.map(acc => (<Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />))}
                                    </Picker>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                                <Text style={styles.buttonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleAction}>
                                <Text style={styles.buttonText}>確認</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Date Picker Overlay */}
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
                                            <Text style={styles.buttonText}>確定</Text>
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
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
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
        marginTop: 20
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 100,
        alignItems: 'center'
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
        textAlign: "center"
    },
});
