-- CreateEnum
CREATE TYPE "NotifTemplateType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_REMINDER_24H', 'BOOKING_CANCELLED', 'REBOOK_REMINDER', 'BIRTHDAY', 'OVERDUE_TREATMENT', 'PAYMENT_RECEIVED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('REVENUE', 'APPOINTMENTS');

-- CreateEnum
CREATE TYPE "TargetPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "template_id" TEXT;

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "type" "NotifTemplateType" NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "treatment_ids" TEXT[],
    "sessions" INTEGER NOT NULL,
    "valid_days" INTEGER NOT NULL DEFAULT 365,
    "price_cents" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_targets" (
    "id" TEXT NOT NULL,
    "practitioner_id" TEXT NOT NULL,
    "type" "TargetType" NOT NULL,
    "amount_cents" INTEGER,
    "appointment_count" INTEGER,
    "period" "TargetPeriod" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_channel_key" ON "notification_templates"("type", "channel");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "package_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_targets" ADD CONSTRAINT "staff_targets_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
