import React from 'react';
import BicycleGameLevel2 from './bicycle-game-level2';
import { awardBicycleLevel3Completion } from '@/services/progress2';

// Envolvemos el juego del nivel 2 inyectando el award del nivel 3
export default function BicycleGameLevel3() {
  return (
    <BicycleGameLevel2
      // @ts-expect-error: el componente de nivel 2 acepta prop opcional para callback de finalización
      onLevelCompleted={async () => {
        try { await awardBicycleLevel3Completion(10); } catch {}
      }}
    />
  );
}


