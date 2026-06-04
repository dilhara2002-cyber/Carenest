import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// Get all midwives
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const status = searchParams.get('status') || 'all';

    const where: Prisma.MidwifeWhereInput = {};
    const userWhere: Prisma.UserWhereInput = {};

    if (activeOnly || status === 'active') {
      userWhere.isActive = true;
    } else if (status === 'inactive') {
      userWhere.isActive = false;
    }

    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(userWhere).length > 0) {
      where.user = { is: userWhere };
    }

    const midwives = await prisma.midwife.findMany({
      where,
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
          },
        },
        _count: {
          select: { assignedMothers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      data: midwives,
      total: midwives.length,
    });
  } catch (error) {
    console.error('Get midwives error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midwives' },
      { status: 500 }
    );
  }
}

// Register new midwife (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      language,
      licenseNumber,
      specialization,
      experience,
      workArea,
      qualifications,
      password,
    } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if license number already exists
    if (licenseNumber) {
      const existingLicense = await prisma.midwife.findFirst({
        where: { licenseNumber },
      });

      if (existingLicense) {
        return NextResponse.json(
          { error: 'A midwife with this license number already exists' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and midwife profile in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'MIDWIFE',
          phone,
          address,
          language: language || 'en',
        },
      });

      // Create midwife profile
      const midwife = await tx.midwife.create({
        data: {
          userId: user.id,
          licenseNumber,
          specialization,
          experience: experience ? parseInt(experience) : null,
          workArea,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'MIDWIFE_REGISTERED',
          entity: 'Midwife',
          entityId: midwife.id,
          details: `Midwife ${name} registered with license ${licenseNumber || 'N/A'}`,
        },
      });

      // Create welcome notification for the new midwife
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to CareNest!',
          message: 'Your midwife account has been created. You can now access the CareNest system to manage your assigned mothers.',
          type: 'INFO',
          link: '/midwife',
        },
      });

      return midwife;
    });

    return NextResponse.json({
      success: true,
      message: 'Midwife registered successfully',
      data: result,
    });
  } catch (error) {
    console.error('Register midwife error:', error);
    return NextResponse.json(
      { error: 'Failed to register midwife' },
      { status: 500 }
    );
  }
}