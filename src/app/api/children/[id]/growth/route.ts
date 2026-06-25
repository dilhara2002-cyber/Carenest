// src/app/api/children/[id]/growth/route.ts
// GET  /api/children/[id]/growth  — fetch chronological growth records for chart
// POST /api/children/[id]/growth  — save a new midwife clinic visit record

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { computeGrowthMetrics, getReferenceBands } from '@/lib/growthUtils';

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch all growth records for a child + WHO reference bands for chart
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: childId } = await params;

    // Fetch child with preterm info
    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        birthWeight: true,
        birthHeight: true,
        isPreterm: true,
        gestationalAgeWeeks: true,
        motherId: true,
        growthRecords: {
          orderBy: { recordDate: 'asc' },
          select: {
            id: true,
            recordDate: true,
            ageMonths: true,
            correctedAgeMonths: true,
            weight: true,
            height: true,
            bmi: true,
            headCircumference: true,
            weightStatus: true,
            heightStatus: true,
            bmiStatus: true,
            zScoreWeight: true,
            zScoreHeight: true,
            zScoreBmi: true,
            notes: true,
          },
        },
      },
    });

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Role guard: MOTHER can only see her own children
    if (session.user.role === 'MOTHER') {
      const mother = await prisma.mother.findUnique({
        where: { id: session.user.motherId ?? '' },
        select: { id: true },
      });
      if (!mother || child.motherId !== mother.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // WHO reference bands for chart background zones
    const referenceBands = getReferenceBands(child.gender as 'MALE' | 'FEMALE');

    // Serialize Decimal fields to numbers for JSON
    const records = child.growthRecords.map((r) => ({
      ...r,
      weight: r.weight != null ? Number(r.weight) : null,
      height: r.height != null ? Number(r.height) : null,
      bmi: r.bmi != null ? Number(r.bmi) : null,
      headCircumference: r.headCircumference != null ? Number(r.headCircumference) : null,
      zScoreWeight: r.zScoreWeight != null ? Number(r.zScoreWeight) : null,
      zScoreHeight: r.zScoreHeight != null ? Number(r.zScoreHeight) : null,
      zScoreBmi: r.zScoreBmi != null ? Number(r.zScoreBmi) : null,
    }));

    return NextResponse.json({
      data: {
        child: {
          id: child.id,
          name: child.name,
          gender: child.gender,
          birthDate: child.birthDate,
          isPreterm: child.isPreterm,
          gestationalAgeWeeks: child.gestationalAgeWeeks,
          birthWeight: child.birthWeight != null ? Number(child.birthWeight) : null,
          birthHeight: child.birthHeight != null ? Number(child.birthHeight) : null,
        },
        records,
        referenceBands,
      },
    });
  } catch (error) {
    console.error('GET growth records error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth records' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — save a new growth record from a midwife clinic visit
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only MIDWIFE or ADMIN can record growth measurements
    if (!['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only midwives and admins can record growth measurements' },
        { status: 403 },
      );
    }

    const { id: childId } = await params;

    const body = await req.json();
    const {
      recordDate,      // ISO string — date of clinic visit
      weightKg,        // number | null
      heightCm,        // number | null
      headCircumference, // number | null
      notes,           // string | null
    } = body;

    // Validate at least one measurement provided
    if (weightKg == null && heightCm == null) {
      return NextResponse.json(
        { error: 'At least one measurement (weight or height) is required' },
        { status: 400 },
      );
    }

    // Fetch child for calculation inputs
    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        gender: true,
        birthDate: true,
        isPreterm: true,
        gestationalAgeWeeks: true,
        motherId: true,
      },
    });

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const visitDate = recordDate ? new Date(recordDate) : new Date();

    // ── Core calculations ──────────────────────────────────────────────────
    const computed = computeGrowthMetrics({
      birthDate: child.birthDate,
      recordDate: visitDate,
      gender: child.gender as 'MALE' | 'FEMALE',
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
      isPreterm: child.isPreterm,
      gestationalAgeWeeks: child.gestationalAgeWeeks,
    });
    // ──────────────────────────────────────────────────────────────────────

    // Save to database
    const growthRecord = await prisma.growthRecord.create({
      data: {
        childId,
        recordDate: visitDate,
        weight: weightKg != null ? weightKg : null,
        height: heightCm != null ? heightCm : null,
        headCircumference: headCircumference != null ? headCircumference : null,
        bmi: computed.bmi,
        ageMonths: computed.ageMonths,
        correctedAgeMonths: computed.correctedAgeMonths,
        zScoreWeight: computed.weightStatus?.zScore ?? null,
        zScoreHeight: computed.heightStatus?.zScore ?? null,
        zScoreBmi: computed.bmiStatus?.zScore ?? null,
        weightStatus: computed.weightStatus?.status ?? null,
        heightStatus: computed.heightStatus?.status ?? null,
        bmiStatus: computed.bmiStatus?.status ?? null,
        notes: notes ?? null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'GROWTH_RECORD_ADDED',
        entity: 'GrowthRecord',
        entityId: growthRecord.id,
        details: `Growth record added for child ${childId} — Age: ${computed.ageMonths}m${
          computed.correctedAgeMonths !== null
            ? ` (corrected: ${computed.correctedAgeMonths}m)`
            : ''
        }, Weight: ${weightKg ?? 'N/A'}kg, Height: ${heightCm ?? 'N/A'}cm`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Growth record saved successfully',
      data: {
        ...growthRecord,
        weight: growthRecord.weight != null ? Number(growthRecord.weight) : null,
        height: growthRecord.height != null ? Number(growthRecord.height) : null,
        bmi: growthRecord.bmi != null ? Number(growthRecord.bmi) : null,
        // Return computed status for immediate UI feedback
        computed: {
          ageMonths: computed.ageMonths,
          correctedAgeMonths: computed.correctedAgeMonths,
          effectiveAgeMonths: computed.effectiveAgeMonths,
          weightStatus: computed.weightStatus,
          heightStatus: computed.heightStatus,
          bmiStatus: computed.bmiStatus,
        },
      },
    });
  } catch (error) {
    console.error('POST growth record error:', error);
    return NextResponse.json(
      { error: 'Failed to save growth record' },
      { status: 500 },
    );
  }
}