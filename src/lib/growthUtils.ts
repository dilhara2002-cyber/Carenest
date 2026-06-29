// src/lib/growthUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// CareNest Growth Calculation Utilities
// Implements Sri Lankan Ministry of Health / WHO protocols:
//   1. Preterm Corrected Age
//   2. BMI Calculation
//   3. Z-Score Status Mapping using exact WHO Benchmarks
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type GrowthStatus = 'NORMAL' | 'MODERATE' | 'SEVERE';
export type Gender = 'MALE' | 'FEMALE';

export interface WHOReferencePoint {
  ageMonths: number;
  weightMedian: number;
  weightMin: number; // -2 SD
  weightMax: number; // +2 SD
  heightMedian: number;
  heightMin: number; // -2 SD
  heightMax: number; // +2 SD
  bmiMedian: number;
  bmiMin: number; // -2 SD
  bmiMax: number; // +2 SD
}

export interface GrowthStatusResult {
  zScore: number;
  status: GrowthStatus;
  color: 'green' | 'yellow' | 'red';
  label: string;
}

export interface ComputedGrowthRecord {
  ageMonths: number;
  correctedAgeMonths: number | null;
  effectiveAgeMonths: number;     // the age used for reference lookup
  bmi: number | null;
  weightStatus: GrowthStatusResult | null;
  heightStatus: GrowthStatusResult | null;
  bmiStatus: GrowthStatusResult | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHO REFERENCE DATA
// Source: WHO Child Growth Standards + Sri Lanka MoH adaptation
// ─────────────────────────────────────────────────────────────────────────────

const WHO_REFERENCE: Record<Gender, WHOReferencePoint[]> = {
  FEMALE: [
    // Birth (0 months)
    {
      ageMonths: 0,
      weightMedian: 3.2,  weightMin: 2.4,  weightMax: 4.2,
      heightMedian: 49.1, heightMin: 45.4, heightMax: 52.9,
      bmiMedian: 13.3,    bmiMin: 11.5,    bmiMax: 15.3
    },
    // 6 months
    {
      ageMonths: 6,
      weightMedian: 7.3,  weightMin: 5.7,  weightMax: 9.3,
      heightMedian: 65.7, heightMin: 61.2, heightMax: 70.3,
      bmiMedian: 17.0,    bmiMin: 14.7,    bmiMax: 19.6
    },
    // 12 months (1 Year)
    {
      ageMonths: 12,
      weightMedian: 8.9,  weightMin: 7.0,  weightMax: 11.5,
      heightMedian: 74.0, heightMin: 68.9, heightMax: 79.2,
      bmiMedian: 16.3,    bmiMin: 14.1,    bmiMax: 18.9
    },
    // 24 months (2 Years)
    {
      ageMonths: 24,
      weightMedian: 11.5, weightMin: 9.0,  weightMax: 14.8,
      heightMedian: 86.4, heightMin: 80.0, heightMax: 92.9,
      bmiMedian: 15.4,    bmiMin: 13.5,    bmiMax: 17.7
    },
    // 36 months (3 Years)
    {
      ageMonths: 36,
      weightMedian: 13.9, weightMin: 10.8, weightMax: 17.0,
      heightMedian: 95.1, heightMin: 87.8, heightMax: 102.4,
      bmiMedian: 15.3,    bmiMin: 13.3,    bmiMax: 17.3
    },
    // 48 months (4 Years)
    {
      ageMonths: 48,
      weightMedian: 16.1, weightMin: 12.3, weightMax: 19.9,
      heightMedian: 102.7, heightMin: 94.8, heightMax: 110.6,
      bmiMedian: 15.2,    bmiMin: 13.1,    bmiMax: 17.3
    },
    // 60 months (5 Years)
    {
      ageMonths: 60,
      weightMedian: 18.2, weightMin: 13.6, weightMax: 22.8,
      heightMedian: 109.4, heightMin: 101.0, heightMax: 117.8,
      bmiMedian: 15.2,    bmiMin: 13.0,    bmiMax: 17.4
    },
  ],
  MALE: [
    // Birth (0 months)
    {
      ageMonths: 0,
      weightMedian: 3.3,  weightMin: 2.5,  weightMax: 4.4,
      heightMedian: 49.9, heightMin: 46.1, heightMax: 53.7,
      bmiMedian: 13.4,    bmiMin: 11.6,    bmiMax: 15.5
    },
    // 6 months
    {
      ageMonths: 6,
      weightMedian: 7.9,  weightMin: 6.4,  weightMax: 10.0,
      heightMedian: 67.6, heightMin: 63.3, heightMax: 71.9,
      bmiMedian: 17.5,    bmiMin: 15.3,    bmiMax: 20.1
    },
    // 12 months (1 Year)
    {
      ageMonths: 12,
      weightMedian: 9.6,  weightMin: 7.7,  weightMax: 12.0,
      heightMedian: 75.7, heightMin: 71.0, heightMax: 80.5,
      bmiMedian: 16.8,    bmiMin: 14.6,    bmiMax: 19.4
    },
    // 24 months (2 Years)
    {
      ageMonths: 24,
      weightMedian: 12.2, weightMin: 9.7,  weightMax: 15.3,
      heightMedian: 87.8, heightMin: 81.7, heightMax: 93.9,
      bmiMedian: 15.9,    bmiMin: 13.9,    bmiMax: 18.2
    },
    // 36 months (3 Years)
    {
      ageMonths: 36,
      weightMedian: 14.3, weightMin: 11.2, weightMax: 17.4,
      heightMedian: 96.1, heightMin: 89.0, heightMax: 103.2,
      bmiMedian: 15.5,    bmiMin: 13.5,    bmiMax: 17.5
    },
    // 48 months (4 Years)
    {
      ageMonths: 48,
      weightMedian: 16.3, weightMin: 12.5, weightMax: 20.1,
      heightMedian: 103.3, heightMin: 95.6, heightMax: 111.0,
      bmiMedian: 15.3,    bmiMin: 13.2,    bmiMax: 17.4
    },
    // 60 months (5 Years)
    {
      ageMonths: 60,
      weightMedian: 18.3, weightMin: 13.8, weightMax: 22.8,
      heightMedian: 110.0, heightMin: 101.8, heightMax: 118.2,
      bmiMedian: 15.1,    bmiMin: 12.9,    bmiMax: 17.3
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRETERM CORRECTED AGE
// Sri Lanka MoH Policy: apply correction until child is 24 months old
// ─────────────────────────────────────────────────────────────────────────────

export function computeCorrectedAgeMonths(
  chronologicalAgeMonths: number,
  isPreterm: boolean,
  gestationalAgeWeeks: number | null | undefined,
): number | null {
  if (!isPreterm || !gestationalAgeWeeks || chronologicalAgeMonths > 24) {
    return null;
  }

  const weeksPreterm = 40 - gestationalAgeWeeks;
  const chronologicalAgeWeeks = chronologicalAgeMonths * 4.345;
  const correctedAgeWeeks = Math.max(0, chronologicalAgeWeeks - weeksPreterm);
  const correctedAgeMonths = Math.round(correctedAgeWeeks / 4.345);

  return correctedAgeMonths;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BMI CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export function computeBMI(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WHO REFERENCE INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────

function interpolateReference(
  ageMonths: number,
  gender: Gender,
): WHOReferencePoint {
  const table = WHO_REFERENCE[gender];

  if (ageMonths <= table[0].ageMonths) return table[0];
  if (ageMonths >= table[table.length - 1].ageMonths) return table[table.length - 1];

  let lower = table[0];
  let upper = table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    if (ageMonths >= table[i].ageMonths && ageMonths <= table[i + 1].ageMonths) {
      lower = table[i];
      upper = table[i + 1];
      break;
    }
  }

  const range = upper.ageMonths - lower.ageMonths;
  const t = range === 0 ? 0 : (ageMonths - lower.ageMonths) / range;

  const lerp = (a: number, b: number) => parseFloat((a + t * (b - a)).toFixed(4));

  return {
    ageMonths,
    weightMedian: lerp(lower.weightMedian, upper.weightMedian),
    weightMin: lerp(lower.weightMin, upper.weightMin),
    weightMax: lerp(lower.weightMax, upper.weightMax),
    heightMedian: lerp(lower.heightMedian, upper.heightMedian),
    heightMin: lerp(lower.heightMin, upper.heightMin),
    heightMax: lerp(lower.heightMax, upper.heightMax),
    bmiMedian: lerp(lower.bmiMedian, upper.bmiMedian),
    bmiMin: lerp(lower.bmiMin, upper.bmiMin),
    bmiMax: lerp(lower.bmiMax, upper.bmiMax),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Z-SCORE CALCULATION
// Uses dual-SD logic to support asymmetric WHO growth bands:
//   If observed < median: uses SD derived from (median - minVal) / 2
//   If observed >= median: uses SD derived from (maxVal - median) / 2
// ─────────────────────────────────────────────────────────────────────────────

function computeZScore(observed: number, median: number, minVal: number, maxVal: number): number {
  if (observed < median) {
    const sdMinus = (median - minVal) / 2;
    return sdMinus === 0 ? 0 : parseFloat(((observed - median) / sdMinus).toFixed(2));
  } else {
    const sdPlus = (maxVal - median) / 2;
    return sdPlus === 0 ? 0 : parseFloat(((observed - median) / sdPlus).toFixed(2));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Z-SCORE → STATUS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function zScoreToStatus(zScore: number): GrowthStatusResult {
  if (zScore >= -2) {
    return {
      zScore,
      status: 'NORMAL',
      color: 'green',
      label: 'Normal',
    };
  } else if (zScore >= -3) {
    return {
      zScore,
      status: 'MODERATE',
      color: 'yellow',
      label: 'Moderate growth concern',
    };
  } else {
    return {
      zScore,
      status: 'SEVERE',
      color: 'red',
      label: 'Severe Malnutrition',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MAIN COMPUTATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export function computeGrowthMetrics(params: {
  birthDate: Date;
  recordDate: Date;
  gender: Gender;
  weightKg: number | null;
  heightCm: number | null;
  isPreterm: boolean;
  gestationalAgeWeeks: number | null | undefined;
}): ComputedGrowthRecord {
  const { birthDate, recordDate, gender, weightKg, heightCm, isPreterm, gestationalAgeWeeks } = params;

  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const ageMonths = Math.max(
    0,
    Math.round((recordDate.getTime() - birthDate.getTime()) / msPerMonth),
  );

  const correctedAgeMonths = computeCorrectedAgeMonths(ageMonths, isPreterm, gestationalAgeWeeks);
  const effectiveAgeMonths = correctedAgeMonths !== null ? correctedAgeMonths : ageMonths;
  const bmi = computeBMI(weightKg, heightCm);

  const ref = interpolateReference(effectiveAgeMonths, gender);

  const weightStatus = weightKg != null
    ? zScoreToStatus(computeZScore(weightKg, ref.weightMedian, ref.weightMin, ref.weightMax))
    : null;

  const heightStatus = heightCm != null
    ? zScoreToStatus(computeZScore(heightCm, ref.heightMedian, ref.heightMin, ref.heightMax))
    : null;

  const bmiStatus = bmi != null
    ? zScoreToStatus(computeZScore(bmi, ref.bmiMedian, ref.bmiMin, ref.bmiMax))
    : null;

  return {
    ageMonths,
    correctedAgeMonths,
    effectiveAgeMonths,
    bmi,
    weightStatus,
    heightStatus,
    bmiStatus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. WHO REFERENCE BANDS FOR CHART RENDERING
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceBand {
  ageMonths: number;
  // Weight bands (kg)
  weightNormalMin: number;
  weightNormalMax: number;
  weightModerateMin: number;
  weightSevereBelow: number;
  // Height bands (cm)
  heightNormalMin: number;
  heightNormalMax: number;
  heightModerateMin: number;
  // BMI bands
  bmiNormalMin: number;
  bmiNormalMax: number;
  bmiModerateMin: number;
}

export function getReferenceBands(gender: Gender): ReferenceBand[] {
  return WHO_REFERENCE[gender].map((ref) => {
    const sdWeightMinus = (ref.weightMedian - ref.weightMin) / 2;
    const sdHeightMinus = (ref.heightMedian - ref.heightMin) / 2;
    const sdBmiMinus = (ref.bmiMedian - ref.bmiMin) / 2;

    return {
      ageMonths: ref.ageMonths,
      weightNormalMin: ref.weightMin,
      weightNormalMax: ref.weightMax,
      weightModerateMin: parseFloat((ref.weightMedian - 3 * sdWeightMinus).toFixed(2)),
      weightSevereBelow: parseFloat((ref.weightMedian - 3 * sdWeightMinus).toFixed(2)),

      heightNormalMin: ref.heightMin,
      heightNormalMax: ref.heightMax,
      heightModerateMin: parseFloat((ref.heightMedian - 3 * sdHeightMinus).toFixed(2)),

      bmiNormalMin: ref.bmiMin,
      bmiNormalMax: ref.bmiMax,
      bmiModerateMin: parseFloat((ref.bmiMedian - 3 * sdBmiMinus).toFixed(2)),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TAILWIND COLOR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const GROWTH_STATUS_STYLES: Record<
  GrowthStatus,
  { bg: string; text: string; border: string; badge: string; chartColor: string }
> = {
  NORMAL: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    chartColor: '#22c55e',
  },
  MODERATE: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    chartColor: '#eab308',
  },
  SEVERE: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    chartColor: '#ef4444',
  },
};

export function getStatusStyles(status: string | null | undefined) {
  if (!status) return GROWTH_STATUS_STYLES.NORMAL;
  return GROWTH_STATUS_STYLES[status as GrowthStatus] ?? GROWTH_STATUS_STYLES.NORMAL;
}