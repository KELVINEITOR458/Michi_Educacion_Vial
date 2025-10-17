import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { PuzzleModule } from './game/puzzle/puzzle.modules';

@Module({
  providers: [GameGateway],
  imports: [PuzzleModule],
})
export class GameModule {}
