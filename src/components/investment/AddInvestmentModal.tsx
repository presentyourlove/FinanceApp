import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Switch } from 'react-native';
import { ModalPage } from '@/src/components/common/ModalPage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { dbOperations } from '@/src/services/database';
import { getStyles } from './styles';
import { StockFormFields } from './StockFormFields';
import { FixedDepositFormFields } from './FixedDepositFormFields';
import { SavingsFormFields } from './SavingsFormFields';

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
        <ModalPage visible={visible} onClose={onClose} title="新增投資">
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
                    <StockFormFields
                        stockInputMode={stockInputMode}
                        setStockInputMode={setStockInputMode}
                        setHandlingFee={setHandlingFee}
                        unitPrice={unitPrice}
                        handleUnitPriceChange={handleUnitPriceChange}
                        amount={amount}
                        handleAmountChange={handleAmountChange}
                        handlingFee={handlingFee}
                        handleHandlingFeeChange={handleHandlingFeeChange}
                        costPrice={costPrice}
                        handleCostPriceChange={handleCostPriceChange}
                        colors={colors}
                        styles={styles}
                    />
                ) : type === 'fixed_deposit' ? (
                    <FixedDepositFormFields
                        maturityDate={maturityDate}
                        onDatePress={() => { setDatePickerMode('add_maturity'); setShowDatePicker(true); }}
                        interestRate={interestRate}
                        setInterestRate={setInterestRate}
                        amount={amount}
                        setAmount={setAmount}
                        colors={colors}
                        styles={styles}
                    />
                ) : (
                    <SavingsFormFields
                        amount={amount}
                        setAmount={setAmount}
                        interestRate={interestRate}
                        setInterestRate={setInterestRate}
                        interestFrequency={interestFrequency}
                        setInterestFrequency={setInterestFrequency}
                        colors={colors}
                        styles={styles}
                    />
                )}

                {/* Common Fields */}
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
        </ModalPage>
    );
}
