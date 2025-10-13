import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  Alert,
  Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { ProgressApi } from '../src/services/progress';
import { BicycleProgressService } from '../src/services/bicycleProgress';
import { awardBicycleLevel2Completion } from '../src/services/progress2';
import { Audio } from 'expo-av';

// Colores definidos localmente para evitar problemas de importación
const colors = {
  primary: '#6366F1',
  secondary: '#A78BFA',
  accent: '#8B5CF6',
  accentLight: '#C4B5FD',
  background: '#FFFFFF',
  white: '#FFFFFF',
  lightWhite: '#EDE1E1',
  black: '#1F2937',
  textPrimary: '#1F2937',
  textSecondary: '#6366F1',
  textWhite: '#FFFFFF',
  textAccent: '#8B5CF6',
  textMuted: '#4B5563',
  buttonPrimary: '#6366F1',
  buttonSecondary: '#A78BFA',
  buttonAccent: '#8B5CF6',
  buttonSuccess: '#10B981',
  buttonWarning: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#6366F1',
  green: '#10B981',
  lightGreen: '#34D399',
  lightBlue: '#A78BFA',
  gray: '#9CA3AF',
  lightGray: '#F3F4F6',
  shadow: 'rgba(99, 102, 241, 0.1)',
  shadowDark: 'rgba(118, 120, 212, 0.3)',
  gradientPrimary: ['#F59E0B', '#EF4444'],
  gradientPrimaryLight: ['#F25233', '#ED664C'],
  gradientSecondary: ['#A78BFA', '#C4B5FD'],
  gradientAccent: ['#8B5CF6', '#A78BFA'],
  gradientBackground: ['#FFFFFF', '#F8FAFC'],
  gradientSuccess: ['#10B981', '#34D399'],
  gradientWarning: ['#F59E0B', '#FBBF24'],
  gradiantGreen: ['#10B981', '#34D399'],
  gradientVialGreen: ['#16A34A', '#22C55E'],
  gradientVialYellow: ['#FACC15', '#FDE047'],
  gradientVialOrange: ['#F97316', '#FB923C'],
  asphalt: '#2E2E2E',
  roadYellow: '#F5D142',
  skyBlue: '#0B2B4C',
  loginBackground: '#0B2B4C',
  gradientLoginPrimary: ['#0B2B4C', '#145DA0'],
  gradientLoginSecondary: ['#F5D142', '#F7C948'],
  gradientLoginAccent: ['#2E2E2E', '#4B5563'],
} as const;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 48;

// --- Imágenes del gatito en bicicleta ---
const bikeSprites = [
  require('../assets/animations/bike_1.png'),
  require('../assets/animations/bike_2.png'),
  require('../assets/animations/bike_3.png'),
  require('../assets/animations/bike_4.png'),
];

// --- Estados del juego ---
enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Question = 'question',
  GameOver = 'gameOver',
  Completed = 'completed',
  Paused = 'paused',
}

// --- Constantes del juego ---
const QUESTION_DISTANCE = 250; // Pregunta cada 250m
const MAX_COLLISIONS = 3; // 3 choques -> perder
const MAX_WRONG_ANSWERS = 3; // 3 errores -> perder
const SPEED_MPS = 20;

// --- Tipos ---
type Obstacle = { id: string; x: number; y: number; width: number; height: number; emoji: string };
type Option = { id: string; text: string; isCorrect: boolean; feedback: string };
type Question = { id: number; title: string; scenario: string; options: Option[] };

// Definir interfaces
interface Particle {
  id: string;
  x: number;
  y: number;
  opacity: Animated.Value;
  emoji?: string; // Opcional para partículas especiales como colisiones
}

interface MovingObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'car' | 'truck' | 'stone' | 'animal' | 'pothole' | 'bicycle';
  emoji: string;
}

const OBSTACLE_TYPES = [
  { type: 'car' as const, emoji: '🚗', width: 60, height: 40, speed: 1.2 },
  { type: 'truck' as const, emoji: '🚛', width: 80, height: 50, speed: 0.8 },
  { type: 'stone' as const, emoji: '🪨', width: 45, height: 45, speed: 0 },
  { type: 'animal' as const, emoji: '🐈', width: 50, height: 50, speed: 0.4 },
  { type: 'pothole' as const, emoji: '🕳️', width: 55, height: 35, speed: 0 }, // Nuevo obstáculo
  //{ type: 'bicycle' as const, emoji: '🚲', width: 45, height: 45, speed: 0.9 },// // Otro ciclista
];

