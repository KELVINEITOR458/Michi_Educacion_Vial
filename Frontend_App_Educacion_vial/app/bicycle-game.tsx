import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { ProgressApi } from 'src/services/progress';
import { BicycleProgressService } from 'src/services/bicycleProgress';
import { awardBicycleLevel1Completion } from 'src/services/progress2';
import { colors } from 'src/utils/colors';

type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
};

type Question = {
  id: number;
  title: string;
  scenario: string;
  options: Option[];
};

type MovingObstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'car' | 'truck' | 'stone' | 'animal';
  emoji: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 48;
const ROAD_HEIGHT = SCREEN_HEIGHT * 0.7;
// Distancia basada en tiempo: 20 metros/seg => 40m cada 2s
const SPEED_MPS = 20;
const OBSTACLE_SPAWN_RATE = 0.015;
const QUESTION_DISTANCE = 200; // Pregunta cada 200m
const MAX_COLLISIONS = 3; // 3 choques -> perder
const MAX_WRONG_ANSWERS = 5; // 5 incorrectas -> perder

enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  Question = 'question',
  GameOver = 'gameOver',
  Completed = 'completed',
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'Semáforo en Rojo',
    scenario: 'Te acercas a un cruce y hay un semáforo en rojo. ¿Qué haces?',
    options: [
      {
        id: '1A',
        text: 'Me detengo y espero a que cambie a verde',
        isCorrect: true,
        feedback: '¡Correcto! Siempre respeta las señales de tránsito.',
      },
      {
        id: '1B',
        text: 'Miro a ambos lados y cruzo si no vienen autos',
        isCorrect: false,
        feedback: 'Incorrecto. Debes respetar el semáforo sin importar el tráfico.',
      },
      {
        id: '1C',
        text: 'Acelero para pasar antes de que lleguen otros vehículos',
        isCorrect: false,
        feedback: 'Peligroso! Nunca ignores las señales de tránsito.',
      },
    ],
  },
  {
    id: 2,
    title: 'Paso Peatonal',
    scenario: 'Ves a una persona esperando cruzar en el paso cebra. ¿Qué haces?',
    options: [
      {
        id: '2A',
        text: 'Me detengo y le cedo el paso',
        isCorrect: true,
        feedback: '¡Excelente! Los peatones tienen prioridad en los cruces.',
      },
      {
        id: '2B',
        text: 'Toco la bocina para que se apure',
        isCorrect: false,
        feedback: 'Incorrecto. Debes ceder el paso pacientemente.',
      },
      {
        id: '2C',
        text: 'Paso rápido antes de que empiece a cruzar',
        isCorrect: false,
        feedback: 'Peligroso! Siempre cede el paso a los peatones.',
      },
    ],
  },
  {
    id: 3,
    title: 'Obstáculo en la Vía',
    scenario: 'Hay una piedra grande en tu carril. ¿Cuál es la mejor acción?',
    options: [
      {
        id: '3A',
        text: 'Freno bruscamente y me detengo',
        isCorrect: false,
        feedback: 'Peligroso! Podrías causar un accidente por detrás.',
      },
      {
        id: '3B',
        text: 'Acelero y paso por encima',
        isCorrect: false,
        feedback: 'Muy peligroso! Podrías dañar tu vehículo o perder control.',
      },
      {
        id: '3C',
        text: 'Reduzco velocidad y cambio de carril con precaución',
        isCorrect: true,
        feedback: '¡Correcto! Siempre cambia de carril de forma segura.',
      },
    ],
  },
  {
    id: 4,
    title: 'Claxon inesperado',
    scenario: 'Un auto detrás de ti toca la bocina varias veces. ¿Qué debes hacer?',
    options: [
        {
            id: '4A',
            text: 'Freno de golpe y salgo a la calle para que me rebasen.',
            isCorrect: false,
            feedback: 'Peligroso. Podrías causar un accidente.',
          },
      {
        id: '4B',
        text: 'Mantengo mi carril en la ciclovía sin perder la calma.',
        isCorrect: true,
        feedback: 'Exacto. Mantén tu carril y evita maniobras bruscas.',
      },
      {
        id: '4C',
        text: 'Señalizo con la mano que continuaré recto y sigo con cuidado.',
        isCorrect: true,
        feedback: 'Muy bien, señalizar ayuda a otros a entender tus movimientos.',
      },
      
    ],
  },
  {
    id: 5,
    title: 'Rotonda final',
    scenario: 'Llegas a una rotonda. ¿Cuál es la forma correcta de cruzarla en bicicleta?',
    options: [
      {
        id: '5A',
        text: 'Ingreso señalizando y cedo el paso a quienes ya circulan.',
        isCorrect: true,
        feedback: 'Excelente. Ceder el paso y señalizar es lo correcto.',
      },
      {
        id: '5B',
        text: 'Circulo en el sentido de la rotonda a velocidad segura.',
        isCorrect: true,
        feedback: 'Perfecto, seguir el flujo evita choques.',
      },
      {
        id: '5C',
        text: 'Cruzo en diagonal por el centro para terminar rápido.',
        isCorrect: false,
        feedback: 'Riesgoso. Podrías ser atropellado.',
      },
    ],
  },
];

