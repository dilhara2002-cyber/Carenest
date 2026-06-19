// src/lib/growthUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// CareNest Growth Calculation Utilities
// Implements Sri Lankan Ministry of Health / WHO protocols:
//   1. Preterm Corrected Age
//   2. BMI Calculation
//   3. Z-Score Status Mapping
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type GrowthStatus = 'NORMAL' | 'MODERATE' | 'SEVERE';
export type Gender = 'MALE' | 'FEMALE';

export interface WHOReferencePoint {
  ageMonths: number;
  weightMedian: number;
  weightSD: number;   // 1 SD — used to derive z-score boundaries
  heightMedian: number;
  heightSD: number;
  bmiMedian: number;
  bmiSD: number;
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
// SD values derived from the normal range boundaries provided:
//   normalMin ≈ median - 2SD  →  SD ≈ (median - normalMin) / 2
// Milestone points: Birth, 6M, 12M, 24M — intermediate values are interpolated
// ─────────────────────────────────────────────────────────────────────────────

const WHO_REFERENCE: Record<Gender, WHOReferencePoint[]> = {
  FEMALE: [
    // Birth (0 months)
    // Weight: median 3.2, range 2.4–4.2  → SD = (3.2 - 2.4) / 2 = 0.40
    // Height: median 49.1, range 45.4–52.9 → SD = (49.1 - 45.4) / 2 = 1.85
    // BMI:    median 13.3, range 11.5–15.3 → SD = (13.3 - 11.5) / 2 = 0.90
    { ageMonths: 0,  weightMedian: 3.2,  weightSD: 0.40, heightMedian: 49.1, heightSD: 1.85, bmiMedian: 13.3, bmiSD: 0.90 },
    // 6 months
    // Weight: median 7.3, range 5.7–9.3   → SD = (7.3 - 5.7) / 2 = 0.80
    // Height: median 65.7, range 61.2–70.3 → SD = (65.7 - 61.2) / 2 = 2.25
    // BMI:    median 17.0, range 14.7–19.6 → SD = (17.0 - 14.7) / 2 = 1.15
    { ageMonths: 6,  weightMedian: 7.3,  weightSD: 0.80, heightMedian: 65.7, heightSD: 2.25, bmiMedian: 17.0, bmiSD: 1.15 },
    // 12 months
    // Weight: median 8.9, range 7.0–11.5  → SD = (8.9 - 7.0) / 2 = 0.95
    // Height: median 74.0, range 68.9–79.2 → SD = (74.0 - 68.9) / 2 = 2.55
    // BMI:    median 16.3, range 14.1–18.9 → SD = (16.3 - 14.1) / 2 = 1.10
    { ageMonths: 12, weightMedian: 8.9,  weightSD: 0.95, heightMedian: 74.0, heightSD: 2.55, bmiMedian: 16.3, bmiSD: 1.10 },
    // 24 months
    // Weight: median 11.5, range 9.0–14.8 → SD = (11.5 - 9.0) / 2 = 1.25
    // Height: median 86.4, range 80.0–92.9 → SD = (86.4 - 80.0) / 2 = 3.20
    // BMI:    median 15.4, range 13.5–17.7 → SD = (15.4 - 13.5) / 2 = 0.95
    { ageMonths: 24, weightMedian: 11.5, weightSD: 1.25, heightMedian: 86.4, heightSD: 3.20, bmiMedian: 15.4, bmiSD: 0.95 },
    // 36 months (extrapolated from WHO tables)
    { ageMonths: 36, weightMedian: 13.9, weightSD: 1.55, heightMedian: 95.1, heightSD: 3.65, bmiMedian: 15.3, bmiSD: 1.00 },
    // 48 months
    { ageMonths: 48, weightMedian: 16.1, weightSD: 1.90, heightMedian: 102.7, heightSD: 3.95, bmiMedian: 15.2, bmiSD: 1.05 },
    // 60 months (5 years)
    { ageMonths: 60, weightMedian: 18.2, weightSD: 2.30, heightMedian: 109.4, heightSD: 4.20, bmiMedian: 15.2, bmiSD: 1.10 },
  ],
  MALE: [
    // Birth
    // Weight: median 3.3, range 2.5–4.4   → SD = (3.3 - 2.5) / 2 = 0.40
    // Height: median 49.9, range 46.1–53.7 → SD = (49.9 - 46.1) / 2 = 1.90
    // BMI:    median 13.4, range 11.6–15.5 → SD = (13.4 - 11.6) / 2 = 0.90
    { ageMonths: 0,  weightMedian: 3.3,  weightSD: 0.40, heightMedian: 49.9, heightSD: 1.90, bmiMedian: 13.4, bmiSD: 0.90 },
    // 6 months
    // Weight: median 7.9, range 6.4–10.0  → SD = (7.9 - 6.4) / 2 = 0.75
    // Height: median 67.6, range 63.3–71.9 → SD = (67.6 - 63.3) / 2 = 2.15
    // BMI:    median 17.5, range 15.3–20.1 → SD = (17.5 - 15.3) / 2 = 1.10
    { ageMonths: 6,  weightMedian: 7.9,  weightSD: 0.75, heightMedian: 67.6, heightSD: 2.15, bmiMedian: 17.5, bmiSD: 1.10 },
    // 12 months
    // Weight: median 9.6, range 7.7–12.0  → SD = (9.6 - 7.7) / 2 = 0.95
    // Height: median 75.7, range 71.0–80.5 → SD = (75.7 - 71.0) / 2 = 2.35
    // BMI:    median 16.8, range 14.6–19.4 → SD = (16.8 - 14.6) / 2 = 1.10
    { ageMonths: 12, weightMedian: 9.6,  weightSD: 0.95, heightMedian: 75.7, heightSD: 2.35, bmiMedian: 16.8, bmiSD: 1.10 },
    // 24 months
    // Weight: median 12.2, range 9.7–15.3 → SD = (12.2 - 9.7) / 2 = 1.25
    // Height: median 87.8, range 81.7–93.9 → SD = (87.8 - 81.7) / 2 = 3.05
    // BMI:    median 15.9, range 13.9–18.2 → SD = (15.9 - 13.9) / 2 = 1.00
    { ageMonths: 24, weightMedian: 12.2, weightSD: 1.25, heightMedian: 87.8, heightSD: 3.05, bmiMedian: 15.9, bmiSD: 1.00 },
    // 36 months (extrapolated)
    { ageMonths: 36, weightMedian: 14.3, weightSD: 1.55, heightMedian: 96.1, heightSD: 3.55, bmiMedian: 15.5, bmiSD: 1.00 },
    // 48 months
    { ageMonths: 48, weightMedian: 16.3, weightSD: 1.90, heightMedian: 103.3, heightSD: 3.85, bmiMedian: 15.3, bmiSD: 1.05 },
    // 60 months (5 years)
    { ageMonths: 60, weightMedian: 18.3, weightSD: 2.25, heightMedian: 110.0, heightSD: 4.10, bmiMedian: 15.1, bmiSD: 1.10 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRETERM CORRECTED AGE
// Sri Lanka MoH Policy: apply correction until child is 24 months old
//
// weeksPreterm     = 40 - gestationalAgeWeeks
// correctedAgeWeeks = chronologicalAgeWeeks - weeksPreterm
// correctedAgeMonths = correctedAgeWeeks / 4.345
// ─────────────────────────────────────────────────────────────────────────────

export function computeCorrectedAgeMonths(
  chronologicalAgeMonths: number,
  isPreterm: boolean,
  gestationalAgeWeeks: number | null | undefined,
): number | null {
  // Only apply if preterm flag set, gestational age known, and child ≤ 24 months
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
// BMI = weight(kg) / (height(cm) / 100)²
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
// Linear interpolation between two milestone points for any age in months
// ─────────────────────────────────────────────────────────────────────────────

function interpolateReference(
  ageMonths: number,
  gender: Gender,
): WHOReferencePoint {
  const table = WHO_REFERENCE[gender];

  // Clamp to range
  if (ageMonths <= table[0].ageMonths) return table[0];
  if (ageMonths >= table[table.length - 1].ageMonths) return table[table.length - 1];

  // Find surrounding points
  let lower = table[0];
  let upper = table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    if (ageMonths >= table[i].ageMonths && ageMonths <= table[i + 1].ageMonths) {
      lower = table[i];
      upper = table[i + 1];
      break;
    }
  }

  // Linear interpolation factor (0 to 1)
  const range = upper.ageMonths - lower.ageMonths;
  const t = range === 0 ? 0 : (ageMonths - lower.ageMonths) / range;

  const lerp = (a: number, b: number) => parseFloat((a + t * (b - a)).toFixed(4));

  return {
    ageMonths,
    weightMedian: lerp(lower.weightMedian, upper.weightMedian),
    weightSD: lerp(lower.weightSD, upper.weightSD),
    heightMedian: lerp(lower.heightMedian, upper.heightMedian),
    heightSD: lerp(lower.heightSD, upper.heightSD),
    bmiMedian: lerp(lower.bmiMedian, upper.bmiMedian),
    bmiSD: lerp(lower.bmiSD, upper.bmiSD),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Z-SCORE CALCULATION
// z = (observed - median) / SD
// ─────────────────────────────────────────────────────────────────────────────

function computeZScore(observed: number, median: number, sd: number): number {
  if (sd === 0) return 0;
  return parseFloat(((observed - median) / sd).toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Z-SCORE → STATUS MAPPING
// Sri Lanka MoH / WHO thresholds:
//   ≥ -2 to ≤ +2  → NORMAL   (green)
//   -2 to -3      → MODERATE (yellow)
//   < -3          → SEVERE   (red)
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
      label: 'Moderate Underweight / Stunting / Wasting',
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
// Called by the API route before saving a GrowthRecord
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

  // Chronological age in months
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const ageMonths = Math.max(
    0,
    Math.round((recordDate.getTime() - birthDate.getTime()) / msPerMonth),
  );

  // Corrected age (preterm adjustment)
  const correctedAgeMonths = computeCorrectedAgeMonths(ageMonths, isPreterm, gestationalAgeWeeks);

  // Effective age for WHO lookup
  const effectiveAgeMonths = correctedAgeMonths !== null ? correctedAgeMonths : ageMonths;

  // BMI
  const bmi = computeBMI(weightKg, heightCm);

  // WHO reference at effective age
  const ref = interpolateReference(effectiveAgeMonths, gender);

  // Z-scores and statuses
  const weightStatus = weightKg != null
    ? zScoreToStatus(computeZScore(weightKg, ref.weightMedian, ref.weightSD))
    : null;

  const heightStatus = heightCm != null
    ? zScoreToStatus(computeZScore(heightCm, ref.heightMedian, ref.heightSD))
    : null;

  const bmiStatus = bmi != null
    ? zScoreToStatus(computeZScore(bmi, ref.bmiMedian, ref.bmiSD))
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
// Returns colored band boundaries for the chart background overlay
// Call this once per chart render to get the reference zone data
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceBand {
  ageMonths: number;
  // Weight bands (kg)
  weightNormalMin: number;
  weightNormalMax: number;
  weightModerateMin: number; // -3 SD
  weightSevereBelow: number; // < -3 SD boundary
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
  return WHO_REFERENCE[gender].map((ref) => ({
    ageMonths: ref.ageMonths,
    // Normal band = median ± 2SD
    weightNormalMin: parseFloat((ref.weightMedian - 2 * ref.weightSD).toFixed(2)),
    weightNormalMax: parseFloat((ref.weightMedian + 2 * ref.weightSD).toFixed(2)),
    // Moderate band lower boundary = median - 3SD
    weightModerateMin: parseFloat((ref.weightMedian - 3 * ref.weightSD).toFixed(2)),
    // Severe boundary (anything below -3SD)
    weightSevereBelow: parseFloat((ref.weightMedian - 3 * ref.weightSD).toFixed(2)),

    heightNormalMin: parseFloat((ref.heightMedian - 2 * ref.heightSD).toFixed(2)),
    heightNormalMax: parseFloat((ref.heightMedian + 2 * ref.heightSD).toFixed(2)),
    heightModerateMin: parseFloat((ref.heightMedian - 3 * ref.heightSD).toFixed(2)),

    bmiNormalMin: parseFloat((ref.bmiMedian - 2 * ref.bmiSD).toFixed(2)),
    bmiNormalMax: parseFloat((ref.bmiMedian + 2 * ref.bmiSD).toFixed(2)),
    bmiModerateMin: parseFloat((ref.bmiMedian - 3 * ref.bmiSD).toFixed(2)),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TAILWIND COLOR MAPPING
// Use these in your chart components and table cells
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
    chartColor: '#22c55e', // green-500
  },
  MODERATE: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    chartColor: '#eab308', // yellow-500
  },
  SEVERE: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    chartColor: '#ef4444', // red-500
  },
};

// Helper: get Tailwind classes for a status value from the DB
export function getStatusStyles(status: string | null | undefined) {
  if (!status) return GROWTH_STATUS_STYLES.NORMAL;
  return GROWTH_STATUS_STYLES[status as GrowthStatus] ?? GROWTH_STATUS_STYLES.NORMAL;
}