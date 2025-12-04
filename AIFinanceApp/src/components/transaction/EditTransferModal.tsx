import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface EditTransferModalProps {
    visible: boolean;
    onClose: () => void;
    onUpdate: () => void;
    accounts: any[];
    amount: string;
    setAmount: (amount: string) => void;
    fromAccount: number | undefined;
    setFromAccount: (id: number | undefined) => void;
    toAccount: number | undefined;
    setToAccount: (id: number | undefined) => void;
    date: Date;
    onDateChange: (event: any, date?: Date) => void;
    description: string;
    setDescription: (desc: string) => void;
    showDatePicker: boolean;
    setShowDatePicker: (show: boolean) => void;
    colors: any;
    styles: any;
}

export default function EditTransferModal({ visible, onClose, onUpdate, accounts, amount, setAmount, fromAccount, setFromAccount, toAccount, setToAccount, date, onDateChange, description, setDescription, showDatePicker, setShowDatePicker, colors, styles }: EditTransferModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>編輯轉帳記錄</Text>
                    <Text style={styles.label}>金額</Text>
                    <TextInput style={styles.input} placeholder="輸入金額" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholderTextColor={colors.subtleText} />
                    <Text style={styles.label}>從 (轉出)</Text>
                    <View style={styles.pickerContainer}><Picker selectedValue={fromAccount} onValueChange={setFromAccount} style={{ color: colors.text }} dropdownIconColor={colors.text}><Picker.Item label="選擇帳戶" value={undefined} />{accounts.map((acc: any) => (<Picker.Item key={acc.id} label={acc.name} value={acc.id} />))}</Picker></View>
                    <Text style={styles.label}>到 (轉入)</Text>
                    <View style={styles.pickerContainer}><Picker selectedValue={toAccount} onValueChange={setToAccount} style={{ color: colors.text }} dropdownIconColor={colors.text}><Picker.Item label="選擇帳戶" value={undefined} />{accounts.map((acc: any) => (<Picker.Item key={acc.id} label={acc.name} value={acc.id} />))}</Picker></View>
                    <Text style={styles.label}>日期</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}><Text style={{ color: colors.text }}>{date.toLocaleDateString('zh-TW')}</Text></TouchableOpacity>
                    {showDatePicker && (<DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />)}
                    <Text style={styles.label}>備註</Text>
                    <TextInput style={styles.input} placeholder="輸入備註（選填）" value={description} onChangeText={setDescription} placeholderTextColor={colors.subtleText} />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={onUpdate}><Text style={styles.buttonText}>確認</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
