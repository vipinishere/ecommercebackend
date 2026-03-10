/*
  Warnings:

  - You are about to drop the column `isVarified` on the `Seller` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "isVarified",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
