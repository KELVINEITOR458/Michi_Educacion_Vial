import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import questions from './questions-level2';
import { QuizProgressService } from '@/services/quizProgress';

// Mapeo de imágenes para las preguntas (completamente opcional)
const questionImages: { [key: string]: any } = {};

// Función para intentar cargar una imagen específica
const tryLoadImage = (name: string, path: string) => {
  try {
    // Usar require estático para cada imagen
    switch (name) {
      case 'senal-pare.png':
        questionImages[name] = require('../../assets/images/quiz/senal-pare.png');
        break;
      case 'paso-peatones-nivel2.png':
        questionImages[name] = require('../../assets/images/quiz/paso-peatones-nivel2.png');
        break;
      case 'semaforo-verde-peaton.png':
        questionImages[name] = require('../../assets/images/quiz/semaforo-verde-peaton.png');
        break;
      case 'mirar-atras-auto.png':
        questionImages[name] = require('../../assets/images/quiz/mirar-atras-auto.png');
        break;
      case 'prohibido-jugar-calle.png':
        questionImages[name] = require('../../assets/images/quiz/prohibido-jugar-calle.png');
        break;
      case 'senal-prohibido-girar.png':
        questionImages[name] = require('../../assets/images/quiz/senal-prohibido-girar.png');
        break;
      case 'rotonda.png':
        questionImages[name] = require('../../assets/images/quiz/rotonda.png');
        break;
      case 'velocidad-urbana.png':
        questionImages[name] = require('../../assets/images/quiz/velocidad-urbana.png');
        break;
      case 'linea-amarilla-continua.png':
        questionImages[name] = require('../../assets/images/quiz/linea-amarilla-continua.png');
        break;
      case 'ambulancia-sirena.png':
        questionImages[name] = require('../../assets/images/quiz/ambulancia-sirena.png');
        break;
      case 'senal-fin-prohibicion.png':
        questionImages[name] = require('../../assets/images/quiz/senal-fin-prohibicion.png');
        break;
      case 'distancia-seguridad.png':
        questionImages[name] = require('../../assets/images/quiz/distancia-seguridad.png');
        break;
      case 'semaforo-amarillo-intermitente.png':
        questionImages[name] = require('../../assets/images/quiz/semaforo-amarillo-intermitente.png');
        break;
      case 'prohibido-celular-conduciendo.png':
        questionImages[name] = require('../../assets/images/quiz/prohibido-celular-conduciendo.png');
        break;
      case 'paso-nivel-barreras.png':
        questionImages[name] = require('../../assets/images/quiz/paso-nivel-barreras.png');
        break;
      default:
        // Silenciosamente ignorar imágenes no definidas
        break;
    }
  } catch (error) {
    // Silenciosamente omitir imágenes no encontradas
  }
};

// ✅ Cargar TODAS las imágenes para que funcionen en todos los niveles
tryLoadImage('senal-pare.png', '../../assets/images/quiz/senal-pare.png');
tryLoadImage('paso-peatones-nivel2.png', '../../assets/images/quiz/paso-peatones-nivel2.png');
tryLoadImage('semaforo-verde-peaton.png', '../../assets/images/quiz/semaforo-verde-peaton.png');
tryLoadImage('mirar-atras-auto.png', '../../assets/images/quiz/mirar-atras-auto.png');
tryLoadImage('prohibido-jugar-calle.png', '../../assets/images/quiz/prohibido-jugar-calle.png');
tryLoadImage('senal-prohibido-girar.png', '../../assets/images/quiz/senal-prohibido-girar.png');
tryLoadImage('rotonda.png', '../../assets/images/quiz/rotonda.png');
tryLoadImage('velocidad-urbana.png', '../../assets/images/quiz/velocidad-urbana.png');
tryLoadImage('linea-amarilla-continua.png', '../../assets/images/quiz/linea-amarilla-continua.png');
tryLoadImage('ambulancia-sirena.png', '../../assets/images/quiz/ambulancia-sirena.png');
tryLoadImage('senal-fin-prohibicion.png', '../../assets/images/quiz/senal-fin-prohibicion.png');
tryLoadImage('distancia-seguridad.png', '../../assets/images/quiz/distancia-seguridad.png');
tryLoadImage('semaforo-amarillo-intermitente.png', '../../assets/images/quiz/semaforo-amarillo-intermitente.png');
tryLoadImage('prohibido-celular-conduciendo.png', '../../assets/images/quiz/prohibido-celular-conduciendo.png');
tryLoadImage('paso-nivel-barreras.png', '../../assets/images/quiz/paso-nivel-barreras.png');

