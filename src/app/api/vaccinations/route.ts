import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get vaccinations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');
    const childId = searchParams.get('childId');
    const midwifeId = searchParams.get('midwifeId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const upcoming = searchParams.get('upcoming');

    const where: Record<string, unknown> = {};

    // Search filter - search in vaccine name
    if (search) {
      where.vaccineName = { contains: search, mode: 'insensitive' };
    }

    // Midwife filter (for admin)
    if (midwifeId) {
      where.OR = [
        { mother: { assignedMidwifeId: midwifeId } },
        { child: { mother: { assignedMidwifeId: midwifeId } } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filters
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = new Date(dateFrom);
      if (dateTo) where.scheduledDate.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Get upcoming vaccinations
    if (upcoming === 'true') {
      where.status = 'PENDING';
      where.scheduledDate = {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      };
    }

    // Role-based filtering
    if (session.user.role === 'MOTHER' && session.user.motherId) {
      // Mothers see their own vaccinations and their children's
      where.OR = [
        { motherId: session.user.motherId },
        { child: { motherId: session.user.motherId } },
      ];
    } else if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      // Midwives see vaccinations for their assigned mothers and their children
      where.OR = [
        { mother: { assignedMidwifeId: session.user.midwifeId } },
        { child: { mother: { assignedMidwifeId: session.user.midwifeId } } },
      ];
      
      // Additional mother filter within assigned mothers
      if (motherId) {
        where.AND = [
          {
            OR: [
              { motherId: motherId },
              { child: { motherId: motherId } },
            ],
          },
        ];
      }
    } else if (session.user.role === 'ADMIN') {
      // Admin sees all vaccinations with optional mother filter
      if (motherId && !midwifeId) {
        where.OR = [
          { motherId: motherId },
          { child: { motherId: motherId } },
        ];
      }
    }

    // Child filter (for specific child)
    if (childId) {
      where.childId = childId;
    }

    const vaccinations = await prisma.vaccination.findMany({
      where,
      include: {
        mother: {
          include: {
            user: {
              select: { name: true },
            },
            assignedMidwife: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        child: {
          include: {
            mother: {
              include: {
                user: {
                  select: { name: true },
                },
                assignedMidwife: {
                  include: {
                    user: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ data: vaccinations });
  } catch (error) {
    console.error('Get vaccinations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaccinations' },
      { status: 500 }
    );
  }
}

// Create vaccination
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      motherId,
      childId,
      vaccineName,
      scheduledDate,
      notes,
    } = body;

    // For midwives, verify the mother is assigned to them
    if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      let targetMotherId = motherId;
      
      if (childId && !motherId) {
        const child = await prisma.child.findUnique({
          where: { id: childId },
        });
        targetMotherId = child?.motherId;
      }

      if (targetMotherId) {
        const mother = await prisma.mother.findUnique({
          where: { id: targetMotherId },
        });
        
        if (mother?.assignedMidwifeId !== session.user.midwifeId) {
          return NextResponse.json(
            { error: 'You can only add vaccinations for your assigned mothers' },
            { status: 403 }
          );
        }
      }
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        motherId: childId ? null : motherId,
        childId: childId || null,
        vaccineName,
        scheduledDate: new Date(scheduledDate),
        status: 'PENDING',
        notes,
      },
    });

    // Create notification
    let userId: string | null = null;
    if (motherId && !childId) {
      const mother = await prisma.mother.findUnique({ where: { id: motherId } });
      userId = mother?.userId || null;
    } else if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: { mother: true },
      });
      userId = child?.mother?.userId || null;
    }

    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Vaccination Scheduled',
          message: `${vaccineName} vaccination scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
          type: 'VACCINATION_REMINDER',
          link: '/vaccinations',
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VACCINATION_CREATED',
        entity: 'Vaccination',
        entityId: vaccination.id,
        details: `${vaccineName} scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vaccination scheduled',
      data: vaccination,
    });
  } catch (error) {
    console.error('Create vaccination error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule vaccination' },
      { status: 500 }
    );
  }
}

// Update vaccination (administer, miss, reschedule)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, administeredDate, batchNumber, administeredBy, notes, ...rest } = body;

    // Get current vaccination
    const currentVaccination = await prisma.vaccination.findUnique({
      where: { id },
      include: {
        mother: true,
        child: { include: { mother: true } },
      },
    });

    if (!currentVaccination) {
      return NextResponse.json({ error: 'Vaccination not found' }, { status: 404 });
    }

    // For midwives, verify the vaccination belongs to their assigned mother
    if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      const targetMotherId = currentVaccination.motherId || currentVaccination.child?.motherId;
      
      if (targetMotherId) {
        const mother = await prisma.mother.findUnique({
          where: { id: targetMotherId },
        });
        
        if (mother?.assignedMidwifeId !== session.user.midwifeId) {
          return NextResponse.json(
            { error: 'You can only update vaccinations for your assigned mothers' },
            { status: 403 }
          );
        }
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    
    if (status) updateData.status = status;
    if (administeredDate) updateData.administeredDate = new Date(administeredDate);
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    if (administeredBy) updateData.administeredBy = administeredBy;
    if (notes !== undefined) updateData.notes = notes;

    // Clear administered fields if status is not COMPLETED
    if (status && status !== 'COMPLETED') {
      updateData.administeredDate = null;
      updateData.administeredBy = null;
      updateData.batchNumber = null;
    }

    const vaccination = await prisma.vaccination.update({
      where: { id },
      data: updateData,
    });

    // Create notification for status change
    if (status && status !== currentVaccination.status) {
      const targetMotherId = currentVaccination.motherId || currentVaccination.child?.motherId;
      if (targetMotherId) {
        const mother = await prisma.mother.findUnique({ where: { id: targetMotherId } });
        if (mother) {
          const statusMessage = status === 'COMPLETED' 
            ? `${currentVaccination.vaccineName} vaccination has been completed.`
            : status === 'MISSED'
            ? `${currentVaccination.vaccineName} vaccination was marked as missed.`
            : `${currentVaccination.vaccineName} vaccination status updated.`;

          await prisma.notification.create({
            data: {
              userId: mother.userId,
              title: 'Vaccination Updated',
              message: statusMessage,
              type: 'VACCINATION_REMINDER',
              link: '/vaccinations',
            },
          });
        }
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `VACCINATION_${status || 'UPDATED'}`,
        entity: 'Vaccination',
        entityId: vaccination.id,
        details: `${currentVaccination.vaccineName} - Status: ${status || 'updated'}${administeredBy ? ` by ${administeredBy}` : ''}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vaccination updated',
      data: vaccination,
    });
  } catch (error) {
    console.error('Update vaccination error:', error);
    return NextResponse.json(
      { error: 'Failed to update vaccination' },
      { status: 500 }
    );
  }
}
