-- CreateEnum
CREATE TYPE "SopType" AS ENUM ('TREATMENT_PLAN', 'SKINCARE_ROUTINE', 'BRIDAL_PACKAGE', 'AFTERCARE_GUIDE', 'OTHER');

-- CreateTable
CREATE TABLE "sop_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SopType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sop_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;