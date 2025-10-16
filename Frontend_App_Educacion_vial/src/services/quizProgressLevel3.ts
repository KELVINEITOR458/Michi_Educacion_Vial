import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressApi } from './progress';
import { AuthService } from './auth';

const QUIZ_PROGRESS_L3_KEY = 'quiz_progress_level3';

export interface QuizProgressLevel3 {
  easy: { completed: boolean; score: number; completedAt?: string };
  medium: { completed: boolean; score: number; completedAt?: string; unlocked: boolean; unlockedAt?: string };
  hard: { completed: boolean; score: number; completedAt?: string; unlocked: boolean; unlockedAt?: string };
}

const defaultProgress: QuizProgressLevel3 = {
  easy: { completed: false, score: 0 },
  medium: { completed: false, score: 0, unlocked: false },
  hard: { completed: false, score: 0, unlocked: false },
};

export class QuizProgressLevel3Service {
  static async getProgress(): Promise<QuizProgressLevel3> {
    try {
      const stored = await AsyncStorage.getItem(QUIZ_PROGRESS_L3_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultProgress, ...parsed } as QuizProgressLevel3;
      }
      return defaultProgress;
    } catch {
      return defaultProgress;
    }
  }

  static async saveProgress(progress: QuizProgressLevel3): Promise<void> {
    await AsyncStorage.setItem(QUIZ_PROGRESS_L3_KEY, JSON.stringify(progress));
  }

  static async isLevelUnlocked(levelId: 'easy' | 'medium' | 'hard'): Promise<boolean> {
    const p = await this.getProgress();
    switch (levelId) {
      case 'easy':
        return true;
      case 'medium':
        return p.medium.unlocked && p.easy.completed;
      case 'hard':
        return p.hard.unlocked && p.medium.completed;
      default:
        return false;
    }
  }

  static async getLevelStatus(levelId: 'easy' | 'medium' | 'hard'): Promise<{ unlocked: boolean; completed: boolean; score: number }> {
    const p = await this.getProgress();
    return {
      unlocked: await this.isLevelUnlocked(levelId),
      completed: p[levelId].completed,
      score: p[levelId].score,
    };
  }

  static async completeLevel(levelId: 'easy' | 'medium' | 'hard', score: number): Promise<void> {
    const p = await this.getProgress();
    if (score === 5) {
      (p as any)[levelId].completed = true;
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

      try {
        if (p.easy.completed && p.medium.completed && p.hard.completed) {
          const session = await AuthService.getSession();
          if (session.accessToken && session.childId) {
            const current = await ProgressApi.get();
            const gameKey = '3_quiz_vial';
            const already = Array.isArray(current.completedGames) && current.completedGames.includes(gameKey);
            if (!already) {
              const updated = [...(current.completedGames || []), gameKey];
              await ProgressApi.update({ completedGames: updated });
            }
          }
        }
      } catch (_err) {
        // Silencioso
      }
    }
  }

  static async reset(): Promise<void> {
    await this.saveProgress(defaultProgress);
  }
}


