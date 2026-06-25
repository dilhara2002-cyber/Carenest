import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get visits
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');
    const midwifeId = searchParams.get('midwifeId');
    const status = searchParams.get('status');
    const visitType = searchParams.get('visitType');
    const upcoming = searchParams.get('upcoming');

    const where: Record<string, any> = {};

    if (motherId) where.motherId = motherId;
    if (midwifeId) where.midwifeId = midwifeId;
    if (status) where.status = status;
    if (visitType) where.visitType = visitType;

    // If viewing upcoming visits
    if (upcoming === 'true') {
      where.visitDate = { gte: new Date() };
      where.status = 'SCHEDULED';
    }

    // Role-based filtering
    if (session.user.role === 'MOTHER' && session.user.motherId) {
      where.motherId = session.user.motherId;
    } else if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      where.midwifeId = session.user.midwifeId;
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        mother: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        midwife: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        child: {
          select: { id: true, name: true, gender: true, birthDate: true },
        },
      },
      orderBy: { visitDate: 'asc' },
    });

    return NextResponse.json({ data: visits });
  } catch (error) {
    console.error('Get visits error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}

// Schedule visit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      motherId,
      visitType,
      visitDate,
      notes,
      postnatalVisitNumber,
      postnatalWindowStart,
      postnatalWindowEnd,
      isPostnatalMandatory,
      isMohVisitRequired,
      childId,
    } = body;

    // Validate postnatal visit date window
    if (visitType === 'POSTNATAL' && isPostnatalMandatory && postnatalWindowStart && postnatalWindowEnd) {
      const vDate = new Date(visitDate);
      const start = new Date(postnatalWindowStart);
      const end = new Date(postnatalWindowEnd);
      if (vDate < start || vDate > end) {
        return NextResponse.json(
          { error: `Visit date must fall within the mandatory postnatal window (${start.toLocaleDateString()} to ${end.toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    const visit = await prisma.visit.create({
      data: {
        motherId,
        midwifeId: session.user.midwifeId || body.midwifeId,
        visitType,
        visitDate: new Date(visitDate),
        notes,
        status: 'SCHEDULED',
        postnatalVisitNumber: postnatalVisitNumber ? parseInt(postnatalVisitNumber) : null,
        postnatalWindowStart: postnatalWindowStart ? new Date(postnatalWindowStart) : null,
        postnatalWindowEnd: postnatalWindowEnd ? new Date(postnatalWindowEnd) : null,
        isPostnatalMandatory: isPostnatalMandatory || false,
        isMohVisitRequired: isMohVisitRequired || false,
        childId: childId || null,
      },
    });

    // Create notification for mother
    const mother = await prisma.mother.findUnique({
      where: { id: motherId },
      include: { user: true },
    });

    if (mother) {
      await prisma.notification.create({
        data: {
          userId: mother.userId,
          title: 'Visit Scheduled',
          message: `A ${visitType.toLowerCase()} visit has been scheduled for ${new Date(visitDate).toLocaleDateString()}`,
          type: 'VISIT_REMINDER',
          link: '/visits',
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VISIT_SCHEDULED',
        entity: 'Visit',
        entityId: visit.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Visit scheduled successfully',
      data: visit,
    });
  } catch (error) {
    console.error('Create visit error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule visit' },
      { status: 500 }
    );
  }
}

// Update visit (complete, cancel, reschedule)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    const currentVisit = await prisma.visit.findUnique({
      where: { id },
    });
    if (!currentVisit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (updateData.visitDate) {
      updateData.visitDate = new Date(updateData.visitDate);
    }
    if (updateData.postnatalWindowStart) {
      updateData.postnatalWindowStart = new Date(updateData.postnatalWindowStart);
    }
    if (updateData.postnatalWindowEnd) {
      updateData.postnatalWindowEnd = new Date(updateData.postnatalWindowEnd);
    }

    // Validate postnatal visit date window during update/reschedule
    if (updateData.visitDate && (updateData.isPostnatalMandatory || currentVisit.isPostnatalMandatory)) {
      const vDate = new Date(updateData.visitDate);
      const start = updateData.postnatalWindowStart ? new Date(updateData.postnatalWindowStart) : (currentVisit.postnatalWindowStart ? new Date(currentVisit.postnatalWindowStart) : null);
      const end = updateData.postnatalWindowEnd ? new Date(updateData.postnatalWindowEnd) : (currentVisit.postnatalWindowEnd ? new Date(currentVisit.postnatalWindowEnd) : null);
      if (start && end && (vDate < start || vDate > end)) {
        return NextResponse.json(
          { error: `Visit date must fall within the mandatory postnatal window (${start.toLocaleDateString()} to ${end.toLocaleDateString()})` },
          { status: 400 }
        );
      }
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: updateData,
    });

    // If completing visit, create notification
    if (updateData.status === 'COMPLETED') {
      const motherData = await prisma.mother.findUnique({
        where: { id: visit.motherId },
      });

      if (motherData) {
        await prisma.notification.create({
          data: {
            userId: motherData.userId,
            title: 'Visit Completed',
            message: `Your ${visit.visitType.toLowerCase()} visit has been completed. Check the notes for details.`,
            type: 'SYSTEM',
            link: '/visits',
          },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `VISIT_${updateData.status || 'UPDATED'}`,
        entity: 'Visit',
        entityId: visit.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Visit updated',
      data: visit,
    });
  } catch (error) {
    console.error('Update visit error:', error);
    return NextResponse.json(
      { error: 'Failed to update visit' },
      { status: 500 }
    );
  }
}
