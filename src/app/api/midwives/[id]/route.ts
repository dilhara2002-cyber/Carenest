import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get single midwife
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

    const midwife = await prisma.midwife.findUnique({
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
            language: true,
            createdAt: true,
          },
        },
        assignedMothers: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        _count: {
          select: { assignedMothers: true, visits: true },
        },
      },
    });

    if (!midwife) {
      return NextResponse.json({ error: 'Midwife not found' }, { status: 404 });
    }

    return NextResponse.json({ data: midwife });
  } catch (error) {
    console.error('Get midwife error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midwife' },
      { status: 500 }
    );
  }
}

// Update midwife
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const midwife = await prisma.midwife.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!midwife) {
      return NextResponse.json({ error: 'Midwife not found' }, { status: 404 });
    }

    const {
      name,
      email,
      phone,
      address,
      language,
      isActive,
      licenseNumber,
      specialization,
      experience,
      workArea,
    } = body;

    // Update in transaction
     const result = await prisma.$transaction(async (tx) => {
      // Update user fields
      const userUpdate: any = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;
      if (address !== undefined) userUpdate.address = address;
      if (language !== undefined) userUpdate.language = language;
      if (isActive !== undefined) userUpdate.isActive = isActive;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: midwife.userId },
          data: userUpdate,
        });
      }

      // Update midwife fields
      const midwifeUpdate: any = {};
      if (licenseNumber !== undefined) midwifeUpdate.licenseNumber = licenseNumber;
      if (specialization !== undefined) midwifeUpdate.specialization = specialization;
      if (experience !== undefined) midwifeUpdate.experience = parseInt(experience) || null;
      if (workArea !== undefined) midwifeUpdate.workArea = workArea;

      const updatedMidwife = await tx.midwife.update({
        where: { id },
        data: midwifeUpdate,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: isActive !== undefined 
            ? (isActive ? 'MIDWIFE_ACTIVATED' : 'MIDWIFE_DEACTIVATED')
            : 'MIDWIFE_UPDATED',
          entity: 'Midwife',
          entityId: id,
          details: `Midwife ${midwife.user.name} updated`,
        },
      });

      return updatedMidwife;
    });

    return NextResponse.json({
      success: true,
      message: 'Midwife updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Update midwife error:', error);
    return NextResponse.json(
      { error: 'Failed to update midwife' },
      { status: 500 }
    );
  }
}

// Delete midwife
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;

    const midwife = await prisma.midwife.findUnique({
      where: { id },
      include: {
        user: true,
        _count: { select: { assignedMothers: true } },
      },
    });

    if (!midwife) {
      return NextResponse.json({ error: 'Midwife not found' }, { status: 404 });
    }

    // Unassign all mothers first
    if (midwife._count.assignedMothers > 0) {
      await prisma.mother.updateMany({
        where: { assignedMidwifeId: id },
        data: { assignedMidwifeId: null },
      });
    }

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MIDWIFE_DELETED',
        entity: 'Midwife',
        entityId: id,
        details: `Midwife ${midwife.user.name} (${midwife.user.email}) deleted`,
      },
    });

    // Delete the user (cascades to midwife profile)
    await prisma.user.delete({
      where: { id: midwife.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Midwife deleted successfully',
    });
  } catch (error) {
    console.error('Delete midwife error:', error);
    return NextResponse.json(
      { error: 'Failed to delete midwife' },
      { status: 500 }
    );
  }
}