import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        // Small timeout to ensure router is ready
        const timer = setTimeout(() => {
            if (Platform.OS === 'web') {
                // Web: Redirect to Sync Settings
                router.replace('/(tabs)/settings?mode=sync');
            } else {
                // Native: Redirect to Transaction (記帳)
                router.replace('/(tabs)/transaction');
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
            <Text style={{ color: '#6366f1', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>FinanceApp</Text>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ color: '#94a3b8', marginTop: 10 }}>正在啟動應用程式...</Text>
        </View>
    );
}
