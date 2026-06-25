import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ThriposhaPacketType } from '@prisma/client';

// Get stock records with summary
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stockRecords = await prisma.thriposhaStock.findMany({
      orderBy: { receivedDate: 'desc' },
    });

    // Calculate total received
    const totalReceived = stockRecords.reduce(
      (sum, record) => sum + Number(record.quantity),
      0
    );

    // Calculate total distributed
    const distributedAgg = await prisma.thriposhaDistribution.aggregate({
      _sum: { quantity: true },
    });
    const totalDistributed = Number(distributedAgg._sum.quantity || 0);

    // Calculate total remaining
    const totalRemaining = stockRecords.reduce(
      (sum, record) => sum + Number(record.remainingQuantity),
      0
    );

    // Sum received by packetType
    const receivedByColor: Record<ThriposhaPacketType, number> = { RED: 0, ORANGE: 0, YELLOW: 0 };
    for (const record of stockRecords) {
      receivedByColor[record.packetType] = (receivedByColor[record.packetType] || 0) + Number(record.quantity);
    }

    // Sum distributed by packetType
    const distributedByColor: Record<ThriposhaPacketType, number> = { RED: 0, ORANGE: 0, YELLOW: 0 };
    const distributionsAgg = await prisma.thriposhaDistribution.groupBy({
      by: ['packetType'],
      _sum: { quantity: true },
    });
    for (const d of distributionsAgg) {
      if (d.packetType) {
        distributedByColor[d.packetType] = Number(d._sum.quantity || 0);
      }
    }

    // Sum remaining by packetType
    const remainingByColor: Record<ThriposhaPacketType, number> = { RED: 0, ORANGE: 0, YELLOW: 0 };
    for (const record of stockRecords) {
      remainingByColor[record.packetType] = (remainingByColor[record.packetType] || 0) + Number(record.remainingQuantity);
    }

    return NextResponse.json({
      data: {
        records: stockRecords,
        summary: {
          totalReceivedKg: Math.round(totalReceived * 100) / 100,
          totalDistributedKg: Math.round(totalDistributed * 100) / 100,
          remainingKg: Math.round(totalRemaining * 100) / 100,
          byColor: {
            received: receivedByColor,
            distributed: distributedByColor,
            remaining: remainingByColor
          }
        },
      },
    });
  } catch (error) {
    console.error('Get thriposha stock error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock records' },
      { status: 500 }
    );
  }
}

// Record new stock receipt
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quantity, packetType, batchNumber, supplier, expiryDate, receivedDate, notes } = body;

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

    const rDate = receivedDate ? new Date(receivedDate) : new Date();
    const month = rDate.getMonth() + 1;
    const year = rDate.getFullYear();

    // Check if stock record of the same packetType already exists in this calendar month and year
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const existingStockThisMonth = await prisma.thriposhaStock.findFirst({
      where: {
        packetType: pktType,
        receivedDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (existingStockThisMonth) {
      return NextResponse.json(
        { error: `Stock receipt for ${pktType} packets already recorded for this calendar month (${month}/${year})` },
        { status: 400 }
      );
    }

    const stock = await prisma.thriposhaStock.create({
      data: {
        quantity: qtyVal,
        remainingQuantity: qtyVal,
        packetType: pktType,
        batchNumber: batchNumber || null,
        supplier: supplier || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        receivedDate: rDate,
        notes: notes || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_STOCK_RECEIVED',
        entity: 'ThriposhaStock',
        entityId: stock.id,
        details: `Received ${quantity} packets of Thriposha stock (${pktType})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stock recorded successfully',
      data: stock,
    });
  } catch (error) {
    console.error('Create thriposha stock error:', error);
    return NextResponse.json(
      { error: 'Failed to record stock' },
      { status: 500 }
    );
  }
}

// Update stock record
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 });
    }

    const existingStock = await prisma.thriposhaStock.findUnique({
      where: { id },
    });
    if (!existingStock) {
      return NextResponse.json({ error: 'Stock record not found' }, { status: 404 });
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
      updateData.remainingQuantity = qtyVal;
    }

    if (updateData.packetType) {
      if (!['RED', 'ORANGE', 'YELLOW'].includes(updateData.packetType)) {
        return NextResponse.json(
          { error: 'Invalid packet type. Must be RED, ORANGE, or YELLOW' },
          { status: 400 }
        );
      }
    }

    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.receivedDate) {
      updateData.receivedDate = new Date(updateData.receivedDate);
    }

    const targetType = (updateData.packetType || existingStock.packetType) as ThriposhaPacketType;
    const targetDate = updateData.receivedDate ? new Date(updateData.receivedDate) : new Date(existingStock.receivedDate);
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const existingStockThisMonth = await prisma.thriposhaStock.findFirst({
      where: {
        id: { not: id },
        packetType: targetType,
        receivedDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (existingStockThisMonth) {
      return NextResponse.json(
        { error: `Stock receipt for ${targetType} packets already recorded for this calendar month (${month}/${year})` },
        { status: 400 }
      );
    }

    const stock = await prisma.thriposhaStock.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_STOCK_UPDATED',
        entity: 'ThriposhaStock',
        entityId: stock.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stock updated',
      data: stock,
    });
  } catch (error) {
    console.error('Update thriposha stock error:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

// Delete stock record
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 });
    }

    await prisma.thriposhaStock.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THRIPOSHA_STOCK_DELETED',
        entity: 'ThriposhaStock',
        entityId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stock record deleted',
    });
  } catch (error) {
    console.error('Delete thriposha stock error:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock record' },
      { status: 500 }
    );
  }
}
