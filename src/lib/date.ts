import { format, isSameDay, subDays } from 'date-fns';

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');
export const shortDate = (date: Date) => format(date, 'MM月dd日');
export const lastSevenDays = () => Array.from({ length: 7 }, (_, index) => subDays(new Date(), 6 - index));
export const sameDay = (date: Date, other: Date) => isSameDay(date, other);
