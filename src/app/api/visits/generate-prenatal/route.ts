import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { motherId } = body;

    if (!motherId) {
      return NextResponse.json({ error: 'motherId is required' }, { status: 400 });
    }

    // Get mother details
    const mother = await prisma.mother.findUnique({
      where: { id: motherId },
      include: {
        user: true,
      },
    });

    if (!mother) {
      return NextResponse.json({ error: 'Mother not found' }, { status: 404 });
    }

    if (mother.needsSpecialAttention) {
      return NextResponse.json(
        { error: 'Mother requires special attention care. Please schedule visits manually.' },
        { status: 400 }
      );
    }

    // Check if there are any scheduled ANTENATAL visits in the future
    const scheduledFutureVisits = await prisma.visit.findMany({
      where: {
        motherId,
        visitType: 'ANTENATAL',
        status: 'SCHEDULED',
        visitDate: { gte: new Date() },
      },
      orderBy: { visitDate: 'desc' },
    });

    if (scheduledFutureVisits.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A prenatal visit is already scheduled.',
        data: scheduledFutureVisits[0],
      });
    }

    // Find the last completed or scheduled antenatal visit
    const lastVisit = await prisma.visit.findFirst({
      where: {
        motherId,
        visitType: 'ANTENATAL',
      },
      orderBy: { visitDate: 'desc' },
    });

    const lastVisitDate = lastVisit ? lastVisit.visitDate : null;

    // Determine the next visit date (30 days after last visit, or today if no visits exist)
    const nextVisitDate = new Date(lastVisitDate || new Date());
    if (lastVisitDate) {
      nextVisitDate.setDate(nextVisitDate.getDate() + 30);
    } else {
      nextVisitDate.setDate(nextVisitDate.getDate() + 30); // 30 days from now if first visit
    }
    
    // If nextVisitDate is in the past, adjust it to tomorrow or today
    const today = new Date();
    if (nextVisitDate < today) {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      nextVisitDate.setTime(tomorrow.getTime());
    }

    // Create the visit
    const visit = await prisma.visit.create({
      data: {
        motherId,
        midwifeId: mother.assignedMidwifeId || session.user.midwifeId || '',
        visitType: 'ANTENATAL',
        visitDate: nextVisitDate,
        notes: 'Auto-generated monthly prenatal visit (Normal Care)',
        status: 'SCHEDULED',
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: mother.userId,
        title: 'Monthly Visit Scheduled',
        message: `Your next monthly prenatal visit has been scheduled for ${nextVisitDate.toLocaleDateString()}`,
        type: 'VISIT_REMINDER',
        link: '/visits',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly prenatal visit generated successfully',
      data: visit,
    });
  } catch (error) {
    console.error('Generate prenatal visit error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prenatal visit' },
      { status: 500 }
    );
  }
}
