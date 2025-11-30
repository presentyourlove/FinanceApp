import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, Alert, Platform, Switch, SectionList, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { dbOperations, Investment } from '../services/database';

interface Account {
    id: number;
    name: string;
    currency: string;
    currentBalance: number;
}

interface GroupedInvestment extends Investment {
    averageCost?: number;
}

export default function InvestScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [investments, setInvestments] = useState<Investment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [type, setType] = useState<'stock' | 'fixed_deposit' | 'savings'>('stock');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(''); // Shares for stock, Principal for others
    const [costPrice, setCostPrice] = useState(''); // Total Cost for stock
    const [currentPrice, setCurrentPrice] = useState(''); // Unit Price
    const [currency, setCurrency] = useState('TWD');
    const [date, setDate] = useState(new Date());
    const [maturityDate, setMaturityDate] = useState(new Date());
    const [interestRate, setInterestRate] = useState('');
    const [interestFrequency, setInterestFrequency] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const [handlingFee, setHandlingFee] = useState('');
    const [notes, setNotes] = useState('');

    // Sync State
    const [syncToTransaction, setSyncToTransaction] = useState(false);
    const [sourceAccountId, setSourceAccountId] = useState<number | undefined>(undefined);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'date' | 'maturity'>('date');

    const loadData = async () => {
        try {
            const invs = await dbOperations.getInvestments();
            setInvestments(invs);
            const accs = await dbOperations.getAccounts();
            setAccounts(accs);
            if (accs.length > 0 && !sourceAccountId) {
                setSourceAccountId(accs[0].id);
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
                    // Update to latest date
                    if (new Date(inv.date) > new Date(stocksMap[inv.name].date)) {
                        stocksMap[inv.name].date = inv.date;
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

        const stocks = Object.values(stocksMap).map(s => ({
            ...s,
            averageCost: s.costPrice ? s.costPrice / s.amount : 0
        }));

        return [
            { title: '股票', data: stocks },
            { title: '定存', data: fixedDeposits },
            { title: '活存', data: savings }
        ].filter(section => section.data.length > 0);
    }, [investments]);

    const resetForm = () => {
        setType('stock');
        setName('');
        setAmount('');
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
        if (accounts.length > 0) setSourceAccountId(accounts[0].id);
    };

    const handleAddInvestment = async () => {
        if (!name || !amount) {
            Alert.alert('錯誤', '請填寫名稱與數量/金額');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('錯誤', '請輸入有效的數量/金額');
            return;
        }

        const data: any = {
            name,
            type,
            amount: numAmount,
            currency,
            date: date.toISOString(),
            notes,
            handlingFee: handlingFee ? parseFloat(handlingFee) : 0,
        };

        if (type === 'stock') {
            if (!costPrice) {
                Alert.alert('錯誤', '股票請輸入總成本');
                return;
            }
            data.costPrice = parseFloat(costPrice);
            data.currentPrice = currentPrice ? parseFloat(currentPrice) : (data.costPrice / numAmount);
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
            setModalVisible(false);
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', '新增失敗');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            if (datePickerMode === 'date') {
                setDate(selectedDate);
            } else {
                setMaturityDate(selectedDate);
            }
        }
    };

    const renderInvestmentItem = ({ item }: { item: GroupedInvestment }) => {
        let details = '';
        if (item.type === 'stock') {
            const avgCost = item.averageCost ? item.averageCost.toFixed(2) : '0';
            details = `股數: ${item.amount} | 均價: ${avgCost} | 總成本: ${item.costPrice}`;
        } else if (item.type === 'fixed_deposit') {
            details = `本金: ${item.amount} | 利率: ${item.interestRate}%`;
        } else {
            details = `本金: ${item.amount} | 利率: ${item.interestRate}%`;
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                            name={item.type === 'stock' ? 'trending-up' : item.type === 'fixed_deposit' ? 'time' : 'wallet'}
                            size={24}
                            color={colors.tint}
                            style={{ marginRight: 10 }}
                        />
                        <Text style={styles.cardTitle}>{item.name}</Text>
                    </View>
                    <Text style={styles.cardAmount}>{item.currency} {item.amount}</Text>
                </View>
                <Text style={styles.cardDetails}>{details}</Text>
                <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>投資組合</Text>
                <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }}>
                    <Ionicons name="add-circle" size={32} color={colors.tint} />
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

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>新增投資</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer}>
                        {/* Type Selector */}
                        <View style={styles.typeSelector}>
                            {(['stock', 'fixed_deposit', 'savings'] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeButton, type === t && { backgroundColor: colors.tint }]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.typeButtonText, type === t && { color: '#fff' }]}>
                                        {t === 'stock' ? '股票' : t === 'fixed_deposit' ? '定存' : '活存'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Common Fields */}
                        <Text style={styles.label}>名稱 (代號)</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例如: 台積電, 2330" placeholderTextColor={colors.subtleText} />

                        <Text style={styles.label}>{type === 'stock' ? '股數' : '本金'}</Text>
                        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="數量或金額" placeholderTextColor={colors.subtleText} />

                        <Text style={styles.label}>幣別</Text>
                        <TextInput style={styles.input} value={currency} onChangeText={setCurrency} placeholder="TWD" placeholderTextColor={colors.subtleText} />

                        <Text style={styles.label}>購買/開始日期</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => { setDatePickerMode('date'); setShowDatePicker(true); }}
                        >
                            <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
                        </TouchableOpacity>

                        {/* Specific Fields */}
                        {type === 'stock' && (
                            <>
                                <Text style={styles.label}>總成本 (含手續費)</Text>
                                <TextInput style={styles.input} value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" placeholder="總花費金額" placeholderTextColor={colors.subtleText} />

                                <Text style={styles.label}>手續費 (僅記錄用)</Text>
                                <TextInput style={styles.input} value={handlingFee} onChangeText={setHandlingFee} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtleText} />
                            </>
                        )}

                        {type === 'fixed_deposit' && (
                            <>
                                <Text style={styles.label}>到期日</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => { setDatePickerMode('maturity'); setShowDatePicker(true); }}
                                >
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
                                    <Picker
                                        selectedValue={interestFrequency}
                                        onValueChange={(itemValue) => setInterestFrequency(itemValue)}
                                        style={{ color: colors.text }}
                                    >
                                        <Picker.Item label="每月" value="monthly" />
                                        <Picker.Item label="每年" value="yearly" />
                                        <Picker.Item label="每日" value="daily" />
                                    </Picker>
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>備註</Text>
                        <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="選填" placeholderTextColor={colors.subtleText} />

                        {/* Sync Option */}
                        <View style={styles.syncContainer}>
                            <Text style={styles.label}>同步至記帳 (支出)</Text>
                            <Switch value={syncToTransaction} onValueChange={setSyncToTransaction} />
                        </View>

                        {syncToTransaction && (
                            <View>
                                <Text style={styles.label}>扣款帳戶</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={sourceAccountId}
                                        onValueChange={(itemValue) => setSourceAccountId(itemValue)}
                                        style={{ color: colors.text }}
                                    >
                                        {accounts.map(acc => (
                                            <Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />
                                        ))}
                                    </Picker>
                                </View>
                                {type !== 'stock' && (
                                    <>
                                        <Text style={styles.label}>手續費 (若有)</Text>
                                        <TextInput style={styles.input} value={handlingFee} onChangeText={setHandlingFee} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtleText} />
                                    </>
                                )}
                            </View>
                        )}

                        <TouchableOpacity style={styles.submitButton} onPress={handleAddInvestment}>
                            <Text style={styles.submitButtonText}>新增投資</Text>
                        </TouchableOpacity>
                        <View style={{ height: 50 }} />
                    </ScrollView>

                    {showDatePicker && (
                        <DateTimePicker
                            value={datePickerMode === 'date' ? date : maturityDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: colors.subtleText,
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
        marginBottom: 10,
        marginLeft: 5,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    cardDetails: {
        fontSize: 14,
        color: colors.subtleText,
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 12,
        color: colors.subtleText,
        textAlign: 'right',
    },
    modalContainer: {
        flex: 1,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    formContainer: {
        padding: 20,
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 4,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.subtleText,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.subtleText,
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.borderColor,
    },
    dateButton: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borderColor,
        alignItems: 'center',
    },
    dateButtonText: {
        fontSize: 16,
        color: colors.text,
    },
    pickerContainer: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderColor,
        overflow: 'hidden',
    },
    syncContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    submitButton: {
        backgroundColor: colors.tint,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
