import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountSettings } from '../AccountSettings';
import { dbOperations } from '../../../services/database';

jest.mock('../../../services/database', () => ({
    dbOperations: {
        getAccounts: jest.fn(),
        addAccountDB: jest.fn(),
        deleteAccountDB: jest.fn(),
        updateAccountOrderDB: jest.fn(),
    },
}));

jest.mock('@/src/components/common/SwipeView', () => {
    const { View } = require('react-native');
    const MockSwipeView = ({ children }: any) => <View>{children}</View>;
    MockSwipeView.displayName = 'MockSwipeView';
    return MockSwipeView;
});

jest.mock('@/src/i18n', () => ({
    t: (key: string) => key,
}));

// Mock Ionicons to avoid rendering issues
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

describe('AccountSettings', () => {
    const mockAccounts = [
        { id: 1, name: 'Account 1', currentBalance: 100, currency: 'TWD', sortIndex: 0 },
        { id: 2, name: 'Account 2', currentBalance: 200, currency: 'USD', sortIndex: 1 },
        { id: 3, name: 'Account 3', currentBalance: 300, currency: 'JPY', sortIndex: 2 },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (dbOperations.getAccounts as jest.Mock).mockResolvedValue([...mockAccounts]);
    });

    it('renders account list correctly', async () => {
        const { getByText } = render(<AccountSettings onBack={jest.fn()} colors={{}} styles={{}} />);

        await waitFor(() => {
            expect(getByText('Account 1 (TWD)')).toBeTruthy();
            expect(getByText('Account 2 (USD)')).toBeTruthy();
            expect(getByText('Account 3 (JPY)')).toBeTruthy();
        });
    });

    it('calls updateAccountOrderDB when moving items up', async () => {
        const { getByTestId } = render(<AccountSettings onBack={jest.fn()} colors={{}} styles={{}} />);

        // Wait for data to load and render
        await waitFor(() => expect(getByTestId('move-up-1')).toBeTruthy());

        // Move 'Account 2' (index 1) UP
        const moveUpBtn = getByTestId('move-up-1');
        fireEvent.press(moveUpBtn);

        // Should swap Acc2 and Acc1
        // New order: Acc2 (id 2), Acc1 (id 1), Acc3 (id 3)
        const expectedAccounts = [
            mockAccounts[1],
            mockAccounts[0],
            mockAccounts[2]
        ];

        expect(dbOperations.updateAccountOrderDB).toHaveBeenCalledWith(expectedAccounts);
    });

    it('calls updateAccountOrderDB when moving items down', async () => {
        const { getByTestId } = render(<AccountSettings onBack={jest.fn()} colors={{}} styles={{}} />);

        // Wait for data to load and render
        await waitFor(() => expect(getByTestId('move-down-1')).toBeTruthy());

        // Move 'Account 2' (index 1) DOWN
        const moveDownBtn = getByTestId('move-down-1');
        fireEvent.press(moveDownBtn);

        // Should swap Acc2 and Acc3
        // New order: Acc1 (id 1), Acc3 (id 3), Acc2 (id 2)
        const expectedAccounts = [
            mockAccounts[0],
            mockAccounts[2],
            mockAccounts[1]
        ];

        expect(dbOperations.updateAccountOrderDB).toHaveBeenCalledWith(expectedAccounts);
    });
});
