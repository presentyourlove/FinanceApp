import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import SyncSettingsView from '@/src/components/settings/SyncSettingsView';
import i18n from '@/src/i18n';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onRefreshData: () => void;
    colors: any;
    styles: any;
}

export default function SettingsModal({ visible, onClose, onRefreshData, colors, styles }: SettingsModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { width: '90%', maxHeight: '80%' }]}>
                    <Text style={styles.modalTitle}>{i18n.t('settings.syncTitle')}</Text>

                    <ScrollView style={{ width: '100%' }}>
                        <SyncSettingsView onRefreshData={onRefreshData} />
                    </ScrollView>

                    <TouchableOpacity style={[styles.button, styles.modalCloseButton, { width: '100%', marginTop: 15, flex: 0, paddingVertical: 12 }]} onPress={onClose}>
                        <Text style={[styles.buttonText, { color: colors.text }]}>{i18n.t('common.close')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
