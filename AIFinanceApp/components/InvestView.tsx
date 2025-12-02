import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, Alert, Platform, Switch, SectionList, Keyboard, TouchableWithoutFeedback, FlatList
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import { dbOperations, Investment } from '@/app/services/database';
import { loadCurrencySettings } from '@/app/utils/currencyStorage';

interface Account {
    id: number;
    name: string;
    currency: string;
    currentBalance: number;
}

interface GroupedInvestment extends Investment {
    averageCost?: number;
    totalShares?: number;
    marketValue?: number;
    unrealizedProfit?: number;
    returnRate?: number;
    estimatedInterest?: number;
}

export default function InvestView({ style }: { style?: any }) {
    // const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [investments, setInvestments] = useState<Investment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currencyOptions, setCurrencyOptions] = useState<string[]>(['TWD']);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Action State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [stockDetailModalVisible, setStockDetailModalVisible] = useState(false);
    const [updatePriceModalVisible, setUpdatePriceModalVisible] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [selectedStockName, setSelectedStockName] = useState<string>('');

    // Action Form State
    const [actionAmount, setActionAmount] = useState('');
    const [actionPrice, setActionPrice] = useState('');
    const [actionDate, setActionDate] = useState(new Date());
    const [actionSync, setActionSync] = useState(false);
    const [actionTargetAccountId, setActionTargetAccountId] = useState<number | undefined>(undefined);
    const [actionFinalInterest, setActionFinalInterest] = useState('');

    // Update Price State
    const [newPrice, setNewPrice] = useState('');

    // Add Form State
    const [type, setType] = useState<'stock' | 'fixed_deposit' | 'savings'>('stock');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(''); // Share count or Principal
    const [unitPrice, setUnitPrice] = useState(''); // New: Unit Price
    const [costPrice, setCostPrice] = useState(''); // Total Cost
    const [currentPrice, setCurrentPrice] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [date, setDate] = useState(new Date());
    const [maturityDate, setMaturityDate] = useState(new Date());
    const [interestRate, setInterestRate] = useState('');
    const [interestFrequency, setInterestFrequency] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const [handlingFee, setHandlingFee] = useState('');
    const [notes, setNotes] = useState('');
    const [syncToTransaction, setSyncToTransaction] = useState(false);

    const [sourceAccountId, setSourceAccountId] = useState<number | undefined>(undefined);
    const [stockInputMode, setStockInputMode] = useState<'shares' | 'cost'>('shares'); // New: Toggle for stock input

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'add_date' | 'add_maturity' | 'action_date'>('add_date');

    const loadData = async () => {
        try {
            const invs = await dbOperations.getInvestments();
            setInvestments(invs);
            const accs = await dbOperations.getAccounts();
            setAccounts(accs);
            const settings = await loadCurrencySettings();
            setCurrencyOptions(Object.keys(settings.exchangeRates));

            if (accs.length > 0) {
                if (!sourceAccountId) setSourceAccountId(accs[0].id);
                if (!actionTargetAccountId) setActionTargetAccountId(accs[0].id);
            }
        } catch (e) {
            console.error("Failed to load investment data:", e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const groupedInvestments = useMemo(() => {
        const stocksMap: { [key: string]: GroupedInvestment } = {};
        const fixedDeposits: Investment[] = [];
        const savings: Investment[] = [];

        investments.forEach(inv => {
            if (inv.type === 'stock') {
                if (stocksMap[inv.name]) {
                    stocksMap[inv.name].amount += inv.amount;
                    stocksMap[inv.name].costPrice = (stocksMap[inv.name].costPrice || 0) + (inv.costPrice || 0);
                    // Use the latest price found (assuming user updates all or latest entry reflects current)
                    if (new Date(inv.date) > new Date(stocksMap[inv.name].date)) {
                        stocksMap[inv.name].currentPrice = inv.currentPrice;
                    }
                } else {
                    stocksMap[inv.name] = { ...inv };
                }
            } else if (inv.type === 'fixed_deposit') {
                fixedDeposits.push(inv);
            } else if (inv.type === 'savings') {
                savings.push(inv);
            }
        });

        const stocks = Object.values(stocksMap).map(s => {
            const avgCost = s.costPrice ? s.costPrice / s.amount : 0;
            const marketVal = s.amount * (s.currentPrice || 0);
            const profit = marketVal - (s.costPrice || 0);
            const rate = s.costPrice ? (profit / s.costPrice) * 100 : 0;
            return {
                ...s,
                averageCost: avgCost,
                marketValue: marketVal,
                unrealizedProfit: profit,
                returnRate: rate
            };
        });

        const calculateInterest = (inv: Investment) => {
            const days = (new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
            if (days < 0) return 0;
            return inv.amount * ((inv.interestRate || 0) / 100) * (days / 365);
        };

        const fds = fixedDeposits.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));
        const savs = savings.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));

        return [
            { title: '股票', data: stocks },
            { title: '定存', data: fds },
            { title: '活存', data: savs }
        ].filter(section => section.data.length > 0);
    }, [investments]);

    const resetAddForm = () => {
        setType('stock');
        setName('');
        setAmount('');
        setUnitPrice('');
        setCostPrice('');
        setCurrentPrice('');
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

    const resetActionForm = (inv: Investment) => {
        setSelectedInvestment(inv);
        setActionAmount(inv.amount.toString());
        setActionPrice('');
        setActionDate(new Date());
        setActionSync(false);
        setActionFinalInterest('');
        if (accounts.length > 0) setActionTargetAccountId(accounts[0].id);
    };

    const handleInvestmentPress = (item: GroupedInvestment) => {
        if (item.type === 'stock') {
            setSelectedStockName(item.name);
            setStockDetailModalVisible(true);
        } else {
            resetActionForm(item);
            setActionModalVisible(true);
        }
    };

    const handleUpdatePrice = async () => {
        if (!newPrice) return Alert.alert('錯誤', '請輸入新價格');
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) return Alert.alert('錯誤', '請輸入有效價格');

        try {
            await dbOperations.updateStockPrice(selectedStockName, price);
            Alert.alert('成功', '股價已更新');
            setUpdatePriceModalVisible(false);
            setNewPrice('');
            loadData();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', '更新失敗');
        }
    };

    const handleAction = async () => {
        if (!selectedInvestment) return;

        const actionType = selectedInvestment.type === 'stock' ? 'sell'
            : selectedInvestment.type === 'fixed_deposit' ? 'close'
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
            await dbOperations.processInvestmentAction(selectedInvestment.id, actionType, data, {
                syncToTransaction: actionSync,
                targetAccountId: actionSync ? actionTargetAccountId : undefined
            });
            Alert.alert('成功', '操作已完成');
            setActionModalVisible(false);
            setStockDetailModalVisible(false); // Close detail modal if open
            loadData();
        } catch (e: any) {
            console.error(e);
            Alert.alert('錯誤', e.message || '操作失敗');
        }
    };

    // Auto-calculation logic for stock inputs
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
            // Mode: Cost. If Unit Price changes, recalc Amount?
            // Amount = (Total Cost - Fee) / Unit. But fee is 0 in this mode.
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

        // For stock, if amount is missing but cost and unit price exist, it should have been calc'd.
        // If user only entered Cost and Unit, amount is calc'd.
        // If user entered Cost but no Unit, we need amount.

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
            // If unit price is provided, use it as current price, otherwise calc from cost/amount
            data.currentPrice = unitPrice ? parseFloat(unitPrice) : (data.costPrice / numAmount);
            // If mode is cost, handling fee is 0 (implied in cost)
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
            setAddModalVisible(false);
            resetAddForm();
            loadData();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', '新增失敗');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        // On Android, we need to close the picker
        if (Platform.OS === 'android') setShowDatePicker(false);

        if (selectedDate) {
            if (datePickerMode === 'add_date') setDate(selectedDate);
            else if (datePickerMode === 'add_maturity') setMaturityDate(selectedDate);
            else if (datePickerMode === 'action_date') setActionDate(selectedDate);
        }
    };

    const renderInvestmentItem = ({ item }: { item: GroupedInvestment }) => {
        let details = '';
        let profitInfo = null;

        if (item.type === 'stock') {
            const avgCost = item.averageCost ? item.averageCost.toFixed(2) : '0';
            details = `股數: ${item.amount} | 均價: ${avgCost}`;

            const profit = item.unrealizedProfit || 0;
            const rate = item.returnRate || 0;
            const color = profit >= 0 ? colors.income : colors.expense;

            profitInfo = (
                <View style={{ marginTop: 5 }}>
                    <Text style={{ color: colors.subtleText }}>現價: {item.currentPrice}</Text>
                    <Text style={{ color, fontWeight: 'bold' }}>
                        損益: {profit.toFixed(0)} ({rate.toFixed(2)}%)
                    </Text>
                </View>
            );
        } else {
            const interest = item.estimatedInterest ? item.estimatedInterest.toFixed(0) : '0';
            details = `本金: ${item.amount} | 利率: ${item.interestRate}%`;
            profitInfo = (
                <Text style={{ color: colors.income, marginTop: 5 }}>預估利息: {interest}</Text>
            );
        }

        return (
            <TouchableOpacity onPress={() => handleInvestmentPress(item)}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons
                                name={item.type === 'stock' ? 'trending-up' : item.type === 'fixed_deposit' ? 'time' : 'wallet'}
                                size={24} color={colors.tint} style={{ marginRight: 10 }}
                            />
                            <Text style={styles.cardTitle}>{item.name}</Text>
                        </View>
                        <Text style={styles.cardAmount}>{item.currency} {item.amount}</Text>
                    </View>
                    <Text style={styles.cardDetails}>{details}</Text>
                    {profitInfo}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.header, { paddingTop: 20 }]}>
                <Text style={styles.headerTitle}>投資組合</Text>
                <TouchableOpacity onPress={() => { resetAddForm(); setAddModalVisible(true); }}>
                    <Ionicons name="add-circle" size={32} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={groupedInvestments}
                keyExtractor={(item, index) => item.id.toString() + index}
                renderItem={renderInvestmentItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>尚無投資項目</Text>}
                stickySectionHeadersEnabled={false}
            />

            {/* Add Investment Modal */}
            <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>新增投資</Text>
                        <TouchableOpacity onPress={() => setAddModalVisible(false)}>
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

                    {/* Date Picker Overlay for Add Modal */}
                    {showDatePicker && (
                        Platform.OS === 'ios' ? (
                            <View style={[styles.centeredView, { position: 'absolute', width: '100%', height: '100%', zIndex: 10, elevation: 10 }]}>
                                <View style={[styles.modalView, { backgroundColor: colors.card, padding: 20, width: '90%' }]}>
                                    <DateTimePicker
                                        value={datePickerMode === 'add_date' ? date : datePickerMode === 'add_maturity' ? maturityDate : actionDate}
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
                                value={datePickerMode === 'add_date' ? date : datePickerMode === 'add_maturity' ? maturityDate : actionDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )
                    )}
                </View>
            </Modal>

            {/* Stock Detail Modal */}
            <Modal visible={stockDetailModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{selectedStockName} 持倉明細</Text>
                        <TouchableOpacity onPress={() => setStockDetailModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ padding: 15 }}>
                        <TouchableOpacity style={styles.updatePriceButton} onPress={() => setUpdatePriceModalVisible(true)}>
                            <Text style={styles.updatePriceButtonText}>更新現價</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={investments.filter(i => i.name === selectedStockName && i.type === 'stock')}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ padding: 15 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => { resetActionForm(item); setActionModalVisible(true); }}>
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{new Date(item.date).toLocaleDateString()}</Text>
                                        <Text style={styles.cardAmount}>{item.amount} 股</Text>
                                    </View>
                                    <Text style={styles.cardDetails}>成本: {item.costPrice} | 單價: {item.currentPrice?.toFixed(2)}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Update Price Modal */}
            <Modal visible={updatePriceModalVisible} animationType="fade" transparent>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centeredView}>
                        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                            <Text style={styles.modalTitle}>更新 {selectedStockName} 現價</Text>
                            <TextInput style={[styles.input, { width: '100%', marginTop: 20 }]} value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholder="輸入最新價格" placeholderTextColor={colors.subtleText} />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setUpdatePriceModalVisible(false)}>
                                    <Text style={styles.buttonText}>取消</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleUpdatePrice}>
                                    <Text style={styles.buttonText}>更新</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Action Modal */}
            <Modal visible={actionModalVisible} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centeredView}>
                        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                            <Text style={styles.modalTitle}>
                                {selectedInvestment?.type === 'stock' ? '賣出股票' : selectedInvestment?.type === 'fixed_deposit' ? '定存解約' : '活存提領'}
                            </Text>

                            <Text style={styles.label}>日期</Text>
                            <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerMode('action_date'); setShowDatePicker(true); }}>
                                <Text style={styles.dateButtonText}>{actionDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>

                            {selectedInvestment?.type === 'stock' && (
                                <>
                                    <Text style={styles.label}>賣出價格 (總價)</Text>
                                    <TextInput style={styles.input} value={actionPrice} onChangeText={setActionPrice} keyboardType="numeric" placeholder="總賣出金額" placeholderTextColor={colors.subtleText} />
                                    <Text style={styles.label}>賣出股數 (持有: {selectedInvestment.amount})</Text>
                                    <TextInput style={styles.input} value={actionAmount} onChangeText={setActionAmount} keyboardType="numeric" placeholder="股數" placeholderTextColor={colors.subtleText} />
                                </>
                            )}

                            {selectedInvestment?.type === 'fixed_deposit' && (
                                <>
                                    <Text style={styles.label}>最終利息 (選填)</Text>
                                    <TextInput style={styles.input} value={actionFinalInterest} onChangeText={setActionFinalInterest} keyboardType="numeric" placeholder="實際收到利息" placeholderTextColor={colors.subtleText} />
                                </>
                            )}

                            {selectedInvestment?.type === 'savings' && (
                                <>
                                    <Text style={styles.label}>提領金額 (餘額: {selectedInvestment.amount})</Text>
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
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setActionModalVisible(false)}>
                                    <Text style={styles.buttonText}>取消</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleAction}>
                                    <Text style={styles.buttonText}>確認</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Date Picker Overlay for Action Modal */}
                            {showDatePicker && (
                                Platform.OS === 'ios' ? (
                                    <View style={[styles.centeredView, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 10 }]}>
                                        <View style={[styles.modalView, { backgroundColor: colors.card, padding: 20, width: '90%' }]}>
                                            <DateTimePicker
                                                value={datePickerMode === 'add_date' ? date : datePickerMode === 'add_maturity' ? maturityDate : actionDate}
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
                                        value={datePickerMode === 'add_date' ? date : datePickerMode === 'add_maturity' ? maturityDate : actionDate}
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

        </View >
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    emptyText: { textAlign: 'center', marginTop: 50, color: colors.subtleText, fontSize: 16 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 10, marginLeft: 5 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 15, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cardAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
    cardDetails: { fontSize: 14, color: colors.subtleText, marginBottom: 4 },
    cardDate: { fontSize: 12, color: colors.subtleText, textAlign: 'right' },
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
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
    cancelButton: { backgroundColor: "#8E8E93" },
    confirmButton: { backgroundColor: "#007AFF" },
    buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
    updatePriceButton: { backgroundColor: colors.accent, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    updatePriceButtonText: { color: '#fff', fontWeight: 'bold' }
});
