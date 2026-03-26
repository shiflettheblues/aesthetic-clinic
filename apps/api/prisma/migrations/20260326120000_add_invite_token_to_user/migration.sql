-- AlterTable
ALTER TABLE "users" ADD COLUMN "invite_token" TEXT,
ADD COLUMN "invite_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_token_key" ON "users"("invite_token");
