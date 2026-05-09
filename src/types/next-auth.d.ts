import 'next-auth';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string;
      motherId?: string;
      midwifeId?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string;
    motherId?: string;
    midwifeId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    motherId?: string;
    midwifeId?: string;
  }
}
