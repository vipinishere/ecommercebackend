import {
  IsString,
  IsEnum,
  MaxLength,
  IsOptional,
} from 'class-validator';

export enum DataType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
}

export class CreateAttributeDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(DataType, {
    message: 'dataType must be TEXT, NUMBER or BOOLEAN',
  })
  dataType: DataType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;
}