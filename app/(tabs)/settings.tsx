import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTheme } from '@/src/context/ThemeContext';
import { getStyles } from '@/src/components/settings/styles';
import i18n from '@/src/i18n';

// Sub-components
import { MainSettings } from '@/src/components/settings/MainSettings';
import { AccountSettings } from '@/src/components/settings/AccountSettings';
import { CategorySettings } from '@/src/components/settings/CategorySettings';
import { CurrencySettings } from '@/src/components/settings/CurrencySettings';
import { ThemeSettings } from '@/src/components/settings/ThemeSettings';
import SyncSettingsView from '@/src/components/settings/SyncSettingsView';
import SwipeView from '@/src/components/common/SwipeView';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const { colors, theme, setTheme } = useTheme();
    const styles = getStyles(colors);

    const [manageMode, setManageMode] = useState<'main' | 'category' | 'account' | 'currency' | 'theme' | 'sync'>('main');

    useEffect(() => {
        if (params.mode === 'sync') {
            setManageMode('sync');
        }
    }, [params.mode]);

    const renderHeader = (title: string, showBack: boolean = false) => (
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            {showBack && (
                <TouchableOpacity onPress={() => setManageMode('main')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.accent} />
                </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{title}</Text>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                {renderHeader(
                    manageMode === 'main' ? i18n.t('settings.title') :
                        manageMode === 'category' ? i18n.t('settings.category') :
                            manageMode === 'account' ? i18n.t('settings.account') :
                                manageMode === 'currency' ? i18n.t('settings.currency') :
                                    manageMode === 'theme' ? i18n.t('settings.theme') : i18n.t('settings.sync'),
                    manageMode !== 'main'
                )}

                {manageMode === 'main' && <MainSettings onNavigate={setManageMode} colors={colors} styles={styles} />}
                {manageMode === 'category' && <CategorySettings onBack={() => setManageMode('main')} colors={colors} styles={styles} />}
                {manageMode === 'account' && <AccountSettings onBack={() => setManageMode('main')} colors={colors} styles={styles} />}
                {manageMode === 'currency' && <CurrencySettings onBack={() => setManageMode('main')} colors={colors} styles={styles} />}
                {manageMode === 'theme' && <ThemeSettings onBack={() => setManageMode('main')} theme={theme} setTheme={setTheme} colors={colors} styles={styles} />}
                {manageMode === 'sync' && (
                    <SwipeView onBack={() => setManageMode('main')}>
                        <ScrollView style={{ flex: 1 }}>
                            <SyncSettingsView onRefreshData={() => { /* No-op or reload specific data if needed */ }} />
                        </ScrollView>
                    </SwipeView>
                )}
            </View>
        </GestureHandlerRootView>
    );
}