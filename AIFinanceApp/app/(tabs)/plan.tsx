import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import InvestView from '@/src/components/InvestView';
import GoalView from '@/src/components/GoalView';

const { width } = Dimensions.get('window');

export default function PlanScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const [activeTab, setActiveTab] = useState(0); // 0: Invest, 1: Goal
    const scrollViewRef = useRef<ScrollView>(null);

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
        if (index !== activeTab) {
            setActiveTab(index);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>財務規劃</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 0 && styles.activeTabButton]}
                    onPress={() => handleTabPress(0)}
                >
                    <Text style={[styles.tabText, { color: activeTab === 0 ? colors.tint : colors.subtleText }]}>投資</Text>
                    {activeTab === 0 && <View style={[styles.activeIndicator, { backgroundColor: colors.tint }]} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 1 && styles.activeTabButton]}
                    onPress={() => handleTabPress(1)}
                >
                    <Text style={[styles.tabText, { color: activeTab === 1 ? colors.tint : colors.subtleText }]}>目標</Text>
                    {activeTab === 1 && <View style={[styles.activeIndicator, { backgroundColor: colors.tint }]} />}
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                <View style={{ width, flex: 1 }}>
                    <InvestView style={{ flex: 1 }} />
                </View>
                <View style={{ width, flex: 1 }}>
                    <GoalView style={{ flex: 1 }} />
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    activeTabButton: {},
    tabText: {
        fontSize: 16,
        fontWeight: '600'
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '100%',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3
    },
    scrollView: {
        flex: 1
    }
});
