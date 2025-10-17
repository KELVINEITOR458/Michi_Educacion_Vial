import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PuzzleService } from './puzzle.service';
import { SplitImageDto } from './dto/split-image.dto';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

@Controller('api/puzzle')
export class PuzzleController {
  constructor(private readonly puzzleService: PuzzleService) {}

  @Get('images')
  async getImages(
    @Query('gridSize') gridSize = '3',
    @Query('filename') filename = 'personaje1.png',
    @Req() req: Request,
  ) {
    try {
      const size = Math.max(2, Math.min(10, parseInt(gridSize, 10) || 3));
      const file = filename || 'personaje1.png';
      const result = await this.puzzleService.splitLocalImage(file, size);
      const base = `${req.protocol}://${req.get('host')}`;
      return {
        success: true,
        gridSize: size,
        total: result.pieces.length,
        pieces: result.pieces.map((p) => ({ url: `${base}${p.url}`, row: p.row, col: p.col })),
      };
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'No se pudieron generar las piezas');
    }
  }

  @Get('available-images')
  async getAvailableImages() {
    // Lista de imágenes disponibles para rompecabezas
    return {
      images: [
        {
          id: 'quizVial',
          name: 'Educación Vial',
          url: 'https://i.imgur.com/4AiXzf8.jpeg'
        },
        {
          id: 'personaje1',
          name: 'Personaje 1',
          url: 'https://i.imgur.com/example1.jpeg'
        },
        {
          id: 'personaje2',
          name: 'Personaje 2',
          url: 'https://i.imgur.com/example2.jpeg'
        }
      ]
    };
  }

  @Get('image')
  async getImage(@Query('filename') filename = 'personaje1.png', @Req() req: Request) {
    const base = `${req.protocol}://${req.get('host')}`;
    return {
      success: true,
      imageUrl: `${base}/assets/images/${filename}`,
    };
  }

  @Post('split')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
    }),
  )
  async splitImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SplitImageDto,
  ) {
    let result;

    if (file) {
      // Caso: Imagen subida por usuario
      result = await this.puzzleService.splitUploadedImage(file.path, dto.gridSize);
    } else if (dto.filename) {
      // Caso: Imagen local del servidor
      result = await this.puzzleService.splitLocalImage(dto.filename, dto.gridSize);
    } else {
      throw new BadRequestException('Debes enviar una imagen o un filename.');
    }

    return {
      success: true,
      gridSize: dto.gridSize,
      total: result.pieces.length,
      pieces: result.pieces.map((p) => ({
        url: p.url,
        row: p.row,
        col: p.col,
      })),
    };
  }
}
