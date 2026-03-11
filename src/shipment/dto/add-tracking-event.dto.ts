import {
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class AddTrackingEventDto {
  @IsString()
  @MaxLength(100)
  eventStatus: string;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsDateString()
  eventTime: string;
}