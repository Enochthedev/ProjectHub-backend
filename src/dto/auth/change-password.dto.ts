import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @ApiProperty({ minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    newPassword: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    confirmPassword: string;
}