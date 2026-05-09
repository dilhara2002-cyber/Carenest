import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<{ id: string; email: string; name: string; role: string; image?: string; motherId?: string; midwifeId?: string } | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            mother: true,
            midwife: true,
          },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        if (!user.isActive) {
          if (user.role === 'MOTHER') {
            throw new Error(
              'Account not activated yet. Your registration is under review. Please contact your nearest MOH office or CareNest support for activation assistance.'
            );
          }
          throw new Error('Account is deactivated');
        }

        if (user.role === 'MOTHER' && !user.mother?.assignedMidwifeId) {
          throw new Error(
            'Account not activated yet. A midwife must be assigned to your profile before you can sign in. Please contact your nearest MOH office or CareNest support for assistance.'
          );
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.profileImage ?? undefined,
          motherId: user.mother?.id,
          midwifeId: user.midwife?.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.motherId = user.motherId;
        token.midwifeId = user.midwifeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.motherId = token.motherId as string | undefined;
        session.user.midwifeId = token.midwifeId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
