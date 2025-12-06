import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/src/services/auth';
import { dbOperations } from '@/src/services/database';
import { backupToCloud, exportData } from '@/src/services/sync';

const DEBOUNCE_DELAY = 3000; // 3 seconds

/**
 * Headless component that manages automatic cloud synchronization.
 * It listens for database changes and triggers a backup if the user is logged in.
 */
export const SyncManager: React.FC = () => {
    const { user } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isBackupInProgress = useRef(false);

    useEffect(() => {
        const handleDataChange = () => {
            // Only auto-backup if user is logged in
            if (!user) {
                return;
            }

            // Debounce
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            console.log('💾 Data changed. Scheduling auto-backup in 3s...');

            timeoutRef.current = setTimeout(async () => {
                if (isBackupInProgress.current) {
                    console.log('⚠️ Backup already in progress, skipping...');
                    return;
                }

                try {
                    isBackupInProgress.current = true;
                    console.log('☁️ Starting auto-backup...');

                    const data = await exportData();
                    if (user.uid) {
                        await backupToCloud(user.uid, data);
                        console.log('✅ Auto-backup completed successfully.');
                    }
                } catch (error) {
                    console.error('❌ Auto-backup failed:', error);
                } finally {
                    isBackupInProgress.current = false;
                }
            }, DEBOUNCE_DELAY);
        };

        // Register listener
        dbOperations.addDataChangeListener(handleDataChange);

        // Cleanup
        return () => {
            dbOperations.removeDataChangeListener(handleDataChange);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user]); // Re-subscribe when user state changes

    return null; // This component does not render anything
};
