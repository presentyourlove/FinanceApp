/**
 * 格式化貨幣金額 (Format Currency)
 * 
 * @param amount 金額數值
 * @param currency 幣別代碼 (e.g., 'TWD', 'USD')
 * @param locale 語系 (預設為 'zh-TW')
 * @returns 格式化後的金額字串 (e.g., "$1,234.56")
 */
export const formatCurrency = (amount: number, currency: string = 'TWD', locale: string = 'zh-TW'): string => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0, // 預設不顯示小數，除非有
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        console.warn(`Currency formatting failed for ${currency}:`, error);
        return `${currency} ${amount.toFixed(2)}`;
    }
};

/**
 * 格式化日期 (Format Date)
 * 
 * @param date 日期物件或字串
 * @param locale 語系 (預設為 'zh-TW')
 * @returns 格式化後的日期字串 (e.g., "2023/1/1")
 */
export const formatDate = (date: string | Date, locale: string = 'zh-TW'): string => {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
        }).format(d);
    } catch (error) {
        console.warn(`Date formatting failed:`, error);
        return String(date);
    }
};
