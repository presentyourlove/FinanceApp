const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'InvestView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new imports after existing imports
const importSection = `import { useTheme } from '@/src/context/ThemeContext';
import { dbOperations, Investment } from '@/src/services/database';
import { loadCurrencySettings } from '@/src/utils/currencyStorage';
import InvestmentCard from '@/src/components/investment/InvestmentCard';
import UpdatePriceModal from '@/src/components/investment/UpdatePriceModal';
import StockDetailModal from '@/src/components/investment/StockDetailModal';
import InvestmentActionModal from '@/src/components/investment/InvestmentActionModal';
import AddInvestmentModal from '@/src/components/investment/AddInvestmentModal';`;

// Replace the import section
content = content.replace(
    /import { useTheme } from '@\/app\/context\/ThemeContext';[\s\S]*?import { loadCurrencySettings } from '@\/app\/utils\/currencyStorage';/,
    importSection
);

// 2. Remove action-related state variables (lines 48-57 approximately)
content = content.replace(
    /\/\/ Action Form State\s+const \[actionAmount[\s\S]*?const \[actionFinalInterest, setActionFinalInterest\] = useState\(''\);/,
    ''
);

// 3. Remove newPrice state
content = content.replace(
    /\/\/ Update Price State\s+const \[newPrice, setNewPrice\] = useState\(''\);/,
    ''
);

// 4. Remove Add Form State and related variables (we'll keep them for now as AddInvestmentModal needs them passed)
// Actually, AddInvestmentModal manages its own state, so we can remove these too
content = content.replace(
    /\/\/ Add Form State[\s\S]*?const \[datePickerMode, setDatePickerMode\] = useState<'add_date' \| 'add_maturity' \| 'action_date'>\('add_date'\);/,
    ''
);

// 5. Remove actionTargetAccountId from loadData
content = content.replace(
    /if \(!actionTargetAccountId\) setActionTargetAccountId\(accs\[0\]\.id\);/,
    ''
);

// 6. Remove resetActionForm function
content = content.replace(
    /const resetActionForm = \(inv: Investment\) => \{[\s\S]*?\};/,
    ''
);

// 7. Remove handleUpdatePrice function
content = content.replace(
    /const handleUpdatePrice = async \(\) => \{[\s\S]*?\};/,
    ''
);

// 8. Remove handleAction function
content = content.replace(
    /const handleAction = async \(\) => \{[\s\S]*?\};/,
    ''
);

// 9. Remove all auto-calculation functions
content = content.replace(
    /\/\/ Auto-calculation logic for stock inputs[\s\S]*?const handleAddInvestment = async/,
    'const handleAddInvestment = async'
);

// 10. Remove handleAddInvestment function
content = content.replace(
    /const handleAddInvestment = async \(\) => \{[\s\S]*?\};/,
    ''
);

// 11. Remove onDateChange function
content = content.replace(
    /const onDateChange = \(event: any, selectedDate\?: Date\) => \{[\s\S]*?\};/,
    ''
);

// 12. Remove resetAddForm function
content = content.replace(
    /const resetAddForm = \(\) => \{[\s\S]*?\};/,
    ''
);

// 13. Update handleInvestmentPress to not call resetActionForm
content = content.replace(
    /const handleInvestmentPress = \(item: GroupedInvestment\) => \{[\s\S]*?\};/,
    `const handleInvestmentPress = (item: GroupedInvestment) => {
        if (item.type === 'stock') {
            setSelectedStockName(item.name);
            setStockDetailModalVisible(true);
        } else {
            setSelectedInvestment(item);
            setActionModalVisible(true);
        }
    };`
);

// 14. Replace renderInvestmentItem to use InvestmentCard
content = content.replace(
    /const renderInvestmentItem = \(\{ item \}: \{ item: GroupedInvestment \}\) => \{[\s\S]*?\};/,
    `const renderInvestmentItem = ({ item }: { item: GroupedInvestment }) => (
        <InvestmentCard item={item} onPress={handleInvestmentPress} colors={colors} />
    );`
);

console.log('Integration script completed successfully!');
fs.writeFileSync(filePath, content, 'utf8');
