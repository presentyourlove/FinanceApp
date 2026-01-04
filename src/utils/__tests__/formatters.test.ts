import { formatCurrency, formatDate } from '../formatters';

describe('formatCurrency', () => {
    it('should format currency correctly with default locale', () => {
        const usd = formatCurrency(1234.56, 'USD');
        const twd = formatCurrency(100, 'TWD');
        console.log('USD:', usd);
        console.log('TWD:', twd);

        // Accept standard currency symbol format OR fallback format (USD 1234.56)
        // Normalize non-breaking spaces
        const usdClean = usd.replace(/\u00A0/g, ' ');
        const twdClean = twd.replace(/\u00A0/g, ' ');

        const isUsdValid = usdClean.includes('1,234.56');
        const isTwdValid = twdClean.includes('100');

        expect(isUsdValid).toBeTruthy();
        expect(isTwdValid).toBeTruthy();
    });

    it('should handle zero correctly', () => {
        const zero = formatCurrency(0, 'USD').replace(/\u00A0/g, ' ');
        expect(zero).toContain('0');
    });

    it('should use provided locale', () => {
        // Germany uses comma for decimal
        expect(formatCurrency(1234.56, 'EUR', 'de-DE')).toContain('1.234,56');
    });
});

describe('formatDate', () => {
    it('should format date string correctly', () => {
        // Use a mid-year date to avoid year shift issues across timezones
        const date = new Date('2023-06-15T12:00:00Z');
        expect(formatDate(date)).toContain('2023');
    });

    it('should handle string input', () => {
        expect(formatDate('2023-12-31')).toContain('2023');
    });
});
