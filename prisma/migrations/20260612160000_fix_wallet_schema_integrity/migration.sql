-- Fix 1: Add @unique constraint to payosOrderCode on Payment
CREATE UNIQUE INDEX "Payment_payosOrderCode_key" ON "Payment"("payosOrderCode");

-- Fix 2: Change monetary Float fields to Decimal(18,6)
-- Wallet.balance and Wallet.frozen
ALTER TABLE "Wallet" ALTER COLUMN "balance" TYPE DECIMAL(18,6) USING "balance"::DECIMAL(18,6);
ALTER TABLE "Wallet" ALTER COLUMN "frozen" TYPE DECIMAL(18,6) USING "frozen"::DECIMAL(18,6);

-- WalletTransaction.amount and WalletTransaction.balanceAfter
ALTER TABLE "WalletTransaction" ALTER COLUMN "amount" TYPE DECIMAL(18,6) USING "amount"::DECIMAL(18,6);
ALTER TABLE "WalletTransaction" ALTER COLUMN "balanceAfter" TYPE DECIMAL(18,6) USING "balanceAfter"::DECIMAL(18,6);

-- PayoutRequest.amountUsd
ALTER TABLE "PayoutRequest" ALTER COLUMN "amountUsd" TYPE DECIMAL(18,6) USING "amountUsd"::DECIMAL(18,6);

-- Fix 3: Add FK relations for WalletTransaction.bookingId and payoutRequestId
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
