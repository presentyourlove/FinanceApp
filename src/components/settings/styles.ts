import { StyleSheet } from 'react-native';

export const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: 10
    },
    backButton: {
        padding: 5,
        marginRight: 5
    },
    listContainer: {
        marginTop: 20,
        paddingHorizontal: 20
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    listItemIcon: {
        marginRight: 15
    },
    listItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text
    },
    subtitle: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, marginTop: 20, marginBottom: 10, color: colors.text },
    description: { fontSize: 14, paddingHorizontal: 20, marginBottom: 15 },
    card: { marginHorizontal: 20, padding: 15, borderRadius: 12, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    input: { padding: 12, borderRadius: 8, backgroundColor: colors.inputBackground, color: colors.text },
    inputText: { fontSize: 16, color: colors.text },
    button: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    bigButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    settingListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    settingItemText: { fontSize: 16, color: colors.text },
    themeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'transparent' },
    themeText: { fontSize: 16 },
    dropdown: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, maxHeight: 200, zIndex: 1000, elevation: 5 },
    dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    currencyHeader: { flexDirection: 'row', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerText: { fontWeight: 'bold', fontSize: 14 },
    currencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    currencyName: { fontSize: 16 },
    rateInput: { padding: 8, borderRadius: 8, borderWidth: 1, textAlign: 'right' },
    label: { fontSize: 16, color: colors.text, marginBottom: 5 }
});
