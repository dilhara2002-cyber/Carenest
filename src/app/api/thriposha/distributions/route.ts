import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get distributions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');
    const childId = searchParams.get('childId');
    const midwifeId = searchParams.get('midwifeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const recipientType = searchParams.get('recipientType');

    const where: Record<string, unknown> = {};

    if (motherId) where.motherId = motherId;
    if (childId) where.childId = childId;
    if (midwifeId) where.midwifeId = midwifeId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (recipientType) where.recipientType = recipientType;

    // Midwife can only see their own distributions
    if (session.user.role === 'MIDWIFE' && session.user.midwifeId) {
      where.midwifeId = session.user.midwifeId;
    }

    const distributions = await prisma.thriposhaDistribution.findMany({
      where,
      include: {
        mother: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        child: {
          select: { id: true, name: true, birthDate: true, gender: true },
        },
        midwife: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: { distributionDate: 'desc' },
    });

    return NextResponse.json({ data: distributions });
  } catch (error) {
    console.error('Get thriposha distributions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distributions' },
      { status: 500 }
    );
  }
}

// Record a new distribution
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
      recipientType,
      quantity,
      distributionDate,
      batchNumber,
      notes,
    } = body;

    if (!recipientType || !quantity) {
      return NextResponse.json(
        { error: 'Recipient type and quantity are required' },
        { status: 400 }
      );
    }

    const qtyVal = Number(quantity);
    if (isNaN(qtyVal) || !Number.isInteger(qtyVal) || qtyVal <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive whole number' },
        { status: 400 }
      );
    }

    // Determine month and year from distribution date
    const distDate = distributionDate ? new Date(distributionDate) : new Date();
    const month = distDate.getMonth() + 1;
    const year = distDate.getFullYear();

    const distribution = await prisma.thriposhaDistribution.create({
      data: {
        motherId: motherId || null,
        childId: childId || null,
        midwifeId: session.user.midwifeId || body.midwifeId,
        recipientType,
        quantity: qtyVal,
        distributionDate: distDate,
        month,
        year,
        batchNumber: batchNumber || null,
        notes: notes || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_DISTRIBUTED',
        entity: 'ThriposhaDistribution',
        entityId: distribution.id,
        details: `Distributed ${quantity} packets of Thriposha (${recipientType})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Thriposha distribution recorded successfully',
      data: distribution,
    });
  } catch (error) {
    console.error('Create thriposha distribution error:', error);
    return NextResponse.json(
      { error: 'Failed to record distribution' },
      { status: 500 }
    );
  }
}

// Update a distribution
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Distribution ID is required' }, { status: 400 });
    }

    if (updateData.distributionDate) {
      const distDate = new Date(updateData.distributionDate);
      updateData.distributionDate = distDate;
      updateData.month = distDate.getMonth() + 1;
      updateData.year = distDate.getFullYear();
    }

    if (updateData.quantity) {
      const qtyVal = Number(updateData.quantity);
      if (isNaN(qtyVal) || !Number.isInteger(qtyVal) || qtyVal <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be a positive whole number' },
          { status: 400 }
        );
      }
      updateData.quantity = qtyVal;
    }

    const distribution = await prisma.thriposhaDistribution.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_DISTRIBUTION_UPDATED',
        entity: 'ThriposhaDistribution',
        entityId: distribution.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution updated',
      data: distribution,
    });
  } catch (error) {
    console.error('Update thriposha distribution error:', error);
    return NextResponse.json(
      { error: 'Failed to update distribution' },
      { status: 500 }
    );
  }
}

// Delete a distribution (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Distribution ID is required' }, { status: 400 });
    }

    await prisma.thriposhaDistribution.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_DISTRIBUTION_DELETED',
        entity: 'ThriposhaDistribution',
        entityId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution deleted',
    });
  } catch (error) {
    console.error('Delete thriposha distribution error:', error);
    return NextResponse.json(
      { error: 'Failed to delete distribution' },
      { status: 500 }
    );
  }
}
