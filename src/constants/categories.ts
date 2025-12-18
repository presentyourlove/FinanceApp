import { TransactionType } from '@/src/types';

export const DEFAULT_CATEGORIES = {
    [TransactionType.EXPENSE]: [
        '餐飲', '交通', '服飾', '居住', '購物', '醫療', '保險', '教育', '娛樂', '旅遊', '運動'
    ],
    [TransactionType.INCOME]: [
        '薪水', '津貼', '兼職', '接案', '股利', '利息', '資本利得', '租金', '稿費', '版稅', '禮金', '退稅', '補助'
    ],
};
