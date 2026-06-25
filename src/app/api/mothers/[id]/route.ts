import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendMidwifeAssignmentEmails } from '@/lib/mailer';

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeMotherCoordinates<T extends { latitude: unknown; longitude: unknown }>(mother: T): T {
  return {
    ...mother,
    latitude: toNullableNumber(mother.latitude),
    longitude: toNullableNumber(mother.longitude),
  };
}

// Get single mother
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

    const mother = await prisma.mother.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            profileImage: true,
            isActive: true,
          },
        },
        assignedMidwife: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        pregnancies: {
          orderBy: { createdAt: 'desc' },
        },
        children: {
          orderBy: { birthDate: 'desc' },
        },
      },
    });

    if (!mother) {
      return NextResponse.json({ error: 'Mother not found' }, { status: 404 });
    }

    return NextResponse.json({ data: normalizeMotherCoordinates(mother) });
  } catch (error) {
    console.error('Get mother error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mother' },
      { status: 500 }
    );
  }
}

// Update mother
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MIDWIFE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const {
      name,
      phone,
      address,
      dateOfBirth,
      bloodGroup,
      emergencyContact,
      emergencyName,
      medicalHistory,
      allergies,
      mohRegistrationNumber,
      assignedMidwifeId,
      isActive,
      needsSpecialAttention,
    } = body;

    // Get current mother data
    const currentMother = await prisma.mother.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!currentMother) {
      return NextResponse.json({ error: 'Mother not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    if (assignedMidwifeId !== undefined && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can assign a midwife and activate mother accounts' },
        { status: 403 }
      );
    }

    // Update user data if provided
    const nextIsActive =
      assignedMidwifeId !== undefined
        ? Boolean(assignedMidwifeId || null)
        : isActive;
    const effectiveAssignedMidwifeId =
      assignedMidwifeId !== undefined ? (assignedMidwifeId || null) : currentMother.assignedMidwifeId;

    if (nextIsActive === true && !effectiveAssignedMidwifeId) {
      return NextResponse.json(
        { error: 'Mother accounts can only be activated after assigning a midwife' },
        { status: 400 }
      );
    }

    if (
      name !== undefined ||
      phone !== undefined ||
      address !== undefined ||
      isActive !== undefined ||
      assignedMidwifeId !== undefined
    ) {
      await prisma.user.update({
        where: { id: currentMother.userId },
        data: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(nextIsActive !== undefined && { isActive: nextIsActive }),
        },
      });
    }

    // Update mother data
    const mother = await prisma.mother.update({
      where: { id },
      data: {
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(emergencyName !== undefined && { emergencyName }),
        ...(medicalHistory !== undefined && { medicalHistory }),
        ...(allergies !== undefined && { allergies }),
        ...(mohRegistrationNumber !== undefined && { mohRegistrationNumber }),
        ...(assignedMidwifeId !== undefined && { assignedMidwifeId: assignedMidwifeId || null }),
        ...(needsSpecialAttention !== undefined && { needsSpecialAttention: Boolean(needsSpecialAttention) }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            isActive: true,
          },
        },
        assignedMidwife: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    // Create audit log
    const changes: string[] = [];
    if (assignedMidwifeId !== undefined && assignedMidwifeId !== currentMother.assignedMidwifeId) {
      changes.push(assignedMidwifeId ? 'Midwife assigned' : 'Midwife unassigned');
    }
    if (name !== undefined && name !== currentMother.user.name) {
      changes.push('Name updated');
    }
    if (nextIsActive !== undefined && nextIsActive !== currentMother.user.isActive) {
      changes.push(nextIsActive ? 'Account activated' : 'Account deactivated');
    }
    if (needsSpecialAttention !== undefined && needsSpecialAttention !== currentMother.needsSpecialAttention) {
      changes.push(needsSpecialAttention ? 'Marked for special attention' : 'Removed special attention');
    }

    if (changes.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'MOTHER_UPDATED',
          entity: 'Mother',
          entityId: id,
          details: changes.join(', '),
        },
      });
    }

    // Create notification if midwife was assigned
    if (assignedMidwifeId && assignedMidwifeId !== currentMother.assignedMidwifeId) {
      // Notify the mother
      await prisma.notification.create({
        data: {
          userId: currentMother.userId,
          title: 'Midwife Assigned',
          message: `A midwife has been assigned to your care. You can now chat with your assigned midwife.`,
          type: 'SYSTEM',
        },
      });

      // Notify the midwife
      const midwife = await prisma.midwife.findUnique({
        where: { id: assignedMidwifeId },
        include: { user: true },
      });
      if (midwife) {
        await prisma.notification.create({
          data: {
            userId: midwife.userId,
            title: 'New Mother Assigned',
            message: `${mother.user.name} has been assigned to your care.`,
            type: 'SYSTEM',
          },
        });

        await sendMidwifeAssignmentEmails({
          motherName: mother.user.name,
          motherEmail: mother.user.email,
          midwifeName: midwife.user.name,
          midwifeEmail: midwife.user.email,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mother updated successfully',
      data: normalizeMotherCoordinates(mother),
    });
  } catch (error) {
    console.error('Update mother error:', error);
    return NextResponse.json(
      { error: 'Failed to update mother' },
      { status: 500 }
    );
  }
}

// Delete mother (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const mother = await prisma.mother.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!mother) {
      return NextResponse.json({ error: 'Mother not found' }, { status: 404 });
    }

    // Delete the user (will cascade to mother due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id: mother.userId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MOTHER_DELETED',
        entity: 'Mother',
        entityId: id,
        details: `Mother ${mother.user.name} deleted`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mother deleted successfully',
    });
  } catch (error) {
    console.error('Delete mother error:', error);
    return NextResponse.json(
      { error: 'Failed to delete mother' },
      { status: 500 }
    );
  }
}