// --- Preguntas ---
// Nivel 2 tiene las mismas preguntas básicas que el nivel 1 pero con dificultad aumentada gradualmente
const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'Semáforo en Rojo',
    scenario: 'Te acercas a un cruce y hay un semáforo en rojo. ¿Qué haces?',
    options: [
      { id: '1A', text: 'Me detengo y espero a que cambie a verde', isCorrect: true, feedback: '¡Correcto! Siempre respeta las señales de tránsito.' },
      { id: '1B', text: 'Miro a ambos lados y cruzo si no vienen autos', isCorrect: false, feedback: 'Incorrecto. Debes respetar el semáforo sin importar el tráfico.' },
      { id: '1C', text: 'Acelero para pasar antes de que lleguen otros vehículos', isCorrect: false, feedback: 'Peligroso! Nunca ignores las señales de tránsito.' },
    ],
  },
  {
    id: 2,
    title: 'Paso Peatonal',
    scenario: 'Ves a una persona esperando cruzar en el paso cebra. ¿Qué haces?',
    options: [
      { id: '2A', text: 'Me detengo y le cedo el paso', isCorrect: true, feedback: '¡Excelente! Los peatones tienen prioridad en los cruces.' },
      { id: '2B', text: 'Toco la bocina para que se apure', isCorrect: false, feedback: 'Incorrecto. Debes ceder el paso pacientemente.' },
      { id: '2C', text: 'Paso rápido antes de que empiece a cruzar', isCorrect: false, feedback: 'Riesgoso! Siempre cede el paso a los peatones.' },
    ],
  },
  {
    id: 3,
    title: 'Obstáculo en la Vía',
    scenario: 'Hay una piedra grande en tu carril. ¿Cuál es la mejor acción?',
    options: [
      { id: '3A', text: 'Freno bruscamente y me detengo', isCorrect: false, feedback: 'Peligroso! Podrías causar un accidente por detrás.' },
      { id: '3B', text: 'Acelero y paso por encima', isCorrect: false, feedback: 'Muy peligroso! Podrías dañar tu vehículo o perder control.' },
      { id: '3C', text: 'Reduzco velocidad y cambio de carril con precaución', isCorrect: true, feedback: '¡Correcto! Siempre cambia de carril de forma segura.' },
    ],
  },
  {
    id: 4,
    title: 'Claxon inesperado',
    scenario: 'Un auto detrás de ti toca la bocina varias veces. ¿Qué debes hacer?',
    options: [
      { id: '4A', text: 'Freno de golpe y salgo a la calle para que me rebasen.', isCorrect: false, feedback: 'Peligroso. Podrías causar un accidente.' },
      { id: '4B', text: 'Mantengo mi carril en la ciclovía sin perder la calma.', isCorrect: true, feedback: 'Exacto. Mantén tu carril y evita maniobras bruscas.' },
      { id: '4C', text: 'Señalizo con la mano que continuaré recto y sigo con cuidado.', isCorrect: true, feedback: 'Muy bien, señalizar ayuda a otros a entender tus movimientos.' },
    ],
  },
  {
    id: 5,
    title: 'Rotonda final',
    scenario: 'Llegas a una rotonda. ¿Cuál es la forma correcta de cruzarla en bicicleta?',
    options: [
      { id: '5A', text: 'Ingreso señalizando y cedo el paso a quienes ya circulan.', isCorrect: true, feedback: 'Excelente. Ceder el paso y señalizar es lo correcto.' },
      { id: '5B', text: 'Circulo en el sentido de la rotonda a velocidad segura.', isCorrect: true, feedback: 'Perfecto, seguir el flujo evita choques.' },
      { id: '5C', text: 'Cruzo en diagonal por el centro para terminar rápido.', isCorrect: false, feedback: 'Riesgoso. Podrías ser atropellado.' },
    ],
  },
];

// --- Función de sonido mejorada (módulo nivel) ---
let soundObjects: Map<string, Audio.Sound> = new Map();
let backgroundMusic: Audio.Sound | null = null;

// Contador único para partículas para evitar keys duplicadas
let particleCounter = 0;

export const playSound = async (type: 'collision' | 'correct' | 'wrong') => {
  // Define los sonidos (fuera del try para acceso en catch)
  const sounds = {
    collision: require('../assets/sounds/crash.mp3'),
    correct: require('../assets/sounds/success.mp3'),
    wrong: require('../assets/sounds/error.mp3'),
  };

  try {
    const soundKey = type;

    // Limpiar sonido anterior del mismo tipo si existe
    const existingSound = soundObjects.get(soundKey);
    if (existingSound) {
      try {
        await existingSound.unloadAsync();
      } catch (e) {
        console.warn('Error descargando sonido anterior:', e);
      }
      soundObjects.delete(soundKey);
    }

    // Crear y cargar el nuevo sonido
    const { sound } = await Audio.Sound.createAsync(sounds[type], {
      shouldPlay: true,
      volume: 0.5, // Reducir volumen para evitar distorsión
    });

    soundObjects.set(soundKey, sound);

    // Configurar liberación automática cuando termine
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !status.isLooping) {
        sound.unloadAsync().catch(console.warn);
        soundObjects.delete(soundKey);
      }
    });

    // Reproducir el sonido
    await sound.playAsync();

    // Liberar después de .5 segundos como respaldo
    setTimeout(() => {
      if (soundObjects.has(soundKey)) {
        sound.unloadAsync().catch(console.warn);
        soundObjects.delete(soundKey);
      }
    }, 500);

  } catch (err) {
    console.warn(`Error reproduciendo sonido ${type}:`, err);
    // Intentar con configuración alternativa
    try {
      const { sound: fallbackSound } = await Audio.Sound.createAsync(
        sounds[type],
        { shouldPlay: true, volume: 0.3 }
      );
      await fallbackSound.playAsync();
      setTimeout(() => fallbackSound.unloadAsync(), 2000);
    } catch (fallbackErr) {
      console.error(`Error fallback sonido ${type}:`, fallbackErr);
    }
  }
};

