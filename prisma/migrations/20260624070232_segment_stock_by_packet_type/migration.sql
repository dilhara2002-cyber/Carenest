-- CreateEnum
CREATE TYPE "ThriposhaPacketType" AS ENUM ('RED', 'ORANGE', 'YELLOW');

-- AlterTable
ALTER TABLE "thriposha_distributions" ADD COLUMN     "packetType" "ThriposhaPacketType" NOT NULL DEFAULT 'YELLOW';

-- AlterTable
ALTER TABLE "thriposha_stock" ADD COLUMN     "packetType" "ThriposhaPacketType" NOT NULL DEFAULT 'YELLOW';
