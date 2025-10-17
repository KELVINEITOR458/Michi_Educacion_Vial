import { Injectable, BadRequestException } from '@nestjs/common';
import { splitImage, PieceInfo } from './utils/image-splitter';
import path from 'path';
import fs from 'fs-extra';

@Injectable()
export class PuzzleService {
  async splitLocalImage(filename: string, gridSize = 3): Promise<{ pieces: PieceInfo[]; folder: string }> {
    const inputPath = path.join(process.cwd(), 'assets', 'images', filename);
    const exists = await fs.pathExists(inputPath);
    if (!exists) {
      throw new BadRequestException(`Imagen no encontrada: ${filename}`);
    }
    return await splitImage(inputPath, gridSize);
  }

  async splitUploadedImage(filePath: string, gridSize = 3): Promise<{ pieces: PieceInfo[]; folder: string }> {
    return await splitImage(filePath, gridSize);
  }
}
