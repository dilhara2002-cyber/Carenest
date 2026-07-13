import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/mother-growth/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const record = await prisma.motherGrowthRecord.findUnique({
      where: { id },
      include: {
        mother: { select: { id: true, user: { select: { name: true, email: true } } } },
        recordedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // RBAC: mothers can only read their own records
    if (session.user.role === 'MOTHER' && record.motherId !== session.user.motherId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // RBAC: midwives can only read records of their assigned mothers
    if (session.user.role === 'MIDWIFE') {
      const mother = await prisma.mother.findUnique({
        where: { id: record.motherId },
        select: { assignedMidwifeId: true },
      });
      if (mother?.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error('GET mother-growth/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth record' },
      { status: 500 }
    );
  }
}

// PUT /api/mother-growth/[id]  — Midwife (own records) & Admin only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.motherGrowthRecord.findUnique({
      where: { id },
      select: { id: true, recordedById: true, motherId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Midwives can only update records they themselves created
    if (
      session.user.role === 'MIDWIFE' &&
      existing.recordedById !== session.user.midwifeId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: you can only edit records you created' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { recordDate, weightKg, sfhCm, notes } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (recordDate !== undefined) updateData.recordDate = new Date(recordDate);
    if (weightKg !== undefined && weightKg !== '')
      updateData.weightKg = parseFloat(weightKg);
    if (sfhCm !== undefined)
      updateData.sfhCm = sfhCm !== '' ? parseFloat(sfhCm) : null;
    if (notes !== undefined) updateData.notes = notes || null;

    const updated = await prisma.motherGrowthRecord.update({
      where: { id },
      data: updateData,
      include: {
        mother: { select: { id: true, user: { select: { name: true, email: true } } } },
        recordedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'MotherGrowthRecord',
        entityId: id,
        details: `Updated growth record for mother ${existing.motherId}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT mother-growth/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update growth record' },
      { status: 500 }
    );
  }
}
