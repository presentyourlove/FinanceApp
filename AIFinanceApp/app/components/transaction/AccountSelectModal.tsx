import React from 'react';
import {
    Modal,
    View,
    Text,
    ScrollView,
    TouchableOpacity
} from 'react-native';

interface AccountSelectModalProps {
    visible: boolean;
    onClose: () => void;
    accounts: any[];
    onSelectAccount: (id: number) => void;
    colors: any;
    styles: any;
}

export default function AccountSelectModal({ visible, onClose, accounts, onSelectAccount, colors, styles }: AccountSelectModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.centeredView}>
                <View style={styles.accountSelectModalView}>
                    <Text style={styles.modalTitle}>選擇帳本</Text>
                    <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                        {accounts.map((acc: any) => (
                            <TouchableOpacity key={acc.id} style={styles.accountSelectItem} onPress={() => { onSelectAccount(acc.id); onClose(); }}>
                                <Text style={styles.accountSelectItemText}>{`${acc.name} (${acc.currency})`}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 10, flex: 0, paddingVertical: 8 }]} onPress={onClose}><Text style={[styles.buttonText, { color: colors.text }]}>關閉</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
