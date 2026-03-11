import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE WISHLIST ─────────────────────────────────────────

  async createWishlist(userId: string, dto: CreateWishlistDto) {
    return this.prisma.wishlist.create({
      data: {
        userId,
        name: dto.name ?? 'My Wishlist',
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  // ─── GET ALL WISHLISTS ───────────────────────────────────────

  async getWishlists(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { items: true }, // total items count per wishlist
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── GET SINGLE WISHLIST ─────────────────────────────────────

  async getWishlist(userId: string, wishlistId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                internalName: true,
                seoTitle: true,
                mrp: true,
                discountPercent: true,
                isFreeDelivery: true,
                images: {
                  where: { isPrimary: true },
                  select: { imageUrl: true, altText: true },
                  take: 1,
                },
                productRatingSummaries: {
                  select: { averageRating: true, totalReviews: true },
                },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                sellingPrice: true,
                color: true,
                size: true,
                storage: true,
                stockQuantity: true,
                isActive: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!wishlist) throw new NotFoundException('Wishlist not found');

    // Allow access if wishlist is public or belongs to user
    if (!wishlist.isPublic && wishlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return wishlist;
  }

  // ─── DELETE WISHLIST ─────────────────────────────────────────

  async deleteWishlist(userId: string, wishlistId: string) {
    await this.checkWishlistOwnership(userId, wishlistId);

    await this.prisma.wishlist.delete({ where: { id: wishlistId } });
    return { message: 'Wishlist deleted successfully' };
  }

  // ─── ADD ITEM ────────────────────────────────────────────────

  async addItem(userId: string, wishlistId: string, dto: AddWishlistItemDto) {
    await this.checkWishlistOwnership(userId, wishlistId);

    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Validate variant if provided
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.productId !== dto.productId) {
        throw new BadRequestException(
          'Variant does not belong to this product',
        );
      }
    }

    // Check if product already in wishlist
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product already in wishlist');
    }

    return this.prisma.wishlistItem.create({
      data: {
        wishlistId,
        productId: dto.productId,
        variantId: dto.variantId,
        note: dto.note,
      },
      include: {
        product: { select: { id: true, internalName: true, mrp: true } },
        variant: { select: { id: true, sellingPrice: true, color: true } },
      },
    });
  }

  // ─── REMOVE ITEM ─────────────────────────────────────────────

  async removeItem(userId: string, wishlistId: string, itemId: string) {
    await this.checkWishlistOwnership(userId, wishlistId);

    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new NotFoundException('Wishlist item not found');
    if (item.wishlistId !== wishlistId) {
      throw new ForbiddenException('Item does not belong to this wishlist');
    }

    await this.prisma.wishlistItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from wishlist' };
  }

  // ─── MOVE TO CART ─────────────────────────────────────────────

  async moveToCart(userId: string, wishlistId: string, itemId: string) {
    await this.checkWishlistOwnership(userId, wishlistId);

    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!item) throw new NotFoundException('Wishlist item not found');
    if (item.wishlistId !== wishlistId) {
      throw new ForbiddenException('Item does not belong to this wishlist');
    }

    // Variant is required to move to cart
    if (!item.variantId) {
      throw new BadRequestException(
        'Please select a variant before moving to cart',
      );
    }

    // Check variant is active
    if (!item.variant?.isActive) {
      throw new BadRequestException('This variant is currently unavailable');
    }

    // Check stock
    if (!item.variant || item.variant.stockQuantity < 1) {
      throw new BadRequestException('This item is out of stock');
    }

    // Add to cart — upsert in case already in cart
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_variantId: {
          userId,
          variantId: item.variantId,
        },
      },
    });

    if (existingCartItem) {
      await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          userId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: 1,
        },
      });
    }

    // Remove from wishlist after moving
    await this.prisma.wishlistItem.delete({ where: { id: itemId } });

    return { message: 'Item moved to cart successfully' };
  }

  // ─── HELPER ───────────────────────────────────────────────────

  private async checkWishlistOwnership(userId: string, wishlistId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
    });

    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return wishlist;
  }
}