-- AlterTable: Add multi-currency and exchange rate metadata to Transaction
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "rateType" TEXT;

-- AlterTable: Add multi-currency and exchange rate metadata to GroupExpense
ALTER TABLE "GroupExpense"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "rateType" TEXT;

-- AlterTable: Track which currency a group split was paid with (ARS, USD, EUR)
ALTER TABLE "ExpenseSplit"
  ADD COLUMN IF NOT EXISTS "paidCurrency" TEXT;
