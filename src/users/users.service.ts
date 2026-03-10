import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ─── GET PROFILE ─────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        primaryNumber: true,
        alternativeNumber: true,
        isPrimeMember: true,
        primeType: true,
        primeExpiry: true,
        rewardPoints: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── UPDATE PROFILE ──────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        primaryNumber: true,
        alternativeNumber: true,
        updatedAt: true,
      },
    });
  }

  // ─── CHANGE PASSWORD ─────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const passwordMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens on password change
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  // ─── CREATE ADDRESS ──────────────────────────────────────────

  async createAddress(userId: string, dto: CreateAddressDto) {
    // If new address is default, unset previous default
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { userId, ...dto },
    });
  }

  // ─── GET ALL ADDRESSES ───────────────────────────────────────

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // default address first
        { createdAt: 'desc' },
      ],
    });
  }

  // ─── GET SINGLE ADDRESS ──────────────────────────────────────

  async getAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found');

    // Make sure address belongs to this user
    if (address.userId !== userId) throw new ForbiddenException('Access denied');

    return address;
  }

  // ─── UPDATE ADDRESS ──────────────────────────────────────────

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.getAddress(userId, addressId); // ownership check

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  // ─── DELETE ADDRESS ──────────────────────────────────────────

  async deleteAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId); // ownership check

    await this.prisma.address.delete({
      where: { id: addressId },
    });

    return { message: 'Address deleted successfully' };
  }

  // ─── SET DEFAULT ADDRESS ─────────────────────────────────────

  async setDefaultAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId); // ownership check

    // Unset previous default
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}