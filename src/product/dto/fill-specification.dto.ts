import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FillSpecificationDto {
  @IsUUID()
  attributeId: string;

  @ValidateIf((o) => o.valueText !== undefined)
  @IsString()
  valueText?: string;

  @ValidateIf((o) => o.valueNumber !== undefined)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Type(() => Number)
  valueNumber?: number;

  @ValidateIf((o) => o.valueBoolean !== undefined)
  @IsBoolean()
  valueBoolean?: boolean;
}

export class FillSpecificationsDto {
  specifications: FillSpecificationDto[];
}