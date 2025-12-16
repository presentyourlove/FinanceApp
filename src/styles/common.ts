import { ViewStyle } from 'react-native';

export const commonStyles = {
    shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    } as ViewStyle,
    shadowMedium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84, // iOS standard for medium
        elevation: 5,
    } as ViewStyle,
    card: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
    } as ViewStyle,
    modalView: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    } as ViewStyle,
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    } as any, // TextStyle
};
