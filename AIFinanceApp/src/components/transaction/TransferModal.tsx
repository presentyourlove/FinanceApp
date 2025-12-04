import React, { useState } from 'react';
import {
    Modal,
    TouchableWithoutFeedback,
    Keyboard,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TransferModalProps {
    visible: boolean;
    onClose: () => void;
    onTransfer: (amount: number, sourceId: number, targetId: number) => void;
    accounts: any[];
    colors: any;
    styles: any;
}

export default function TransferModal({ visible, onClose, onTransfer, accounts, colors, styles }: TransferModalProps) {
    const [amount, setAmount] = useState('');
    const [sourceId, setSourceId] = useState<number | undefined>(undefined);
    const [targetId, setTargetId] = useState<number | undefined>(undefined);
    const [selectionMode, setSelectionMode] = useState<'none' | 'source' | 'target'>('none');

    const handleSubmit = () => {
        if (!amount || !sourceId || !targetId) return Alert.alert('錯誤', '請填寫完整資訊');
        onTransfer(parseFloat(amount), sourceId, targetId);
        setAmount('');
        setSourceId(undefined);
        setTargetId(undefined);
        onClose();
    };

    const renderSelectionList = () => (
        <View style={{ width: '100%', maxHeight: 300 }}>
            <Text style={styles.modalTitle}>請選擇{selectionMode === 'source' ? '轉出' : '轉入'}帳本</Text>
            <ScrollView style={{ width: '100%' }}>
                {accounts.map((acc: any) => (
                    <TouchableOpacity key={acc.id} style={styles.modalListItem} onPress={() => { (selectionMode === 'source' ? setSourceId : setTargetId)(acc.id); setSelectionMode('none'); }}>
                        <Text style={styles.inputText}>{`${acc.name} (${acc.currency})`}</Text>
                        {(selectionMode === 'source' ? sourceId === acc.id : targetId === acc.id) && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10, backgroundColor: '#FF3B30' }]} onPress={() => setSelectionMode('none')}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
        </View>
    );

    const renderForm = () => (
        <>
            <Text style={styles.modalTitle}>轉帳</Text>
            <TextInput style={[styles.input, { width: '100%', marginBottom: 15 }]} placeholder="金額" placeholderTextColor={colors.subtleText} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <View style={{ width: '100%', marginBottom: 10 }}>
                <Text style={styles.inputLabel}>從:</Text>
                <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectionMode('source')}>
                    <Text style={{ color: sourceId ? colors.text : colors.subtleText }}>{accounts.find((acc: any) => acc.id === sourceId)?.name || '請選擇轉出帳本'}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
                </TouchableOpacity>
            </View>
            <View style={{ width: '100%', marginBottom: 20 }}>
                <Text style={styles.inputLabel}>到:</Text>
                <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setSelectionMode('target')}>
                    <Text style={{ color: targetId ? colors.text : colors.subtleText }}>{accounts.find((acc: any) => acc.id === targetId)?.name || '請選擇轉入帳本'}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.subtleText} />
                </TouchableOpacity>
            </View>
            <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={[styles.button, styles.modalCloseButton]} onPress={onClose}><Text style={[styles.buttonText, { color: colors.text }]}>取消</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.modalConfirmButton]} onPress={handleSubmit}><Text style={styles.buttonText}>確認</Text></TouchableOpacity>
            </View>
        </>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true}><TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.centeredView}><View style={styles.modalView}>{selectionMode === 'none' ? renderForm() : renderSelectionList()}</View></View></TouchableWithoutFeedback></Modal>
    );
}
