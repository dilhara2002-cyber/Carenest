import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get children
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');

    const where: {
      motherId?: string;
      mother?: {
        assignedMidwifeId?: string;
      };
    } = {};

    if (motherId) {
      where.motherId = motherId;
    }

    // Role-based filtering
    if (session.user.role === 'MOTHER' && session.user.motherId) {
      where.motherId = session.user.motherId;
    } else if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      where.mother = { assignedMidwifeId: session.user.midwifeId };
    }

    const children = await prisma.child.findMany({
      where,
      include: {
        mother: {
          include: {
            user: {
              select: { name: true, email: true },
            },
            assignedMidwife: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
        growthRecords: {
          orderBy: { recordDate: 'asc' },
        },
        vaccinations: {
          orderBy: { scheduledDate: 'asc' },
        },
      },
      orderBy: { birthDate: 'desc' },
    });

    return NextResponse.json({ data: children });
  } catch (error) {
    console.error('Get children error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

// Register child (Admin/Midwife only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only Admin/Midwife can register children' }, { status: 401 });
    }

    const body = await req.json();
    const {
      motherId,
      name,
      gender,
      birthDate,
      birthWeight,
      birthHeight,
      birthTime,
      birthPlace,
      healthNotes,
    } = body;

    if (!motherId) {
      return NextResponse.json({ error: 'Mother ID is required' }, { status: 400 });
    }

    // For midwife, verify the mother is assigned to them
    if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      const mother = await prisma.mother.findUnique({
        where: { id: motherId },
      });
      if (mother?.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json(
          { error: 'You can only register children for your assigned mothers' },
          { status: 403 }
        );
      }
    }

    const child = await prisma.child.create({
      data: {
        motherId,
        name,
        gender,
        birthDate: new Date(birthDate),
        birthWeight: birthWeight ? parseFloat(birthWeight) : null,
        birthHeight: birthHeight ? parseFloat(birthHeight) : null,
        birthTime,
        birthPlace,
        healthNotes,
      },
    });

    // Update mother's pregnancy status to DELIVERED
    await prisma.pregnancy.updateMany({
      where: {
        motherId,
        status: 'ACTIVE',
      },
      data: {
        status: 'DELIVERED',
      },
    });

    // Create initial growth record
    if (birthWeight || birthHeight) {
      await prisma.growthRecord.create({
        data: {
          childId: child.id,
          weight: birthWeight ? parseFloat(birthWeight) : null,
          height: birthHeight ? parseFloat(birthHeight) : null,
          notes: 'Birth measurements',
        },
      });
    }

    // Create standard vaccination schedule
    const vaccineSchedule = [
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
    ];

    const birthDateObj = new Date(birthDate);
    const vaccinations = vaccineSchedule.map((vaccine) => {
      const scheduledDate = new Date(birthDateObj);
      scheduledDate.setMonth(scheduledDate.getMonth() + vaccine.ageMonths);
      return {
        childId: child.id,
        vaccineName: vaccine.name,
        scheduledDate,
        status: 'PENDING' as const,
      };
    });

    await prisma.vaccination.createMany({
      data: vaccinations,
    });

    // Get mother for notification
    const mother = await prisma.mother.findUnique({
      where: { id: motherId },
      include: { user: true },
    });

    // Create notification for mother
    if (mother) {
      await prisma.notification.create({
        data: {
          userId: mother.userId,
          title: 'Child Registered',
          message: `${name} has been registered. Vaccination schedule has been created.`,
          type: 'INFO',
          link: '/children',
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHILD_REGISTERED',
        entity: 'Child',
        entityId: child.id,
        details: `Child ${name} registered for ${mother?.user?.name || 'mother'}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Child registered successfully',
      data: child,
    });
  } catch (error) {
    console.error('Create child error:', error);
    return NextResponse.json(
      { error: 'Failed to register child' },
      { status: 500 }
    );
  }
}

// Update child
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate);
    }

    const child = await prisma.child.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Child updated',
      data: child,
    });
  } catch (error) {
    console.error('Update child error:', error);
    return NextResponse.json(
      { error: 'Failed to update child' },
      { status: 500 }
    );
  }
}
