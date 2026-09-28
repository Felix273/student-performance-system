-- CreateTable
CREATE TABLE "ApplicableFee" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicableFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicableFee_feeStructureId_idx" ON "ApplicableFee"("feeStructureId");

-- AddForeignKey
ALTER TABLE "ApplicableFee" ADD CONSTRAINT "ApplicableFee_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