// --- Función para música de fondo ---
export const playBackgroundMusic = async () => {
  try {
    // Detener música anterior si existe
    if (backgroundMusic) {
      await backgroundMusic.unloadAsync();
      backgroundMusic = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/background.mp3'),
      {
        shouldPlay: true,
        isLooping: true, // Música en loop infinito
        volume: 0.2, // Volumen bajo (20%) para no interferir con efectos de sonido
      }
    );

    backgroundMusic = sound;
  } catch (err) {
    console.warn('⚠️ Música de fondo no disponible. Para agregar música:');
    console.warn('1. Agrega un archivo background.mp3 a assets/sounds/');
    console.warn('2. Puede ser cualquier canción instrumental');
  }
};

export const stopBackgroundMusic = async () => {
  try {
    if (backgroundMusic) {
      await backgroundMusic.unloadAsync();
      backgroundMusic = null;
    }
  } catch (err) {
    console.warn('Error deteniendo música de fondo:', err);
  }
};

// --- Componente principal ---
function BicycleGameScreen() {
  const router = useRouter();
  // Estados básicos del juego
  const [gameState, setGameState] = useState<GameState>(GameState.Menu);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [questionsTriggered, setQuestionsTriggered] = useState(0);
  const [level, setLevel] = useState(1);
  const [obstacleSpeedMultiplier, setObstacleSpeedMultiplier] = useState(1);

  // Estados del jugador
  const playerX = useRef(new Animated.Value(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2));
  const playerY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.8));

  // Estados del juego
  const [obstacles, setObstacles] = useState<MovingObstacle[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | 'neutral'>('neutral');
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [collisionText, setCollisionText] = useState<string>('¡Colisión! Ten cuidado en la vía.');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [playerFrame, setPlayerFrame] = useState(0);
  const [flashVisible, setFlashVisible] = useState(false);
  const [isPedaling, setIsPedaling] = useState(false);
  const [playerTilt, setPlayerTilt] = useState(0);
  const [clouds, setClouds] = useState<{id: string, x: number, y: number, speed: number}[]>([]);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Refs para el loop del juego
  const gameLoopRef = useRef<number | null>(null);
  const lastQuestionDistance = useRef(0);
  const lastFrameTime = useRef<number | null>(null);
  const roadOffsetRef = useRef(0);
  const lastCollisionAt = useRef<number>(0);
  const invulnerableUntil = useRef<number>(0);

  const roadOffset = useRef(new Animated.Value(0)).current;
  const bgOffset = useRef(new Animated.Value(0)).current;
  const backgroundOffset = useRef(new Animated.Value(0)).current;
  const cloudOffsets = useRef<{[key: string]: Animated.Value}>({}).current;
  // Refs para minimizar renders del HUD
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const lastHudUpdateAt = useRef<number>(0);

  const baseSpeed = 3; // Reducido de 4 para comenzar más lento
  const speed = baseSpeed + Math.min(score * 0.15, 2); // Máximo aumento de 2 puntos de velocidad
  const spawnChance = Math.min(0.02 + (distance / 1000) * 0.003, 0.08); // AUMENTADO: Basado en distancia, máximo 8% (doble del original)

  // Animación del jugador
  useEffect(() => {
    const interval = setInterval(() => setPlayerFrame(prev => (prev + 1) % bikeSprites.length), 120);
    return () => clearInterval(interval);
  }, []);

  // Inicializar nubes del fondo - Pequeñas como antes
  useEffect(() => {
    const initialClouds = Array.from({ length: 5 }, (_, i) => {
      const cloudId = `cloud-${i}`;
      // Crear Animated.Value para posición X de cada nube
      cloudOffsets[cloudId] = new Animated.Value(Math.random() * SCREEN_WIDTH);
      return {
        id: cloudId,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT * 0.15) + 2, // Área más pequeña como antes (15% vs 25%)
        speed: (Math.random() * 0.5 + 0.1), // Velocidad normal como antes
      };
    });
    setClouds(initialClouds);
  }, []);

  // Animación de pedaleo cuando el jugador se mueve
  useEffect(() => {
    if (gameState === GameState.Playing) {
      const pedalInterval = setInterval(() => {
        setIsPedaling(prev => !prev);
      }, 300); // Cambiar cada 300ms
      return () => clearInterval(pedalInterval);
    }
  }, [gameState]);

  // Animación de balanceo cuando gira
  const handlePlayerMovement = useCallback((gestureState: any) => {
    const deltaX = gestureState.dx || 0;
    const tiltAmount = Math.min(Math.abs(deltaX) * 0.1, 5); // Máximo 5 grados de inclinación
    setPlayerTilt(deltaX > 0 ? tiltAmount : -tiltAmount);
  }, []);

  // --- Loop principal ---
  const gameLoop = useCallback(() => {
    if (gameState !== GameState.Playing) return;

    const now = Date.now();
    const last = lastFrameTime.current ?? now;
    const dt = (now - last) / 1000; // seconds
    lastFrameTime.current = now;

    // Update distance and score (5 m/s) con throttling para evitar renders excesivos
    distanceRef.current = distanceRef.current + SPEED_MPS * dt;
    scoreRef.current = scoreRef.current + 10 * dt;
    const nowMs = now;
    if (nowMs - (lastHudUpdateAt.current || 0) > 100) { // cada ~100ms
      setDistance(Math.floor(distanceRef.current));
      setScore(Math.floor(scoreRef.current));
      lastHudUpdateAt.current = nowMs;
    }

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

    // Spawn new obstacles - AUMENTADO: Más obstáculos para mayor dificultad
    if (Math.random() < spawnChance || obstacles.length < 2) { // También genera si hay pocos obstáculos (máximo 3)
      const obstacleType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const newObstacle: MovingObstacle = {
        id: String(Date.now()),
        x: Math.random() * (SCREEN_WIDTH - obstacleType.width),
        y: -obstacleType.height,
        width: obstacleType.width,
        height: obstacleType.height,
        speed: obstacleType.speed + obstacleSpeedMultiplier * 0.3, // Más gradual que * 0.5
        type: obstacleType.type as 'car' | 'truck' | 'stone' | 'animal' | 'pothole' | 'bicycle',
        emoji: obstacleType.emoji,
      };
      setObstacles(prev => [...prev, newObstacle]);
    }

    // Animate road dashed lines
    roadOffsetRef.current = (roadOffsetRef.current + 200 * dt) % (SCREEN_HEIGHT);

    // La animación continua de la carretera se maneja en un useEffect dedicado

    // Animar nubes del fondo dinámico - Dirección derecha a izquierda con parallax
    clouds.forEach(cloud => {
      const currentX = cloudOffsets[cloud.id];
      if (currentX) {
        // Calcular nueva posición con parallax (nubes se mueven más lento que la carretera)
        const parallaxSpeed = cloud.speed * 0.3; // Factor de parallax para nubes
        const newX = (currentX as any)._value - parallaxSpeed * dt * 60; // 60 FPS aproximado

        if (newX < -100) {
          // Reset nube cuando sale de pantalla
          currentX.setValue(SCREEN_WIDTH + 50);
        } else {
          currentX.setValue(newX);
        }
      }
    });

    // Efecto parallax para fondo (más sutil que carretera)
    const bgParallaxSpeed = speed * 0.1; // Fondo se mueve muy lentamente
    backgroundOffset.setValue((backgroundOffset as any)._value + bgParallaxSpeed * dt);

    // Colisiones
    checkCollision();

    // Pregunta cada 250 m -
    if (distance >= (questionsTriggered + 1) * QUESTION_DISTANCE && questionsTriggered < 5) {
      const nextIndex = questionsTriggered;
      const question = QUESTIONS[nextIndex];
      if (question) {
        // Detener inmediatamente el game loop
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = null;
        }
        setCurrentQuestion(question);
        setGameState(GameState.Question);
        lastQuestionDistance.current = (questionsTriggered + 1) * QUESTION_DISTANCE;
        lastFrameTime.current = null;
        setQuestionsTriggered(prev => prev + 1);
      }
    }

    // Increase level - Más agresivo basado en distancia y puntuación
    const newLevel = Math.floor(distance / 500) + 1; // Aumenta cada 500m en lugar de 600m
    if (newLevel > level) {
      setLevel(newLevel);
      setObstacleSpeedMultiplier(prev => prev + 0.4); // Aumenta más rápidamente la velocidad de obstáculos
    }

    // Partículas de polvo - Más frecuentes para mayor inmersión (35% de probabilidad)
    if (Math.random() < 0.35 && particles.length < 60) {
      generateParticles();
    }

    // Generar partículas de velocidad detrás de la bicicleta - Más frecuentes
    if (Math.random() < 0.5 && speed > baseSpeed && particles.length < 60) { // limitar cantidad
      generateSpeedParticles();
    }

    if (gameState === GameState.Playing) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, distance, level, score, questionsTriggered, clouds]);

  // --- Partículas ---
  const generateParticles = () => {
    const newParticle: Particle = {
      id: `dust-${particleCounter++}`,
      x: (playerX.current as any)._value + PLAYER_SIZE / 2 - 4 + Math.random() * 8,
      y: (playerY.current as any)._value + PLAYER_SIZE,
      opacity: new Animated.Value(1),
    };
    setParticles(prev => [...prev, newParticle]);

    Animated.timing(newParticle.opacity, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    });
  };

  // --- Partículas de velocidad mejoradas ---
  const generateSpeedParticles = () => {
    const playerXPos = (playerX.current as any)._value;
    const playerYPos = (playerY.current as any)._value;

    // Crear múltiples partículas detrás de la rueda trasera
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const particle: Particle = {
          id: `speed-${particleCounter++}`,
          x: playerXPos + PLAYER_SIZE / 2 - Math.random() * 20 - 10, // Detrás de la bicicleta
          y: playerYPos + PLAYER_SIZE - Math.random() * 10,
          opacity: new Animated.Value(0.9), // Más opaco para ser visible
        };
        setParticles(prev => [...prev, particle]);

        // Animar la partícula hacia atrás y desaparecer
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          // También podemos agregar movimiento hacia atrás aquí si queremos
        ]).start(() => {
          setParticles(prev => prev.filter(p => p.id !== particle.id));
        });
      }, i * 50); // Stagger para efecto más natural
    }
  };

  const checkCollision = useCallback(() => {
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
    triggerFlash();
    generateCollisionEffect();
    playSound('collision');
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

  // --- Efecto de flash y vibración ---
  const triggerFlash = () => {
    setFlashVisible(true);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setFlashVisible(false));
    Vibration.vibrate(200);
  };

  // --- Efecto de emojis en colisión ---
  const generateCollisionEffect = () => {
    const centerX = (playerX.current as any)._value + PLAYER_SIZE / 2;
    const centerY = (playerY.current as any)._value + PLAYER_SIZE / 2;
    const emojis = ['💥', '⚠️', '🚧', '🔥'];

    emojis.forEach((emoji, index) => {
      const particle = {
        id: `collision-${particleCounter++}`,
        x: centerX + (Math.random() - 0.5) * 60,
        y: centerY + (Math.random() - 0.5) * 60,
        opacity: new Animated.Value(1),
        emoji,
      };
      setParticles(prev => [...prev, particle]);

      Animated.timing(particle.opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setParticles(prev => prev.filter(p => p.id !== particle.id)));
    });
  };

  // --- Gradiente dinámico por nivel ---
  const getLevelGradient = () => {
    switch (level) {
      case 1: return ['#4facfe', '#00f2fe'];
      case 2: return ['#43e97b', '#38f9d7'];
      case 3: return ['#fa709a', '#fee140'];
      case 4: return ['#fddb92', '#d1fdff'];
      default: return ['#a1c4fd', '#c2e9fb'];
    }
  };


  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => gameState === GameState.Playing,
        onMoveShouldSetPanResponder: () => gameState === GameState.Playing,
        onPanResponderMove: (_, gestureState) => {
          const newX = Math.max(0, Math.min(SCREEN_WIDTH - PLAYER_SIZE, gestureState.moveX - PLAYER_SIZE / 2));
          const newY = Math.max(SCREEN_HEIGHT * 0.2, Math.min(SCREEN_HEIGHT * 0.9 - PLAYER_SIZE, gestureState.moveY - PLAYER_SIZE / 2));
          playerX.current.setValue(newX);
          playerY.current.setValue(newY);

          // Actualizar inclinación de la bicicleta según movimiento horizontal
          const deltaX = gestureState.dx || 0;
          const tiltAmount = Math.min(Math.abs(deltaX) * 0.2, 15); // Más exagerado - máximo 15 grados
          setPlayerTilt(deltaX > 0 ? tiltAmount : -tiltAmount);
        },
      }),
    [gameState]
  );

  // Función para reinicializar nubes
  const reinitializeClouds = useCallback(() => {
    const initialClouds = Array.from({ length: 5 }, (_, i) => {
      const cloudId = `cloud-${i}`;
      // Crear Animated.Value para posición X de cada nube
      cloudOffsets[cloudId] = new Animated.Value(Math.random() * SCREEN_WIDTH);
      return {
        id: cloudId,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT * 0.15) + 2, // Área más pequeña como antes
        speed: (Math.random() * 0.5 + 0.1), // Velocidad normal como antes
      };
    });
    setClouds(initialClouds);
  }, []);

  // Start Game
  const startGame = useCallback(() => {
    setGameState(GameState.Playing);
    setScore(0);
    setDistance(0);
    scoreRef.current = 0;
    distanceRef.current = 0;
    setCollisionCount(0);
    setWrongCount(0);
    setCorrectCount(0);
    setQuestionsTriggered(0);
    setLevel(1);
    setObstacleSpeedMultiplier(1); // Reiniciar velocidad de obstáculos
    setObstacles([]);
    setCurrentQuestion(null);
    setSelectedOptionIds([]);
    setFeedback(null);
    setFeedbackStatus('neutral');
    setShowCollisionModal(false);
    lastQuestionDistance.current = 0;
    lastFrameTime.current = null;
    roadOffsetRef.current = 0;
    playerX.current.setValue(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2);
    playerY.current.setValue(SCREEN_HEIGHT * 0.8);
    particleCounter = 0; // Reiniciar contador de partículas

    // Reinicializar nubes para asegurar que aparezcan correctamente
    reinitializeClouds();

    // Reinicializar animaciones parallax
    backgroundOffset.setValue(0);
    roadOffset.setValue(0);
  }, []); // Close startGame function here

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

      // 🔊 Reproducir sonido de respuesta correcta
      playSound('correct');

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

      // 🔊 Reproducir sonido de respuesta incorrecta
      playSound('wrong');

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

  // Música de fondo - se reproduce cuando el juego está activo
  useEffect(() => {
    if (gameState === GameState.Playing) {
      // Iniciar música de fondo cuando comienza el juego
      playBackgroundMusic();
    } else {
      // Detener música de fondo cuando no está jugando
      stopBackgroundMusic();
    }

    // Cleanup: detener música cuando el componente se desmonte
    return () => {
      stopBackgroundMusic();
    };
  }, [gameState]);

  // Animación continua de la carretera usando un loop independiente (menos jank)
  useEffect(() => {
    let isMounted = true;
    const loop = () => {
      if (!isMounted || gameState !== GameState.Playing) return;
      roadOffset.setValue(0);
      Animated.timing(roadOffset, {
        toValue: 30,
        duration: 150,
        useNativeDriver: false,
      }).start(() => {
        if (isMounted) loop();
      });
    };
    loop();
    return () => {
      isMounted = false;
      roadOffset.stopAnimation();
    };
  }, [gameState, roadOffset]);
  return (
    <LinearGradient colors={getLevelGradient() as [string, string, ...string[]]} style={styles.container}>
      {/* Fondo dinámico con cielo y nubes - AHORA VISIBLE */}
      <View style={styles.dynamicBackground}>
        {/* Nubes animadas con Animated.View independientes */}
        {clouds.map(cloud => (
          <Animated.View
            key={cloud.id}
            style={[
              styles.cloud,
              {
                left: cloudOffsets[cloud.id] || 0,
                top: cloud.y,
                transform: [
                  { scale: 0.8 + Math.sin(Date.now() * 0.001 + cloud.id.length) * 0.2 },
                ],
              }
            ]}
          />
        ))}
      </View>

      {/* Fondo con gradiente - Transición suave desde nubes hasta carretera */}
      <Animated.View
        style={[
          styles.background,
          {
            transform: [{ translateY: backgroundOffset }]
          }
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(135, 206, 235, 0.9)', // Color cielo más intenso arriba
            'rgba(136, 192, 208, 0.7)', // Transición suave
            'rgba(136, 192, 208, 0.3)', // Más claro hacia abajo
            'rgba(136, 192, 208, 0)'    // Transparente al final
          ]}
          style={StyleSheet.absoluteFillObject}
          locations={[0, 0.3, 0.7, 1]}
        />
      </Animated.View>

      {/* Road con efecto 3D */}
      <Animated.View style={[styles.road, { transform: [{ translateY: roadOffset }] }]}>
        {Array.from({ length: 12 }).map((_, i) => {
          const segmentHeight = 30;
          const gap = 40;
          const total = segmentHeight + gap;
          const top = (i * total + roadOffsetRef.current) % SCREEN_HEIGHT;
          const scale = 0.3 + (top / SCREEN_HEIGHT) * 0.7;
          return <View key={i} style={[styles.dash, { top, left: SCREEN_WIDTH / 2 - 2 * scale, transform: [{ scaleX: scale }] }]} />;
        })}
      </Animated.View>

      {/* Partículas de polvo - Más frecuentes pero no excesivas (20% de probabilidad) */}
      {particles.map(p => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              opacity: p.opacity,
              backgroundColor: p.emoji ? 'rgba(255, 255, 0, 0.8)' : 'rgba(200, 200, 200, 0.9)', // Más visible
              width: p.emoji ? 20 : 8,
              height: p.emoji ? 20 : 8,
              borderRadius: p.emoji ? 10 : 4,
            }
          ]}
        >
          {p.emoji ? <Text style={{ fontSize: 16 }}>{p.emoji}</Text> : null}
        </Animated.View>
      ))}

      {/* Player */}
      <Animated.View
        style={[
          styles.player,
          { left: playerX.current, top: playerY.current },
          { transform: [{ rotate: `${playerTilt}deg` }] }
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.Image
          source={bikeSprites[playerFrame]}
          style={[
            styles.playerImage,
            isPedaling && { transform: [{ rotate: '8deg' }, { translateY: -2 }] }
          ]}
        />
      </Animated.View>

      {/* Obstáculos */}
      {obstacles.map(o => (
        <View key={o.id} style={[styles.obstacle, { left: o.x, top: o.y, width: o.width, height: o.height }]}>
          <Text style={{ fontSize: o.width / 2 }}>{o.emoji}</Text>
        </View>
      ))}

      {/* HUD mejorado - Diseño de dos filas */}
      {gameState === GameState.Playing && (
        <View style={styles.hud}>
          {/* Primera fila: Puntuación, Distancia, Velocidad, Nivel */}
          <View style={styles.hudTopRow}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Puntos</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceLabel}>Distancia</Text>
              <Text style={styles.distanceValue}>{Math.floor(distance)}m</Text>
            </View>
            <View style={styles.speedContainer}>
              <Text style={styles.speedLabel}>Velocidad</Text>
              <Text style={styles.speedValue}>{Math.floor(speed * 3.6)} km/h</Text>
            </View>
            <View style={styles.levelContainer}>
              <Text style={styles.levelLabel}>Nivel</Text>
              <Text style={styles.levelValue}>{level}</Text>
            </View>
          </View>

          {/* Segunda fila: Vidas y Errores */}
          <View style={styles.hudBottomRow}>
            <View style={styles.heartsContainer}>
              <Text style={styles.heartsLabel}>Vidas:</Text>
              {Array.from({ length: MAX_COLLISIONS }).map((_, i) => (
                <Text key={i} style={[styles.heart, collisionCount > i && styles.heartUsed]}>❤️</Text>
              ))}
            </View>
            <View style={styles.wrongCountContainer}>
              <Text style={styles.wrongCountLabel}>Errores</Text>
              <Text style={styles.wrongCountValue}>{wrongCount}/{MAX_WRONG_ANSWERS}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Menú */}
      {gameState === GameState.Menu && (
        <LinearGradient colors={colors.gradientPrimary} style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
          <TouchableOpacity 
            onPress={() => router.replace('/minigames/level2' as Href)} 
            style={styles.backTopBtn} 
            activeOpacity={0.85}
          >
            <Image source={require('../assets/images/btn-volver.png')} style={styles.backImg} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.menuContainer}>
            <View style={styles.mascotContainer}>
              <Image source={require('../assets/images/bici.png')} style={styles.biciImage} resizeMode="contain" />
            </View>
            <Text style={styles.gameTitle}>Aventura en Bicicleta Nivel 2</Text>
            <Text style={styles.gameSubtitle}>
              Demuestra lo que has aprendido en este nivel más desafiante
            </Text>
            
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Cómo Jugar:</Text>
              <Text style={styles.instructionText}>• Desliza para mover tu bicicleta</Text>
              <Text style={styles.instructionText}>• Evita más obstáculos que antes</Text>
              <Text style={styles.instructionText}>• Responde preguntas para continuar</Text>
              <Text style={styles.instructionText}>• ¡Cuidado con los límites de velocidad!</Text>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Comenzar Nivel 2</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

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

            {/* Información de vidas restantes */}
            <View style={styles.livesInfo}>
              <Text style={styles.livesText}>Vidas restantes:</Text>
              <View style={styles.heartsContainerModal}>
                {Array.from({ length: MAX_COLLISIONS }).map((_, i) => (
                  <Text key={i} style={[styles.heartModal, collisionCount > i && styles.heartUsedModal]}>❤️</Text>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalContinueButton}
              onPress={() => {
                setShowCollisionModal(false);
                // Only resume if we are still paused (not game over)
                lastFrameTime.current = null;
                lastCollisionAt.current = Date.now();
                invulnerableUntil.current = Date.now() + 2000; // 2s invulnerabilidad al reanudar
                setGameState(GameState.Playing);
              }}
            >
              <Text style={styles.modalContinueButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Completed Modal */}
      {gameState === GameState.Completed && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 ¡Felicidades!</Text>
            <Image source={require('../assets/images/gano.png')} style={styles.modalImage} />
            <Text style={styles.modalScenario}>
              Has completado exitosamente el Nivel 2 de Educación Vial.
            </Text>
            <Text style={styles.modalScenario}>
              Respondiste correctamente las 5 preguntas y demostraste tus conocimientos.
            </Text>

            <View style={styles.completionButtons}>
              <TouchableOpacity
                style={styles.completionButton}
                onPress={() => {
                  lastFrameTime.current = null;
                  setGameState(GameState.Playing);
                }}
              >
                <Text style={styles.completionButtonText}>Seguir jugando</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.completionButton, styles.completionButtonSecondary]}
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
                          await awardBicycleLevel2Completion();
                        } catch (awardError) {
                          console.warn('⚠️ Could not award level 2 completion, but continuing:', awardError);
                        }
                      }
                    } catch (syncError) {
                      console.warn('⚠️ Server sync failed, but local progress saved:', syncError);
                    }

                    // 4. Forzar una nueva carga del progreso al regresar
                    if (syncSuccess) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  } catch (error) {
                    console.error('❌ Error in bicycle level 2 completion process:', error);
                    Alert.alert(
                      'Error',
                      'Hubo un error al guardar tu progreso. No te preocupes, tu progreso se guardará localmente y se sincronizará más tarde.',
                      [{ text: 'Aceptar' }]
                    );
                  } finally {
                    // Navegar de vuelta al menú de nivel 2
                    router.replace('/minigames/level2' as Href);
                  }
                }}
              >
                <Text style={[styles.completionButtonText, styles.completionButtonTextSecondary]}>Completar Nivel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Game Over Modal */}
      {gameState === GameState.GameOver && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}> Juego Terminado</Text>
            <Image source={require('../assets/images/perdio.png')} style={styles.modalImage} />
            <Text style={styles.modalScenario}>
              Has alcanzado el límite de errores o choques permitidos.
            </Text>
            <Text style={styles.modalScenario}>
              ¡Sigue practicando para mejorar tus conocimientos!
            </Text>

            <View style={styles.gameOverButtons}>
              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={startGame}
              >
                <Text style={styles.gameOverButtonText}>Reiniciar Juego</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gameOverButton, styles.gameOverButtonSecondary]}
                onPress={() => {
                  // Detener música antes de navegar
                  stopBackgroundMusic();

                  // Limpiar completamente el estado del juego antes de navegar
                  setGameState(GameState.Menu);
                  setScore(0);
                  setDistance(0);
                  setCollisionCount(0);
                  setWrongCount(0);
                  setCorrectCount(0);
                  setQuestionsTriggered(0);
                  setLevel(1);
                  setObstacleSpeedMultiplier(1);
                  setObstacles([]);
                  setCurrentQuestion(null);
                  setSelectedOptionIds([]);
                  setFeedback(null);
                  setFeedbackStatus('neutral');
                  setShowCollisionModal(false);
                  lastQuestionDistance.current = 0;
                  lastFrameTime.current = null;
                  roadOffsetRef.current = 0;
                  particleCounter = 0;

                  // Navegar de vuelta al menú de nivel 2 con timestamp para forzar recarga
                  const timestamp = Date.now();
                  router.replace(`/minigames/level2?refresh=${timestamp}` as Href);
                }}
              >
                <Text style={[styles.gameOverButtonText, styles.gameOverButtonTextSecondary]}>← Volver al Nivel 2</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* 🔴 Flash rojo */}
      {flashVisible && (
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(255, 0, 0, 0.5)',
            opacity: flashOpacity,
          }}
        />
      )}
    </LinearGradient>
  );
};

