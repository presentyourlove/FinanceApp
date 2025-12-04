import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useAuth } from '@/app/services/auth';
import { useSync } from '@/app/hooks/useSync';
import { useTheme } from '@/app/context/ThemeContext';

interface SyncSettingsViewProps {
    onRefreshData?: () => void;
}

export default function SyncSettingsView({ onRefreshData }: SyncSettingsViewProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const { user, signIn, signUp, signOut, loading } = useAuth();
    const { isBackingUp, isRestoring, lastBackupTime, handleBackup, handleRestore } = useSync(user?.uid);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('錯誤', '請輸入 Email 和密碼');
            return;
        }
        try {
            await signIn(email, password);
        } catch (error: any) {
            Alert.alert('登入失敗', error.message);
        }
    };

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('錯誤', '請輸入 Email 和密碼');
            return;
        }
        try {
            await signUp(email, password);
        } catch (error: any) {
            Alert.alert('註冊失敗', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.subtitle}>雲端同步</Text>
            <View style={styles.contentContainer}>
                {user ? (
                    <View style={styles.card}>
                        <Text style={styles.userInfo}>已登入: {user.email}</Text>
                        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={signOut} disabled={loading}>
                            <Text style={styles.buttonText}>{loading ? '處理中...' : '登出'}</Text>
                        </TouchableOpacity>

                        <Text style={styles.sectionTitle}>資料備份與還原</Text>

                        <TouchableOpacity
                            style={[styles.button, styles.backupButton, { opacity: isBackingUp ? 0.7 : 1 }]}
                            onPress={handleBackup}
                            disabled={isBackingUp || isRestoring}
                        >
                            <Text style={styles.buttonText}>{isBackingUp ? '備份中...' : '立即備份至雲端'}</Text>
                        </TouchableOpacity>

                        <Text style={styles.lastBackupText}>
                            {lastBackupTime ? `上次備份: ${new Date(lastBackupTime).toLocaleString()}` : '尚未備份'}
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, styles.restoreButton, { opacity: isRestoring ? 0.7 : 1 }]}
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
                    <View style={styles.card}>
                        <Text style={styles.description}>
                            登入帳號以啟用雲端同步功能，防止資料遺失。
                        </Text>

                        <TextInput
                            style={[styles.input, { marginBottom: 10 }]}
                            placeholder="Email"
                            placeholderTextColor={colors.subtleText}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={[styles.input, { marginBottom: 20 }]}
                            placeholder="密碼"
                            placeholderTextColor={colors.subtleText}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, flex: 1 }]} onPress={handleLogin} disabled={loading}>
                                <Text style={styles.buttonText}>{loading ? '處理中...' : '登入'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.subtleText, flex: 1 }]} onPress={handleRegister} disabled={loading}>
                                <Text style={styles.buttonText}>{loading ? '處理中...' : '註冊'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        width: '100%',
    },
    subtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        color: colors.text
    },
    contentContainer: {
        paddingHorizontal: 20
    },
    card: {
        padding: 15,
        borderRadius: 12,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    userInfo: {
        marginBottom: 15,
        fontSize: 16,
        color: colors.text
    },
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 15,
        color: colors.text,
        fontWeight: 'bold'
    },
    backupButton: {
        backgroundColor: '#007AFF',
        marginBottom: 5
    },
    lastBackupText: {
        color: colors.subtleText,
        marginBottom: 20,
        fontSize: 12,
        textAlign: 'center'
    },
    restoreButton: {
        backgroundColor: '#34C759'
    },
    description: {
        marginBottom: 20,
        color: colors.subtleText,
        lineHeight: 20
    },
    input: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.inputBackground,
        color: colors.text
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10
    }
});
