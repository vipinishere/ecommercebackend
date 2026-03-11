/*
  Warnings:

  - Changed the type of `dataType` on the `SpecificationAttribute` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "dataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN');

-- AlterTable
ALTER TABLE "SpecificationAttribute" DROP COLUMN "dataType",
ADD COLUMN     "dataType" "dataType" NOT NULL;

-- AlterTable
ALTER TABLE "SpecificationGroup" ADD COLUMN     "description" TEXT;
