import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from '../../common/enums/note-type.enum';

export class CreateMilestoneNoteDto {
  @ApiProperty({
    description: 'Content of the milestone note',
    example:
      'Completed initial research phase. Found 15 relevant papers on machine learning in education.',
    minLength: 10,
    maxLength: 2000,
    type: String,
  })
  @IsString({ message: 'Content must be a string' })
  @MinLength(10, { message: 'Content must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Content must not exceed 2000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;

  @ApiProperty({
    description: 'Type of the note',
    example: NoteType.PROGRESS,
    enum: NoteType,
  })
  @IsEnum(NoteType, {
    message: `Note type must be one of: ${Object.values(NoteType).join(', ')}`,
  })
  type: NoteType;
}
