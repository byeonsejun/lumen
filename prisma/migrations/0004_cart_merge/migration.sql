-- CreateTable
CREATE TABLE "CartMerge" (
    "userId" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartMerge_pkey" PRIMARY KEY ("userId","id")
);

-- AddForeignKey
ALTER TABLE "CartMerge" ADD CONSTRAINT "CartMerge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

