import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressApi } from '@/services/progress';
import { AuthService } from '@/services/auth';

const QUIZ_PROGRESS_L2_KEY = 'quiz_progress_level2';

export interface QuizProgressLevel2 {
  easy: { completed: boolean; score: number; completedAt?: string };
  medium: { completed: boolean; score: number; completedAt?: string; unlocked: boolean; unlockedAt?: string };
  hard: { completed: boolean; score: number; completedAt?: string; unlocked: boolean; unlockedAt?: string };
}

const defaultProgress: QuizProgressLevel2 = {
  easy: { completed: false, score: 0 },
  medium: { completed: false, score: 0, unlocked: false },
  hard: { completed: false, score: 0, unlocked: false },
};

export class QuizProgressLevel2Service {
  static async getProgress(): Promise<QuizProgressLevel2> {
    try {
      const stored = await AsyncStorage.getItem(QUIZ_PROGRESS_L2_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultProgress, ...parsed } as QuizProgressLevel2;
      }
      return defaultProgress;
    } catch {
      return defaultProgress;
    }
  }

  static async saveProgress(progress: QuizProgressLevel2): Promise<void> {
    await AsyncStorage.setItem(QUIZ_PROGRESS_L2_KEY, JSON.stringify(progress));
  }

  static async getLevelStatus(levelId: 'easy' | 'medium' | 'hard'): Promise<{ unlocked: boolean; completed: boolean; score: number }> {
    const p = await this.getProgress();
    switch (levelId) {
      case 'easy':
        return { unlocked: true, completed: p.easy.completed, score: p.easy.score };
      case 'medium':
        return { unlocked: p.medium.unlocked && p.easy.completed, completed: p.medium.completed, score: p.medium.score };
      case 'hard':
        return { unlocked: p.hard.unlocked && p.medium.completed, completed: p.hard.completed, score: p.hard.score };
    }
  }

  static async completeLevel(levelId: 'easy' | 'medium' | 'hard', score: number): Promise<void> {
    const p = await this.getProgress();
    if (score === 5) {
      p[levelId].completed = true as any;
      (p as any)[levelId].score = score;
      (p as any)[levelId].completedAt = new Date().toISOString();

      if (levelId === 'easy' && !p.medium.unlocked) {
        p.medium.unlocked = true;
        p.medium.unlockedAt = new Date().toISOString();
      } else if (levelId === 'medium' && !p.hard.unlocked) {
        p.hard.unlocked = true;
        p.hard.unlockedAt = new Date().toISOString();
      }

      await this.saveProgress(p);

      // Si ahora todos los niveles del Nivel 2 están completos, reflejarlo en el backend
      try {
        if (p.easy.completed && p.medium.completed && p.hard.completed) {
          const session = await AuthService.getSession();
          if (session.accessToken && session.childId) {
            const current = await ProgressApi.get();
            const gameKey = '2_quiz_vial';
            const already = Array.isArray(current.completedGames) && current.completedGames.includes(gameKey);
            if (!already) {
              const updated = [...(current.completedGames || []), gameKey];
              await ProgressApi.update({ completedGames: updated });
            }
          }
        }
      } catch (_err) {
        // Silencioso: si falla, se sincronizará en otra ocasión
      }
    }
  }

  static async reset(): Promise<void> {
    await this.saveProgress(defaultProgress);
  }
}


