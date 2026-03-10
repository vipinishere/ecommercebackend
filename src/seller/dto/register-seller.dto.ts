import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterSellerDto {
  @IsString()
  @MaxLength(150)
  businessName: string;

  @IsEmail()
  @MaxLength(150)
  contactEmail: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  contactPhone: string;

  @IsString()
  @MinLength(8)
  password: string;
}