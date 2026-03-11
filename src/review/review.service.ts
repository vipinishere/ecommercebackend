import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE REVIEW ───────────────────────────────────────────

  async createReview(userId: string, dto: CreateReviewDto) {
    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Check verified purchase
    let isVerifiedPurchase = false;
    if (dto.orderId) {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          orderId: dto.orderId,
          productId: dto.productId,
          order: { userId },
        },
      });
      isVerifiedPurchase = !!orderItem;
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        isVerifiedPurchase,
      },
    });

    // Add images if provided
    if (dto.imageUrls && dto.imageUrls.length > 0) {
      await this.prisma.reviewImage.createMany({
        data: dto.imageUrls.map((imageUrl) => ({
          reviewId: review.id,
          imageUrl,
        })),
      });
    }

    // Add videos if provided
    if (dto.videoUrls && dto.videoUrls.length > 0) {
      await this.prisma.reviewVideo.createMany({
        data: dto.videoUrls.map((videoUrl) => ({
          reviewId: review.id,
          videoUrl,
        })),
      });
    }

    // Update product rating summary
    await this.updateRatingSummary(dto.productId);

    return this.getReview(review.id);
  }

  // ─── GET PRODUCT REVIEWS ─────────────────────────────────────

  async getProductReviews(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        images: { select: { id: true, imageUrl: true } },
        videos: { select: { id: true, videoUrl: true } },
      },
      orderBy: [
        { isVerifiedPurchase: 'desc' }, // verified purchases first
        { createdAt: 'desc' },
      ],
    });

    // Get rating summary
    const ratingSummary = await this.prisma.productRatingSummary.findUnique({
      where: { productId },
    });

    return {
      ratingSummary,
      totalReviews: reviews.length,
      reviews,
    };
  }

  // ─── GET SINGLE REVIEW ────────────────────────────────────────

  async getReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, name: true } },
        images: { select: { id: true, imageUrl: true } },
        videos: { select: { id: true, videoUrl: true } },
        product: { select: { id: true, internalName: true } },
      },
    });

    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  // ─── UPDATE REVIEW ────────────────────────────────────────────

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own review');
    }

    // Update review fields
    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
    });

    // Update images if provided
    if (dto.imageUrls) {
      // Delete existing images and re-create
      await this.prisma.reviewImage.deleteMany({ where: { reviewId } });
      if (dto.imageUrls.length > 0) {
        await this.prisma.reviewImage.createMany({
          data: dto.imageUrls.map((imageUrl) => ({ reviewId, imageUrl })),
        });
      }
    }

    // Update videos if provided
    if (dto.videoUrls) {
      await this.prisma.reviewVideo.deleteMany({ where: { reviewId } });
      if (dto.videoUrls.length > 0) {
        await this.prisma.reviewVideo.createMany({
          data: dto.videoUrls.map((videoUrl) => ({ reviewId, videoUrl })),
        });
      }
    }

    // Recalculate rating summary if rating changed
    if (dto.rating) {
      await this.updateRatingSummary(review.productId);
    }

    return this.getReview(reviewId);
  }

  // ─── DELETE REVIEW ────────────────────────────────────────────

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    // Recalculate rating summary
    await this.updateRatingSummary(review.productId);

    return { message: 'Review deleted successfully' };
  }

  // ─── HELPER — Update Rating Summary ──────────────────────────

  private async updateRatingSummary(productId: string) {
    // Get all reviews for this product
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      // Delete summary if no reviews
      await this.prisma.productRatingSummary.deleteMany({
        where: { productId },
      });
      return;
    }

    // Count each rating
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingCounts[r.rating as keyof typeof ratingCounts]++;
    });

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    // Upsert rating summary
    await this.prisma.productRatingSummary.upsert({
      where: { productId },
      update: {
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
        averageRating,
        totalReviews,
      },
      create: {
        productId,
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
        averageRating,
        totalReviews,
      },
    });
  }
}