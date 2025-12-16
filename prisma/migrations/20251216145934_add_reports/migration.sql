/*
  Warnings:

  - You are about to drop the column `createdAt` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `reports` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reports" DROP COLUMN "createdAt",
DROP COLUMN "fileUrl",
ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'processing',
ALTER COLUMN "format" SET DEFAULT 'PDF';

-- CreateIndex
CREATE INDEX "reports_organizationId_idx" ON "reports"("organizationId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
