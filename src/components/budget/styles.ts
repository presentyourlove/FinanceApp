import { StyleSheet } from 'react-native';
import { commonStyles } from '@/src/styles/common';

export const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    listContent: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: colors.card, ...commonStyles.card, ...commonStyles.shadow },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    cardAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
    cardDetails: { fontSize: 14, color: colors.subtleText, marginBottom: 4 },
    progressBarContainer: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 5, marginTop: 5 },
    progressBar: { height: '100%' },
    progressText: { fontSize: 12 },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.subtleText },
    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    formContainer: { padding: 20 },
    label: { fontSize: 14, fontWeight: '500', color: colors.subtleText, marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
    dropdownButton: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    disabledButton: { opacity: 0.6 },
    dropdownText: { fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    button: { ...commonStyles.button },
    cancelButton: { backgroundColor: '#FF3B30' },
    buttonText: { ...commonStyles.buttonText },
    selectionItem: {
        width: '100%',
        padding: 15,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    selectionText: { fontSize: 16 }
});
