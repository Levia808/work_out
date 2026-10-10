import { percentage, sleepDurationMinutes, streakFromDates, totalCalories } from './calculations';

globalThis.describe('FitTrack calculations', () => {
  globalThis.it('clamps progress to 0-100', () => { globalThis.expect(percentage(120, 100)).toBe(100); globalThis.expect(percentage(-1, 100)).toBe(0); });
  globalThis.it('calculates sleep across a normal night', () => { globalThis.expect(sleepDurationMinutes(new Date('2026-10-08T23:30:00'), new Date('2026-10-09T07:00:00'))).toBe(450); });
  globalThis.it('totals calories', () => { globalThis.expect(totalCalories([{ calories: 420 }, { calories: 580 }])).toBe(1000); });
  globalThis.it('calculates a consecutive streak ending today', () => { globalThis.expect(streakFromDates(['2026-10-07', '2026-10-08', '2026-10-09'], '2026-10-09')).toBe(3); });
});
