import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsPositive,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortBy {
  PRICE_LOW_TO_HIGH = 'PRICE_LOW_TO_HIGH',
  PRICE_HIGH_TO_LOW = 'PRICE_HIGH_TO_LOW',
  RATING = 'RATING',
  NEWEST = 'NEWEST',
}

export class ProductQueryDto {
  // ─── FILTERS ─────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  // ─── SORT ─────────────────────────────────────────────────────

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  // ─── PAGINATION ───────────────────────────────────────────────

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

// GET /product?search=iphone&categoryId=uuid&minPrice=10000&maxPrice=50000&minRating=4&sortBy=RATING&page=1&limit=20