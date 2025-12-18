import { Alert } from 'react-native';
import i18n from '@/src/i18n';

/**
 * Unified Error Handler
 * Centralizes error logging and user notification strategies.
 */
export class ErrorHandler {
    /**
     * Handle an error by logging it and optionally alerting the user.
     * @param error The error object (unknown type to be safe)
     * @param context A string description of where the error occurred (e.g., 'Function Name')
     * @param showUserAlert Whether to show a UI alert to the user. Default is false (log only).
     */
    static handleError(error: unknown, context: string, showUserAlert: boolean = false): void {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 1. Unified Logging (Can be extended to external monitoring services like Sentry)
        console.error(`[${context}] Error:`, errorMessage);

        // 2. Optional User Notification
        if (showUserAlert) {
            Alert.alert(
                i18n.t('common.error'),
                i18n.t('common.unknownError') + `: ${errorMessage}` // Or a friendlier message
            );
        }
    }
}
