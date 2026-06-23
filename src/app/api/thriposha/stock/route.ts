import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({
      data: {
        records: stockRecords,
        summary: {
          totalReceivedKg: Math.round(totalReceived * 100) / 100,
          totalDistributedKg: Math.round(totalDistributed * 100) / 100,
          remainingKg: Math.round((totalReceived - totalDistributed) * 100) / 100,
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
    const { quantity, batchNumber, supplier, expiryDate, receivedDate, notes } = body;

    const qtyVal = Number(quantity);
    if (isNaN(qtyVal) || !Number.isInteger(qtyVal) || qtyVal <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive whole number' },
        { status: 400 }
      );
    }

    const stock = await prisma.thriposhaStock.create({
      data: {
        quantity: qtyVal,
        batchNumber: batchNumber || null,
        supplier: supplier || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
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
        details: `Received ${quantity} packets of Thriposha stock`,
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
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.receivedDate) {
      updateData.receivedDate = new Date(updateData.receivedDate);
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
