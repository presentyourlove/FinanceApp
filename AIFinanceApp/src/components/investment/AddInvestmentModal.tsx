import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { dbOperations } from '@/src/services/database';

interface Account {
    id: number;
    name: string;
    currency: string;
    currentBalance: number;
}

interface AddInvestmentModalProps {
    visible: boolean;
    onClose: () => void;
    accounts: Account[];
    currencyOptions: string[];
    onSuccess: () => void;
    colors: any;
}

export default function AddInvestmentModal({
    visible,
    onClose,
    accounts,
    currencyOptions,
    onSuccess,
    colors
}: AddInvestmentModalProps) {
    const styles = getStyles(colors);

    const [type, setType] = useState<'stock' | 'fixed_deposit' | 'savings'>('stock');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [date, setDate] = useState(new Date());
    const [maturityDate, setMaturityDate] = useState(new Date());
    const [interestRate, setInterestRate] = useState('');
    const [interestFrequency, setInterestFrequency] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const [handlingFee, setHandlingFee] = useState('');
    const [notes, setNotes] = useState('');
    const [syncToTransaction, setSyncToTransaction] = useState(false);
    const [sourceAccountId, setSourceAccountId] = useState<number | undefined>(undefined);
    const [stockInputMode, setStockInputMode] = useState<'shares' | 'cost'>('shares');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'add_date' | 'add_maturity'>('add_date');

    useEffect(() => {
        if (accounts.length > 0 && !sourceAccountId) {
            setSourceAccountId(accounts[0].id);
        }
    }, [accounts]);

    const resetForm = () => {
        setType('stock');
        setName('');
        setAmount('');
        setUnitPrice('');
        setCostPrice('');
        setCurrency('TWD');
        setDate(new Date());
        setMaturityDate(new Date());
        setInterestRate('');
        setInterestFrequency('monthly');
        setHandlingFee('');
        setNotes('');
        setSyncToTransaction(false);
        setStockInputMode('shares');
        if (accounts.length > 0) setSourceAccountId(accounts[0].id);
    };

    const handleUnitPriceChange = (text: string) => {
        setUnitPrice(text);
        const u = parseFloat(text);
        if (stockInputMode === 'shares') {
            const a = parseFloat(amount);
            const fee = parseFloat(handlingFee) || 0;
            if (!isNaN(u) && !isNaN(a)) {
                setCostPrice((u * a + fee).toString());
            }
        } else {
            const c = parseFloat(costPrice);
            if (!isNaN(u) && !isNaN(c) && u !== 0) {
                setAmount((c / u).toString());
            }
        }
    };

    const handleAmountChange = (text: string) => {
        setAmount(text);
        const a = parseFloat(text);
        const u = parseFloat(unitPrice);
        const fee = parseFloat(handlingFee) || 0;
        if (!isNaN(a) && !isNaN(u)) {
            setCostPrice((a * u + fee).toString());
        }
    };

    const handleCostPriceChange = (text: string) => {
        setCostPrice(text);
        const c = parseFloat(text);
        const u = parseFloat(unitPrice);
        if (!isNaN(c) && !isNaN(u) && u !== 0) {
            setAmount((c / u).toString());
        }
    };

    const handleHandlingFeeChange = (text: string) => {
        setHandlingFee(text);
        if (stockInputMode === 'shares') {
            const fee = parseFloat(text) || 0;
            const u = parseFloat(unitPrice);
            const a = parseFloat(amount);
            if (!isNaN(u) && !isNaN(a)) {
                setCostPrice((u * a + fee).toString());
            }
        }
    };

    const handleAddInvestment = async () => {
        if (!name) return Alert.alert('錯誤', '請填寫名稱');

        let numAmount = parseFloat(amount);

        if (type === 'stock') {
            if (!amount && costPrice && unitPrice) {
                numAmount = parseFloat(costPrice) / parseFloat(unitPrice);
            }
        }

        if (isNaN(numAmount) || numAmount <= 0) return Alert.alert('錯誤', '請輸入有效的數量/金額');

        const data: any = {
            name, type, amount: numAmount, currency, date: date.toISOString(), notes,
            handlingFee: handlingFee ? parseFloat(handlingFee) : 0,
        };

        if (type === 'stock') {
            if (!costPrice) return Alert.alert('錯誤', '股票請輸入總成本');
            data.costPrice = parseFloat(costPrice);
            data.currentPrice = unitPrice ? parseFloat(unitPrice) : (data.costPrice / numAmount);
            if (stockInputMode === 'cost') data.handlingFee = 0;
        } else if (type === 'fixed_deposit') {
            data.maturityDate = maturityDate.toISOString();
            data.interestRate = interestRate ? parseFloat(interestRate) : 0;
        } else if (type === 'savings') {
            data.interestRate = interestRate ? parseFloat(interestRate) : 0;
            data.interestFrequency = interestFrequency;
        }

        try {
            await dbOperations.addInvestment(data, {
                syncToTransaction,
                sourceAccountId: syncToTransaction ? sourceAccountId : undefined
            });
            Alert.alert('成功', '已新增投資項目');
            resetForm();
            onClose();
            onSuccess();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', '新增失敗');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) {
            if (datePickerMode === 'add_date') setDate(selectedDate);
            else if (datePickerMode === 'add_maturity') setMaturityDate(selectedDate);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>新增投資</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.formContainer}>
                    <View style={styles.typeSelector}>
                        {(['stock', 'fixed_deposit', 'savings'] as const).map((t) => (
                            <TouchableOpacity key={t} style={[styles.typeButton, type === t && { backgroundColor: colors.accent }]} onPress={() => setType(t)}>
                                <Text style={[styles.typeButtonText, type === t && { color: '#fff' }]}>{t === 'stock' ? '股票' : t === 'fixed_deposit' ? '定存' : '活存'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.label}>名稱 (代號)</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例如: 台積電, 2330" placeholderTextColor={colors.subtleText} />

                    {type === 'stock' ? (
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
                    ) : (
                        <>
                            <Text style={styles.label}>本金</Text>
                            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="金額" placeholderTextColor={colors.subtleText} />
                        </>
                    )}

                    <Text style={styles.label}>幣別</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={currency} onValueChange={setCurrency} style={{ color: colors.text }}>
                            {currencyOptions.map(c => <Picker.Item key={c} label={c} value={c} />)}
                        </Picker>
                    </View>

                    <Text style={styles.label}>購買/開始日期</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerMode('add_date'); setShowDatePicker(true); }}>
                        <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>

                    {type === 'fixed_deposit' && (
                        <>
                            <Text style={styles.label}>到期日</Text>
                            <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerMode('add_maturity'); setShowDatePicker(true); }}>
                                <Text style={styles.dateButtonText}>{maturityDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>年利率 (%)</Text>
                            <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" placeholder="1.5" placeholderTextColor={colors.subtleText} />
                        </>
                    )}
                    {type === 'savings' && (
                        <>
                            <Text style={styles.label}>年利率 (%)</Text>
                            <TextInput style={styles.input} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" placeholder="1.2" placeholderTextColor={colors.subtleText} />
                            <Text style={styles.label}>配息頻率</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={interestFrequency} onValueChange={(itemValue) => setInterestFrequency(itemValue)} style={{ color: colors.text }}>
                                    <Picker.Item label="每月" value="monthly" /><Picker.Item label="每年" value="yearly" /><Picker.Item label="每日" value="daily" />
                                </Picker>
                            </View>
                        </>
                    )}

                    {type !== 'stock' && (
                        <>
                            <Text style={styles.label}>手續費 (選填)</Text>
                            <TextInput style={styles.input} value={handlingFee} onChangeText={setHandlingFee} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtleText} />
                        </>
                    )}

                    <Text style={styles.label}>備註</Text>
                    <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="選填" placeholderTextColor={colors.subtleText} />

                    <View style={styles.syncContainer}>
                        <Text style={styles.label}>同步至記帳 (支出)</Text>
                        <Switch value={syncToTransaction} onValueChange={setSyncToTransaction} />
                    </View>
                    {syncToTransaction && (
                        <View>
                            <Text style={styles.label}>扣款帳戶</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={sourceAccountId} onValueChange={(itemValue) => setSourceAccountId(itemValue)} style={{ color: colors.text }}>
                                    {accounts.map(acc => (<Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />))}
                                </Picker>
                            </View>
                        </View>
                    )}
                    <TouchableOpacity style={styles.submitButton} onPress={handleAddInvestment}>
                        <Text style={styles.submitButtonText}>新增投資</Text>
                    </TouchableOpacity>
                    <View style={{ height: 50 }} />
                </ScrollView>

                {/* Date Picker Overlay */}
                {showDatePicker && (
                    Platform.OS === 'ios' ? (
                        <View style={[styles.centeredView, { position: 'absolute', width: '100%', height: '100%', zIndex: 10, elevation: 10 }]}>
                            <View style={[styles.modalView, { backgroundColor: colors.card, padding: 20, width: '90%' }]}>
                                <DateTimePicker
                                    value={datePickerMode === 'add_date' ? date : maturityDate}
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
                            value={datePickerMode === 'add_date' ? date : maturityDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )
                )}
            </View>
        </Modal>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    formContainer: { padding: 20 },
    typeSelector: { flexDirection: 'row', marginBottom: 20, backgroundColor: colors.inputBackground, borderRadius: 10, padding: 4 },
    typeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    typeButtonText: { fontSize: 14, fontWeight: '600', color: colors.subtleText },
    label: { fontSize: 14, fontWeight: '500', color: colors.subtleText, marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
    dateButton: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' },
    dateButtonText: { fontSize: 16, color: colors.text },
    pickerContainer: { backgroundColor: colors.inputBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' },
    syncContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    submitButton: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '85%', borderRadius: 20, padding: 25, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
    confirmButton: { backgroundColor: "#007AFF" },
    buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
});
