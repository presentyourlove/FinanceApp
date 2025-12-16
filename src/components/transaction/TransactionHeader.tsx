import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '@/src/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TransactionHeaderProps {
    accounts: Account[];
    selectedAccountId: number | undefined;
    currentBalance: number;
    colors: any;
    styles: any;
    onSettingsPress: () => void;
    onAccountSelectPress: () => void;
}

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
    accounts,
    selectedAccountId,
    currentBalance,
    colors,
    styles,
    onSettingsPress,
    onAccountSelectPress
}) => {
    const insets = useSafeAreaInsets();
    const currentAccount = accounts.find(acc => acc.id === selectedAccountId);

    return (
        <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={{ width: '100%', alignItems: 'flex-end', paddingRight: 10 }}>
                <TouchableOpacity onPress={onSettingsPress}>
                    <Ionicons name="settings-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.pickerButton} onPress={onAccountSelectPress}>
                <Text style={styles.pickerDisplayText}>{currentAccount?.name || '選擇帳本'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>當前帳本餘額</Text>
            <Text style={[styles.balanceText, { color: currentBalance >= 0 ? colors.tint : colors.expense }]} numberOfLines={1} adjustsFontSizeToFit={true}>
                {`${currentAccount?.currency || 'TWD'} ${currentBalance.toFixed(2)}`}
            </Text>
        </View>
    );
};
