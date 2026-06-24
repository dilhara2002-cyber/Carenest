import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to check authorization and get the child
async function getChildAndCheckPermission(
  childId: string,
  session: any,
  allowedRoles: string[]
): Promise<{ child: any; error: string | null; status: number | null }> {
  if (!session || !session.user) {
    return { child: null, error: 'Unauthorized', status: 401 };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return { child: null, error: 'Unauthorized', status: 401 };
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      mother: true,
    },
  });

  if (!child) {
    return { child: null, error: 'Child not found', status: 404 };
  }

  // Mother can only access if it is her child
  if (session.user.role === 'MOTHER' && child.motherId !== session.user.motherId) {
    return { child: null, error: 'Forbidden - Not your child', status: 403 };
  }

  // Midwife can only access if mother is assigned to her
  if (
    session.user.role === 'MIDWIFE' &&
    session.user.midwifeId &&
    child.mother.assignedMidwifeId !== session.user.midwifeId
  ) {
    return { child: null, error: 'Forbidden - Mother is not assigned to you', status: 403 };
  }

  return { child, error: null, status: null };
}

// GET all growth records for a child
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: childId } = await params;

    const { child, error, status } = await getChildAndCheckPermission(
      childId,
      session,
      ['MOTHER', 'MIDWIFE', 'ADMIN']
    );

    if (error || !child) {
      return NextResponse.json({ error: error || 'Child not found' }, { status: status || 404 });
    }

    const growthRecords = await prisma.growthRecord.findMany({
      where: { childId },
      orderBy: { recordDate: 'desc' },
    });

    return NextResponse.json({ data: growthRecords });
  } catch (error) {
    console.error('Get child growth records error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth records' },
      { status: 500 }
    );
  }
}

// POST new growth record (Admin/Midwife only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: childId } = await params;

    const { child, error, status } = await getChildAndCheckPermission(
      childId,
      session,
      ['MIDWIFE', 'ADMIN']
    );

    if (error || !child) {
      return NextResponse.json({ error: error || 'Child not found' }, { status: status || 404 });
    }

    const body = await req.json();
    const { weight, height, headCircumference, recordDate, notes } = body;

    if (weight === undefined || height === undefined) {
      return NextResponse.json(
        { error: 'Weight and height are required' },
        { status: 400 }
      );
    }

    const weightVal = Number(weight);
    const heightVal = Number(height);
    const headCircumferenceVal = headCircumference ? Number(headCircumference) : null;

    if (isNaN(weightVal) || weightVal <= 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      );
    }

    if (isNaN(heightVal) || heightVal <= 0) {
      return NextResponse.json(
        { error: 'Height must be a positive number' },
        { status: 400 }
      );
    }

    // Calculate BMI: weight (kg) / (height (m) ^ 2)
    const heightInMeters = heightVal / 100;
    const bmiVal = Number((weightVal / (heightInMeters * heightInMeters)).toFixed(2));

    const record = await prisma.growthRecord.create({
      data: {
        childId,
        weight: weightVal,
        height: heightVal,
        headCircumference: headCircumferenceVal,
        bmi: bmiVal,
        notes: notes || null,
        recordDate: recordDate ? new Date(recordDate) : new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHILD_GROWTH_RECORD_CREATED',
        entity: 'GrowthRecord',
        entityId: record.id,
        details: `Growth record added for ${child.name} (Weight: ${weightVal}kg, Height: ${heightVal}cm, BMI: ${bmiVal})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Growth record created successfully',
      data: record,
    });
  } catch (error) {
    console.error('Create child growth record error:', error);
    return NextResponse.json(
      { error: 'Failed to create growth record' },
      { status: 500 }
    );
  }
}

// DELETE a growth record (Admin/Midwife only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: childId } = await params;

    const { child, error, status } = await getChildAndCheckPermission(
      childId,
      session,
      ['MIDWIFE', 'ADMIN']
    );

    if (error || !child) {
      return NextResponse.json({ error: error || 'Child not found' }, { status: status || 404 });
    }

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { error: 'Growth record ID (recordId) is required' },
        { status: 400 }
      );
    }

    // Verify the record exists and belongs to this child
    const existingRecord = await prisma.growthRecord.findFirst({
      where: {
        id: recordId,
        childId,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Growth record not found for this child' },
        { status: 404 }
      );
    }

    await prisma.growthRecord.delete({
      where: { id: recordId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHILD_GROWTH_RECORD_DELETED',
        entity: 'GrowthRecord',
        entityId: recordId,
        details: `Growth record deleted for ${child.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Growth record deleted successfully',
    });
  } catch (error) {
    console.error('Delete child growth record error:', error);
    return NextResponse.json(
      { error: 'Failed to delete growth record' },
      { status: 500 }
    );
  }
}
