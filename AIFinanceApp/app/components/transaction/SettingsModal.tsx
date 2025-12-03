import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleAuth } from '@/app/services/auth';
import { useSync } from '@/app/hooks/useSync';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    categories: any;
    onAddCategory: (type: 'income' | 'expense', name: string) => void;
    onDeleteCategory: (type: 'income' | 'expense', name: string) => void;
    onMoveCategory: (type: 'income' | 'expense', index: number, direction: 'up' | 'down') => void;
    onDeleteAccount: (id: number) => void;
    onAddAccount: (name: string, balance: number, currency: string) => void;
    accounts: any[];
    onRefreshData: () => void;
    colors: any;
    styles: any;
}

export default function SettingsModal({ visible, onClose, categories, onAddCategory, onDeleteCategory, onMoveCategory, onDeleteAccount, onAddAccount, accounts, onRefreshData, colors, styles }: SettingsModalProps) {
    const [manageMode, setManageMode] = useState<'category' | 'account' | 'sync'>('category');
    const { user, signIn, signOut, loading } = useGoogleAuth();
    const { isBackingUp, isRestoring, lastBackupTime, handleBackup, handleRestore } = useSync(user?.uid);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { width: '90%', maxHeight: '80%' }]}>
                    <Text style={styles.modalTitle}>設定</Text>

                    <View style={{ flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderColor: colors.borderColor }}>
                        <TouchableOpacity onPress={() => setManageMode('category')} style={{ padding: 10, borderBottomWidth: manageMode === 'category' ? 2 : 0, borderColor: colors.tint }}>
                            <Text style={{ color: manageMode === 'category' ? colors.tint : colors.subtleText }}>分類</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setManageMode('account')} style={{ padding: 10, borderBottomWidth: manageMode === 'account' ? 2 : 0, borderColor: colors.tint }}>
                            <Text style={{ color: manageMode === 'account' ? colors.tint : colors.subtleText }}>帳本</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setManageMode('sync')} style={{ padding: 10, borderBottomWidth: manageMode === 'sync' ? 2 : 0, borderColor: colors.tint }}>
                            <Text style={{ color: manageMode === 'sync' ? colors.tint : colors.subtleText }}>同步</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ width: '100%' }}>
                        {manageMode === 'sync' ? (
                            <View style={{ padding: 10 }}>
                                <Text style={[styles.label, { fontSize: 18, marginBottom: 15 }]}>Google 帳號同步</Text>
                                {user ? (
                                    <View>
                                        <Text style={{ marginBottom: 15, fontSize: 16, color: colors.text }}>已登入: {user.email}</Text>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: '#FF3B30', marginBottom: 20 }]} onPress={signOut} disabled={loading}>
                                            <Text style={styles.buttonText}>{loading ? '處理中...' : '登出'}</Text>
                                        </TouchableOpacity>

                                        <Text style={[styles.label, { fontSize: 18, marginBottom: 15 }]}>資料備份與還原</Text>

                                        <TouchableOpacity
                                            style={[styles.button, { backgroundColor: '#007AFF', marginBottom: 5, opacity: isBackingUp ? 0.7 : 1 }]}
                                            onPress={handleBackup}
                                            disabled={isBackingUp || isRestoring}
                                        >
                                            <Text style={styles.buttonText}>{isBackingUp ? '備份中...' : '立即備份至雲端'}</Text>
                                        </TouchableOpacity>

                                        <Text style={{ color: colors.subtleText, marginBottom: 20, fontSize: 12, textAlign: 'center' }}>
                                            {lastBackupTime ? `上次備份: ${new Date(lastBackupTime).toLocaleString()}` : '尚未備份'}
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.button, { backgroundColor: '#34C759', opacity: isRestoring ? 0.7 : 1 }]}
                                            onPress={() => {
                                                Alert.alert(
                                                    '確認還原',
                                                    '這將會覆蓋您目前手機上的所有資料，確定要還原嗎？',
                                                    [
                                                        { text: '取消', style: 'cancel' },
                                                        {
                                                            text: '確定還原', style: 'destructive', onPress: () => handleRestore(() => {
                                                                if (onRefreshData) onRefreshData();
                                                            })
                                                        }
                                                    ]
                                                );
                                            }}
                                            disabled={isBackingUp || isRestoring}
                                        >
                                            <Text style={styles.buttonText}>{isRestoring ? '還原中...' : '從雲端還原'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={{ marginBottom: 20, color: colors.subtleText, lineHeight: 20 }}>
                                            登入 Google 帳號以啟用雲端同步功能，防止資料遺失，並在多個裝置間同步您的記帳資料。
                                        </Text>
                                        <TouchableOpacity style={[styles.button, { backgroundColor: '#4285F4' }]} onPress={signIn} disabled={loading}>
                                            <Text style={styles.buttonText}>{loading ? '登入中...' : '使用 Google 登入'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Text style={{ color: colors.subtleText }}>{manageMode === 'category' ? '分類管理功能在此' : '帳本管理功能在此'}</Text>
                                <Text style={{ color: colors.subtleText, fontSize: 12, marginTop: 5 }}>(原有功能保留，此處僅示意)</Text>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 15, flex: 0, paddingVertical: 12 }]} onPress={onClose}>
                        <Text style={[styles.buttonText, { color: colors.text }]}>關閉</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
