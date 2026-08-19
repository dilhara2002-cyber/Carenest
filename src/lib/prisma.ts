import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {

  // Ensure Prisma uses the binary engine locally to avoid the
  // "Using engine type 'client' requires either 'adapter' or 'accelerateUrl'"
  // validation in dev environments. Setting the env var is the supported
  // way; passing an `engine` option to the PrismaClient constructor is
  // not supported and caused an unknown-property error.


  // If the generated client expects the "client" engine type, Prisma requires
  // an adapter or accelerateUrl to be provided. Use the Postgres adapter with
  // a `pg` Pool built from the project's DATABASE_URL so the PrismaClient can
  // operate without requiring remote acceleration.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;