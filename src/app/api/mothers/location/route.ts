import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get current mother's saved location
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'MOTHER' || !session.user.motherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mother = await prisma.mother.findUnique({
      where: { id: session.user.motherId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationUpdatedAt: true,
      },
    });

    if (!mother) {
      return NextResponse.json({ error: 'Mother profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: mother.id,
        latitude: mother.latitude ? Number(mother.latitude) : null,
        longitude: mother.longitude ? Number(mother.longitude) : null,
        locationUpdatedAt: mother.locationUpdatedAt,
      },
    });
  } catch (error) {
    console.error('Get mother location error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// Update current mother's location
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'MOTHER' || !session.user.motherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude } = body as { latitude?: number | null; longitude?: number | null };

    const clearingLocation = latitude === null || longitude === null;

    if (!clearingLocation) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return NextResponse.json(
          { error: 'Latitude and longitude must be numbers' },
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90) {
        return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
      }

      if (longitude < -180 || longitude > 180) {
        return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
      }
    }

    const updatedMother = await prisma.mother.update({
      where: { id: session.user.motherId },
      data: {
        latitude: clearingLocation ? null : latitude,
        longitude: clearingLocation ? null : longitude,
        locationUpdatedAt: clearingLocation ? null : new Date(),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationUpdatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MOTHER_LOCATION_UPDATED',
        entity: 'Mother',
        entityId: session.user.motherId,
        details: clearingLocation ? 'Location removed by mother' : 'Location updated by mother',
      },
    });

    return NextResponse.json({
      success: true,
      message: clearingLocation ? 'Location removed' : 'Location updated',
      data: {
        id: updatedMother.id,
        latitude: updatedMother.latitude ? Number(updatedMother.latitude) : null,
        longitude: updatedMother.longitude ? Number(updatedMother.longitude) : null,
        locationUpdatedAt: updatedMother.locationUpdatedAt,
      },
    });
  } catch (error) {
    console.error('Update mother location error:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

