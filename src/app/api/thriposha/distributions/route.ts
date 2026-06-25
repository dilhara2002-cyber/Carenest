import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ThriposhaPacketType } from '@prisma/client';

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
    const packetType = searchParams.get('packetType');

    const where: Record<string, unknown> = {};

    if (motherId) where.motherId = motherId;
    if (childId) where.childId = childId;
    if (midwifeId) where.midwifeId = midwifeId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (recipientType) where.recipientType = recipientType;
    if (packetType) where.packetType = packetType;

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

// Helper to deduct stock using FIFO
async function deductStock(tx: any, packetType: ThriposhaPacketType, quantity: number) {
  let toDeduct = quantity;
  const stocks = await tx.thriposhaStock.findMany({
    where: {
      packetType,
      remainingQuantity: { gt: 0 }
    },
    orderBy: { receivedDate: 'asc' }
  });

  const totalAvailable = stocks.reduce((sum: number, s: any) => sum + Number(s.remainingQuantity), 0);
  if (totalAvailable < quantity) {
    throw new Error(`Insufficient stock: only ${totalAvailable} ${packetType} packets remaining`);
  }

  const usedBatches: string[] = [];

  for (const stock of stocks) {
    if (toDeduct <= 0) break;
    const current = Number(stock.remainingQuantity);
    const deductAmt = Math.min(toDeduct, current);

    await tx.thriposhaStock.update({
      where: { id: stock.id },
      data: { remainingQuantity: current - deductAmt }
    });

    if (stock.batchNumber && !usedBatches.includes(stock.batchNumber)) {
      usedBatches.push(stock.batchNumber);
    }

    toDeduct -= deductAmt;
  }

  return { batchNumber: usedBatches.join(', ') };
}

