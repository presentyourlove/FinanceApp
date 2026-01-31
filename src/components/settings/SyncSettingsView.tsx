import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/services/auth';
import { useSync } from '@/src/hooks/useSync';
import { useTheme } from '@/src/context/ThemeContext';
import { hasFirebaseConfig, auth } from '@/src/services/firebaseConfig';
import { restoreFromCloud } from '@/src/services/sync';
import i18n from '@/src/i18n';

interface SyncSettingsViewProps {
    onRefreshData?: () => void;
}

export default function SyncSettingsView({ onRefreshData }: SyncSettingsViewProps) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const { user, signIn, signUp, loading, signOut } = useAuth();
    const { isBackingUp, isRestoring, lastBackupTime, handleBackup, handleRestore } = useSync(user?.uid);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(i18n.t('common.error'), i18n.t('sync.enterEmailPassword'));
            return;
        }
        try {
            await signIn(email, password);

            // Auto Restore after login
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    await restoreFromCloud(currentUser.uid);
                    if (onRefreshData) onRefreshData();
                    Alert.alert(i18n.t('common.success'), i18n.t('sync.autoRestoreSuccess'));
                } catch (e: any) {
                    if (e.message !== "No backup found in cloud.") {
                        console.error("Auto restore failed:", e);
                        Alert.alert(i18n.t('common.warning'), i18n.t('sync.autoRestoreFail', { message: e.message }));
                    }
                }
            }
        } catch (error: any) {
            Alert.alert(i18n.t('common.error'), error.message);
        }
    };

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert(i18n.t('common.error'), i18n.t('sync.enterEmailPassword'));
            return;
        }
        try {
            await signUp(email, password);
        } catch (error: any) {
            Alert.alert(i18n.t('common.error'), error.message);
        }
    };

    const handleSignIn = handleLogin;
    const handleSignUp = handleRegister;

    return (
        <View style={styles.container}>
            <Text style={styles.subtitle}>{i18n.t('settings.sync')}</Text>
            <View style={styles.contentContainer}>
                {!hasFirebaseConfig ? (
                    <View style={styles.card}>
                        <Text style={styles.warningTitle}>⚠️ {i18n.t('sync.notEnabled')}</Text>
                        <Text style={styles.description}>
                            {i18n.t('sync.description1')}
                        </Text>
                        <Text style={styles.description}>
                            {i18n.t('sync.description2')}
                        </Text>
                        <Text style={[styles.description, { fontWeight: 'bold', marginTop: 10 }]}>
                            💡 {i18n.t('sync.tip')}
                        </Text>
                    </View>
                ) : !user ? (
                    <View style={styles.card}>
                        <Text style={styles.warningTitle}>⚠️ {i18n.t('sync.notEnabled')}</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 10 }]}
                            placeholder={i18n.t('sync.emailPlaceholder')}
                            placeholderTextColor={colors.subtleText}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={[styles.input, { marginBottom: 20 }]}
                            placeholder={i18n.t('sync.passwordPlaceholder')}
                            placeholderTextColor={colors.subtleText}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={[styles.button, styles.primaryButton, { flex: 1 }]} onPress={handleSignIn} disabled={loading}>
                                <Text style={styles.buttonText}>{loading ? '...' : i18n.t('common.confirm')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.secondaryButton, { flex: 1 }]} onPress={handleSignUp} disabled={loading}>
                                <Text style={[styles.buttonText, { color: colors.text }]}>{i18n.t('goal.addButton')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <Text style={[styles.userInfo, { marginBottom: 10 }]}>Email: {user?.email || 'N/A'}</Text>
                        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={signOut}>
                            <Text style={[styles.buttonText, { color: colors.text }]}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <Text style={styles.sectionTitle}>{i18n.t('sync.backupRestore')}</Text>
                        <View style={styles.syncButtons}>
                            <TouchableOpacity style={[styles.syncButton, { backgroundColor: colors.tint }]} onPress={handleBackup} disabled={isBackingUp}>
                                {isBackingUp ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload" size={24} color="#fff" />}
                                <Text style={styles.syncButtonText}>{isBackingUp ? '...' : i18n.t('common.save')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.syncButton, { backgroundColor: colors.accent }]} onPress={() => {
                                Alert.alert(
                                    i18n.t('sync.confirmRestoreTitle'),
                                    i18n.t('sync.confirmRestoreMessage'),
                                    [
                                        { text: i18n.t('common.cancel'), style: 'cancel' },
                                        {
                                            text: i18n.t('sync.confirmRestoreButton'), style: 'destructive', onPress: () => handleRestore(() => {
                                                if (onRefreshData) onRefreshData();
                                            })
                                        }
                                    ]
                                );
                            }} disabled={isRestoring}>
                                {isRestoring ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-download" size={24} color="#fff" />}
                                <Text style={styles.syncButtonText}>{isRestoring ? '...' : i18n.t('common.back')}</Text>
                            </TouchableOpacity>
                        </View>
                        {lastBackupTime && (
                            <Text style={styles.lastBackupText}>{i18n.t('common.save')}: {new Date(lastBackupTime).toLocaleString()}</Text>
                        )}
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
    warningTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF9500',
        marginBottom: 15
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
    },
    syncButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 15
    },
    syncButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8
    },
    syncButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14
    },
    primaryButton: {
        backgroundColor: colors.primary
    },
    secondaryButton: {
        backgroundColor: colors.secondary || '#8E8E93' // Fallback color
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderColor,
        marginVertical: 15
    }
});
