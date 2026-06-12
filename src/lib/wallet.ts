import prisma from '@/lib/prisma';
import { WalletTransactionType, Prisma } from '@prisma/client';

export const MINIMUM_PAYOUT_USD = 50;
export const PLATFORM_COMMISSION_RATE = 0.20;

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, frozen: 0 },
  });
}

export async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: WalletTransactionType,
  description: string,
  metadata?: Record<string, unknown>
) {
  const wallet = await tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, frozen: 0 },
  });
  const newBalance = Number(wallet.balance) + amount;

  await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      metadata: metadata ? (metadata as object) : undefined,
    },
  });
}

export async function freezeFundsForPayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');
    const available = Number(wallet.balance) - Number(wallet.frozen);
    if (available < amount) throw new Error('Insufficient available balance');

    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount }, frozen: { increment: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_REQUEST,
        amount: -amount,
        balanceAfter: Number(wallet.balance) - amount,
        description: `Withdrawal request of $${amount.toFixed(2)} USD pending approval`,
        payoutRequestId,
      },
    });
  });
}

export async function completePayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    await tx.wallet.update({ where: { userId }, data: { frozen: { decrement: amount } } });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_PAID,
        amount: -amount,
        balanceAfter: Number(wallet.balance),
        description: `Withdrawal of $${amount.toFixed(2)} USD confirmed paid`,
        payoutRequestId,
      },
    });
  });
}

export async function cancelPayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount }, frozen: { decrement: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_CANCELLED,
        amount,
        balanceAfter: Number(wallet.balance) + amount,
        description: `Withdrawal cancelled — $${amount.toFixed(2)} returned to balance`,
        payoutRequestId,
      },
    });
  });
}
