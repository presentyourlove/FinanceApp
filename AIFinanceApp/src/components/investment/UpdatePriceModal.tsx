import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput, Keyboard, Alert } from 'react-native';
import { dbOperations } from '@/src/services/database';

interface UpdatePriceModalProps {
    visible: boolean;
    onClose: () => void;
    stockName: string;
    onSuccess: () => void;
    colors: any;
}

export default function UpdatePriceModal({ visible, onClose, stockName, onSuccess, colors }: UpdatePriceModalProps) {
    const styles = getStyles(colors);
    const [newPrice, setNewPrice] = useState('');

    const handleUpdatePrice = async () => {
        if (!newPrice) return Alert.alert('錯誤', '請輸入新價格');
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) return Alert.alert('錯誤', '請輸入有效價格');

        try {
            await dbOperations.updateStockPrice(stockName, price);
            Alert.alert('成功', '股價已更新');
            setNewPrice('');
            onClose();
            onSuccess();
        } catch (e) {
            console.error(e);
            Alert.alert('錯誤', '更新失敗');
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.centeredView}>
                    <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                        <Text style={styles.modalTitle}>更新 {stockName} 現價</Text>
                        <TextInput
                            style={[styles.input, { width: '100%', marginTop: 20 }]}
                            value={newPrice}
                            onChangeText={setNewPrice}
                            keyboardType="numeric"
                            placeholder="輸入最新價格"
                            placeholderTextColor={colors.subtleText}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setNewPrice('');
                                    onClose();
                                }}
                            >
                                <Text style={styles.buttonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.confirmButton]}
                                onPress={handleUpdatePrice}
                            >
                                <Text style={styles.buttonText}>更新</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: {
        width: '85%',
        borderRadius: 20,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.borderColor
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 100,
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: "#8E8E93"
    },
    confirmButton: {
        backgroundColor: "#007AFF"
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    },
});
