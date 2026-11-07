-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "GroupMemberStatus" AS ENUM ('PENDING', 'ACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('GROUP_INVITE', 'GROUP_EXPENSE', 'MEMBER_SUGGESTION', 'BUDGET_ALERT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure new enum values exist if NotificationType was already created via db push
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MEMBER_SUGGESTION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUDGET_ALERT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Group
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "strictPayments" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable GroupMember
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "invitedById" TEXT;
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "status" "GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable GroupExpense
ALTER TABLE "GroupExpense" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- AlterTable ExpenseSplit
ALTER TABLE "ExpenseSplit" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Category_userId_isDeleted_idx" ON "Category"("userId", "isDeleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupMember_groupId_status_idx" ON "GroupMember"("groupId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupExpense_groupId_date_idx" ON "GroupExpense"("groupId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupExpense_paidById_idx" ON "GroupExpense"("paidById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupExpense_categoryId_idx" ON "GroupExpense"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseSplit_transactionId_key" ON "ExpenseSplit"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseSplit_groupExpenseId_userId_key" ON "ExpenseSplit"("groupExpenseId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseSplit_groupExpenseId_isPaid_idx" ON "ExpenseSplit"("groupExpenseId", "isPaid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseSplit_userId_idx" ON "ExpenseSplit"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "GroupExpense" DROP CONSTRAINT IF EXISTS "GroupExpense_categoryId_fkey";
ALTER TABLE "GroupExpense" ADD CONSTRAINT "GroupExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" DROP CONSTRAINT IF EXISTS "ExpenseSplit_transactionId_fkey";
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

