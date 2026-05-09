import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get single pregnancy
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

    const pregnancy = await prisma.pregnancy.findUnique({
      where: { id },
      include: {
        mother: {
          include: {
            user: { select: { name: true, email: true } },
            assignedMidwife: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!pregnancy) {
      return NextResponse.json({ error: 'Pregnancy not found' }, { status: 404 });
    }

    // Check access permissions
    if (session.user.role === 'MOTHER' && pregnancy.motherId !== session.user.motherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (session.user.role === 'MIDWIFE' && pregnancy.mother.assignedMidwifeId !== session.user.midwifeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ data: pregnancy });
  } catch (error) {
    console.error('Get pregnancy error:', error);
    return NextResponse.json({ error: 'Failed to fetch pregnancy' }, { status: 500 });
  }
}

// Update pregnancy (Admin/Midwife only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only Admin/Midwife can update pregnancy records' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Find the pregnancy first
    const existingPregnancy = await prisma.pregnancy.findUnique({
      where: { id },
      include: { mother: true },
    });

    if (!existingPregnancy) {
      return NextResponse.json({ error: 'Pregnancy not found' }, { status: 404 });
    }

    // Midwife can only update pregnancies for their assigned mothers
    if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      if (existingPregnancy.mother.assignedMidwifeId !== session.user.midwifeId) {
        return NextResponse.json(
          { error: 'You can only update pregnancies for your assigned mothers' },
          { status: 403 }
        );
      }
    }

    const {
      lastMenstrualPeriod,
      expectedDeliveryDate,
      currentWeek,
      status,
      highRisk,
      highRiskReasons,
      medicalNotes,
      bloodPressure,
      weight,
      gravida,
      para,
    } = body;

    // Build update data
    const updateData: any = {};

    if (lastMenstrualPeriod !== undefined) {
      updateData.lastMenstrualPeriod = new Date(lastMenstrualPeriod);
      // Recalculate expected delivery date (40 weeks from LMP)
      const lmp = new Date(lastMenstrualPeriod);
      const edd = new Date(lmp);
      edd.setDate(edd.getDate() + 280);
      updateData.expectedDeliveryDate = edd;
      // Calculate current week
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
      updateData.currentWeek = Math.floor(diffDays / 7);
    }

    if (expectedDeliveryDate !== undefined && !lastMenstrualPeriod) {
      updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
    }

    if (currentWeek !== undefined && !lastMenstrualPeriod) {
      updateData.currentWeek = parseInt(currentWeek);
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (highRisk !== undefined) {
      updateData.highRisk = highRisk;
    }

    if (highRiskReasons !== undefined) {
      updateData.highRiskReasons = highRiskReasons;
    }

    if (medicalNotes !== undefined) {
      updateData.medicalNotes = medicalNotes;
    }

    if (bloodPressure !== undefined) {
      updateData.bloodPressure = bloodPressure;
    }

    if (weight !== undefined) {
      updateData.weight = weight ? parseFloat(weight) : null;
    }

    if (gravida !== undefined) {
      updateData.gravida = gravida ? parseInt(gravida) : null;
    }

    if (para !== undefined) {
      updateData.para = para ? parseInt(para) : null;
    }

    const pregnancy = await prisma.pregnancy.update({
      where: { id },
      data: updateData,
      include: {
        mother: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PREGNANCY_UPDATED',
        entity: 'Pregnancy',
        entityId: id,
        details: `Pregnancy record updated for ${pregnancy.mother.user.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pregnancy updated successfully',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Update pregnancy error:', error);
    return NextResponse.json({ error: 'Failed to update pregnancy' }, { status: 500 });
  }
}

// Delete pregnancy (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Only Admin can delete pregnancy records' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const pregnancy = await prisma.pregnancy.findUnique({
      where: { id },
      include: { mother: { include: { user: true } } },
    });

    if (!pregnancy) {
      return NextResponse.json({ error: 'Pregnancy not found' }, { status: 404 });
    }

    await prisma.pregnancy.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PREGNANCY_DELETED',
        entity: 'Pregnancy',
        entityId: id,
        details: `Pregnancy record deleted for ${pregnancy.mother.user.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pregnancy deleted successfully',
    });
  } catch (error) {
    console.error('Delete pregnancy error:', error);
    return NextResponse.json({ error: 'Failed to delete pregnancy' }, { status: 500 });
  }
}
