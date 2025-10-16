import { ProgressApi } from './progress';

// Internal helper to apply updates with caps and unlocks for level 1
async function apply(update: { addPoints: number; addCoinsIfNoPoints?: number; addCompleted: string[] }) {
  try {
    const current = await ProgressApi.get();

    const newPoints = (current.points || 0) + update.addPoints;
    const coins = (current.coins || 0) + (update.addCoinsIfNoPoints || 0);
    const newCompletedGames = [...(current.completedGames || []), ...update.addCompleted];

    const levelPoints = current.levelPoints || { 1: 0, 2: 0, 3: 0 };
    const currentLP = Number(levelPoints[1] ?? 0);

    const newLevelPoints = Math.min(currentLP + (update.addPoints || 0), 25);
    const actualPointsEarned = newLevelPoints - currentLP;

    const completedGames: string[] = Array.isArray(current.completedGames) ? current.completedGames : [];
    const newCompleted = [...completedGames];
    for (const key of update.addCompleted) if (!newCompleted.includes(key)) newCompleted.push(key);

    const newUnlocked = Array.isArray(current.unlockedLevels) ? [...current.unlockedLevels] : [1];
    const level = current.level || 1;
    const newLPObj = { ...levelPoints, [level]: newLevelPoints } as Record<string, number>;
    if (newLevelPoints >= 25 && level < 3 && !newUnlocked.includes(2)) {
      newUnlocked.push(2);
    }

    const result = await ProgressApi.update({
      level,
      points: (current.points || 0) + actualPointsEarned,
      coins,
      completedGames: newCompleted,
      levelPoints: newLPObj,
      unlockedLevels: newUnlocked,
    }).catch(error => {
      console.error('❌ Error en ProgressApi.update:', {
        error: error.message,
        requestData: {
          level,
          points: (current.points || 0) + actualPointsEarned,
          coins,
          completedGames: newCompleted,
          levelPoints: newLPObj,
          unlockedLevels: newUnlocked,
        }
      });
      throw error; // Re-lanzar para manejo posterior
    });

    return result;
  } catch (error) {
    console.error('❌ Error in progress apply function:', error);
    // No lanzar el error para no interrumpir el flujo del juego
    return null;
  }
}

export async function awardQuizLevel1Completion(pointsEarned = 10) {
  const l = 1;
  return apply({
    addPoints: pointsEarned,
    addCoinsIfNoPoints: Math.floor(pointsEarned / 2),
    addCompleted: [`${l}_quiz_vial`, `${l}_1`],
  });
}

export async function awardBicycleLevel1Completion(pointsEarned = 10) {
  const l = 1;
  return apply({
    addPoints: pointsEarned,
    addCoinsIfNoPoints: Math.floor(pointsEarned / 2),
    addCompleted: [`${l}_paseo_bici`, `${l}_2`],
  });
}




export async function awardBicycleLevel2Completion(pointsEarned = 10) {
  const l = 2;

  try {
    return await apply({
      addPoints: pointsEarned,
      addCoinsIfNoPoints: Math.floor(pointsEarned / 2),
      addCompleted: [`${l}_paseo_bici`, `${l}_2`],
    });
  } catch (error) {
    console.error('❌ Error in awardBicycleLevel2Completion:', error);
    // No lanzar el error para no interrumpir el flujo del juego
    return null;
  }
}

export async function awardColoringLevel1Completion(pointsEarned = 10) {
  const l = 1;
  return apply({
    addPoints: pointsEarned,
    addCoinsIfNoPoints: Math.floor(pointsEarned / 2),
    addCompleted: [`${l}_colorear_divertidamente`, `${l}_6`],
  });
}

export async function awardColoringTaskCompletion(task: 'cat' | 'patrol' | 'semaforo', pointsEarned = 8) {
  const l = 1;
  return apply({
    addPoints: pointsEarned,
    addCoinsIfNoPoints: Math.floor(pointsEarned / 2),
    addCompleted: [`${l}_coloring_${task}`],
  });
}

// Comprueba si las 3 tareas de colorear están completas y, si falta, añade la clave resumen '1_colorear_divertidamente'
export async function maybeAwardColoringSetStar() {
  const current = await ProgressApi.get();
  const done: string[] = Array.isArray(current.completedGames) ? current.completedGames : [];

  // Verificar si tiene todas las tareas individuales
  const hasAllTasks = ['1_coloring_cat', '1_coloring_patrol', '1_coloring_semaforo'].every((k) => done.includes(k));
  const hasSummary = done.includes('1_colorear_divertidamente') || done.includes('1_6');

  if (hasAllTasks && !hasSummary) {
    return apply({ addPoints: 0, addCompleted: ['1_colorear_divertidamente', '1_6'] });
  }

  return current;
}

// Elimina la clave resumen '1_colorear_divertidamente' si ya no se cumplen los requisitos
export async function maybeRemoveColoringSetStar() {
  const current = await ProgressApi.get();
  const done: string[] = Array.isArray(current.completedGames) ? current.completedGames : [];

  // Verificar si tiene todas las tareas individuales
  const hasAllTasks = ['1_coloring_cat', '1_coloring_patrol', '1_coloring_semaforo'].every((k) => done.includes(k));
  const hasSummary = done.includes('1_colorear_divertidamente') || done.includes('1_6');

  // Si tiene el resumen pero no todas las tareas individuales, eliminar el resumen
  if (hasSummary && !hasAllTasks) {
    const newCompleted = done.filter(key => !['1_colorear_divertidamente', '1_6'].includes(key));
    return ProgressApi.update({ completedGames: newCompleted });
  }

  return current;
}
