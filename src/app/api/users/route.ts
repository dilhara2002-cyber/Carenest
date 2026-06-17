import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// Register new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, phone, address, dateOfBirth, bloodGroup, emergencyContact, emergencyName } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const isMotherRegistration = role === 'MOTHER' || !role;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'MOTHER',
        phone,
        address,
        isActive: !isMotherRegistration,
      },
    });

    // Create Mother profile if role is MOTHER
    if (isMotherRegistration) {
      await prisma.mother.create({
        data: {
          userId: user.id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bloodGroup,
          emergencyContact,
          emergencyName,
        },
      });
    }

    // Create Midwife profile if role is MIDWIFE
    if (role === 'MIDWIFE') {
      await prisma.midwife.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        details: `User ${user.name} registered with role ${user.role}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}

// Get all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const where = role ? { role: role as 'MOTHER' | 'MIDWIFE' | 'ADMIN' } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
