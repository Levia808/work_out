import { estimateBodyComposition, percentage, sleepDurationMinutes, streakFromDates, totalCalories } from './calculations';

globalThis.describe('FitTrack calculations', () => {
  globalThis.it('clamps progress to 0-100', () => { globalThis.expect(percentage(120, 100)).toBe(100); globalThis.expect(percentage(-1, 100)).toBe(0); });
  globalThis.it('calculates sleep across a normal night', () => { globalThis.expect(sleepDurationMinutes(new Date('2026-10-08T23:30:00'), new Date('2026-10-09T07:00:00'))).toBe(450); });
  globalThis.it('totals calories', () => { globalThis.expect(totalCalories([{ calories: 420 }, { calories: 580 }])).toBe(1000); });
  globalThis.it('calculates a consecutive streak ending today', () => { globalThis.expect(streakFromDates(['2026-10-07', '2026-10-08', '2026-10-09'], '2026-10-09')).toBe(3); });

  globalThis.it('uses the published Chinese-adult male body-fat equation and derives mass consistently', () => {
    const result = estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'male', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' });
    globalThis.expect(result.bmi).toBe(24.2);
    globalThis.expect(result.waistToHeightRatio).toBe(0.471);
    globalThis.expect(result.bodyFatEstimatePercent).toBe(20.1);
    globalThis.expect(result.estimatedFatMassKg).toBe(14.1);
    globalThis.expect(result.estimatedFatFreeMassKg).toBe(55.9);
    globalThis.expect(result.fatMassIndex).toBe(4.9);
    globalThis.expect(result.fatFreeMassIndex).toBe(19.3);
  });

  globalThis.it('uses the Liu equation for female midpoint measurements and discloses study agreement limits', () => {
    const result = estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'female', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' });
    globalThis.expect(result.bodyFatEstimatePercent).toBe(32.1);
    globalThis.expect(result.methodKey).toBe('liu-2015-china');
    globalThis.expect(result.methodNote?.includes('±6.88')).toBe(true);
    globalThis.expect(result.methodNote?.includes('50–70 岁')).toBe(true);
    const unknownAge = estimateBodyComposition({ bodyFormulaSex: 'female', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' });
    globalThis.expect(unknownAge.bodyFatEstimatePercent).toBe(undefined);
    globalThis.expect(unknownAge.method).toBe(undefined);
  });

  globalThis.it('allows the male Liu equation without age and flags age outside its independent validation sample', () => {
    const unknownAge = estimateBodyComposition({ bodyFormulaSex: 'male', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' });
    globalThis.expect(unknownAge.bodyFatEstimatePercent).toBe(20.1);
    globalThis.expect(unknownAge.methodNote?.includes('未记录年龄')).toBe(true);
    const youngerAdult = estimateBodyComposition({ ageYears: 35, bodyFormulaSex: 'male', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' });
    globalThis.expect(youngerAdult.bodyFatEstimatePercent).toBe(20.1);
    globalThis.expect(youngerAdult.methodNote?.includes('适配性不确定')).toBe(true);
  });

  globalThis.it('uses the 2026 Chinese female narrowest-waist equations and labels android-region estimate correctly', () => {
    const result = estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'female', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'narrowest' });
    globalThis.expect(result.bodyFatEstimatePercent).toBe(36.3);
    globalThis.expect(result.androidRegionFatEstimatePercent).toBe(41.9);
    globalThis.expect(result.methodKey).toBe('peng-2026-chinese-women');
    globalThis.expect(result.methodNote?.includes('不是个人误差区间')).toBe(true);
    const withoutAge = estimateBodyComposition({ bodyFormulaSex: 'female', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'narrowest' });
    globalThis.expect(withoutAge.bodyFatEstimatePercent).toBe(36.3);
    globalThis.expect(withoutAge.methodNote?.includes('无法判断')).toBe(true);
  });

  globalThis.it('does not apply an equation when the matching waist protocol is unknown or incompatible', () => {
    globalThis.expect(estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'male', heightCm: 170, weightKg: 70, waistCm: 80 }).bodyFatEstimatePercent === undefined).toBe(true);
    globalThis.expect(estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'male', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'narrowest' }).bodyFatEstimatePercent === undefined).toBe(true);
  });

  globalThis.it('keeps unavailable and implausible estimates unavailable instead of clamping', () => {
    globalThis.expect(estimateBodyComposition({ weightKg: 70, waistCm: 80 }).bodyFatEstimatePercent === undefined).toBe(true);
    globalThis.expect(estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'male', heightCm: 170, weightKg: 20, waistCm: 30, waistMeasurementSite: 'midpoint' }).bodyFatEstimatePercent === undefined).toBe(true);
    globalThis.expect(estimateBodyComposition({ ageYears: 40, bodyFormulaSex: 'other' as 'male', heightCm: 170, weightKg: 70, waistCm: 80, waistMeasurementSite: 'midpoint' }).bodyFatEstimatePercent === undefined).toBe(true);
  });
});
