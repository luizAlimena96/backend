/*
  Warnings:

  - You are about to drop the column `leadMessageTemplate` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `minutesBefore` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `reminderConfigId` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sendToLead` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sendToTeam` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sent` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `teamMessageTemplate` on the `appointment_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `teamPhones` on the `appointment_reminders` table. All the data in the column will be lost.
  - Added the required column `message` to the `appointment_reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient` to the `appointment_reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `appointment_reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `appointment_reminders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "appointment_reminders_scheduledFor_sent_idx";

-- AlterTable
ALTER TABLE "appointment_reminder_configs" ADD COLUMN     "additionalPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "appointment_reminders" DROP COLUMN "leadMessageTemplate",
DROP COLUMN "minutesBefore",
DROP COLUMN "reminderConfigId",
DROP COLUMN "sendToLead",
DROP COLUMN "sendToTeam",
DROP COLUMN "sent",
DROP COLUMN "teamMessageTemplate",
DROP COLUMN "teamPhones",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "recipient" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "auto_scheduling_configs" ADD COLUMN     "reminderWindowEnd" TEXT NOT NULL DEFAULT '22:00',
ADD COLUMN     "reminderWindowStart" TEXT NOT NULL DEFAULT '08:00';

-- CreateIndex
CREATE INDEX "appointment_reminders_status_idx" ON "appointment_reminders"("status");

-- CreateIndex
CREATE INDEX "appointment_reminders_scheduledFor_idx" ON "appointment_reminders"("scheduledFor");
