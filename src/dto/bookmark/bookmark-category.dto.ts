import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBookmarkCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string; // Hex color code
}

export class UpdateBookmarkCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}

export class BookmarkCategoryDto {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AssignBookmarkCategoryDto {
  @IsUUID()
  bookmarkId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string; // null to remove category
}
