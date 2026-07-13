import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch all ongoing growth records for a child
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

    // Fetch the child to verify existence and get mother details
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        mother: true,
      },
    });

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Role Guard: MOTHER can only view her own child's records
    if (session.user.role === 'MOTHER') {
      if (child.motherId !== session.user.motherId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Role Guard: MIDWIFE can only view records for assigned mothers
    if (session.user.role === 'MIDWIFE') {
      if (child.mother.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const records = await prisma.childGrowthRecord.findMany({
      where: { childId },
      orderBy: { recordDate: 'desc' },
    });

    // Serialize Decimals for JSON
    const serializedRecords = records.map((r) => ({
      ...r,
      weightKg: Number(r.weightKg),
      lengthCm: Number(r.lengthCm),
      headCircumferenceCm: Number(r.headCircumferenceCm),
    }));

    return NextResponse.json({ data: serializedRecords });
  } catch (error) {
    console.error('GET child ongoing growth records error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ongoing growth records' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Log a new ongoing child growth record (Midwife & Admin only)
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

    // Fetch child to verify existence and check age restriction
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        mother: true,
      },
    });

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Role Guard: MIDWIFE can only record for assigned mothers
    if (session.user.role === 'MIDWIFE') {
      if (child.mother.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json(
          { error: 'Forbidden: Mother is not assigned to you' },
          { status: 403 },
        );
      }
    }

    const body = await req.json();
    const { recordDate, weightKg, lengthCm, headCircumferenceCm, notes } = body;

    // Validate inputs
    if (weightKg == null || lengthCm == null || headCircumferenceCm == null) {
      return NextResponse.json(
        { error: 'Weight, Length, and Head Circumference are required' },
        { status: 400 },
      );
    }

    const parsedWeight = parseFloat(weightKg);
    const parsedLength = parseFloat(lengthCm);
    const parsedHeadCircumference = parseFloat(headCircumferenceCm);

    if (isNaN(parsedWeight) || isNaN(parsedLength) || isNaN(parsedHeadCircumference)) {
      return NextResponse.json(
        { error: 'Measurements must be valid numeric values' },
        { status: 400 },
      );
    }

    const visitDate = recordDate ? new Date(recordDate) : new Date();

    // Verify child's age is under 5 years (60 months)
    const birthDateObj = new Date(child.birthDate);
    const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
    const ageMonths = Math.round((visitDate.getTime() - birthDateObj.getTime()) / msPerMonth);
    if (ageMonths > 60) {
      return NextResponse.json(
        { error: 'Growth measurements can only be tracked for children under 5 years of age (60 months)' },
        { status: 400 },
      );
    }

    // Save to database
    const record = await prisma.childGrowthRecord.create({
      data: {
        childId,
        recordDate: visitDate,
        weightKg: parsedWeight,
        lengthCm: parsedLength,
        headCircumferenceCm: parsedHeadCircumference,
        notes: notes || null,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'ChildGrowthRecord',
        entityId: record.id,
        details: `Ongoing child growth record added for child ${childId} — Age: ${ageMonths}m, Weight: ${parsedWeight}kg, Length: ${parsedLength}cm, Head: ${parsedHeadCircumference}cm`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Growth record saved successfully',
        data: {
          ...record,
          weightKg: Number(record.weightKg),
          lengthCm: Number(record.lengthCm),
          headCircumferenceCm: Number(record.headCircumferenceCm),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST child ongoing growth record error:', error);
    return NextResponse.json(
      { error: 'Failed to save ongoing growth record' },
      { status: 500 },
    );
  }
}
