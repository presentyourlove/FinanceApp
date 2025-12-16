import { StyleSheet } from 'react-native';
import { commonStyles } from '@/src/styles/common';

export const getStyles = (colors: any) => StyleSheet.create({
    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    formContainer: { padding: 20 },
    typeSelector: { flexDirection: 'row', marginBottom: 20, backgroundColor: colors.inputBackground, borderRadius: 10, padding: 4 },
    typeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    typeButtonText: { fontSize: 14, fontWeight: '600', color: colors.subtleText },
    label: { fontSize: 14, fontWeight: '500', color: colors.subtleText, marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.borderColor },
    dateButton: { backgroundColor: colors.inputBackground, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' },
    dateButtonText: { fontSize: 16, color: colors.text },
    pickerContainer: { backgroundColor: colors.inputBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' },
    syncContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    submitButton: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '85%', ...commonStyles.modalView, ...commonStyles.shadowMedium },
    button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
    confirmButton: { backgroundColor: "#007AFF" },
    buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },

    // InvestView specific styles
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    emptyText: { textAlign: 'center', marginTop: 50, color: colors.subtleText, fontSize: 16 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 20, marginBottom: 10, marginLeft: 5 },
});
