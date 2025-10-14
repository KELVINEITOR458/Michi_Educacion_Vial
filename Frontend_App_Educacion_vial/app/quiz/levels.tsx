import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';
import { QuizProgressService, type QuizProgress } from '@/services/quizProgress';

const { width, height } = Dimensions.get('window');

export default function QuizLevels() {
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [levelStatuses, setLevelStatuses] = useState<{
    easy: { unlocked: boolean; completed: boolean; score: number };
    medium: { unlocked: boolean; completed: boolean; score: number };
    hard: { unlocked: boolean; completed: boolean; score: number };
  }>({
    easy: { unlocked: false, completed: false, score: 0 },
    medium: { unlocked: false, completed: false, score: 0 },
    hard: { unlocked: false, completed: false, score: 0 },
  });
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      // Primero verificar si hay corrupción extrema que requiera limpieza administrativa
      await QuizProgressService.adminResetIfCorrupted();

      const quizProgress = await QuizProgressService.getProgress();

      // Los datos ya vienen validados y corregidos automáticamente por el servicio
      setProgress(quizProgress);

      // Cargar estados de todos los niveles
      const easyStatus = await QuizProgressService.getLevelStatus('easy');
      const mediumStatus = await QuizProgressService.getLevelStatus('medium');
      const hardStatus = await QuizProgressService.getLevelStatus('hard');

      setLevelStatuses({
        easy: easyStatus,
        medium: mediumStatus,
        hard: hardStatus,
      });
    } catch (error) {
      console.error('❌ Error loading quiz progress:', error);
      // Estado por defecto en caso de error - solo fácil desbloqueado
      setLevelStatuses({
        easy: { unlocked: true, completed: false, score: 0 },
        medium: { unlocked: false, completed: false, score: 0 },
        hard: { unlocked: false, completed: false, score: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  const levels = [
    {
      id: 'easy' as const,
      title: 'Nivel Fácil',
      subtitle: '5 preguntas básicas',
      icon: '🟢',
      color: ['#4CAF50', '#45a049'] as const,
      description: 'Preguntas básicas sobre señales de tráfico y normas viales fundamentales',
      questions: 5,
      difficulty: 'Principiante'
    },
    {
      id: 'medium' as const,
      title: 'Nivel Medio',
      subtitle: '5 preguntas intermedias',
      icon: '🟡',
      color: ['#FFC107', '#FF9800'] as const,
      description: 'Preguntas sobre conducción segura y marcas viales más complejas',
      questions: 5,
      difficulty: 'Intermedio'
    },
    {
      id: 'hard' as const,
      title: 'Nivel Difícil',
      subtitle: '5 preguntas avanzadas',
      icon: '🔴',
      color: ['#E53935', '#F44336'] as const,
      description: 'Preguntas complejas sobre normas de circulación y señales específicas',
      questions: 5,
      difficulty: 'Avanzado'
    }
  ];

  const handleStartQuiz = async (levelId: 'easy' | 'medium' | 'hard') => {
    const status = levelStatuses[levelId];

    if (status.unlocked) {
      router.push(`/quiz/play?level=${levelId}` as Href);
    }
  };

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/bg-quiz.png')} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando niveles...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/bg-quiz.png')} style={styles.container} resizeMode="cover">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Quiz Vial</Text>
        <Text style={styles.subtitle}>Elige tu nivel de dificultad</Text>
        {progress?.level1Completed && (
          <View style={styles.completionBadge}>
            <Text style={styles.completionText}>🎉 ¡Nivel 1 Completado!</Text>
          </View>
        )}
      </View>

      {/* Levels Cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {levels.map((level, index) => {
          const status = levelStatuses[level.id];
          const isLocked = !status.unlocked;

          return (
            <TouchableOpacity
              key={level.id}
              style={[styles.levelCard, { marginTop: index === 0 ? 20 : 0 }]}
              onPress={() => handleStartQuiz(level.id)}
              activeOpacity={isLocked ? 1 : 0.8}
              disabled={isLocked}
            >
              <LinearGradient
                colors={isLocked ? ['#666666', '#888888'] : level.color}
                style={styles.levelGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.levelHeader}>
                  <Text style={[styles.levelIcon, isLocked && styles.lockedIcon]}>{level.icon}</Text>
                  <View style={styles.levelInfo}>
                    <Text style={[styles.levelTitle, isLocked && styles.lockedTitle]}>{level.title}</Text>
                    <Text style={[styles.levelSubtitle, isLocked && styles.lockedSubtitle]}>{level.subtitle}</Text>
                  </View>
                  {status.completed && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedIcon}>✅</Text>
                    </View>
                  )}
                </View>

                <View style={styles.levelContent}>
                  <Text style={[styles.levelDescription, isLocked && styles.lockedDescription]}>{level.description}</Text>

                  {isLocked ? (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockIcon}>🔒</Text>
                      <Text style={styles.lockMessage}>
                        {level.id === 'easy' ? '' :
                         level.id === 'medium' ? 'Completa el Nivel Fácil para desbloquear' :
                         'Completa el Nivel Medio para desbloquear'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.levelStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statIcon}>❓</Text>
                        <Text style={styles.statText}>{level.questions} preguntas</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statIcon}>📊</Text>
                        <Text style={styles.statText}>{level.difficulty}</Text>
                      </View>
                      {status.completed && (
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>⭐</Text>
                          <Text style={styles.statText}>{status.score}/5</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.startButton, isLocked && styles.lockedButton]}
                  onPress={() => handleStartQuiz(level.id)}
                  disabled={isLocked}
                >
                  <LinearGradient
                    colors={isLocked ? ['#999999', '#bbbbbb'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.startButtonGradient}
                  >
                    <Text style={[styles.startButtonText, isLocked && styles.lockedButtonText]}>
                      {isLocked ? '🔒 Bloqueado' : status.completed ? '🔄 Repetir' : '▶️ Comenzar'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/minigames/level1' as Href)}
        activeOpacity={0.8}
      >
        <Image source={require('../../assets/images/btn-volver.png')} style={{ width: 96, height: 84 }} resizeMode="contain" />
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: width < 400 ? 28 : 32,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: colors.shadowDark as any,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width < 400 ? 16 : 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  completionBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  completionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  levelCard: {
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: colors.shadowDark as any,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  levelGradient: {
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  levelSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  levelContent: {
    marginBottom: 20,
  },
  levelDescription: {
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.95,
  },
  levelStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  startButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 35,
    left: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  lockedIcon: {
    opacity: 0.6,
  },
  lockedTitle: {
    color: '#cccccc',
  },
  lockedSubtitle: {
    color: '#999999',
  },
  completedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedIcon: {
    fontSize: 16,
  },
  lockedDescription: {
    color: '#999999',
  },
  lockOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  lockIcon: {
    fontSize: 48,
    color: '#fff',
    marginBottom: 12,
  },
  lockMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  lockedButton: {
    opacity: 0.6,
  },
  lockedButtonText: {
    color: '#999999',
  },
});
