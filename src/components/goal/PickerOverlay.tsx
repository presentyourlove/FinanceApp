import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PickerOverlayProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (value: any) => void;
    items: any[];
    title: string;
    colors: any;
    styles: any;
    renderItemContent?: (item: any) => React.ReactNode;
}

export const PickerOverlay: React.FC<PickerOverlayProps> = ({
    visible,
    onClose,
    onSelect,
    items,
    title,
    colors,
    styles,
    renderItemContent
}) => {
    if (!visible) return null;
    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
            <Pressable style={styles.pickerModalOverlay} onPress={onClose}>
                <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
                    <View style={[styles.pickerModalHeader, { borderBottomColor: colors.borderColor }]}>
                        <Text style={[styles.pickerModalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.subtleText} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={items}
                        keyExtractor={(item) => (item.id !== undefined ? item.id?.toString() : item) || 'null'}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.pickerItem, { borderBottomColor: colors.borderColor }]}
                                onPress={() => onSelect(item.id !== undefined ? item.id : item)}
                            >
                                {renderItemContent ? renderItemContent(item) : (
                                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Pressable>
        </View>
    );
};
