import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportData, backupToCloud, restoreFromCloud } from '../services/sync';

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
            Alert.alert('錯誤', '請先登入帳號');
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

            Alert.alert('成功', '備份已上傳至雲端');
        } catch (error) {
            console.error('Backup failed:', error);
            Alert.alert('備份失敗', error instanceof Error ? error.message : '未知錯誤');
        } finally {
            setIsBackingUp(false);
        }
    }, [userId]);

    const handleRestore = useCallback(async (onSuccess?: () => void) => {
        if (!userId) {
            Alert.alert('錯誤', '請先登入帳號');
            return;
        }

        setIsRestoring(true);
        try {
            await restoreFromCloud(userId);
            Alert.alert('成功', '資料已從雲端還原');
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Restore failed:', error);
            Alert.alert('還原失敗', '找不到備份或網路錯誤');
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
