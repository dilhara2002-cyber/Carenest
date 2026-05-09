import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPregnancyProgress } from '@/lib/utils';

// Get pregnancies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');
    const status = searchParams.get('status');

    const where: any = {};

    if (motherId) {
      where.motherId = motherId;
    }

    if (status) {
      where.status = status;
    }

    // Role-based filtering
    if (session.user.role === 'MOTHER' && session.user.motherId) {
      where.motherId = session.user.motherId;
    } else if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      where.mother = { assignedMidwifeId: session.user.midwifeId };
    }

    const pregnancies = await prisma.pregnancy.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedPregnancies = pregnancies.map((p) => {
      const progress = getPregnancyProgress(p.lastMenstrualPeriod);
      return {
        ...p,
        currentWeek: progress?.weeks ?? p.currentWeek,
        progress,
      };
    });

    return NextResponse.json({ data: enrichedPregnancies });
  } catch (error) {
    console.error('Get pregnancies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pregnancies' },
      { status: 500 }
    );
  }
}

// Create pregnancy (Admin/Midwife only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only Admin/Midwife can register pregnancies' }, { status: 401 });
    }

    const body = await req.json();
    const {
      motherId,
      lastMenstrualPeriod,
      expectedDeliveryDate,
      medicalNotes,
      highRisk,
      highRiskReasons,
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
          { error: 'You can only add pregnancies for your assigned mothers' },
          { status: 403 }
        );
      }
    }

    // Check if mother already has an active pregnancy
    const activePregnancy = await prisma.pregnancy.findFirst({
      where: { motherId, status: 'ACTIVE' },
    });

    if (activePregnancy) {
      return NextResponse.json(
        { error: 'This mother already has an active pregnancy' },
        { status: 400 }
      );
    }

    // Calculate expected delivery date if LMP provided
    let edd = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    if (!edd && lastMenstrualPeriod) {
      edd = new Date(lastMenstrualPeriod);
      edd.setDate(edd.getDate() + 280); // 40 weeks
    }

    // Calculate current week
    let currentWeek = null;
    if (lastMenstrualPeriod) {
      const lmp = new Date(lastMenstrualPeriod);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lmp.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      currentWeek = Math.floor(diffDays / 7);
    }

    const pregnancy = await prisma.pregnancy.create({
      data: {
        motherId,
        lastMenstrualPeriod: lastMenstrualPeriod ? new Date(lastMenstrualPeriod) : null,
        expectedDeliveryDate: edd,
        currentWeek,
        medicalNotes,
        highRisk: highRisk || false,
        highRiskReasons,
        status: 'ACTIVE',
      },
    });

    // Get mother's user for notification
    const mother = await prisma.mother.findUnique({
      where: { id: motherId },
      include: { user: true },
    });

    // Create notification for mother
    if (mother) {
      await prisma.notification.create({
        data: {
          userId: mother.userId,
          title: 'Pregnancy Registered',
          message: edd 
            ? `Your pregnancy has been registered. Expected delivery: ${edd.toLocaleDateString()}`
            : 'Your pregnancy has been registered.',
          type: 'INFO',
          link: '/pregnancies',
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PREGNANCY_CREATED',
        entity: 'Pregnancy',
        entityId: pregnancy.id,
        details: `Pregnancy registered for ${mother?.user?.name || 'mother'}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pregnancy record created',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Create pregnancy error:', error);
    return NextResponse.json(
      { error: 'Failed to create pregnancy record' },
      { status: 500 }
    );
  }
}

// Update pregnancy
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (updateData.lastMenstrualPeriod) {
      updateData.lastMenstrualPeriod = new Date(updateData.lastMenstrualPeriod);
      
      // Recalculate current week
      const lmp = new Date(updateData.lastMenstrualPeriod);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lmp.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      updateData.currentWeek = Math.floor(diffDays / 7);
    }

    if (updateData.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateData.expectedDeliveryDate);
    }

    const pregnancy = await prisma.pregnancy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Pregnancy updated',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Update pregnancy error:', error);
    return NextResponse.json(
      { error: 'Failed to update pregnancy' },
      { status: 500 }
    );
  }
}
