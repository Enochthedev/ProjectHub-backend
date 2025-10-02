import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password: string;
}