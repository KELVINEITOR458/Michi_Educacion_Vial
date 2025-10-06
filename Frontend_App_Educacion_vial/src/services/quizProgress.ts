import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressApi } from './progress';
import { AuthService } from './auth';

const QUIZ_PROGRESS_KEY = 'quiz_progress';

export interface QuizProgress {
  easy: {
    completed: boolean;
    score: number;
    completedAt?: string;
  };
  medium: {
    completed: boolean;
    score: number;
    completedAt?: string;
    unlocked: boolean;
    unlockedAt?: string;
  };
  hard: {
    completed: boolean;
    score: number;
    completedAt?: string;
    unlocked: boolean;
    unlockedAt?: string;
  };
  level1Completed: boolean;
  level1CompletedAt?: string;
}

const defaultProgress: QuizProgress = {
  easy: {
    completed: false,
    score: 0,
  },
  medium: {
    completed: false,
    score: 0,
    unlocked: false,
  },
  hard: {
    completed: false,
    score: 0,
    unlocked: false,
  },
  level1Completed: false,
};

export class QuizProgressService {
  static async getProgress(): Promise<QuizProgress> {
    try {
      const stored = await AsyncStorage.getItem(QUIZ_PROGRESS_KEY);
      if (stored) {
        const parsedProgress = JSON.parse(stored);

        // Verificar y corregir datos inconsistentes automáticamente
        const correctedProgress = await this.validateAndCorrectProgress(parsedProgress);

        // Si los datos fueron corregidos, guardarlos silenciosamente
        if (JSON.stringify(correctedProgress) !== stored) {
          await this.saveProgress(correctedProgress);
        }

        return correctedProgress;
      }

      return defaultProgress;
    } catch (error) {
      console.error('❌ Error getting progress, using default:', error);
      return defaultProgress;
    }
  }

  static async validateAndCorrectProgress(progress: any): Promise<QuizProgress> {
    const corrected = { ...defaultProgress, ...progress };

    // Caso 1: Nivel medio completado pero fácil no completado
    if (corrected.medium.completed && !corrected.easy.completed) {
      corrected.medium.completed = false;
      corrected.medium.score = 0;
      corrected.medium.completedAt = undefined;
    }

    // Caso 2: Nivel difícil completado pero medio no completado
    if (corrected.hard.completed && !corrected.medium.completed) {
      corrected.hard.completed = false;
      corrected.hard.score = 0;
      corrected.hard.completedAt = undefined;
    }

    // Caso 3: Nivel medio desbloqueado pero fácil no completado
    if (corrected.medium.unlocked && !corrected.easy.completed) {
      corrected.medium.unlocked = false;
      corrected.medium.unlockedAt = undefined;
    }

    // Caso 4: Nivel difícil desbloqueado pero medio no completado
    if (corrected.hard.unlocked && !corrected.medium.completed) {
      corrected.hard.unlocked = false;
      corrected.hard.unlockedAt = undefined;
    }

    // Caso 5: level1Completed es true pero no todos los niveles están completados
    if (corrected.level1Completed && (!corrected.easy.completed || !corrected.medium.completed || !corrected.hard.completed)) {
      corrected.level1Completed = false;
      corrected.level1CompletedAt = undefined;
    }

    // Caso 6: Nivel fácil marcado como completado pero con score 0 (datos corruptos)
    if (corrected.easy.completed && corrected.easy.score === 0) {
      console.log('🔧 Datos corruptos detectados en nivel fácil, reseteando');
      corrected.easy.completed = false;
      corrected.easy.score = 0;
      corrected.easy.completedAt = undefined;
    }

    return corrected;
  }

  static async saveProgress(progress: QuizProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }

  static async completeLevel(levelId: 'easy' | 'medium' | 'hard', score: number): Promise<void> {
    const progress = await this.getProgress();

    // Solo marcar como completado si respondió las 5 preguntas correctamente
    if (score === 5) {
      progress[levelId].completed = true;
      progress[levelId].score = score;
      progress[levelId].completedAt = new Date().toISOString();

      // Solo desbloquear siguiente nivel si el actual se completó correctamente
      if (levelId === 'easy' && !progress.medium.unlocked) {
        progress.medium.unlocked = true;
        progress.medium.unlockedAt = new Date().toISOString();
      } else if (levelId === 'medium' && !progress.hard.unlocked) {
        progress.hard.unlocked = true;
        progress.hard.unlockedAt = new Date().toISOString();
      }

      // Verificar si se completó todo el nivel 1
      if (progress.easy.completed && progress.medium.completed && progress.hard.completed) {
        progress.level1Completed = true;
        progress.level1CompletedAt = new Date().toISOString();

        // Agregar entrada específica del quiz difícil (solo 1 estrella)
        try {
          const session = await AuthService.getSession();
          if (session.accessToken && session.childId) {
            const currentProgress = await ProgressApi.get();
            const gameKey = '1_quiz_vial';

            if (!currentProgress.completedGames.includes(gameKey)) {
              const updatedCompletedGames = [...currentProgress.completedGames, gameKey];
              await ProgressApi.update({ completedGames: updatedCompletedGames });
            }
          }
        } catch (error) {
          console.error('❌ Error updating quiz completion:', error);
        }
      }

      await this.saveProgress(progress);
    }
  }

