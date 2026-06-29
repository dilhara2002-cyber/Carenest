import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculatePregnancyWeek(lmp: Date | string | null): number | null {
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lmpDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  return weeks > 0 && weeks <= 42 ? weeks : null;
}

export function calculateBMI(weight: number, height: number): number {
  // Weight in kg, height in cm
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
}

export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function getExpectedDeliveryDate(lmp: Date | string): Date {
  const lmpDate = new Date(lmp);
  const edd = new Date(lmpDate);
  edd.setDate(edd.getDate() + 280); // 40 weeks
  return edd;
}

export function getPregnancyTrimester(week: number): string {
  if (week <= 12) return 'First Trimester';
  if (week <= 26) return 'Second Trimester';
  return 'Third Trimester';
}

export interface PregnancyProgress {
  weeks: number;
  days: number;
  totalDays: number;
  month: number;
  trimester: number;
  trimesterLabel: string;
  percentComplete: number;
  expectedDeliveryDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
}

export function getPregnancyProgress(lmp: Date | string | null | undefined): PregnancyProgress | null {
  if (!lmp) return null;

  const lmpDate = new Date(lmp);
  if (isNaN(lmpDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lmpNorm = new Date(lmpDate);
  lmpNorm.setHours(0, 0, 0, 0);

  const totalDays = Math.floor((today.getTime() - lmpNorm.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return null;

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  // Gestational month: ~4.345 weeks per month, capped at 10
  const month = Math.min(Math.floor(weeks / 4.345) + 1, 10);

  // Trimester
  let trimester: number;
  let trimesterLabel: string;
  if (weeks <= 12) {
    trimester = 1;
    trimesterLabel = 'First Trimester';
  } else if (weeks <= 26) {
    trimester = 2;
    trimesterLabel = 'Second Trimester';
  } else {
    trimester = 3;
    trimesterLabel = 'Third Trimester';
  }

  // EDD = LMP + 280 days (40 weeks)
  const edd = new Date(lmpNorm);
  edd.setDate(edd.getDate() + 280);

  const daysRemaining = Math.max(0, Math.floor((edd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const isOverdue = totalDays > 280;
  const percentComplete = Math.min(Math.round((totalDays / 280) * 100), 100);

  return {
    weeks,
    days,
    totalDays,
    month,
    trimester,
    trimesterLabel,
    percentComplete,
    expectedDeliveryDate: edd,
    daysRemaining,
    isOverdue,
  };
}

export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const vaccineSchedule = {
  maternal: [
    { name: 'Tetanus Toxoid (TT1)', week: 16 },
    { name: 'Tetanus Toxoid (TT2)', week: 20 },
    { name: 'Tetanus Toxoid (TT3)', week: 24 },
  ],
  child: [
    { name: 'BCG', ageMonths: 0 },
    { name: 'Hepatitis B (Birth dose)', ageMonths: 0 },
    { name: 'Pentavalent 1', ageMonths: 2 },
    { name: 'OPV 1', ageMonths: 2 },
    { name: 'Pentavalent 2', ageMonths: 4 },
    { name: 'OPV 2', ageMonths: 4 },
    { name: 'Pentavalent 3', ageMonths: 6 },
    { name: 'OPV 3', ageMonths: 6 },
    { name: 'MMR 1', ageMonths: 9 },
    { name: 'Japanese Encephalitis', ageMonths: 12 },
    { name: 'MMR 2', ageMonths: 18 },
    { name: 'DPT Booster', ageMonths: 18 },
  ],
};

export interface PostnatalVisitWindow {
  visitNumber: number;
  windowStart: Date;
  windowEnd: Date;
  suggestedDate: Date;
  isMohVisitRequired: boolean;
}

export function getPostnatalVisitSchedule(birthDate: Date | string): PostnatalVisitWindow[] {
  const base = new Date(birthDate);
  base.setHours(0, 0, 0, 0);

  const getOffsetDate = (days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  return [
    {
      visitNumber: 1,
      windowStart: getOffsetDate(0),
      windowEnd: getOffsetDate(5),
      suggestedDate: getOffsetDate(3),
      isMohVisitRequired: false,
    },
    {
      visitNumber: 2,
      windowStart: getOffsetDate(6),
      windowEnd: getOffsetDate(10),
      suggestedDate: getOffsetDate(8),
      isMohVisitRequired: false,
    },
    {
      visitNumber: 3,
      windowStart: getOffsetDate(14),
      windowEnd: getOffsetDate(21),
      suggestedDate: getOffsetDate(18),
      isMohVisitRequired: true,
    },
    {
      visitNumber: 4,
      windowStart: getOffsetDate(42),
      windowEnd: getOffsetDate(42),
      suggestedDate: getOffsetDate(42),
      isMohVisitRequired: false,
    },
  ];
}

export function isMonthlyPrenatalVisitDue(lastVisitDate: Date | string | null | undefined): boolean {
  if (!lastVisitDate) return true;
  const last = new Date(lastVisitDate);
  const today = new Date();
  const diffTime = today.getTime() - last.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 30;
}
