-- CreateEnum
CREATE TYPE "ThriposhaRecipientType" AS ENUM ('PREGNANT_MOTHER', 'LACTATING_MOTHER', 'CHILD_UNDER_5');

-- CreateTable
CREATE TABLE "thriposha_distributions" (
    "id" TEXT NOT NULL,
    "motherId" TEXT,
    "childId" TEXT,
    "midwifeId" TEXT NOT NULL,
    "recipientType" "ThriposhaRecipientType" NOT NULL,
    "quantity" DECIMAL(5,2) NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "batchNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thriposha_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thriposha_stock" (
    "id" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DECIMAL(8,2) NOT NULL,
    "batchNumber" TEXT,
    "supplier" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thriposha_stock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "midwives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
