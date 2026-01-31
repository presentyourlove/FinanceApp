
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeView from '@/src/components/common/SwipeView';
import { ThemeType } from '@/src/services/storage/themeStorage';
import i18n from '@/src/i18n';

interface ThemeSettingsProps {
    onBack: () => void;
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    colors: any;
    styles: any;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onBack, theme, setTheme, colors, styles }) => {
    return (
        <SwipeView onBack={onBack}>
            <ScrollView style={{ flex: 1 }}>
                <Text style={styles.subtitle}>{i18n.t('theme.title')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={[styles.themeOption, { borderBottomColor: colors.borderColor }]} onPress={() => setTheme('Default')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>{i18n.t('theme.light')}</Text>
                        {theme === 'Default' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.themeOption} onPress={() => setTheme('Dark')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>{i18n.t('theme.dark')}</Text>
                        {theme === 'Dark' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SwipeView>
    );
};
