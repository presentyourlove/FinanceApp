import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import i18n from '@/src/i18n';

interface TransactionFiltersProps {
    filterType: 'all' | 'day' | 'month' | 'year';
    onFilterChange: (type: 'all' | 'day' | 'month' | 'year') => void;
    styles: any;
}

export const TransactionFilters = ({ filterType, onFilterChange, styles }: TransactionFiltersProps) => {
    return (
        <View style={styles.filterContainer}>
            {(['all', 'year', 'month', 'day'] as const).map((type) => (
                <TouchableOpacity
                    key={type}
                    style={[styles.filterButton, filterType === type && styles.filterButtonSelected]}
                    onPress={() => onFilterChange(type)}
                >
                    <Text style={[styles.filterButtonText, filterType === type && styles.filterButtonTextSelected]}>
                        {i18n.t(`transaction.filters.${type}`)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};
