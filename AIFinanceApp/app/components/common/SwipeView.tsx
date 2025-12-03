import React, { useRef } from 'react';
import {
    View,
    PanResponder
} from 'react-native';

// SwipeView Component for "Swipe Right to Back"
const SwipeView = ({ children, onBack, style }: { children: React.ReactNode, onBack: () => void, style?: any }) => {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only activate if horizontal swipe is dominant and moving right
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx > 50) { // Threshold for swipe back
                    onBack();
                }
            },
        })
    ).current;

    return (
        <View style={[{ flex: 1 }, style]} {...panResponder.panHandlers}>
            {children}
        </View>
    );
};

export default SwipeView;
