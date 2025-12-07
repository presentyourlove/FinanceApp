import { useRouter, useLocalSearchParams } from 'expo-router';
import { Platform, View, Text } from 'react-native';
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Loading...</Text>
        </View>
    );
}
