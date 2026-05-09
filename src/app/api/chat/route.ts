import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get chat messages
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      // Get all conversations (latest message from each user)
      const conversations = await prisma.$queryRaw`
        SELECT DISTINCT ON (
          CASE 
            WHEN "senderId" = ${session.user.id} THEN "receiverId"
            ELSE "senderId"
          END
        )
        cm.*,
        CASE 
          WHEN "senderId" = ${session.user.id} THEN "receiverId"
          ELSE "senderId"
        END as "otherUserId"
        FROM chat_messages cm
        WHERE "senderId" = ${session.user.id} OR "receiverId" = ${session.user.id}
        ORDER BY 
          CASE 
            WHEN "senderId" = ${session.user.id} THEN "receiverId"
            ELSE "senderId"
          END,
          "createdAt" DESC
      `;

      return NextResponse.json({ data: conversations });
    }

    // Get messages between two users
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: {
          select: { name: true, profileImage: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, message } = body;

    if (!receiverId || !message) {
      return NextResponse.json(
        { error: 'Receiver and message are required' },
        { status: 400 }
      );
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        message,
      },
      include: {
        sender: {
          select: { name: true, profileImage: true, role: true },
        },
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: 'New Message',
        message: `You have a new message from ${session.user.name}`,
        type: 'CHAT',
        link: `/chat?userId=${session.user.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: chatMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
