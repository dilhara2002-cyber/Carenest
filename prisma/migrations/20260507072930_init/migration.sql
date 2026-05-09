-- AlterTable
ALTER TABLE "mothers" ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "longitude" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyChatMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySystemUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyVaccinationAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyVisitReminders" BOOLEAN NOT NULL DEFAULT true;
