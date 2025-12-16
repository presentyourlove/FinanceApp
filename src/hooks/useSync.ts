import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportData, backupToCloud, restoreFromCloud } from '../services/sync';
import i18n from '@/src/i18n';

const LAST_BACKUP_KEY = 'last_backup_timestamp';

export const useSync = (userId: string | undefined) => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);

    // Load last backup time from local storage on mount
    useEffect(() => {
        const loadLastBackupTime = async () => {
            try {
                const storedTime = await AsyncStorage.getItem(LAST_BACKUP_KEY);
                if (storedTime) {
                    setLastBackupTime(parseInt(storedTime, 10));
                }
            } catch (error) {
                console.error('Failed to load last backup time:', error);
            }
        };
        loadLastBackupTime();
    }, []);

    const handleBackup = useCallback(async () => {
        if (!userId) {
            Alert.alert(i18n.t('common.error'), i18n.t('common.pleaseLogin'));
            return;
        }

        setIsBackingUp(true);
        try {
            // 1. Export data
            const data = await exportData();

            // 2. Upload to cloud
            await backupToCloud(userId, data);

            // 3. Update local state
            const now = Date.now();
            setLastBackupTime(now);
            await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toString());

            Alert.alert(i18n.t('common.success'), i18n.t('backup.uploadSuccess'));
        } catch (error) {
            console.error('Backup failed:', error);
            Alert.alert(i18n.t('backup.uploadFail'), error instanceof Error ? error.message : i18n.t('common.unknownError'));
        } finally {
            setIsBackingUp(false);
        }
    }, [userId]);

    const handleRestore = useCallback(async (onSuccess?: () => void) => {
        if (!userId) {
            Alert.alert(i18n.t('common.error'), i18n.t('common.pleaseLogin'));
            return;
        }

        setIsRestoring(true);
        try {
            await restoreFromCloud(userId);
            Alert.alert(i18n.t('common.success'), i18n.t('backup.restoreSuccess'));
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Restore failed:', error);
            Alert.alert(i18n.t('backup.restoreFail'), i18n.t('backup.restoreFailMsg'));
        } finally {
            setIsRestoring(false);
        }
    }, [userId]);

    return {
        isBackingUp,
        isRestoring,
        lastBackupTime,
        handleBackup,
        handleRestore,
    };
};
