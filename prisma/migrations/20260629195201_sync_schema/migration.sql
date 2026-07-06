/*
  Warnings:

  - You are about to drop the column `height` on the `mothers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "children" ADD COLUMN     "gestationalAgeWeeks" INTEGER,
ADD COLUMN     "isPreterm" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "growth_records" ADD COLUMN     "ageMonths" INTEGER,
ADD COLUMN     "bmiStatus" TEXT,
ADD COLUMN     "correctedAgeMonths" INTEGER,
ADD COLUMN     "heightStatus" TEXT,
ADD COLUMN     "weightStatus" TEXT,
ADD COLUMN     "zScoreBmi" DECIMAL(5,2),
ADD COLUMN     "zScoreHeight" DECIMAL(5,2),
ADD COLUMN     "zScoreWeight" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "mothers" DROP COLUMN "height";
