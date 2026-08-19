-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MOTHER', 'MIDWIFE', 'ADMIN');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('ANTENATAL', 'POSTNATAL');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VaccinationStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ThriposhaRecipientType" AS ENUM ('PREGNANT_MOTHER', 'LACTATING_MOTHER', 'CHILD_UNDER_5');

-- CreateEnum
CREATE TYPE "ThriposhaPacketType" AS ENUM ('RED', 'ORANGE', 'YELLOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MOTHER',
    "phone" TEXT,
    "address" TEXT,
    "profileImage" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyVisitReminders" BOOLEAN NOT NULL DEFAULT true,
    "notifyVaccinationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "notifyChatMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifySystemUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mothers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "bloodGroup" TEXT,
    "emergencyContact" TEXT,
    "emergencyName" TEXT,
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "mohRegistrationNumber" TEXT,
    "mohRegNumber" TEXT NOT NULL DEFAULT '',
    "nicNumber" TEXT NOT NULL DEFAULT '',
    "height" DECIMAL(5,2),
    "assignedMidwifeId" TEXT,
    "needsSpecialAttention" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mothers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midwives" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "experience" INTEGER,
    "workArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "midwives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregnancies" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "lastMenstrualPeriod" TIMESTAMP(3),
    "currentWeek" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "medicalNotes" TEXT,
    "highRisk" BOOLEAN NOT NULL DEFAULT false,
    "highRiskReasons" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pregnancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthWeight" DECIMAL(5,2),
    "birthHeight" DECIMAL(5,2),
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "healthNotes" TEXT,
    "image" TEXT,
    "isPreterm" BOOLEAN NOT NULL DEFAULT false,
    "gestationalAgeWeeks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DECIMAL(5,2),
    "height" DECIMAL(5,2),
    "headCircumference" DECIMAL(5,2),
    "bmi" DECIMAL(5,2),
    "notes" TEXT,
    "ageMonths" INTEGER,
    "correctedAgeMonths" INTEGER,
    "zScoreWeight" DECIMAL(5,2),
    "zScoreHeight" DECIMAL(5,2),
    "zScoreBmi" DECIMAL(5,2),
    "weightStatus" TEXT,
    "heightStatus" TEXT,
    "bmiStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_growth_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "lengthCm" DECIMAL(5,2) NOT NULL,
    "headCircumferenceCm" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "midwifeId" TEXT NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "bloodPressure" TEXT,
    "weight" DECIMAL(5,2),
    "temperature" DECIMAL(4,1),
    "fetalHeartRate" INTEGER,
    "symptoms" TEXT,
    "recommendations" TEXT,
    "postnatalVisitNumber" INTEGER,
    "postnatalWindowStart" TIMESTAMP(3),
    "postnatalWindowEnd" TIMESTAMP(3),
    "isPostnatalMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isMohVisitRequired" BOOLEAN NOT NULL DEFAULT false,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" TEXT NOT NULL,
    "motherId" TEXT,
    "childId" TEXT,
    "vaccineName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "administeredDate" TIMESTAMP(3),
    "status" "VaccinationStatus" NOT NULL DEFAULT 'PENDING',
    "batchNumber" TEXT,
    "administeredBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_care_records" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "pregnancyWeek" INTEGER,
    "careType" TEXT NOT NULL,
    "query" TEXT,
    "suggestions" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_care_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileData" BYTEA,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thriposha_distributions" (
    "id" TEXT NOT NULL,
    "motherId" TEXT,
    "childId" TEXT,
    "midwifeId" TEXT NOT NULL,
    "recipientType" "ThriposhaRecipientType" NOT NULL,
    "packetType" "ThriposhaPacketType" NOT NULL DEFAULT 'YELLOW',
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
    "remainingQuantity" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "packetType" "ThriposhaPacketType" NOT NULL DEFAULT 'YELLOW',
    "batchNumber" TEXT,
    "supplier" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thriposha_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mother_growth_records" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "sfhCm" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mother_growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mothers_userId_key" ON "mothers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "midwives_userId_key" ON "midwives"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_name_key" ON "document_types"("name");

-- AddForeignKey
ALTER TABLE "mothers" ADD CONSTRAINT "mothers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mothers" ADD CONSTRAINT "mothers_assignedMidwifeId_fkey" FOREIGN KEY ("assignedMidwifeId") REFERENCES "midwives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midwives" ADD CONSTRAINT "midwives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_growth_records" ADD CONSTRAINT "child_growth_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "midwives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_care_records" ADD CONSTRAINT "ai_care_records_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thriposha_distributions" ADD CONSTRAINT "thriposha_distributions_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "midwives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mother_growth_records" ADD CONSTRAINT "mother_growth_records_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mother_growth_records" ADD CONSTRAINT "mother_growth_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "midwives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