const OBSTACLE_TYPES = [
  { type: 'car' as const, emoji: '🚗', width: 60, height: 40, speed: 1.2 },
  { type: 'truck' as const, emoji: '🚛', width: 80, height: 50, speed: 0.8 },
  { type: 'stone' as const, emoji: '🪨', width: 30, height: 30, speed: 0 },
  { type: 'animal' as const, emoji: '🐈', width: 35, height: 35, speed: 0.4 },
];

export default function BicycleGameScreen() {
  const router = useRouter();
  
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.Menu);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  // Número de preguntas ya disparadas por distancia (0..5)
  const [questionsTriggered, setQuestionsTriggered] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Player State
  const playerX = useRef(new Animated.Value(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2));
  const playerY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.8));
  
  // Game Objects
  const [obstacles, setObstacles] = useState<MovingObstacle[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastQuestionDistance = useRef(0);
  const lastFrameTime = useRef<number | null>(null);
  const roadOffsetRef = useRef(0);
  const lastCollisionAt = useRef<number>(0);
  const invulnerableUntil = useRef<number>(0);
  
  // Question State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | 'neutral'>('neutral');
  // Collision Modal State
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [collisionText, setCollisionText] = useState<string>('¡Colisión! Ten cuidado en la vía.');
  
  // Touch Controls
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => gameState === GameState.Playing,
        onMoveShouldSetPanResponder: () => gameState === GameState.Playing,
        
        onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const newX = Math.max(0, Math.min(SCREEN_WIDTH - PLAYER_SIZE, gestureState.moveX - PLAYER_SIZE / 2));
          // Bound Y within road area (20%..90% of screen height)
          const minY = SCREEN_HEIGHT * 0.2;
          const maxY = SCREEN_HEIGHT * 0.9 - PLAYER_SIZE;
          const rawY = gestureState.moveY - PLAYER_SIZE / 2;
          const newY = Math.max(minY, Math.min(maxY, rawY));
          playerX.current.setValue(newX);
          playerY.current.setValue(newY);
        },
      }),
    [gameState],
  );

  // Collision Detection
  const checkCollisions = useCallback(() => {
    if (gameState !== GameState.Playing) return;
    const now = Date.now();
    if (now < invulnerableUntil.current) return;
    const playerCurrentX = (playerX.current as any)._value;
    const playerCurrentY = (playerY.current as any)._value;
    const playerRect = {
      x: playerCurrentX,
      y: playerCurrentY,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    };

    for (const obstacle of obstacles) {
      if (
        playerRect.x < obstacle.x + obstacle.width &&
        playerRect.x + playerRect.width > obstacle.x &&
        playerRect.y < obstacle.y + obstacle.height &&
        playerRect.y + playerRect.height > obstacle.y
      ) {
        // Collision detected
        handleCollision();
        return;
      }
    }
  }, [obstacles, gameState]);

  const handleCollision = useCallback(() => {
    const now = Date.now();
    // Cooldown of 1s to avoid multiple counts while overlapping
    if (now - lastCollisionAt.current < 1000) return;
    lastCollisionAt.current = now;
    invulnerableUntil.current = now + 2000; // 2s invulnerable

    const newCollisions = collisionCount + 1;
    setCollisionCount(newCollisions);
    if (newCollisions >= MAX_COLLISIONS) {
      setGameState(GameState.GameOver);
    } else {
      setCollisionText(`Choques: ${newCollisions}/${MAX_COLLISIONS}`);
      setShowCollisionModal(true);
      setGameState(GameState.Paused);
      // Nudge player slightly to reduce overlap
      const currentY = (playerY.current as any)._value ?? SCREEN_HEIGHT * 0.8;
      playerY.current.setValue(Math.max(SCREEN_HEIGHT * 0.2, currentY - 40));
      lastFrameTime.current = null;
    }
  }, [collisionCount]);

  // Spawn Obstacles
  const spawnObstacle = useCallback(() => {
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
      const obstacleType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const newObstacle: MovingObstacle = {
        id: Date.now().toString(),
        x: Math.random() * (SCREEN_WIDTH - obstacleType.width),
        y: -obstacleType.height,
        width: obstacleType.width,
        height: obstacleType.height,
        speed: obstacleType.speed + level * 0.5,
        type: obstacleType.type,
        emoji: obstacleType.emoji,
      };
      
      setObstacles(prev => [...prev, newObstacle]);
    }
  }, [level]);

  // Check for Questions
  const checkForQuestion = useCallback(() => {
    if (gameState !== GameState.Playing) return;
    if (questionsTriggered >= 5) return;
    // Disparar exactamente en 200, 400, 600, 800, 1000m
    const nextThreshold = (questionsTriggered + 1) * QUESTION_DISTANCE;
    if (distance >= nextThreshold) {
      const nextIndex = questionsTriggered; // 0..4
      const question = QUESTIONS[nextIndex];
      if (question) {
        // Detener inmediatamente el game loop
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = null;
        }
        setCurrentQuestion(question);
        setGameState(GameState.Question);
        lastQuestionDistance.current = nextThreshold;
        lastFrameTime.current = null; // prevent dt spike when resuming
        // marcar que ya se disparó esta pregunta
        setQuestionsTriggered(prev => prev + 1);
      }
    }
  }, [distance, questionsTriggered, gameState]);

  // Game Loop
  const gameLoop = useCallback(() => {
    if (gameState !== GameState.Playing) return;

    const now = Date.now();
    const last = lastFrameTime.current ?? now;
    const dt = (now - last) / 1000; // seconds
    lastFrameTime.current = now;

    // Update distance and score (5 m/s)
    setDistance(prev => prev + SPEED_MPS * dt);
    setScore(prev => prev + Math.floor(10 * dt)); // score ticks

    // Animate road dashed lines
    roadOffsetRef.current = (roadOffsetRef.current + 200 * dt) % (SCREEN_HEIGHT);

    // Update obstacles (slower descent)
    setObstacles(prev => 
      prev
        .map(obstacle => ({
          ...obstacle,
          y: obstacle.y + (SPEED_MPS * 16) * dt + obstacle.speed * 6,
        }))
        .filter(obstacle => obstacle.y < SCREEN_HEIGHT + 100)
    );

    // Spawn new obstacles
    spawnObstacle();

    // Check collisions
    checkCollisions();

    // Check for questions
    checkForQuestion();

    // Increase level
    const newLevel = Math.floor(distance / 400) + 1; // sube cada 400m
    if (newLevel > level) {
      setLevel(newLevel);
    }

    if (gameState === GameState.Playing) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, distance, level, spawnObstacle, checkCollisions, checkForQuestion]);

  // Start Game
  const startGame = useCallback(() => {
    setGameState(GameState.Playing);
    setScore(0);
    setDistance(0);
    setCollisionCount(0);
    setWrongCount(0);
    setCorrectCount(0);
    setQuestionsTriggered(0);
    setLevel(1);
    setObstacles([]);
    lastQuestionDistance.current = 0;
    lastFrameTime.current = null;
    roadOffsetRef.current = 0;
    playerX.current.setValue(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2);
    playerY.current.setValue(SCREEN_HEIGHT * 0.8);
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    setGameState(GameState.Menu);
    setCurrentQuestion(null);
    setSelectedOptionIds([]);
    setFeedback(null);
    setFeedbackStatus('neutral');
  }, []);

  // Question Handlers
  const toggleOption = useCallback((optionId: string) => {
    setSelectedOptionIds(prev =>
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    );
  }, []);

  const handleConfirmAnswer = useCallback(() => {
    if (!currentQuestion || selectedOptionIds.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una respuesta');
      return;
    }

    const selectedOptions = currentQuestion.options.filter(option =>
      selectedOptionIds.includes(option.id)
    );
    const correctOptions = currentQuestion.options.filter(option => option.isCorrect);
    const isCorrect = selectedOptions.length === correctOptions.length &&
                     selectedOptions.every(option => option.isCorrect);

    if (isCorrect) {
      setFeedbackStatus('success');
      setFeedback('¡Correcto! Continúa avanzando.');
      setScore(prev => prev + 100);
      setCorrectCount(prev => prev + 1);
      
      setTimeout(() => {
        setCurrentQuestion(null);
        setSelectedOptionIds([]);
        setFeedback(null);
        setFeedbackStatus('neutral');
        // Win only after answering the 5th question correctly
        lastFrameTime.current = null;
        const newState = (correctCount + 1) >= 5 && questionsTriggered >= 5
          ? GameState.Completed
          : GameState.Playing;
        setGameState(newState);
        
        // Reiniciar el game loop si volvemos a Playing
        if (newState === GameState.Playing) {
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
      }, 2000);
    } else {
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      setFeedbackStatus('error');
      setFeedback(selectedOptions[0]?.feedback || 'Respuesta incorrecta. Intenta de nuevo.');
      
      if (newWrong >= MAX_WRONG_ANSWERS) {
        setTimeout(() => {
          setGameState(GameState.GameOver);
        }, 2000);
      } else {
        setTimeout(() => {
          setSelectedOptionIds([]);
          setFeedback(null);
          setFeedbackStatus('neutral');
          lastFrameTime.current = null;
          // Reiniciar el game loop para continuar jugando
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        }, 2000);
      }
    }
  }, [currentQuestion, selectedOptionIds, wrongCount, correctCount, questionsTriggered, gameLoop]);

  // Game Loop Effect
  useEffect(() => {
    if (gameState === GameState.Playing) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Render Menu
  if (gameState === GameState.Menu) {
    return (
      <ImageBackground source={require('../assets/images/aven-bici.png')} style={styles.container} resizeMode="cover" blurRadius={3}>
        <TouchableOpacity 
          onPress={() => router.replace('/minigames/level1' as Href)} 
          style={styles.backTopBtn} 
          activeOpacity={0.85}
        >
          <Image source={require('../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.menuContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.gameTitle}>🚴‍♂️ Aventura en Bicicleta</Text>
            <Text style={styles.gameSubtitle}>
              Evita obstáculos y responde preguntas correctamente para avanzar
            </Text>
          </View>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Cómo Jugar:</Text>
            <Text style={styles.instructionText}>• Desliza para mover tu bicicleta</Text>
            <Text style={styles.instructionText}>• Evita chocar con obstáculos</Text>
            <Text style={styles.instructionText}>• Responde preguntas para continuar</Text>
            <Text style={styles.instructionText}>• ¡No cometas más de 3 errores!</Text>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Comenzar Juego</Text>
          </TouchableOpacity>

          
        </View>
      </ImageBackground>
    );
  }

  // Render Game Over
  if (gameState === GameState.GameOver) {
    return (
      <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>😢 Juego Terminado</Text>
          <Text style={styles.gameOverText}>
            Distancia recorrida: {Math.floor(distance)}m
          </Text>
          <Text style={styles.gameOverText}>
            Puntuación final: {score}
          </Text>
          
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Jugar de Nuevo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              resetGame();
              router.replace('/minigames/level1' as Href);
            }}
            style={{ marginTop: 10 }}
          >
            <LinearGradient colors={colors.gradientSecondary} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 }}>
              <Text style={{ color: colors.white, fontWeight: '700' }}>Volver al Nivel 1</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Render Completed
  if (gameState === GameState.Completed) {
    return (
      <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>🎉 ¡Felicidades!</Text>
          <Text style={styles.gameOverText}>
            Has completado tu paseo en bicicleta respondiendo 5 preguntas correctamente.
          </Text>
          <View style={{ width: '100%', maxWidth: 400 }}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.buttonPrimary }]}
              onPress={() => {
                lastFrameTime.current = null;
                setGameState(GameState.Playing);
              }}
            >
              <Text style={styles.startButtonText}>Seguir jugando</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={async () => {
                try {
                  // 1. Marcar como completado localmente
                  await BicycleProgressService.markCompleted();

                  // 2. Intentar sincronizar con el servidor
                  let syncSuccess = false;
                  try {
                    syncSuccess = await BicycleProgressService.syncWithServer();

                    if (syncSuccess) {
                      // 3. Intentar otorgar recompensas adicionales solo si la sincronización fue exitosa
                      try {
                        await awardBicycleLevel1Completion();
                      } catch (awardError) {
                        console.warn('⚠️ Could not award level 1 completion, but continuing:', awardError);
                      }
                    }
                  } catch (syncError) {
                    console.warn('⚠️ Server sync failed, but local progress saved:', syncError);
                    // El progreso local ya está guardado, se intentará sincronizar la próxima vez
                  }

                  // 4. Forzar una nueva carga del progreso al regresar
                  if (syncSuccess) {
                    // Esperar un momento para asegurar que los cambios se propaguen
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                } catch (error) {
                  console.error('❌ Error in bicycle completion process:', error);
                  // Mostrar mensaje de error al usuario
                  Alert.alert(
                    'Error',
                    'Hubo un error al guardar tu progreso. No te preocupes, tu progreso se guardará localmente y se sincronizará más tarde.',
                    [{ text: 'Aceptar' }]
                  );
                } finally {
                  // Navegar de vuelta al menú de nivel 1
                  router.replace('/minigames/level1' as Href);
                }
              }}
            >
              <Text style={styles.startButtonText}>Completar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Render Main Game
  return (
    <LinearGradient colors={colors.gradientPrimary} style={styles.container}>
      {/* HUD */}
      <View style={styles.hudContainer}>
        <View style={styles.hudRow}>
          <Text style={styles.hudText}>Puntos: {score}</Text>
          <Text style={styles.hudText}>Nivel: {level}</Text>
        </View>
        <View style={styles.hudRow}>
          <Text style={styles.hudText}>Distancia: {Math.floor(distance)}m</Text>
          <View style={styles.hudRow}>
            <View style={styles.heartsContainer}>
              {Array.from({ length: MAX_COLLISIONS }).map((_, i) => (
                <Text key={i} style={[styles.heart, collisionCount > i && styles.heartUsed]}>❤️</Text>
              ))}
            </View>
            <Text style={[styles.hudText, { marginLeft: 10 }]}>Fallos: {wrongCount}/{MAX_WRONG_ANSWERS}</Text>
          </View>
        </View>
      </View>

      {/* Game Scene */}
      <View style={styles.gameScene} {...panResponder.panHandlers}>
        {/* Road */}
        <View style={styles.road}>
          {/* Side borders simulating perspective */}
          <View style={[styles.roadSide, styles.leftSide]} />
          <View style={[styles.roadSide, styles.rightSide]} />
          {/* Moving dashed center lines */}
          {Array.from({ length: 12 }).map((_, i) => {
            const segmentHeight = 30;
            const gap = 40;
            const total = segmentHeight + gap;
            const offset = (roadOffsetRef.current % total);
            const top = ((i * total) + offset) % (SCREEN_HEIGHT);
            return (
              <View key={i} style={[styles.dash, { top, left: SCREEN_WIDTH / 2 - 2 }]} />
            );
          })}
        </View>

        {/* Player */}
        <Animated.View
          style={[
            styles.player,
            {
              left: playerX.current,
              top: playerY.current,
            },
          ]}
        >
          {/* Opción 2A: Imagen personalizada (descomenta si tienes la imagen) */}
          <Image 
            source={require('../assets/images/bici-juego.png')} 
            style={styles.playerImage} 
            resizeMode="contain" 
          />
          
          {/* Opción 3: Icono geométrico personalizado */}
          {/* <View style={styles.bicycleIcon}>
            <View style={styles.wheel} />
            <View style={styles.wheel2} />
            <View style={styles.frame} />
          </View> */}
          
          {/* Opción 1: Diferentes emojis (elige uno) */}
          {/* <Text style={styles.playerEmoji}>🚲</Text> - Bicicleta simple */}
          {/* <Text style={styles.playerEmoji}>🚴‍♂️</Text> - Ciclista hombre */}
          {/* <Text style={styles.playerEmoji}>🚴‍♀️</Text> - Ciclista mujer */}
          {/* <Text style={styles.playerEmoji}>🚴</Text> - Ciclista genérico */}
          {/* <Text style={styles.playerEmoji}>🛴</Text> - Scooter */}
          {/* <Text style={styles.playerEmoji}>🏍️</Text> - Motocicleta */}
        </Animated.View>

        {/* Obstacles */}
        {obstacles.map(obstacle => (
          <View
            key={obstacle.id}
            style={[
              styles.obstacle,
              {
                left: obstacle.x,
                top: obstacle.y,
                width: obstacle.width,
                height: obstacle.height,
              },
            ]}
          >
            <Text style={styles.obstacleEmoji}>{obstacle.emoji}</Text>
          </View>
        ))}
      </View>

      {/* Question Modal */}
      <Modal
        visible={gameState === GameState.Question && currentQuestion !== null}
        animationType="fade"
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{currentQuestion?.title}</Text>
            <Text style={styles.modalScenario}>{currentQuestion?.scenario}</Text>

            <View style={styles.modalOptions}>
              {currentQuestion?.options.map(option => {
                const isSelected = selectedOptionIds.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => toggleOption(option.id)}
                  >
                    <View style={styles.modalOptionIndicator}>
                      <View style={[styles.modalCheckbox, isSelected && styles.modalCheckboxActive]}>
                        {isSelected && <Text style={styles.modalCheckboxIcon}>✓</Text>}
                      </View>
                    </View>
                    <Text style={styles.modalOptionText}>{option.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={handleConfirmAnswer}
            >
              <Text style={styles.modalConfirmText}>Confirmar Respuesta</Text>
            </TouchableOpacity>

            {feedback && (
              <View
                style={[
                  styles.modalFeedback,
                  feedbackStatus === 'success' ? styles.modalFeedbackSuccess : styles.modalFeedbackError,
                ]}
              >
                <Text style={styles.modalFeedbackText}>{feedback}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Collision Modal */}
      <Modal visible={showCollisionModal && gameState === GameState.Paused} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚠️ ¡Colisión!</Text>
            <Text style={styles.modalScenario}>{collisionText}</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                setShowCollisionModal(false);
                // Only resume if we are still paused (not game over)
                lastFrameTime.current = null;
                lastCollisionAt.current = Date.now();
                invulnerableUntil.current = Date.now() + 2000; // 2s invulnerabilidad al reanudar
                setGameState(GameState.Playing);
              }}
            >
              <Text style={styles.startButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  backTopBtn: { position: 'absolute', top: 20, left: 16, zIndex: 20 },
  backImg: { width: 96, height: 84 },
  mascotContainer: { alignItems: 'center', marginVertical: 12 },
  biciImage: { width: 220, height: 200 },
  
  // Menu Styles
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  gameSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 8,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  startButton: {
    backgroundColor: colors.buttonSuccess,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Game Over Styles
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  gameOverText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },

  // HUD Styles
  hudContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  hudText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heartsContainer: {
    flexDirection: 'row',
  },
  heart: {
    fontSize: 16,
    marginLeft: 2,
  },
  heartUsed: {
    opacity: 0.3,
  },

  // Game Scene Styles
  gameScene: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  road: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#333',
  },
  roadSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: '#999',
    opacity: 0.9,
  },
  leftSide: { left: SCREEN_WIDTH * 0.1 },
  rightSide: { right: SCREEN_WIDTH * 0.1 },
  dash: {
    position: 'absolute',
    width: 4,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 2,
    opacity: 0.9,
  },
  roadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#fff',
    opacity: 0.7,
  },

  // Player Styles
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playerEmoji: {
    fontSize: PLAYER_SIZE * 0.8,
  },
  playerImage: {
    width: PLAYER_SIZE * 1.5,  // 50% más grande
    height: PLAYER_SIZE * 1.5, // 50% más grande
  },
  // Estilos para icono geométrico de bicicleta
  bicycleIcon: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    position: 'relative',
  },
  wheel: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: 'transparent',
    left: 4,
    top: 20,
  },
  wheel2: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: 'transparent',
    right: 4,
    top: 20,
  },
  frame: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#333',
    left: 14,
    top: 28,
    transform: [{ rotate: '15deg' }],
  },

  // Obstacle Styles
  obstacle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  obstacleEmoji: {
    fontSize: 30,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: '95%',
    maxWidth: 480,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalScenario: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOptions: {
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  modalOptionSelected: {
    borderColor: colors.buttonSuccess,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  modalOptionIndicator: {
    marginRight: 15,
  },
  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCheckboxActive: {
    backgroundColor: colors.buttonSuccess,
    borderColor: colors.buttonSuccess,
  },
  modalCheckboxIcon: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  modalConfirmButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFeedback: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalFeedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  modalFeedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalFeedbackText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textPrimary,
  },
});
