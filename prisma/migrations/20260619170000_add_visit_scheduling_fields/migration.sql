-- AlterTable: Add needsSpecialAttention to mothers
ALTER TABLE "mothers" ADD COLUMN IF NOT EXISTS "needsSpecialAttention" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add postnatal visit scheduling fields to visits
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "postnatalVisitNumber" INTEGER;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "postnatalWindowStart" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "postnatalWindowEnd" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "isPostnatalMandatory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "isMohVisitRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "childId" TEXT;

-- AddForeignKey: Link visits to children
ALTER TABLE "visits" ADD CONSTRAINT "visits_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;
