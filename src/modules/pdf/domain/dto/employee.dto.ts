import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class EmployeeDTO {
  @ApiProperty({
    description: 'Employee full name',
    example: 'John Doe',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Employee department',
    example: 'IT',
  })
  @IsOptional()
  @IsString()
  department: string;

  @ApiPropertyOptional({
    description: 'Employee gender',
    example: 'Laki-laki',
  })
  @IsOptional()
  @IsString()
  gender: string;

  @ApiProperty({
    description: 'Employee age',
    example: 30,
  })
  @IsNumber()
  age: number;
}

export interface PdfGenerationOptions {
  title?: string;
}
