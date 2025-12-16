import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeView from '@/src/components/common/SwipeView';
import * as CurrencyStorage from '@/src/services/storage/currencyStorage';

interface CurrencySettingsProps {
    onBack: () => void;
    colors: any;
    styles: any;
}

export const CurrencySettings: React.FC<CurrencySettingsProps> = ({ onBack, colors, styles }) => {
    const [currencySettings, setCurrencySettings] = useState<CurrencyStorage.CurrencySettings>({
        mainCurrency: 'TWD',
        exchangeRates: {}
    });
    const [tempRates, setTempRates] = useState<{ [key: string]: string }>({});
    const allCurrencies = ['TWD', 'USD', 'JPY', 'CNY', 'HKD', 'MOP', 'GBP', 'KRW'];

    useEffect(() => {
        loadCurrencySettings();
    }, []);

    const loadCurrencySettings = async () => {
        const loaded = await CurrencyStorage.loadCurrencySettings();
        setCurrencySettings(loaded);
        const initialTempRates: { [key: string]: string } = {};
        Object.entries(loaded.exchangeRates).forEach(([curr, rate]) => {
            initialTempRates[curr] = rate.toString();
        });
        setTempRates(initialTempRates);
    };

    const handleMainCurrencyChange = (newMain: string) => {
        const pivotRateStr = tempRates[newMain];
        const pivotRate = parseFloat(pivotRateStr);

        if (isNaN(pivotRate) || pivotRate <= 0) {
            Alert.alert("錯誤", "新主幣別的匯率無效，無法切換。請先設定有效的匯率。");
            return;
        }

        const newSettings = { ...currencySettings, mainCurrency: newMain };
        const newTempRates: { [key: string]: string } = {};

        Object.keys(tempRates).forEach(curr => {
            const oldRate = parseFloat(tempRates[curr]);
            if (!isNaN(oldRate)) {
                let newRate = oldRate / pivotRate;
                newTempRates[curr] = parseFloat(newRate.toFixed(6)).toString();
            } else {
                newTempRates[curr] = tempRates[curr];
            }
        });

        newTempRates[newMain] = '1';
        setCurrencySettings(newSettings);
        setTempRates(newTempRates);
    };

    const handleRateChange = (currency: string, rate: string) => {
        setTempRates(prev => ({ ...prev, [currency]: rate }));
    };

    const saveCurrencySettings = async () => {
        const newRates: { [key: string]: number } = {};
        let isValid = true;

        Object.entries(tempRates).forEach(([curr, rateStr]) => {
            const rate = parseFloat(rateStr);
            if (isNaN(rate) || rate <= 0) {
                isValid = false;
            }
            newRates[curr] = rate;
        });

        if (!isValid) {
            Alert.alert("錯誤", "請輸入有效的匯率數值（必須大於 0）。");
            return;
        }

        newRates[currencySettings.mainCurrency] = 1;

        const newSettings = {
            mainCurrency: currencySettings.mainCurrency,
            exchangeRates: newRates
        };

        await CurrencyStorage.saveCurrencySettings(newSettings);
        setCurrencySettings(newSettings);
        const updatedTempRates: { [key: string]: string } = {};
        Object.entries(newRates).forEach(([curr, rate]) => {
            updatedTempRates[curr] = rate.toString();
        });
        setTempRates(updatedTempRates);

        Alert.alert("成功", "匯率設定已儲存。");
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
                <Text style={styles.subtitle}>匯率設定</Text>
                <Text style={[styles.description, { color: colors.subtleText }]}>
                    請選擇主幣別，並設定其他幣別相對於主幣別的匯率。
                    {"\n"}(例如：主幣別為 TWD，USD 匯率設為 0.03)
                </Text>

                <View style={styles.card}>
                    <View style={styles.currencyHeader}>
                        <Text style={[styles.headerText, { color: colors.text, flex: 2 }]}>{i18n.t('currency.code')}</Text>
                        <Text style={[styles.headerText, { color: colors.text, flex: 1, textAlign: 'center' }]}>{i18n.t('currency.mainCurrency')}</Text>
                        <Text style={[styles.headerText, { color: colors.text, flex: 1.5, textAlign: 'right' }]}>{i18n.t('currency.rate')}</Text>
                    </View>

                    {allCurrencies.map((curr) => {
                        const isMain = currencySettings.mainCurrency === curr;
                        return (
                            <View key={curr} style={styles.currencyRow}>
                                <View style={{ flex: 2 }}>
                                    <Text style={[styles.currencyName, { color: colors.text }]}>{getCurrencyLabel(curr)}</Text>
                                </View>

                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleMainCurrencyChange(curr)}
                                >
                                    <Ionicons
                                        name={isMain ? "radio-button-on" : "radio-button-off"}
                                        size={24}
                                        color={isMain ? colors.tint : colors.subtleText}
                                    />
                                </TouchableOpacity>

                                <View style={{ flex: 1.5 }}>
                                    <TextInput
                                        style={[
                                            styles.rateInput,
                                            {
                                                color: isMain ? colors.subtleText : colors.text,
                                                backgroundColor: isMain ? colors.background : colors.inputBackground,
                                                borderColor: colors.borderColor
                                            }
                                        ]}
                                        value={tempRates[curr] || ''}
                                        onChangeText={(text) => handleRateChange(curr, text)}
                                        keyboardType="numeric"
                                        editable={!isMain}
                                    />
                                </View>
                            </View>
                        );
                    })}

                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, marginTop: 20 }]} onPress={saveCurrencySettings}>
                        <Text style={styles.buttonText}>{i18n.t('currency.saveButton')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </SwipeView>
    );
};
