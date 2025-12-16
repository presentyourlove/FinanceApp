import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeView from '@/src/components/common/SwipeView';
import { ThemeType } from '@/src/services/storage/themeStorage';

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
                <Text style={styles.subtitle}>主題設定</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={[styles.themeOption, { borderBottomColor: colors.borderColor }]} onPress={() => setTheme('Default')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>淺色模式</Text>
                        {theme === 'Default' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.themeOption} onPress={() => setTheme('Dark')}>
                        <Text style={[styles.themeText, { color: colors.text }]}>深色模式</Text>
                        {theme === 'Dark' && <Ionicons name="checkmark" size={24} color={colors.tint} />}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SwipeView>
    );
};