  static async resetProgress(): Promise<void> {
    await this.saveProgress(defaultProgress);
  }

  static async forceCleanReset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUIZ_PROGRESS_KEY);
    } catch (error) {
      console.error('❌ Error removing quiz progress:', error);
    }
  }

  // Función administrativa para limpiar datos corruptos extremos
  static async adminResetIfCorrupted(): Promise<boolean> {
    try {
      const progress = await this.getProgress();

      // Verificar casos extremos de corrupción
      const hasExtremeCorruption =
        (progress.medium.completed && !progress.easy.completed) ||
        (progress.hard.completed && !progress.medium.completed) ||
        (progress.medium.unlocked && !progress.easy.completed) ||
        (progress.hard.unlocked && !progress.medium.completed) ||
        (progress.level1Completed && (!progress.easy.completed || !progress.medium.completed || !progress.hard.completed));

      if (hasExtremeCorruption) {
        console.log('🚨 Extreme corruption detected, performing admin reset');
        await this.forceCleanReset();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error in admin reset check:', error);
      return false;
    }
  }

  static async getNextAvailableLevel(): Promise<'easy' | 'medium' | 'hard'> {
    const progress = await this.getProgress();

    if (!progress.easy.completed) return 'easy';
    if (!progress.medium.unlocked) return 'easy'; // Si medium no está desbloqueado, jugar easy
    if (!progress.hard.unlocked) return 'medium'; // Si hard no está desbloqueado, jugar medium

    return 'easy'; // Si todos están completados, empezar de nuevo
  }

  static async isLevelUnlocked(levelId: 'easy' | 'medium' | 'hard'): Promise<boolean> {
    const progress = await this.getProgress();

    switch (levelId) {
      case 'easy':
        return true; // Siempre disponible
      case 'medium':
        // Solo desbloquear nivel medio si se completó el nivel fácil correctamente
        return progress.medium.unlocked && progress.easy.completed;
      case 'hard':
        // Solo desbloquear nivel difícil si se completó el nivel medio correctamente
        return progress.hard.unlocked && progress.medium.completed;
      default:
        return false;
    }
  }

  static async getLevelStatus(levelId: 'easy' | 'medium' | 'hard'): Promise<{
    unlocked: boolean;
    completed: boolean;
    score: number;
  }> {
    const progress = await this.getProgress();

    return {
      unlocked: await this.isLevelUnlocked(levelId),
      completed: progress[levelId].completed,
      score: progress[levelId].score,
    };
  }

  static async emergencyReset(): Promise<void> {
    console.log('🚨 Realizando reset de emergencia del progreso del quiz');
    await this.forceCleanReset();
  }

  static async nuclearReset(): Promise<void> {
    console.log('☢️ Realizando reset NUCLEAR - borrando TODOS los datos del quiz');
    try {
      await AsyncStorage.removeItem(QUIZ_PROGRESS_KEY);
      console.log('✅ Datos del quiz completamente eliminados');
    } catch (error) {
      console.error('❌ Error durante reset nuclear:', error);
    }
  }

  static async validateEasyLevelIntegrity(): Promise<boolean> {
    try {
      const progress = await this.getProgress();

      // El nivel fácil nunca debe aparecer como completado si tiene score 0
      if (progress.easy.completed && progress.easy.score === 0) {
        console.log('❌ Integridad del nivel fácil comprometida');
        return false;
      }

      // El nivel fácil siempre debe estar desbloqueado
      if (!progress.easy.completed && !this.isLevelUnlocked('easy')) {
        console.log('❌ Nivel fácil debería estar desbloqueado');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error validando integridad del nivel fácil:', error);
      return false;
    }
  }

  static async diagnosticReport(): Promise<string> {
    try {
      const progress = await this.getProgress();
      const easyStatus = await this.getLevelStatus('easy');
      const mediumStatus = await this.getLevelStatus('medium');
      const hardStatus = await this.getLevelStatus('hard');

      return `
🔍 DIAGNÓSTICO DEL PROGRESO DEL QUIZ:

📊 Datos actuales:
- Easy: completado=${progress.easy.completed}, score=${progress.easy.score}
- Medium: completado=${progress.medium.completed}, desbloqueado=${progress.medium.unlocked}
- Hard: completado=${progress.hard.completed}, desbloqueado=${progress.hard.unlocked}

📋 Estados calculados:
- Easy: ${JSON.stringify(easyStatus)}
- Medium: ${JSON.stringify(mediumStatus)}
- Hard: ${JSON.stringify(hardStatus)}

⚠️ Problemas detectados:
${progress.easy.completed && progress.easy.score === 0 ? '- Nivel fácil marcado como completado con score 0' : '- Ningún problema detectado'}

✅ Nivel fácil debería estar: desbloqueado=${easyStatus.unlocked}, completado=${easyStatus.completed}
      `.trim();
    } catch (error) {
      return `❌ Error generando diagnóstico: ${error}`;
    }
  }
}
