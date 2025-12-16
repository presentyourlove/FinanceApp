import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/src/i18n';

interface MainSettingsProps {
    onNavigate: (mode: 'category' | 'account' | 'currency' | 'theme' | 'sync') => void;
    colors: any;
    styles: any;
}

export const MainSettings: React.FC<MainSettingsProps> = ({ onNavigate, colors, styles }) => {
    return (
        <ScrollView style={{ flex: 1 }}>
            <View style={styles.listContainer}>
                <TouchableOpacity style={styles.listItem} onPress={() => onNavigate('theme')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="color-palette" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>{i18n.t('settings.theme')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => onNavigate('category')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="list" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>{i18n.t('settings.category')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => onNavigate('account')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="wallet" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>{i18n.t('settings.account')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => onNavigate('currency')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="cash" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>{i18n.t('settings.currency')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.listItem} onPress={() => onNavigate('sync')}>
                    <View style={styles.listItemLeft}>
                        <Ionicons name="cloud-upload" size={24} color={colors.accent} style={styles.listItemIcon} />
                        <Text style={styles.listItemText}>{i18n.t('settings.sync')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtleText} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};
