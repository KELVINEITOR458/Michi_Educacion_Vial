import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, type Href } from 'expo-router';
import { Dimensions } from 'react-native';
import { QuizProgressLevel3Service } from '@/services/quizProgressLevel3';
import { ProgressApi } from '@/services/progress';

const { width } = Dimensions.get('window');

export default function QuizLevelsLevel3() {
  const router = useRouter();
  const [levelStatuses, setLevelStatuses] = useState({
    easy: { unlocked: true, completed: false, score: 0 },
    medium: { unlocked: false, completed: false, score: 0 },
    hard: { unlocked: false, completed: false, score: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProgress(); }, []);

  const loadProgress = async () => {
    try {
      // Validación como nivel 2: bloquear todo Nivel 3 hasta completar el Nivel 2
      const backendProgress = await ProgressApi.get();
      const completed: string[] = Array.isArray(backendProgress.completedGames) ? backendProgress.completedGames : [];
      const level2Completed = completed.includes('2_quiz_vial');

      if (!level2Completed) {
        setLevelStatuses({
          easy: { unlocked: false, completed: false, score: 0 },
          medium: { unlocked: false, completed: false, score: 0 },
          hard: { unlocked: false, completed: false, score: 0 },
        });
        return;
      }

      // Si Nivel 2 está completado, usar el progreso real del Nivel 3
      const easyStatus = await QuizProgressLevel3Service.getLevelStatus('easy');
      const mediumStatus = await QuizProgressLevel3Service.getLevelStatus('medium');
      const hardStatus = await QuizProgressLevel3Service.getLevelStatus('hard');
      setLevelStatuses({ easy: easyStatus, medium: mediumStatus, hard: hardStatus });
    } catch (_e) {
      setLevelStatuses({
        easy: { unlocked: false, completed: false, score: 0 },
        medium: { unlocked: false, completed: false, score: 0 },
        hard: { unlocked: false, completed: false, score: 0 },
      });
    } finally { setLoading(false); }
  };

  const levels = [
    { id: 'easy' as const, title: 'Nivel 3 Fácil', subtitle: '5 preguntas básicas', icon: '🟢', color: ['#4CAF50', '#45a049'] as const, description: 'Preguntas básicas nivel 3', questions: 5, difficulty: 'Principiante' },
    { id: 'medium' as const, title: 'Nivel 3 Medio', subtitle: '5 preguntas intermedias', icon: '🟡', color: ['#FFC107', '#FF9800'] as const, description: 'Preguntas intermedias nivel 3', questions: 5, difficulty: 'Intermedio' },
    { id: 'hard' as const, title: 'Nivel 3 Difícil', subtitle: '5 preguntas avanzadas', icon: '🔴', color: ['#E53935', '#F44336'] as const, description: 'Preguntas avanzadas nivel 3', questions: 5, difficulty: 'Avanzado' },
  ];

  const handleStartQuiz = async (levelId: 'easy' | 'medium' | 'hard') => {
    const status = levelStatuses[levelId];
    if (status.unlocked) router.push(`/quiz/play-level3?level=${levelId}` as Href);
  };

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/bg-quiz.png')} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/bg-quiz.png')} style={styles.container} resizeMode="cover">
      {/* Back Button */}
      <TouchableOpacity onPress={() => router.replace('/minigames/level3' as Href)} style={styles.backBtn} activeOpacity={0.85}>
        <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Quiz Vial</Text>
        <Text style={styles.subtitle}>Elige tu nivel de dificultad</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {levels.map((lvl, index) => {
          const status = levelStatuses[lvl.id];
          const isLocked = !status.unlocked;
          return (
            <TouchableOpacity
              key={lvl.id}
              style={[styles.card, { marginTop: index === 0 ? 20 : 0 }]}
              onPress={() => handleStartQuiz(lvl.id)}
              activeOpacity={isLocked ? 1 : 0.85}
              disabled={isLocked}
            >
              <LinearGradient colors={isLocked ? ['#666666', '#888888'] : (lvl.color as any)} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.cardHeader}> 
                  <Text style={[styles.cardIcon, isLocked && styles.lockedIcon]}>{lvl.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isLocked && styles.lockedTitle]}>{lvl.title}</Text>
                    <Text style={[styles.cardSubtitle, isLocked && styles.lockedSubtitle]}>{lvl.subtitle}</Text>
                  </View>
                  {status.completed && (
                    <View style={styles.completedBadge}><Text style={styles.completedIcon}>✅</Text></View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={[styles.cardDesc, isLocked && styles.lockedDescription]}>{lvl.description}</Text>
                  {isLocked ? (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockIcon}>🔒</Text>
                      <Text style={styles.lockMessage}>
                        {lvl.id === 'easy' ? '' : lvl.id === 'medium' ? 'Completa el Nivel 3 Fácil para desbloquear' : 'Completa el Nivel 3 Medio para desbloquear'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.levelStats}>
                      <View style={styles.statItem}><Text style={styles.statIcon}>❓</Text><Text style={styles.statText}>{lvl.questions} preguntas</Text></View>
                      <View style={styles.statItem}><Text style={styles.statIcon}>📊</Text><Text style={styles.statText}>{lvl.difficulty}</Text></View>
                      {status.completed && (<View style={styles.statItem}><Text style={styles.statIcon}>⭐</Text><Text style={styles.statText}>{status.score}/5</Text></View>)}
                    </View>
                  )}
                </View>

                <TouchableOpacity style={[styles.startButton, isLocked && styles.lockedButton]} onPress={() => handleStartQuiz(lvl.id)} disabled={isLocked}>
                  <LinearGradient colors={isLocked ? ['#999999', '#bbbbbb'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={styles.startButtonGradient}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  header: { alignItems: 'center', marginBottom: 20 },
  image: { width: width < 400 ? 140 : 180, height: width < 400 ? 120 : 160 },
  title: { fontSize: width < 400 ? 28 : 32, fontWeight: 'bold', color: colors.white, textAlign: 'center', marginBottom: 8, textShadowColor: colors.shadowDark as any, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: width < 400 ? 16 : 18, color: colors.white, textAlign: 'center', opacity: 0.9 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.white, fontSize: 16 },
  card: { borderRadius: 20, marginBottom: 20, shadowColor: colors.shadowDark as any, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, overflow: 'hidden' },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 24 },
  cardTitle: { color: colors.white, fontWeight: 'bold', fontSize: 24, marginBottom: 4 },
  cardSubtitle: { color: colors.white, opacity: 0.9, fontSize: 16 },
  cardBody: { marginBottom: 20 },
  cardDesc: { color: colors.white, opacity: 0.95, marginTop: 6, lineHeight: 20, fontSize: 14 },
  levelStats: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  statIcon: { fontSize: 16, marginRight: 6 },
  statText: { fontSize: 12, color: colors.white, fontWeight: '600' },
  startButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  startButtonGradient: { paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  startButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  lockedIcon: { opacity: 0.6 },
  lockedTitle: { color: '#cccccc' },
  lockedSubtitle: { color: '#999999' },
  completedBadge: { backgroundColor: 'rgba(76, 175, 80, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  completedIcon: { fontSize: 16 },
  lockedDescription: { color: '#999999' },
  lockOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  lockIcon: { fontSize: 48, color: '#fff', marginBottom: 12 },
  lockMessage: { fontSize: 16, color: '#fff', textAlign: 'center', fontWeight: '600', paddingHorizontal: 20 },
  lockedButton: { opacity: 0.6 },
  lockedButtonText: { color: '#999999' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cardMeta: { color: colors.white, fontWeight: '700' },
});


