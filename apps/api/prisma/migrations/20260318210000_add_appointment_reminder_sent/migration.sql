-- Add reminder_24h_sent_at to appointments table
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_24h_sent_at" TIMESTAMP(3);
