import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    specialization?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specializations?: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[];

    @ApiProperty({ required: false, minimum: 1, maximum: 5 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    year?: number;

    @ApiProperty({ required: false, minimum: 1, maximum: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(20)
    capacity?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;
}