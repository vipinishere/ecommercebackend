import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateWishlistDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string = 'My Wishlist';

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;
}