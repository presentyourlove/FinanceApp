import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeView from '@/src/components/common/SwipeView'; // Ensure this path is correct or update if necessary
import { dbOperations } from '@/src/services/database';
import i18n from '@/src/i18n';
import { Account } from '@/src/types';

interface AccountSettingsProps {
    onBack: () => void;
    colors: any;
    styles: any;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onBack, colors, styles }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [newAccName, setNewAccName] = useState('');
    const [newAccBalance, setNewAccBalance] = useState('');
    const [newAccCurrency, setNewAccCurrency] = useState('TWD');
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const allCurrencies = ['TWD', 'USD', 'JPY', 'CNY', 'HKD', 'MOP', 'GBP', 'KRW'];

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const loadedAccounts = await dbOperations.getAccounts();
            setAccounts(loadedAccounts);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddAccount = async () => {
        const name = newAccName;
        const balance = parseFloat(newAccBalance);

        if (!name) {
            Alert.alert("名稱無效", "請輸入新的帳本名稱。");
            return;
        }
        if (isNaN(balance)) {
            Alert.alert("金額無效", "請輸入有效的初始資金。");
            return;
        }

        try {
            await dbOperations.addAccountDB(name, balance, newAccCurrency);
            loadAccounts();
            setNewAccName('');
            setNewAccBalance('');
            setNewAccCurrency('TWD');
            Alert.alert("成功", `帳本「${name}」已新增。`);
        } catch {
            Alert.alert("新增失敗", "新增帳本時發生錯誤。");
        }
    };

    const handleDeleteAccount = async (id: number) => {
        if (accounts.length <= 1) {
            Alert.alert("無法刪除", "至少需要保留一個帳本。");
            return;
        }

        try {
            await dbOperations.deleteAccountDB(id);
            loadAccounts();
            Alert.alert("成功", "帳本已刪除。");
        } catch (error: any) {
            if (error.message && error.message.includes("transactions")) {
                Alert.alert("無法刪除", "此帳本仍有交易記錄，請先清除相關交易。");
            } else {
                Alert.alert("刪除失敗", "刪除帳本時發生錯誤。");
            }
        }
    };

    const getCurrencyLabel = (code: string) => {
        const labels: { [key: string]: string } = {
            'TWD': 'TWD - 新台幣',
            'USD': 'USD - 美金',
            'JPY': 'JPY - 日圓',
            'CNY': 'CNY - 人民幣',
            'HKD': 'HKD - 港幣',
            'MOP': 'MOP - 澳門幣',
            'GBP': 'GBP - 英鎊',
            'KRW': 'KRW - 韓元',
        };
        return labels[code] || code;
    };


    return (
        <SwipeView onBack={onBack}>
            <ScrollView style={{ flex: 1 }}>
                <Text style={styles.subtitle}>新增帳本</Text>
                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        placeholder="帳本名稱"
                        placeholderTextColor={colors.subtleText}
                        value={newAccName}
                        onChangeText={setNewAccName}
                    />
                    <TextInput
                        style={[styles.input, { marginTop: 10 }]}
                        placeholder="初始餘額"
                        placeholderTextColor={colors.subtleText}
                        keyboardType="numeric"
                        value={newAccBalance}
                        onChangeText={setNewAccBalance}
                    />

                    <View style={{ width: '100%', marginTop: 10, zIndex: 1000 }}>
                        <TouchableOpacity
                            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                            onPress={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                        >
                            <Text style={styles.inputText}>{getCurrencyLabel(newAccCurrency)}</Text>
                            <Ionicons name={isCurrencyDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.subtleText} />
                        </TouchableOpacity>

                        {isCurrencyDropdownOpen && (
                            <View style={styles.dropdown}>
                                <ScrollView nestedScrollEnabled={true}>
                                    {allCurrencies.map((curr) => (
                                        <TouchableOpacity
                                            key={curr}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setNewAccCurrency(curr);
                                                setIsCurrencyDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={{ color: colors.text }}>{getCurrencyLabel(curr)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.income, marginTop: 10 }]}
                        onPress={handleAddAccount}
                    >
                        <Text style={styles.buttonText}>{i18n.t('account.addButton')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>{i18n.t('account.existingTitle')}</Text>
                <View style={styles.card}>
                    {accounts?.map((acc: Account) => (
                        <View key={acc.id} style={styles.settingListItem}>
                            <Text style={styles.settingItemText}>{acc.name} ({acc.currency})</Text>
                            <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)}>
                                <Ionicons name="trash" size={20} color={colors.expense} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </SwipeView>
    );
};
