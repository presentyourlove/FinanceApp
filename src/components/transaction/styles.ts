import { commonStyles } from '@/src/styles/common';

export const getStyles = (colors: any, insets: any) => StyleSheet.create({
    // ...
    header: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.card,
        alignSelf: 'stretch',
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        ...commonStyles.shadowMedium,
        marginBottom: 15,
    },
    // ...
    modalView: {
        width: '80%',
        backgroundColor: colors.card,
        ...commonStyles.modalView,
        ...commonStyles.shadowMedium,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        padding: 5,
    },
    pickerDisplayText: {
        fontSize: 50,
        fontWeight: '600',
        color: colors.accent,
        textAlign: 'center',
    },
    title: {
        fontSize: 14,
        color: colors.subtleText,
        marginTop: 5,
    },
    balanceText: {
        fontSize: 36,
        fontWeight: 'bold',
        marginVertical: 5,
    },
    inputArea: {
        backgroundColor: colors.card,
        marginHorizontal: 15,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
        marginBottom: 20,
    },
    input: {
        height: 45,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        backgroundColor: colors.inputBackground,
        color: colors.text,
        width: '100%',
    },
    inputText: {
        fontSize: 16,
        color: colors.text,
    },
    inputLabel: {
        alignSelf: 'flex-start',
        marginLeft: 5,
        marginBottom: 5,
        fontSize: 14,
        color: colors.subtleText,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '90%',
        marginTop: 5,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    mainButton: {
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 2,
    },
    autoWidthButton: {
        flex: 1,
        marginRight: 10,
    },
    incomeButton: {
        backgroundColor: colors.income,
    },
    expenseButton: {
        backgroundColor: colors.expense,
    },
    transferButton: {
        backgroundColor: colors.transfer,
    },
    categoryZone: {
        flex: 2,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    categoryButton: {
        backgroundColor: colors.inputBackground,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 15,
        margin: 3,
    },
    categoryText: {
        fontSize: 12,
        color: colors.text,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    listHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    filterButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.inputBackground,
    },
    filterButtonSelected: {
        backgroundColor: colors.tint,
    },
    filterButtonText: {
        fontSize: 14,
        color: colors.text,
    },
    filterButtonTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        backgroundColor: colors.card,
    },
    listItemTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    listItemType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    listItemDate: {
        fontSize: 12,
        color: colors.subtleText,
    },
    listItemAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: colors.subtleText,
        fontSize: 16,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.text,
    },
    modalListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        width: '100%',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: colors.subtleText,
    },
    confirmButton: {
        backgroundColor: colors.tint,
    },
    datePickerContainer: {
        flexDirection: 'row',
        width: '90%',
        marginBottom: 10,
        justifyContent: 'space-between'
    },
    dateInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
