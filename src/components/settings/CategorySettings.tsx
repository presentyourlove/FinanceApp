import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeView from '@/src/components/common/SwipeView'; // Ensure this exists
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as CategoryStorage from '@/src/services/storage/categoryStorage';
import { Category, TransactionType } from '@/src/types';
import i18n from '@/src/i18n';

interface CategorySettingsProps {
    onBack: () => void;
    colors: any;
    styles: any;
}

export const CategorySettings: React.FC<CategorySettingsProps> = ({ onBack, colors, styles }) => {
    // State is now a flat array of Category objects
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('');
    // Use activeTab for switching between Expense and Income views
    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const loaded = await CategoryStorage.loadCategories();
            // Convert old Categories format to Category[]
            const allCategories: Category[] = [];
            if (loaded[TransactionType.EXPENSE]) {
                loaded[TransactionType.EXPENSE].forEach((name: string) => {
                    allCategories.push({
                        id: Date.now() + Math.random(),
                        icon: '💰',
                        name,
                        type: TransactionType.EXPENSE,
                        isDefault: true
                    });
                });
            }
            if (loaded[TransactionType.INCOME]) {
                loaded[TransactionType.INCOME].forEach((name: string) => {
                    allCategories.push({
                        id: Date.now() + Math.random(),
                        icon: '💵',
                        name,
                        type: TransactionType.INCOME,
                        isDefault: true
                    });
                });
            }
            setCategories(allCategories);
        } catch (e) {
            console.error("Failed to load categories", e);
            setCategories([]);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryIcon || !newCategoryName) {
            Alert.alert(i18n.t('common.error'), i18n.t('category.missingInfo'));
            return;
        }

        const newCat: Category = {
            id: Date.now(),
            icon: newCategoryIcon,
            name: newCategoryName,
            type: activeTab,
            isDefault: false
        };

        const updated = [...categories, newCat];
        setCategories(updated);

        // Convert to old format for storage
        const toSave: CategoryStorage.Categories = {
            [TransactionType.EXPENSE]: updated.filter(c => c.type === TransactionType.EXPENSE).map(c => c.name),
            [TransactionType.INCOME]: updated.filter(c => c.type === TransactionType.INCOME).map(c => c.name)
        };
        await CategoryStorage.saveCategories(toSave);

        setNewCategoryName('');
        setNewCategoryIcon('');
        Alert.alert(i18n.t('common.success'), i18n.t('category.addSuccess', {
            category: newCategoryName,
            type: activeTab === TransactionType.EXPENSE ? i18n.t('category.expense') : i18n.t('category.income')
        }));
    };

    const handleDeleteCategory = async (id: number) => {
        Alert.alert(
            i18n.t('common.warning'),
            i18n.t('category.deleteConfirm'),
            [
                { text: i18n.t('common.cancel'), style: 'cancel' },
                {
                    text: i18n.t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const updated = categories.filter(c => c.id !== id);
                        setCategories(updated);

                        // Convert to old format
                        const toSave: CategoryStorage.Categories = {
                            [TransactionType.EXPENSE]: updated.filter(c => c.type === TransactionType.EXPENSE).map(c => c.name),
                            [TransactionType.INCOME]: updated.filter(c => c.type === TransactionType.INCOME).map(c => c.name)
                        };
                        await CategoryStorage.saveCategories(toSave);
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => (
        <ScaleDecorator>
            <TouchableOpacity
                onLongPress={drag}
                disabled={isActive || item.isDefault}
                style={[
                    styles.settingListItem,
                    {
                        backgroundColor: isActive ? colors.inputBackground : colors.card,
                        opacity: isActive ? 0.7 : 1
                    }
                ]}
            >
                <Text style={styles.settingItemText}>{item.icon} {item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="menu" size={24} color={colors.subtleText} style={{ marginRight: 15 }} />
                    {!item.isDefault && (
                        <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="trash" size={20} color={colors.expense} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </ScaleDecorator>
    );

    return (
        <SwipeView onBack={onBack}>
            <View style={{ flex: 1 }}>
                <DraggableFlatList
                    data={categories.filter(c => c.type === activeTab)}
                    onDragEnd={({ data }) => {
                        // Merge reordered subset back into main array
                        const otherCategories = categories.filter(c => c.type !== activeTab);
                        const updatedCategories = [...otherCategories, ...data];
                        setCategories(updatedCategories);

                        // Convert to old format
                        const toSave: CategoryStorage.Categories = {
                            [TransactionType.EXPENSE]: updatedCategories.filter(c => c.type === TransactionType.EXPENSE).map(c => c.name),
                            [TransactionType.INCOME]: updatedCategories.filter(c => c.type === TransactionType.INCOME).map(c => c.name)
                        };
                        CategoryStorage.saveCategories(toSave);
                    }}
                    keyExtractor={(item) => item.id.toString()}
                    ListHeaderComponent={
                        <>
                            <View style={{ paddingHorizontal: 15, marginTop: 20 }}>
                                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                                    <TouchableOpacity
                                        onPress={() => setActiveTab(TransactionType.EXPENSE)}
                                        style={[
                                            styles.bigButton,
                                            {
                                                backgroundColor: activeTab === TransactionType.EXPENSE ? colors.expense : colors.card,
                                                marginRight: 10,
                                                flex: 1,
                                                borderWidth: activeTab !== TransactionType.EXPENSE ? 1 : 0,
                                                borderColor: colors.borderColor
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.buttonText, { color: activeTab === TransactionType.EXPENSE ? '#fff' : colors.text }]}>
                                            {i18n.t('category.expense')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setActiveTab(TransactionType.INCOME)}
                                        style={[
                                            styles.bigButton,
                                            {
                                                backgroundColor: activeTab === TransactionType.INCOME ? colors.income : colors.card,
                                                flex: 1,
                                                borderWidth: activeTab !== TransactionType.INCOME ? 1 : 0,
                                                borderColor: colors.borderColor
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.buttonText, { color: activeTab === TransactionType.INCOME ? '#fff' : colors.text }]}>
                                            {i18n.t('category.income')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.subtitle}>{i18n.t('category.addNewTitle', { type: activeTab === TransactionType.INCOME ? i18n.t('category.income') : i18n.t('category.expense') })}</Text>
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.input, { width: 60, marginRight: 10, textAlign: 'center' }]}
                                        placeholder="🏷️"
                                        placeholderTextColor={colors.subtleText}
                                        value={newCategoryIcon}
                                        onChangeText={setNewCategoryIcon}
                                        maxLength={2}
                                    />
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginRight: 10 }]}
                                        placeholder={i18n.t('category.newPlaceholder')}
                                        placeholderTextColor={colors.subtleText}
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                    />
                                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, paddingHorizontal: 20 }]} onPress={handleAddCategory}>
                                        <Text style={styles.buttonText}>{i18n.t('category.add')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.subtitle}>
                                {i18n.t('category.existingTitle', { type: activeTab === TransactionType.INCOME ? i18n.t('category.income') : i18n.t('category.expense') })}
                                <Text style={{ fontSize: 14, fontWeight: 'normal', color: colors.subtleText }}> ({i18n.t('category.dragToReorder')})</Text>
                            </Text>
                        </>
                    }
                    containerStyle={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    renderItem={renderItem}
                />
            </View>
        </SwipeView>
    );
};
