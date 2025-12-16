/*
  Warnings:

  - You are about to drop the column `completedAt` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `downloads` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `generatedAt` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `includeDetails` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `includeGraphs` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `reports` table. All the data in the column will be lost.
  - Changed the type of `type` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `period` on the `reports` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organizationId_fkey";

-- AlterTable
ALTER TABLE "followups" ADD COLUMN     "crmStageId" TEXT,
ALTER COLUMN "delayHours" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "conversationSummary" TEXT,
ADD COLUMN     "crmStageId" TEXT;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "completedAt",
DROP COLUMN "downloads",
DROP COLUMN "endDate",
DROP COLUMN "generatedAt",
DROP COLUMN "includeDetails",
DROP COLUMN "includeGraphs",
DROP COLUMN "organizationId",
DROP COLUMN "startDate",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "fileSize" INTEGER,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "period",
ADD COLUMN     "period" TEXT NOT NULL,
ALTER COLUMN "format" DROP DEFAULT;

-- DropEnum
DROP TYPE "ReportPeriod";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "ReportType";

-- CreateIndex
CREATE INDEX "followups_crmStageId_idx" ON "followups"("crmStageId");

-- AddForeignKey
ALTER TABLE "followups" ADD CONSTRAINT "followups_crmStageId_fkey" FOREIGN KEY ("crmStageId") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
