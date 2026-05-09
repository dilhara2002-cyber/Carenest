import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get current authenticated user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        phone: true,
        address: true,
        language: true,
        notifyVisitReminders: true,
        notifyVaccinationAlerts: true,
        notifyChatMessages: true,
        notifySystemUpdates: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Update profile / language / password for current authenticated user
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      profileImage,
      phone,
      address,
      language,
      currentPassword,
      newPassword,
      notifyVisitReminders,
      notifyVaccinationAlerts,
      notifyChatMessages,
      notifySystemUpdates,
    } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: {
      profileImage?: string | null;
      phone?: string | null;
      address?: string | null;
      language?: string;
      password?: string;
      notifyVisitReminders?: boolean;
      notifyVaccinationAlerts?: boolean;
      notifyChatMessages?: boolean;
      notifySystemUpdates?: boolean;
    } = {};

    if (profileImage !== undefined) {
      if (profileImage !== null && typeof profileImage !== 'string') {
        return NextResponse.json(
          { error: 'Profile image must be a URL string' },
          { status: 400 }
        );
      }
      updateData.profileImage = profileImage && profileImage.trim().length > 0 ? profileImage.trim() : null;
    }
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (language !== undefined) updateData.language = language;
    if (notifyVisitReminders !== undefined) updateData.notifyVisitReminders = Boolean(notifyVisitReminders);
    if (notifyVaccinationAlerts !== undefined) updateData.notifyVaccinationAlerts = Boolean(notifyVaccinationAlerts);
    if (notifyChatMessages !== undefined) updateData.notifyChatMessages = Boolean(notifyChatMessages);
    if (notifySystemUpdates !== undefined) updateData.notifySystemUpdates = Boolean(notifySystemUpdates);

    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters' },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        phone: true,
        address: true,
        language: true,
        notifyVisitReminders: true,
        notifyVaccinationAlerts: true,
        notifyChatMessages: true,
        notifySystemUpdates: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_SETTINGS_UPDATED',
        entity: 'User',
        entityId: session.user.id,
        details: `Settings updated by ${updatedUser.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