// Función para obtener imagen de forma segura (completamente opcional)
const getQuestionImage = (imageName?: string) => {
  if (!imageName) return null;

  try {
    // Intentar obtener la imagen del mapeo
    const imageSource = questionImages[imageName];
    return imageSource || null;
  } catch (error) {
    // Silenciosamente retornar null si hay error
    return null;
  }
};

// Componente para mostrar imagen de forma segura con optimizaciones
const QuestionImage = ({ imageName }: { imageName?: string }) => {
  const imageSource = getQuestionImage(imageName);

  if (!imageSource) {
    return null; // No mostrar nada si no hay imagen
  }

  return (
    <View style={styles.imageContainer}>
      <Image
        source={imageSource}
        style={styles.questionImage}
        resizeMode="contain"
        fadeDuration={300} // ✅ Animación suave de carga
        onError={() => {
          // Silenciosamente manejar errores de carga
        }}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

type LevelId = 'easy' | 'medium' | 'hard';

export default function QuizPlayLevel2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const levelId = params.level as LevelId;

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [failedQuestions, setFailedQuestions] = useState<Set<number>>(new Set());

  // Filtrar preguntas según el nivel
  const levelQuestions = useMemo(() => {
    return questions.filter(q => q.difficulty === levelId);
  }, [levelId]);

  const current = useMemo(() => levelQuestions[index], [index, levelQuestions]);

  const getLevelTitle = (level: LevelId) => {
    switch (level) {
      case 'easy': return 'Nivel 2 Fácil';
      case 'medium': return 'Nivel 2 Medio';
      case 'hard': return 'Nivel 2 Difícil';
      default: return 'Quiz Nivel 2';
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

  const handleOptionSelect = async (i: number) => {
    if (showFeedback) return;

    const correct = i === current.answer;
    setSelectedOption(i);
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setScore(s => s + 1);
    } else {
      // Si falla una pregunta, marcar como fallida
      setFailedQuestions(prev => new Set([...prev, index]));
    }

    // Show feedback for 1.5 seconds before moving to next question
    setTimeout(async () => {
      if (index + 1 < levelQuestions.length) {
        // Si la respuesta fue correcta, avanzar a la siguiente
        if (correct) {
          setIndex(index + 1);
          setSelectedOption(null);
          setShowFeedback(false);
        } else {
          // Si falló, mostrar feedback de error pero no avanzar
          setShowFeedback(false);
          setSelectedOption(null);
        }
      } else {
        // Última pregunta - verificar si completó todas correctamente
        const finalScore = correct ? score + 1 : score;

        if (finalScore === levelQuestions.length && failedQuestions.size === 0) {
          // ✅ Completó todas las 5 preguntas correctamente
          await QuizProgressService.completeLevel(levelId, finalScore);

          Alert.alert(
            '¡Nivel Completado!',
            `${getLevelTitle(levelId)} finalizado perfectamente\nPuntuación: ${finalScore} de ${levelQuestions.length}`,
            [
              {
                text: 'Continuar',
                onPress: () => router.replace('/quiz/levels-level2' as Href),
              },
            ]
          );
        } else {
          // ❌ Falló alguna pregunta - reiniciar todo el nivel
          Alert.alert(
            '¡Nivel Fallido!',
            `Cometiste ${failedQuestions.size + (correct ? 0 : 1)} error(es).\nDebes responder todas las preguntas correctamente para avanzar.`,
            [
              {
                text: 'Reiniciar Nivel',
                onPress: () => {
                  setIndex(0);
                  setScore(0);
                  setSelectedOption(null);
                  setShowFeedback(false);
                  setFailedQuestions(new Set());
                },
              },
            ]
          );
        }
      }
    }, 1500);
  };

  // Calculate progress percentage
  const progress = levelQuestions.length > 0 ? (index / levelQuestions.length) * 100 : 0;

  if (!current) {
    return (
      <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontraron preguntas para este nivel</Text>
          <TouchableOpacity
            style={styles.backToLevelsButton}
            onPress={() => router.replace('/quiz/levels-level2' as Href)}
          >
            <LinearGradient colors={colors.gradientSecondary} style={styles.backToLevelsGradient}>
              <Text style={styles.backToLevelsText}>← Volver a Niveles</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.levelTitle}>
          {getLevelEmoji(levelId)} {getLevelTitle(levelId)}
        </Text>
        <Text style={styles.levelSubtitle}>Educación Vial Nivel 2</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>
          Pregunta {index + 1} de 5
        </Text>
      </View>

      {/* Question Card */}
      <View style={styles.card}>
        {/* Imagen de la pregunta (completamente opcional) */}
        <QuestionImage imageName={current.image} />

        <Text style={styles.question}>{current.q}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {current.options.map((option, i) => {
            const isSelected = selectedOption === i;
            const isAnswer = i === current.answer;
            let optionStyle = styles.option;

            if (showFeedback) {
              if (isSelected && isCorrect) {
                // ✅ Respuesta correcta seleccionada
                optionStyle = {...styles.option, ...styles.correctOption};
              } else if (isSelected && !isCorrect) {
                // ❌ Respuesta incorrecta seleccionada
                optionStyle = {...styles.option, ...styles.incorrectOption};
              }
              // No mostrar la respuesta correcta si se falló
            }

            return (
              <TouchableOpacity
                key={i}
                style={[
                  optionStyle,
                  isSelected && styles.selectedOption,
                ]}
                onPress={() => handleOptionSelect(i)}
                disabled={showFeedback}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionText,
                  (showFeedback && isSelected && isCorrect) && styles.correctText,
                  (showFeedback && isSelected && !isCorrect) && styles.incorrectText
                ]}>
                  {option}
                </Text>
                {showFeedback && isSelected && isCorrect && (
                  <Text style={styles.feedbackIcon}>✓</Text>
                )}
                {showFeedback && isSelected && !isCorrect && (
                  <Text style={styles.feedbackIcon}>✗</Text>
                )}
                {/* No mostrar ✓ en la respuesta correcta si se falló */}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>Puntuación: {score}</Text>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <LinearGradient colors={colors.gradientSecondary} style={styles.backButtonGradient}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  levelTitle: {
    fontSize: width < 400 ? 24 : 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: colors.shadowDark as any,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  levelSubtitle: {
    fontSize: width < 400 ? 16 : 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  backToLevelsButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 200,
  },
  backToLevelsGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  backToLevelsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Progress Bar
  progressBarContainer: {
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    marginBottom: 24,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: colors.white,
    fontWeight: '600',
    lineHeight: 24,
  },
  // Question Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.shadowDark as any,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  question: {
    fontSize: width < 400 ? 18 : 20,
    marginBottom: 24,
    color: colors.white,
    fontWeight: '600',
    lineHeight: 28,
  },
  // Imagen de la pregunta
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  questionImage: {
    width: width * 0.5, // ✅ Reducir tamaño para carga más rápida
    height: width * 0.3, // ✅ Reducir altura para carga más rápida
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Options
  optionsContainer: {
    marginTop: 8,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: colors.white,
    flex: 1,
    marginRight: 8,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  correctOption: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderColor: colors.success,
  },
  incorrectOption: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    borderColor: colors.error || '#dc3545',
  },
  correctText: {
    color: colors.success || '#28a745',
    fontWeight: '600',
  },
  incorrectText: {
    color: colors.error || '#dc3545',
    textDecorationLine: 'line-through',
  },
  feedbackIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Score
  scoreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  // Back button
  backButton: {
    position: 'absolute',
    top: 45,
    left: 20,
    zIndex: 10,
    borderRadius: 16,
    overflow: 'hidden',
    width: 110,
  },
  backButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
