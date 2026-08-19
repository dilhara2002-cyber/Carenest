import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {

  // Ensure Prisma uses the binary engine locally to avoid the
  // "Using engine type 'client' requires either 'adapter' or 'accelerateUrl'"
  // validation in dev environments. Setting the env var is the supported
  // way; passing an `engine` option to the PrismaClient constructor is
  // not supported and caused an unknown-property error.
  if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
  }

  // If the generated client expects the "client" engine type, Prisma requires
  // an adapter or accelerateUrl to be provided. Use the Postgres adapter factory
  // with the project's DATABASE_URL so the PrismaClient can operate without
  // requiring remote acceleration.
  // Use the connection-string-based adapter to avoid needing a local
  // `pg` Pool in environments where `pg` may not be available at runtime.
  const adapter = new PrismaPg(process.env.DATABASE_URL ?? '');

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
