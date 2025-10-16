import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import questions from './questions-level3';
import { QuizProgressLevel3Service } from '@/services/quizProgressLevel3';
import { ProgressApi } from '@/services/progress';

const questionImages: { [key: string]: any } = {};
const tryLoadImage = (name: string, path: string) => {
  try { switch (name) {
    case 'senal-pare.png': questionImages[name] = require('../../assets/images/quiz/senal-pare.png'); break;
    case 'paso-peatones-nivel2.png': questionImages[name] = require('../../assets/images/quiz/paso-peatones-nivel2.png'); break;
    case 'semaforo-verde-peaton.png': questionImages[name] = require('../../assets/images/quiz/semaforo-verde-peaton.png'); break;
    case 'mirar-atras-auto.png': questionImages[name] = require('../../assets/images/quiz/mirar-atras-auto.png'); break;
    case 'prohibido-jugar-calle.png': questionImages[name] = require('../../assets/images/quiz/prohibido-jugar-calle.png'); break;
    case 'senal-prohibido-girar.png': questionImages[name] = require('../../assets/images/quiz/senal-prohibido-girar.png'); break;
    case 'rotonda.png': questionImages[name] = require('../../assets/images/quiz/rotonda.png'); break;
    case 'velocidad-urbana.png': questionImages[name] = require('../../assets/images/quiz/velocidad-urbana.png'); break;
    case 'linea-amarilla-continua.png': questionImages[name] = require('../../assets/images/quiz/linea-amarilla-continua.png'); break;
  } } catch {}
};

Object.values(questions).forEach((q) => { if (q.image) tryLoadImage(q.image, q.image); });

type LevelId = 'easy' | 'medium' | 'hard';

