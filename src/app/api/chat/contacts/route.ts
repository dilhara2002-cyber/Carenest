import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get chat contacts based on user role
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    let contacts: {
      id: string;
      name: string;
      email: string;
      profileImage?: string | null;
      role: string;
      specialization?: string | null;
      bloodGroup?: string | null;
      unreadCount: number;
      lastMessage?: string | null;
      lastMessageTime?: Date | null;
    }[] = [];

    if (userRole === 'MOTHER') {
      // For mothers: get their assigned midwife
      const mother = await prisma.mother.findUnique({
        where: { userId },
        include: {
          assignedMidwife: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (mother?.assignedMidwife) {
        // Get unread message count from this midwife
        const unreadCount = await prisma.chatMessage.count({
          where: {
            senderId: mother.assignedMidwife.user.id,
            receiverId: userId,
            isRead: false,
          },
        });

        // Get last message
        const lastMessage = await prisma.chatMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: mother.assignedMidwife.user.id },
              { senderId: mother.assignedMidwife.user.id, receiverId: userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        contacts = [{
          id: mother.assignedMidwife.user.id,
          name: mother.assignedMidwife.user.name,
          email: mother.assignedMidwife.user.email,
          profileImage: mother.assignedMidwife.user.profileImage,
          role: 'MIDWIFE',
          specialization: mother.assignedMidwife.specialization,
          unreadCount,
          lastMessage: lastMessage?.message,
          lastMessageTime: lastMessage?.createdAt,
        }];
      }
    } else if (userRole === 'MIDWIFE') {
      // For midwives: get all their assigned mothers
      const midwife = await prisma.midwife.findUnique({
        where: { userId },
        include: {
          assignedMothers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                  role: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (midwife?.assignedMothers) {
        // Get unread counts and last messages for each mother
        const contactsWithMessages = await Promise.all(
          midwife.assignedMothers
            .filter(m => m.user.isActive !== false)
            .map(async (mother) => {
              const unreadCount = await prisma.chatMessage.count({
                where: {
                  senderId: mother.user.id,
                  receiverId: userId,
                  isRead: false,
                },
              });

              const lastMessage = await prisma.chatMessage.findFirst({
                where: {
                  OR: [
                    { senderId: userId, receiverId: mother.user.id },
                    { senderId: mother.user.id, receiverId: userId },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              });

              return {
                id: mother.user.id,
                name: mother.user.name,
                email: mother.user.email,
                profileImage: mother.user.profileImage,
                role: 'MOTHER',
                bloodGroup: mother.bloodGroup,
                unreadCount,
                lastMessage: lastMessage?.message,
                lastMessageTime: lastMessage?.createdAt,
              };
            })
        );

        // Sort by last message time (most recent first)
        contacts = contactsWithMessages.sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
      }
    } else if (userRole === 'ADMIN') {
      // For admins: get all users they've chatted with
      const chatUsers = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
        distinct: ['senderId', 'receiverId'],
      });

      const userIds = new Set<string>();
      chatUsers.forEach(msg => {
        if (msg.senderId !== userId) userIds.add(msg.senderId);
        if (msg.receiverId !== userId) userIds.add(msg.receiverId);
      });

      if (userIds.size > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            role: true,
          },
        });

        contacts = await Promise.all(
          users.map(async (user) => {
            const unreadCount = await prisma.chatMessage.count({
              where: {
                senderId: user.id,
                receiverId: userId,
                isRead: false,
              },
            });

            const lastMessage = await prisma.chatMessage.findFirst({
              where: {
                OR: [
                  { senderId: userId, receiverId: user.id },
                  { senderId: user.id, receiverId: userId },
                ],
              },
              orderBy: { createdAt: 'desc' },
            });

            return {
              ...user,
              unreadCount,
              lastMessage: lastMessage?.message,
              lastMessageTime: lastMessage?.createdAt,
            };
          })
        );
      }
    }

    return NextResponse.json({ 
      data: contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Get chat contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