export default BicycleGameScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Fondo dinámico con cielo y nubes - Área más pequeña como antes
  dynamicBackground: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.20, // Restaurado al tamaño original (20% vs 35%)
    backgroundColor: '#87ceeb',
    overflow: 'hidden',
    zIndex: 15,
    top: 0,
  },
  cloud: {
    position: 'absolute',
    width: 80, // Restaurado al tamaño original (antes era mucho más pequeño)
    height: 40, // Restaurado al tamaño original (antes era mucho más pequeño)
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Un poco menos opaco
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, // Sombra más sutil como antes
    shadowRadius: 3,
    elevation: 3,
    zIndex: 20, // zIndex más alto para estar por encima de todo
  },
  background: { position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT, zIndex: 0 },
  road: { position: 'absolute', width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  dash: { position: 'absolute', width: 4, height: 30, backgroundColor: '#fff' },
  player: { position: 'absolute', width: PLAYER_SIZE, height: PLAYER_SIZE, zIndex: 5 },
  playerImage: { width: PLAYER_SIZE * 1.5, height: PLAYER_SIZE * 1.5 },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(200,200,200,0.8)' },
  obstacle: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },

  // HUD mejorado con fondo transparente - Posicionado debajo del área de nubes
  hud: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.21, // Justo debajo del área de nubes (20% + 1% margen)
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fondo semi-transparente
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  hudTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Espacio entre las dos filas
  },
  hudBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    backgroundColor: 'rgba(255, 106, 0, 0.9)',
    paddingHorizontal: 6, // Más pequeño para cuatro elementos
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,     // Espacio mínimo entre elementos
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: { fontSize: 10, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  scoreValue: { fontSize: 16, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  levelContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 6, // Más pequeño para cuatro elementos
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 6, // Más pequeño para cuatro elementos
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 4, // Espacio mínimo entre elementos
  },
  speedContainer: {
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingHorizontal: 6, // Más pequeño para cuatro elementos
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceLabel: { fontSize: 9, color: 'white', fontWeight: 'bold' },
  distanceValue: { fontSize: 12, color: 'white', fontWeight: 'bold' },
  speedLabel: { fontSize: 9, color: 'white', fontWeight: 'bold' },
  speedValue: { fontSize: 12, color: 'white', fontWeight: 'bold' },
  levelLabel: { fontSize: 10, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  levelValue: { fontSize: 16, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  heartsContainer: { flexDirection: 'row', alignItems: 'center' },
  heartsLabel: { fontSize: 10, color: 'white', fontWeight: 'bold', marginRight: 5 },
  heart: { fontSize: 16, marginLeft: 2 },
  heartUsed: { opacity: 0.3 },
  wrongCountContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wrongCountLabel: { fontSize: 9, color: 'white', fontWeight: 'bold' },
  wrongCountValue: { fontSize: 12, color: 'white', fontWeight: 'bold' },

  // Menu Styles
  backTopBtn: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10,
  },
  backImg: {
    width: 96,
    height: 84,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mascotContainer: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  biciImage: {
    width: '100%',
    height: '100%',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  gameSubtitle: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: colors.white,
    marginBottom: 5,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: colors.buttonSuccess,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameOverContainer: { position: 'absolute', top: SCREEN_HEIGHT / 3, left: 0, right: 0, alignItems: 'center' },
  gameOverText: { fontSize: 24, fontWeight: 'bold', marginVertical: 8, color: '#fff' },
  gameOverButtons: { marginTop: 20, alignItems: 'center' },
  completionButtons: { marginTop: 20, alignItems: 'center' },

  // Modal Styles - EXACTAMENTE como en bicycle-game.tsx
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

  // Estilos específicos para modal de colisiones
  livesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 10,
  },
  livesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 10,
  },
  heartsContainerModal: {
    flexDirection: 'row',
  },
  heartModal: {
    fontSize: 20,
    marginLeft: 3,
  },
  heartUsedModal: {
    opacity: 0.3,
  },
  modalContinueButton: {
    backgroundColor: colors.buttonSuccess,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalContinueButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estilos específicos para botones del modal de completitud
  completionButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    width: '80%',
  },
  completionButtonSecondary: {
    backgroundColor: colors.buttonSecondary,
  },
  completionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completionButtonTextSecondary: {
    color: colors.white,
  },

  // Estilos específicos para botones del modal de Game Over
  gameOverButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    width: '80%',
  },
  gameOverButtonSecondary: {
    backgroundColor: colors.buttonSecondary,
  },
  gameOverButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameOverButtonTextSecondary: {
    color: colors.white,
  },

  // Estilo para las imágenes en los modales
  modalImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 15,
    resizeMode: 'contain',
  },
});