// Helper to restore stock
async function restoreStock(tx: any, packetType: ThriposhaPacketType, quantity: number) {
  let toRestore = quantity;
  const stocks = await tx.thriposhaStock.findMany({
    where: { packetType },
    orderBy: { receivedDate: 'asc' }
  });

  for (const stock of stocks) {
    if (toRestore <= 0) break;
    const original = Number(stock.quantity);
    const current = Number(stock.remainingQuantity);
    if (current < original) {
      const room = original - current;
      const restoreAmt = Math.min(toRestore, room);
      
      await tx.thriposhaStock.update({
        where: { id: stock.id },
        data: { remainingQuantity: current + restoreAmt }
      });
      
      toRestore -= restoreAmt;
    }
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
      packetType,
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

    // Validate packetType
    let pktType: ThriposhaPacketType = 'YELLOW';
    if (packetType) {
      if (!['RED', 'ORANGE', 'YELLOW'].includes(packetType)) {
        return NextResponse.json(
          { error: 'Invalid packet type. Must be RED, ORANGE, or YELLOW' },
          { status: 400 }
        );
      }
      pktType = packetType as ThriposhaPacketType;
    }

    // Determine month and year from distribution date
    const distDate = distributionDate ? new Date(distributionDate) : new Date();
    const month = distDate.getMonth() + 1;
    const year = distDate.getFullYear();

    const distribution = await prisma.$transaction(async (tx) => {
      // Check duplicate packet distribution within the same calendar month
      const duplicateWhere: any = {
        packetType: pktType,
        month,
        year,
      };

      if (motherId) {
        duplicateWhere.motherId = motherId;
      } else if (childId) {
        duplicateWhere.childId = childId;
      } else {
        throw new Error('Mother ID or Child ID is required');
      }

      const duplicate = await tx.thriposhaDistribution.findFirst({
        where: duplicateWhere
      });

      if (duplicate) {
        throw new Error(`Duplicate distribution: Beneficiary already received a ${pktType} packet this month (${month}/${year})`);
      }

      // Deduct stock using FIFO
      const { batchNumber: finalBatch } = await deductStock(tx, pktType, qtyVal);

      // Create distribution
      const dist = await tx.thriposhaDistribution.create({
        data: {
          motherId: motherId || null,
          childId: childId || null,
          midwifeId: session.user.midwifeId || body.midwifeId,
          recipientType,
          packetType: pktType,
          quantity: qtyVal,
          distributionDate: distDate,
          month,
          year,
          batchNumber: batchNumber || finalBatch || null,
          notes: notes || null,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'THRIPOSHA_DISTRIBUTED',
          entity: 'ThriposhaDistribution',
          entityId: dist.id,
          details: `Distributed ${quantity} packets of Thriposha (${recipientType}, ${pktType})`,
        },
      });

      return dist;
    });

    return NextResponse.json({
      success: true,
      message: 'Thriposha distribution recorded successfully',
      data: distribution,
    });
  } catch (error: any) {
    console.error('Create thriposha distribution error:', error);
    const message = error.message || 'Failed to record distribution';
    const status = (message.includes('Duplicate') || message.includes('Insufficient') || message.includes('required')) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
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

    if (updateData.packetType) {
      if (!['RED', 'ORANGE', 'YELLOW'].includes(updateData.packetType)) {
        return NextResponse.json(
          { error: 'Invalid packet type. Must be RED, ORANGE, or YELLOW' },
          { status: 400 }
        );
      }
    }

    const updatedDistribution = await prisma.$transaction(async (tx) => {
      const existingDist = await tx.thriposhaDistribution.findUnique({
        where: { id }
      });
      if (!existingDist) {
        throw new Error('Distribution record not found');
      }

      // Revert the stock allocation of the existing distribution
      await restoreStock(tx, existingDist.packetType, Number(existingDist.quantity));

      const targetType = (updateData.packetType || existingDist.packetType) as ThriposhaPacketType;
      const targetQty = updateData.quantity !== undefined ? Number(updateData.quantity) : Number(existingDist.quantity);

      const targetDate = updateData.distributionDate ? new Date(updateData.distributionDate) : new Date(existingDist.distributionDate);
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();

      const targetMotherId = updateData.motherId !== undefined ? updateData.motherId : existingDist.motherId;
      const targetChildId = updateData.childId !== undefined ? updateData.childId : existingDist.childId;

      // Duplicate check (excluding current ID)
      const duplicateWhere: any = {
        id: { not: id },
        packetType: targetType,
        month,
        year,
      };
      if (targetMotherId) {
        duplicateWhere.motherId = targetMotherId;
      } else if (targetChildId) {
        duplicateWhere.childId = targetChildId;
      } else {
        throw new Error('Mother ID or Child ID is required');
      }

      const duplicate = await tx.thriposhaDistribution.findFirst({
        where: duplicateWhere
      });

      if (duplicate) {
        throw new Error(`Duplicate distribution: Beneficiary already received a ${targetType} packet this month (${month}/${year})`);
      }

      // Perform stock deduction (FIFO) for the new quantity and type
      const { batchNumber: finalBatch } = await deductStock(tx, targetType, targetQty);

      // Build updated fields
      const dataToUpdate = {
        ...updateData,
        month,
        year,
        distributionDate: targetDate,
        batchNumber: updateData.batchNumber || finalBatch || null
      };

      const dist = await tx.thriposhaDistribution.update({
        where: { id },
        data: dataToUpdate,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'THRIPOSHA_DISTRIBUTION_UPDATED',
          entity: 'ThriposhaDistribution',
          entityId: dist.id,
          details: `Updated distribution: ${targetQty} packets of ${targetType}`,
        },
      });

      return dist;
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution updated successfully',
      data: updatedDistribution,
    });
  } catch (error: any) {
    console.error('Update thriposha distribution error:', error);
    const message = error.message || 'Failed to update distribution';
    const status = message.includes('not found') ? 404 : (message.includes('Duplicate') || message.includes('Insufficient') || message.includes('required')) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
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

    await prisma.$transaction(async (tx) => {
      const existingDist = await tx.thriposhaDistribution.findUnique({
        where: { id }
      });
      if (!existingDist) {
        throw new Error('Distribution record not found');
      }

      // Revert the stock allocation of the existing distribution
      await restoreStock(tx, existingDist.packetType, Number(existingDist.quantity));

      await tx.thriposhaDistribution.delete({ where: { id } });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'THRIPOSHA_DISTRIBUTION_DELETED',
          entity: 'ThriposhaDistribution',
          entityId: id,
          details: `Deleted distribution: restored ${existingDist.quantity} packets of ${existingDist.packetType}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution deleted and stock restored successfully',
    });
  } catch (error: any) {
    console.error('Delete thriposha distribution error:', error);
    const message = error.message || 'Failed to delete distribution';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
