import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────

  // GET /review/product/:productId
  @Get('product/:productId')
  getProductReviews(@Param('productId') productId: string) {
    return this.reviewService.getProductReviews(productId);
  }

  // GET /review/:id
  @Get(':id')
  getReview(@Param('id') reviewId: string) {
    return this.reviewService.getReview(reviewId);
  }

  // ─── PROTECTED ────────────────────────────────────────────────

  // POST /review
  @Post()
  @UseGuards(JwtAuthGuard)
  createReview(
    @GetUser('userId') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(userId, dto);
  }

  // PATCH /review/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateReview(
    @GetUser('userId') userId: string,
    @Param('id') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.updateReview(userId, reviewId, dto);
  }

  // DELETE /review/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteReview(
    @GetUser('userId') userId: string,
    @Param('id') reviewId: string,
  ) {
    return this.reviewService.deleteReview(userId, reviewId);
  }
}