/*
  Warnings:

  - A unique constraint covering the columns `[evolutionInstanceName]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "followup_logs" DROP CONSTRAINT "followup_logs_followupId_fkey";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "metaLeadgenId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "datacrazyApiToken" TEXT,
ADD COLUMN     "datacrazyApiUrl" TEXT,
ADD COLUMN     "datacrazyTagId" TEXT,
ADD COLUMN     "datacrazyTenantId" TEXT,
ADD COLUMN     "datacrazyWebhookUrl" TEXT,
ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaGraphApiVersion" TEXT DEFAULT 'v24.0',
ADD COLUMN     "metaIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaPageId" TEXT,
ADD COLUMN     "metaVerifyToken" TEXT,
ADD COLUMN     "metaWelcomeMessage" TEXT DEFAULT 'Olá, falo com {{nome}}?';

-- CreateIndex
CREATE UNIQUE INDEX "organizations_evolutionInstanceName_key" ON "organizations"("evolutionInstanceName");

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_followupId_fkey" FOREIGN KEY ("followupId") REFERENCES "followups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
