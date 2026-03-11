import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export class AddProductImageDto {
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}