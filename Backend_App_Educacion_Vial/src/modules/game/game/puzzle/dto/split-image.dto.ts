import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class SplitImageDto {
  @IsOptional()
  @IsInt()
  @Min(2)
  gridSize?: number = 3;

  @IsOptional()
  @IsString()
  filename?: string; // Para dividir una imagen local existente
}
