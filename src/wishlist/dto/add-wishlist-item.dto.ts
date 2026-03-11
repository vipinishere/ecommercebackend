import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddWishlistItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}