import { IsString, IsEmail, MinLength, MaxLength, IsOptional, Matches, IsNotEmpty } from "class-validator";
export class RegisterDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;


  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  primaryNumber: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  alternativeNumber?: string;
}