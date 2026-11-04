-- AlterTable
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_pkey",
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY ("userId", "productSlug", "color");
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "colorLabelSnapshot" TEXT;
