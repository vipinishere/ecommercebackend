import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddMoneyDto } from './dto/add-money.dto';
import { PaymentTypeForWallet } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE WALLET ───────────────────────────────────────────

  async createWallet(userId: string) {
    // Check if wallet already exists
    const existing = await this.prisma.walletAccount.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Wallet already exists for this user');
    }

    return this.prisma.walletAccount.create({
      data: {
        userId,
        currentBalance: 0,
      },
      select: {
        id: true,
        userId: true,
        currentBalance: true,
        updatedAt: true,
      },
    });
  }

  // ─── GET WALLET ──────────────────────────────────────────────

  async getWallet(userId: string) {
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        currentBalance: true,
        updatedAt: true,
      },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  // ─── GET TRANSACTION HISTORY ─────────────────────────────────

  async getTransactions(userId: string) {
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      select: {
        id: true,
        transactionType: true,
        referenceType: true,
        referenceId: true,
        amount: true,
        balanceAfterTransaction: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      currentBalance: wallet.currentBalance,
      transactions,
    };
  }

  // ─── ADD MONEY ───────────────────────────────────────────────

  async addMoney(userId: string, dto: AddMoneyDto) {
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found. Please create a wallet first.');

    // Simulate payment gateway success
    // In production — integrate Razorpay/Stripe here
    const paymentSuccess = true;

    if (!paymentSuccess) {
      throw new BadRequestException('Payment failed. Please try again.');
    }

    // Update wallet balance
    const updatedWallet = await this.prisma.walletAccount.update({
      where: { userId },
      data: { currentBalance: { increment: dto.amount } },
    });

    // Record wallet transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: 'CREDIT',
        referenceType: dto.paymentType === PaymentTypeForWallet.CARD
          ? 'RECHARGE'
          : 'RECHARGE',
        amount: dto.amount,
        balanceAfterTransaction:
          Number(wallet.currentBalance) + dto.amount,
        status: 'COMPLETED',
      },
    });

    return {
      message: 'Money added successfully',
      addedAmount: dto.amount,
      newBalance: updatedWallet.currentBalance,
    };
  }
}