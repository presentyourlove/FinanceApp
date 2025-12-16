import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction, TransactionType, Account } from '@/src/types';

interface TransactionListItemProps {
    item: Transaction;
    accounts: Account[];
    selectedAccountId: number | undefined;
    colors: any;
    styles: any;
    onPress: (item: Transaction) => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = React.memo(({
    item,
    accounts,
    selectedAccountId,
    colors,
    styles,
    onPress
}) => {
    const isTransfer = item.type === TransactionType.TRANSFER;
    const sourceAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';
    const targetAccountName = accounts.find(acc => acc.id === item.targetAccountId)?.name || '未知帳本';

    let amountSign: string, amountColor: string, descriptionText: string;
    if (isTransfer) {
        if (item.accountId === selectedAccountId) {
            amountSign = '-';
            descriptionText = `轉出至 ${targetAccountName}`;
        } else {
            amountSign = '+';
            descriptionText = `轉入自 ${sourceAccountName}`;
        }
        amountColor = colors.transfer;
    } else {
        amountSign = item.type === TransactionType.INCOME ? '+' : '-';
        amountColor = item.type === TransactionType.INCOME ? colors.income : colors.expense;
        descriptionText = item.description;
    }

    const displayAccountName = accounts.find(acc => acc.id === item.accountId)?.name || '未知帳本';
    const accountCurrency = accounts.find(acc => acc.id === item.accountId)?.currency || 'TWD';

    return (
        <TouchableOpacity style={styles.listItem} onPress={() => onPress(item)}>
            <View style={styles.listItemTextContainer}>
                <Text style={styles.listItemType} numberOfLines={1}>{descriptionText}</Text>
                <Text style={styles.listItemDate}>{displayAccountName} · {new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.listItemAmount, { color: amountColor }]}>{`${amountSign} ${accountCurrency} ${item.amount.toFixed(2)}`}</Text>
        </TouchableOpacity>
    );
});

TransactionListItem.displayName = 'TransactionListItem';