export default function QuizPlayLevel3() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const levelId = params.level as LevelId;

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [failedQuestions, setFailedQuestions] = useState<Set<number>>(new Set());

  const levelQuestions = useMemo(() => questions.filter(q => q.difficulty === levelId), [levelId]);
  const current = useMemo(() => levelQuestions[index], [index, levelQuestions]);

  const getLevelTitle = (level: LevelId) => {
    switch (level) {
      case 'easy': return 'Nivel 3 Fácil';
      case 'medium': return 'Nivel 3 Medio';
      case 'hard': return 'Nivel 3 Difícil';
      default: return 'Quiz Nivel 3';
    }
  };

  const getLevelEmoji = (level: LevelId) => {
    switch (level) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '🧠';
    }
  };

  const getBackgroundImage = (level: LevelId) => {
    switch (level) {
      case 'easy':
        return require('../../assets/images/quiz-facil-bg.png');
      case 'medium':
        return require('../../assets/images/quiz-intermedio-bg.png');
      case 'hard':
        return require('../../assets/images/quiz-dificil-bg.png');
      default:
        return require('../../assets/images/quiz-facil-bg.png');
    }
  };

  const handleOptionSelect = async (i: number) => {
    if (showFeedback) return;

    const correct = i === current.answer;
    setSelectedOption(i);
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) setScore(s => s + 1);
    else setFailedQuestions(prev => new Set([...prev, index]));

    setTimeout(async () => {
      if (index + 1 < levelQuestions.length) {
        if (correct) {
          setIndex(index + 1);
          setSelectedOption(null);
          setShowFeedback(false);
        } else {
          setShowFeedback(false);
          setSelectedOption(null);
        }
      } else {
        const finalScore = correct ? score + 1 : score;
        if (finalScore === 5) {
          await QuizProgressLevel3Service.completeLevel(levelId, 5);
          // Si completó hard, marcar 3_quiz_vial en backend (igual a nivel 2)
          if (levelId === 'hard') {
            try {
              const current = await ProgressApi.get();
              const cg: string[] = Array.isArray(current.completedGames) ? current.completedGames : [];
              if (!cg.includes('3_quiz_vial')) {
                await ProgressApi.update({ completedGames: [...cg, '3_quiz_vial'] });
              }
            } catch {}
          }
          Alert.alert('¡Completado!', '¡Excelente! Has completado este nivel con 5/5.', [
            { text: 'OK', onPress: () => router.replace('/quiz/levels-level3' as Href) },
          ]);
        } else {
          Alert.alert('Nivel no superado', 'Necesitas acertar todas para completar este nivel.', [
            { text: 'Reintentar', onPress: () => router.replace(`/quiz/play-level3?level=${levelId}` as Href) },
            { text: 'Volver', onPress: () => router.replace('/quiz/levels-level3' as Href) },
          ]);
        }
      }
    }, 1500);
  };

  return (
    <ImageBackground source={getBackgroundImage(levelId)} style={styles.bg} resizeMode="cover">
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.replace('/quiz/levels-level3' as Href)} style={styles.backBtn} activeOpacity={0.85}>
          <Image source={require('../../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.levelTitle}>{getLevelEmoji(levelId)} {getLevelTitle(levelId)}</Text>
        </View>

        {/* Progress Bar - Top Right */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${(index / 5) * 100}%` }]} />
          <Text style={styles.progressText}>{index + 1}/5</Text>
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <Text style={styles.question}>{current.q}</Text>
          {!!current.image && !!questionImages[current.image] && (
            <Image source={questionImages[current.image]} style={styles.questionImage} resizeMode="stretch" />
          )}
        </View>

        {/* Options Card */}
        <View style={styles.optionsCard}>
          <View style={styles.optionsContainer}>
            {current.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              let optionStyle = styles.option;
              if (showFeedback) {
                if (isSelected && isCorrect) optionStyle = { ...styles.option, ...styles.correctOption };
                else if (isSelected && !isCorrect) optionStyle = { ...styles.option, ...styles.incorrectOption };
              } else if (isSelected) {
                optionStyle = { ...styles.option, ...styles.selectedOption };
              }
              return (
                <TouchableOpacity key={i} style={optionStyle} onPress={() => handleOptionSelect(i)} disabled={showFeedback}>
                  <Text style={[
                    styles.optionText,
                    (showFeedback && isSelected && isCorrect) && styles.correctText,
                    (showFeedback && isSelected && !isCorrect) && styles.incorrectText
                  ]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, padding: 20, paddingTop: 80 },
  backBtn: { position: 'absolute', top: 20, left: 16, zIndex: 10 },
  backImg: { width: 96, height: 84 },
  header: { alignItems: 'center', marginBottom: 20 },
  levelTitle: { fontSize: width < 400 ? 24 : 28, fontWeight: 'bold', color: colors.white, textAlign: 'center', marginBottom: 8, textShadowColor: colors.shadowDark as any, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  // Progress Bar
  progressBarContainer: { position: 'absolute', top: 50, right: 20, height: 28, width: 70, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 14, overflow: 'hidden', zIndex: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  progressBar: { height: '100%', backgroundColor: colors.success, borderRadius: 12 },
  progressText: { position: 'absolute', width: '100%', height: '100%', textAlign: 'center', color: colors.white, fontWeight: '700', lineHeight: 28, fontSize: 11, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  // Cards
  questionCard: { backgroundColor: 'rgb(63, 62, 62)', borderRadius: 20, padding: 0, shadowColor: colors.shadowDark as any, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6, marginBottom: 16, overflow: 'hidden' },
  question: { fontSize: width < 400 ? 18 : 20, color: colors.white, fontWeight: '600', lineHeight: 28, textAlign: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  questionImage: { width: '100%', height: width * 0.4, borderRadius: 0, backgroundColor: 'rgba(119, 116, 116, 0.3)' },
  optionsCard: { backgroundColor: 'rgb(65, 62, 62)', borderRadius: 20, padding: 24, shadowColor: colors.shadowDark as any, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6, marginBottom: 20 },
  optionsContainer: { marginTop: 8 },
  option: { backgroundColor: 'rgba(255, 255, 255, 0.24)', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 16, color: colors.white, flex: 1, marginRight: 8 },
  selectedOption: { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)' },
  correctOption: { backgroundColor: 'rgba(76, 175, 80, 0.8)', borderColor: '#4CAF50', borderWidth: 3, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
  incorrectOption: { backgroundColor: 'rgba(244, 67, 54, 0.8)', borderColor: '#F44336', borderWidth: 3, shadowColor: '#F44336', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
  correctText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  incorrectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});


