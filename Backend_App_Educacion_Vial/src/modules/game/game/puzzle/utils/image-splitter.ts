import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface PieceInfo {
  id: string;
  row: number;
  col: number;
  path: string;
  url: string;
}

export async function splitImage(
  inputPath: string,
  gridSize = 3,
  outputBase = path.join(process.cwd(), 'uploads', 'pieces')
): Promise<{ pieces: PieceInfo[]; folder: string }> {
  // Crear hash estable basado en filename + gridSize
  const filename = path.basename(inputPath);
  const hash = crypto.createHash('md5').update(`${filename}-${gridSize}`).digest('hex');
  const outputDir = path.join(outputBase, hash);
  
  // Verificar si ya existen las piezas
  const firstPiecePath = path.join(outputDir, 'piece-0-0.png');
  if (await fs.pathExists(firstPiecePath)) {
    console.log(`Reutilizando piezas existentes para ${filename} (${gridSize}x${gridSize})`);
    const pieces: PieceInfo[] = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const piecePath = path.join(outputDir, `piece-${row}-${col}.png`);
        pieces.push({
          id: `${row}-${col}`,
          row,
          col,
          path: piecePath,
          url: `/uploads/pieces/${hash}/piece-${row}-${col}.png`,
        });
      }
    }
    
    return { pieces, folder: outputDir };
  }

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height)
    throw new Error('No se pudo obtener tamaño de imagen');

  const imgW = metadata.width;
  const imgH = metadata.height;

  await fs.ensureDir(outputDir);

  const pieces: PieceInfo[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Calcular bordes redondeados para evitar áreas inválidas
      const left = Math.round((col / gridSize) * imgW);
      const top = Math.round((row / gridSize) * imgH);
      const right = Math.round(((col + 1) / gridSize) * imgW);
      const bottom = Math.round(((row + 1) / gridSize) * imgH);

      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);

      // Asegurar que no nos salgamos del borde por redondeo
      const safeLeft = Math.min(left, Math.max(0, imgW - width));
      const safeTop = Math.min(top, Math.max(0, imgH - height));

      const piecePath = path.join(outputDir, `piece-${row}-${col}.png`);

      // Usar clone() para evitar interferencias entre iteraciones
      try {
        await image
          .clone()
          .extract({ left: safeLeft, top: safeTop, width, height })
          .toFile(piecePath);
      } catch (err) {
        // Incluir detalles para facilitar el debug si vuelve a ocurrir
        throw new Error(
          `extract_area failed row=${row} col=${col} left=${safeLeft} top=${safeTop} width=${width} height=${height} imgW=${imgW} imgH=${imgH}`
        );
      }

        pieces.push({
          id: `${row}-${col}`,
          row,
          col,
          path: piecePath,
          url: `/uploads/pieces/${hash}/piece-${row}-${col}.png`,
        });
    }
  }

  return { pieces, folder: outputDir };
}
