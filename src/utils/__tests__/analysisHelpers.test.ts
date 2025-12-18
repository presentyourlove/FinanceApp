import { generateAdvice } from '../analysisHelpers';


// Mock i18n
jest.mock('@/src/i18n', () => ({
    t: (key: string, options?: any) => {
        if (key === 'analysis.adviceOverSpent') return `Overspent ${options?.period}`;
        if (key === 'analysis.adviceHighSpent') return `High spent ${options?.period}`;
        if (key === 'analysis.adviceGood') return `Good job ${options?.period}`;
        if (key === 'analysis.adviceTopCategory') return `Top cat ${options?.category}`;
        if (key === 'analysis.thisMonth') return 'this month';
        if (key === 'analysis.thisYear') return 'this year';
        return key;
    }
}));

describe('analysisHelpers', () => {
    describe('generateAdvice', () => {
        it('should return overspent advice when expense > income', () => {
            const advice = generateAdvice(100, 150, undefined, 'month');
            expect(advice).toContain('Overspent this month');
        });

        it('should return high spent advice when expense > 80% income', () => {
            const advice = generateAdvice(100, 90, undefined, 'month');
            expect(advice).toContain('High spent this month');
        });

        it('should return good job advice when expense is low', () => {
            const advice = generateAdvice(100, 50, undefined, 'month');
            expect(advice).toContain('Good job this month');
        });

        it('should include top category advice if provided', () => {
            const advice = generateAdvice(100, 50, 'Food', 'month');
            expect(advice).toContain('Top cat Food');
        });

        it('should handle year period correctly', () => {
            const advice = generateAdvice(100, 150, undefined, 'year');
            expect(advice).toContain('Overspent this year');
        });
    });
});
