import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/mother-growth
// MOTHER  → own records only
// MIDWIFE → records for their assigned mothers
// ADMIN   → all records; supports ?motherId= filter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherIdParam = searchParams.get('motherId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (session.user.role === 'MOTHER') {
      // Mothers can only see their own records
      if (!session.user.motherId) {
        return NextResponse.json({ data: [] });
      }
      where.motherId = session.user.motherId;
    } else if (session.user.role === 'MIDWIFE') {
      if (motherIdParam) {
        // Verify that the requested mother is assigned to this midwife
        const mother = await prisma.mother.findUnique({
          where: { id: motherIdParam },
          select: { assignedMidwifeId: true },
        });
        if (mother?.assignedMidwifeId !== session.user.midwifeId) {
          return NextResponse.json(
            { error: 'Forbidden: mother not assigned to you' },
            { status: 403 }
          );
        }
        where.motherId = motherIdParam;
      } else {
        // Return records for all of this midwife's assigned mothers
        where.mother = { assignedMidwifeId: session.user.midwifeId };
      }
    } else if (session.user.role === 'ADMIN') {
      if (motherIdParam) {
        where.motherId = motherIdParam;
      }
    }

    const records = await prisma.motherGrowthRecord.findMany({
      where,
      include: {
        mother: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
        recordedBy: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { recordDate: 'desc' },
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('GET mother-growth error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth records' },
      { status: 500 }
    );
  }
}

// POST /api/mother-growth  — Midwife & Admin only
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized — only Midwives and Admins can record growth data' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { motherId, recordDate, weightKg, sfhCm, notes } = body;

    if (!motherId) {
      return NextResponse.json({ error: 'motherId is required' }, { status: 400 });
    }
    if (weightKg === undefined || weightKg === null || weightKg === '') {
      return NextResponse.json({ error: 'weightKg is required' }, { status: 400 });
    }

    // Resolve the midwifeId of the current user (Admin records under their own ID, or use provided)
    let recordedById = session.user.midwifeId;

    if (session.user.role === 'ADMIN') {
      // For admin, find the midwife record for this user (if it exists), else use the mother's midwife
      const adminMidwife = await prisma.midwife.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (adminMidwife) {
        recordedById = adminMidwife.id;
      } else {
        // Fall back to the assigned midwife of the mother
        const mother = await prisma.mother.findUnique({
          where: { id: motherId },
          select: { assignedMidwifeId: true },
        });
        recordedById = mother?.assignedMidwifeId ?? undefined;
      }
    }

    if (!recordedById) {
      return NextResponse.json(
        { error: 'Could not resolve a midwife to attribute this record to' },
        { status: 400 }
      );
    }

    // For midwife role: verify they are assigned to this mother
    if (session.user.role === 'MIDWIFE') {
      const mother = await prisma.mother.findUnique({
        where: { id: motherId },
        select: { assignedMidwifeId: true },
      });
      if (mother?.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json(
          { error: 'Forbidden: this mother is not assigned to you' },
          { status: 403 }
        );
      }
    }

    const record = await prisma.motherGrowthRecord.create({
      data: {
        motherId,
        recordedById,
        recordDate: recordDate ? new Date(recordDate) : new Date(),
        weightKg: parseFloat(weightKg),
        sfhCm: sfhCm !== undefined && sfhCm !== '' ? parseFloat(sfhCm) : null,
        notes: notes || null,
      },
      include: {
        mother: { select: { id: true, user: { select: { name: true, email: true } } } },
        recordedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'MotherGrowthRecord',
        entityId: record.id,
        details: `Weight: ${weightKg} kg, SFH: ${sfhCm ?? 'N/A'} cm for mother ${motherId}`,
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('POST mother-growth error:', error);
    return NextResponse.json(
      { error: 'Failed to create growth record' },
      { status: 500 }
    );
  }
}
