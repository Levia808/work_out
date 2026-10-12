export function percentage(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)));
}

export function sleepDurationMinutes(fellAsleepAt: Date, wokeAt: Date): number {
  const duration = Math.round((wokeAt.getTime() - fellAsleepAt.getTime()) / 60_000);
  return Math.max(0, duration);
}

export function totalCalories(items: Array<{ calories: number } | { kcal: number }>): number {
  return items.reduce((total, item) => total + ('calories' in item ? item.calories : item.kcal), 0);
}

export function streakFromDates(dates: string[], today: string): number {
  const values = new Set(dates);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  while (values.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export type BodyFormulaSex = 'male' | 'female';
export type WaistMeasurementSite = 'midpoint' | 'narrowest';
export type BodyCompositionInputs = {
  ageYears?: number;
  bodyFormulaSex?: BodyFormulaSex;
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
  waistMeasurementSite?: WaistMeasurementSite;
};

export type BodyFatMethod = 'liu-2015-china' | 'peng-2026-chinese-women';
export type BodyCompositionEstimate = {
  bmi?: number;
  waistToHeightRatio?: number;
  bodyFatEstimatePercent?: number;
  /** DXA android-region fat percentage equation; not visceral fat. */
  androidRegionFatEstimatePercent?: number;
  estimatedFatMassKg?: number;
  estimatedFatFreeMassKg?: number;
  fatMassIndex?: number;
  fatFreeMassIndex?: number;
  method?: string;
  methodKey?: BodyFatMethod;
  methodNote?: string;
};

const validNumber = (value: number | undefined, min: number, max: number) =>
  value !== undefined && Number.isFinite(value) && value >= min && value <= max;

/**
 * Small on-device anthropometric equations. Values are screening estimates,
 * not measurements, diagnosis, or a substitute for DXA/clinical assessment.
 */
export function estimateBodyComposition(input: BodyCompositionInputs): BodyCompositionEstimate {
  const heightValid = validNumber(input.heightCm, 100, 230);
  const weightValid = validNumber(input.weightKg, 20, 350);
  const waistValid = validNumber(input.waistCm, 30, 200);
  const ageValid = validNumber(input.ageYears, 18, 100);
  const formulaSex = input.bodyFormulaSex === 'male' || input.bodyFormulaSex === 'female'
    ? input.bodyFormulaSex
    : undefined;
  const heightM = heightValid ? input.heightCm! / 100 : undefined;
  const bmiRaw = heightM && weightValid ? input.weightKg! / (heightM * heightM) : undefined;
  const bmi = bmiRaw === undefined ? undefined : Number(bmiRaw.toFixed(1));
  const waistToHeightRatio = heightValid && waistValid ? input.waistCm! / input.heightCm! : undefined;

  let bodyFatEstimatePercent: number | undefined;
  let androidRegionFatEstimatePercent: number | undefined;
  let method: string | undefined;
  let methodKey: BodyFatMethod | undefined;
  let methodNote: string | undefined;
  const isRecentFemaleEquation = formulaSex === 'female' && input.waistMeasurementSite === 'narrowest';
  const isLiuWaistProtocol = input.waistMeasurementSite === 'midpoint';
  const canUseLiuEquation = isLiuWaistProtocol && (formulaSex === 'male' || (formulaSex === 'female' && ageValid));
  if (bmiRaw !== undefined && waistValid && formulaSex && (isRecentFemaleEquation || canUseLiuEquation)) {
    const waist = input.waistCm!;
    const waistSquared = waist * waist;
    if (isRecentFemaleEquation) {
      // Peng et al. 2026, Chinese female sample. Waist is measured at the
      // narrowest point; equations estimate total and DXA android-region BF%.
      bodyFatEstimatePercent = 5.76 + 0.666 * bmiRaw + 0.180 * waist;
      androidRegionFatEstimatePercent = -13.3 + 0.711 * bmiRaw + 0.475 * waist;
      method = 'Peng 等（2026）中国女性围度方程';
      methodKey = 'peng-2026-chinese-women';
      methodNote = `该研究样本为中国女性（20–79 岁），采用重复交叉验证，尚不能视作独立外部验证；总体体脂率交叉验证 RMSE 约 3.47 个百分点，Android 区域体脂率约 5.81 个百分点。群体误差不是个人误差区间。${input.ageYears === undefined ? ' 未记录年龄，无法判断是否处于研究样本年龄范围。' : input.ageYears < 20 || input.ageYears > 79 ? ' 当前年龄超出研究样本范围，属于外推。' : ''}Android 区域脂肪不等同于内脏脂肪。`;
    } else {
      // Liu et al. 2015 Chinese-adult equations. Waist protocol is the
      // midpoint between the lower rib and iliac crest.
      bodyFatEstimatePercent = formulaSex === 'male'
        ? -41.92778773 + 0.33718996 * bmiRaw + 0.99622038 * waist - 0.00403169 * waistSquared
        : -22.46354525 + 0.32551474 * bmiRaw + 0.87135268 * waist + 0.00319864 * input.ageYears! * bmiRaw - 0.00408430 * waistSquared;
      method = 'Liu 等（2015）中国成人体脂估算方程';
      methodKey = 'liu-2015-china';
      methodNote = `研究在上海中国成年人样本开发（平均年龄 46.2 岁，SD 5.3），并以 50–70 岁独立样本验证。与 DXA 的群体一致性界限约为男性 ±6.64、女性 ±6.88 个百分点，不是个人误差区间；自行测量腰围会增加不确定性。腰围测量点需为肋骨下缘与髂嵴间中点。${input.ageYears === undefined ? ' 未记录年龄，无法判断与开发/验证人群的适配性。' : input.ageYears < 50 || input.ageYears > 70 ? ' 当前年龄不在独立验证样本的 50–70 岁范围内，对该年龄段的适配性不确定。' : ''}`;
    }
    // Reject implausible outputs rather than clamping to plausible-looking values.
    if (!Number.isFinite(bodyFatEstimatePercent) || bodyFatEstimatePercent < 2 || bodyFatEstimatePercent > 70) {
      bodyFatEstimatePercent = undefined;
      androidRegionFatEstimatePercent = undefined;
      method = undefined;
      methodKey = undefined;
      methodNote = undefined;
    } else {
      bodyFatEstimatePercent = Number(bodyFatEstimatePercent.toFixed(1));
      if (androidRegionFatEstimatePercent !== undefined) {
        androidRegionFatEstimatePercent = Number.isFinite(androidRegionFatEstimatePercent) && androidRegionFatEstimatePercent >= 2 && androidRegionFatEstimatePercent <= 80
          ? Number(androidRegionFatEstimatePercent.toFixed(1))
          : undefined;
      }
    }
  }

  const estimatedFatMassKg = bodyFatEstimatePercent !== undefined && weightValid
    ? Number((input.weightKg! * bodyFatEstimatePercent / 100).toFixed(1))
    : undefined;
  const estimatedFatFreeMassKg = estimatedFatMassKg !== undefined && weightValid
    ? Number((input.weightKg! - estimatedFatMassKg).toFixed(1))
    : undefined;
  const heightSquared = heightM ? heightM * heightM : undefined;
  const fatMassIndex = estimatedFatMassKg !== undefined && heightSquared
    ? Number((estimatedFatMassKg / heightSquared).toFixed(1))
    : undefined;
  const fatFreeMassIndex = estimatedFatFreeMassKg !== undefined && heightSquared
    ? Number((estimatedFatFreeMassKg / heightSquared).toFixed(1))
    : undefined;

  return {
    ...(bmi === undefined ? {} : { bmi }),
    ...(waistToHeightRatio === undefined ? {} : { waistToHeightRatio: Number(waistToHeightRatio.toFixed(3)) }),
    ...(bodyFatEstimatePercent === undefined ? {} : {
      bodyFatEstimatePercent,
      ...(androidRegionFatEstimatePercent === undefined ? {} : { androidRegionFatEstimatePercent }),
      estimatedFatMassKg,
      estimatedFatFreeMassKg,
      fatMassIndex,
      fatFreeMassIndex,
      method,
      methodKey,
      methodNote,
    }),
  };
}
