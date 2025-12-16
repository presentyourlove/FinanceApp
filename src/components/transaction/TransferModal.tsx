import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations } from '@/src/services/database';
import i18n from '@/src/i18n';

interface TransferModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accounts: any[];
}

export default function TransferModal({ visible, onClose, onSuccess, accounts }: TransferModalProps) {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [sourceId, setSourceId] = useState<number | null>(null);
    const [targetId, setTargetId] = useState<number | null>(null);
    const [selectionMode, setSelectionMode] = useState<'source' | 'target' | 'none'>('none');

    const styles = StyleSheet.create({
        // ... (styles same as original)
        centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
        modalView: { width: '85%', backgroundColor: colors.card, borderRadius: 20, padding: 25, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
        button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100 },
        buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
        modalTitle: { marginBottom: 20, textAlign: "center", fontSize: 20, fontWeight: 'bold', color: colors.text },
        input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
        inputLabel: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
        accountButton: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 15, marginBottom: 15, width: '100%', borderWidth: 1, borderColor: colors.borderColor },
        modalCloseButton: { backgroundColor: colors.expense, marginRight: 10 },
        modalConfirmButton: { backgroundColor: colors.tint, marginLeft: 10 },
        cancelButton: { backgroundColor: colors.expense },
    });

    const handleSubmit = async () => {
        if (!amount || !sourceId || !targetId) return Alert.alert(i18n.t('common.error'), i18n.t('common.error'));

        await dbOperations.performTransfer(sourceId, targetId, parseFloat(amount), new Date(), i18n.t('transaction.transfer'));
        setAmount('');
        setSourceId(null);
        setTargetId(null);
        onSuccess();
        onClose();
    };

    if (selectionMode !== 'none') {
        const remainingAccounts = accounts.filter(a =>
            selectionMode === 'source' ? a.id !== targetId : a.id !== sourceId
        );
        return (
            <Modal animationType="slide" transparent={true} visible={visible}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{i18n.t('goal.selectAccount')}</Text>
                        {remainingAccounts.map(acc => (
                            <TouchableOpacity key={acc.id} style={[styles.button, { backgroundColor: colors.tint, marginVertical: 5, width: '100%' }]} onPress={() => {
                                if (selectionMode === 'source') setSourceId(acc.id);
                                else setTargetId(acc.id);
                                setSelectionMode('none');
                            }}>
                                <Text style={styles.buttonText}>{acc.name} ({acc.currency})</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10 }]} onPress={() => setSelectionMode('none')}>
                            <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{i18n.t('transaction.transfer')}</Text>
                    <TextInput style={[styles.input, { width: '100%', marginBottom: 15 }]} placeholder={i18n.t('budget.amount')} placeholderTextColor={colors.subtleText} keyboardType="numeric" value={amount} onChangeText={setAmount} />

                    <Text style={styles.inputLabel}>{i18n.t('goal.fromAccount')}:</Text>
                    <TouchableOpacity style={styles.accountButton} onPress={() => setSelectionMode('source')}>
                        <Text style={{ color: sourceId ? colors.text : colors.subtleText }}>
                            {accounts.find((acc: any) => acc.id === sourceId)?.name || i18n.t('goal.selectAccount')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>{i18n.t('goal.toAccount')}:</Text>
                    <TouchableOpacity style={styles.accountButton} onPress={() => setSelectionMode('target')}>
                        <Text style={{ color: targetId ? colors.text : colors.subtleText }}>
                            {accounts.find((acc: any) => acc.id === targetId)?.name || i18n.t('goal.selectAccount')}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', marginTop: 20 }}>
                        <TouchableOpacity style={[styles.button, styles.modalCloseButton]} onPress={onClose}>
                            <Text style={[styles.buttonText, { color: colors.text }]}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.modalConfirmButton]} onPress={handleSubmit}>
                            <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
