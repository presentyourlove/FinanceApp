import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Transaction, TransactionType, Account } from '@/src/types';
import i18n from '@/src/i18n';
import { formatCurrency, formatDate } from '@/src/utils/formatters';

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
    const sourceAccountName = accounts.find(acc => acc.id === item.accountId)?.name || i18n.t('account.unknown');
    const targetAccountName = accounts.find(acc => acc.id === item.targetAccountId)?.name || i18n.t('account.unknown');

    let amountSign: string, amountColor: string, descriptionText: string;
    if (isTransfer) {
        if (item.accountId === selectedAccountId) {
            amountSign = '-';
            descriptionText = i18n.t('transaction.transferTo', { account: targetAccountName });
        } else {
            amountSign = '+';
            descriptionText = i18n.t('transaction.transferFrom', { account: sourceAccountName });
        }
        amountColor = colors.transfer;
    } else {
        amountSign = item.type === TransactionType.INCOME ? '+' : '-';
        amountColor = item.type === TransactionType.INCOME ? colors.income : colors.expense;
        descriptionText = item.description;
    }

    const displayAccountName = accounts.find(acc => acc.id === item.accountId)?.name || i18n.t('account.unknown');
    const accountCurrency = accounts.find(acc => acc.id === item.accountId)?.currency || 'TWD';

    return (
        <TouchableOpacity style={styles.listItem} onPress={() => onPress(item)}>
            <View style={styles.listItemTextContainer}>
                <Text style={styles.listItemType} numberOfLines={1}>{descriptionText}</Text>
                <Text style={styles.listItemDate}>{displayAccountName} · {formatDate(item.date)}</Text>
            </View>
            <Text style={[styles.listItemAmount, { color: amountColor }]}>{`${amountSign} ${formatCurrency(item.amount, accountCurrency)}`}</Text>
        </TouchableOpacity>
    );
});

TransactionListItem.displayName = 'TransactionListItem';
