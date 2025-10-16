import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import questions from './questions';

const SERVER_URL = __DEV__ ? 'http://192.168.100.159:3002' : 'http://localhost:3002';

type ServerQuestion = {
  id: string;
  q: string;
  options: string[];
  answer?: number;
  image?: string;
};

export default function CompetitionPlay() {
  const router = useRouter();
  const { roomCode, playerId, playerName } = useLocalSearchParams<{ 
    roomCode?: string; 
    playerId?: string; 
    playerName?: string; 
  }>();
  const socketRef = useRef<Socket | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<ServerQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canAnswer, setCanAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const questionStartTime = useRef<number>(0);
  const socketInitialized = useRef<boolean>(false);
  
  // Ref para rastrear el estado actual sin depender del estado en useCallback
  const currentQuestionRef = useRef<ServerQuestion | null>(null);
  const questionIndexRef = useRef(1);

  // Fallback local selection (solo visual) si el servidor no envía preguntas
  const fallbackQuestions = useMemo(() => {
    const pool = [...questions];
    const picked: ServerQuestion[] = [];
    for (let i = 0; i < 8 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const q = pool.splice(idx, 1)[0];
      picked.push({ id: q.id, q: q.q, options: q.options, image: (q as any).image });
    }
    return picked;
  }, []);

  // Handlers estables para evitar re-crear listeners
  const handleRoundStarted = useCallback((data: { index: number; total: number; question: ServerQuestion; time: number }) => {
    // Solo resetear si es una pregunta diferente o si no hay pregunta actual
    const newQuestionIndex = data.index + 1;
    const isNewQuestion = questionIndexRef.current !== newQuestionIndex || !currentQuestionRef.current;
    
    if (isNewQuestion) {
      // Reset completo del estado para nueva pregunta
      setQuestionIndex(newQuestionIndex);
      setTotalQuestions(data.total);
      setCurrentQuestion(data.question);
      setCanAnswer(true); // Asegurar que se puede responder
      setSelectedAnswer(null);
      setAnswerResult(null);
      questionStartTime.current = Date.now();
      
      // Actualizar refs
      questionIndexRef.current = newQuestionIndex;
      currentQuestionRef.current = data.question;
    }
    
    // Siempre actualizar tiempo y loading (para reconexiones)
    setTimeLeft(data.time);
    setLoading(false);
  }, []);

  const handleAnswerResult = useCallback((data: { questionIndex: number; isCorrect: boolean; points: number; correctAnswer: number; explanation: string }) => {
    // Asegurar que explanation sea un string válido
    const safeData = {
      ...data,
      explanation: String(data.explanation || '¡Buena respuesta! Recuerda siempre seguir las normas de tránsito.')
    };
    
    setAnswerResult(safeData);
    setCanAnswer(false);
  }, []);

  const handleRoundEnded = useCallback((data: { questionIndex: number; correctAnswer: number; explanation: string }) => {
    setCanAnswer(false);
    // Si no se había respondido, mostrar la respuesta correcta
    setAnswerResult((prev: any) => {
      if (!prev) {
        return {
          isCorrect: false,
          correctAnswer: data.correctAnswer,
          explanation: String(data.explanation || '¡Buena respuesta! Recuerda siempre seguir las normas de tránsito.')
        };
      }
      return prev;
    });
  }, []);

  const handleTimer = useCallback((data: { time: number }) => {
    setTimeLeft(data.time);
  }, []);

  const handleCompetitionFinished = useCallback((payload: { rankings: any[] }) => {
    router.replace('/quiz/competition-results' as Href);
  }, [router]);

  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (socketInitialized.current) {
      return;
    }
    
    socketInitialized.current = true;
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'], forceNew: true, autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      // La unión al room se manejará en un useEffect separado
    });

    // Servidor indica inicio de ronda con una pregunta
    socket.on('roundStarted', handleRoundStarted);
    socket.on('timer', handleTimer);
    socket.on('answerResult', handleAnswerResult);
    socket.on('roundEnded', handleRoundEnded);
    socket.on('competitionFinished', handleCompetitionFinished);

    // Si el servidor no envía nada en unos segundos, usar fallback local para no dejar al usuario esperando
    const safety = setTimeout(() => {
      if (loading && !currentQuestion) {
        const first = fallbackQuestions[0];
        setQuestionIndex(1);
        setTotalQuestions(fallbackQuestions.length);
        setCurrentQuestion(first);
        setTimeLeft(15);
        setCanAnswer(true);
        setLoading(false);
      }
    }, 5000); // Aumentar a 5 segundos para dar más tiempo al servidor


    return () => {
      clearTimeout(safety);
      socket.disconnect();
      socketInitialized.current = false;
    };
  }, []);

  // useEffect separado para unirse al room cuando los parámetros estén disponibles
  useEffect(() => {
    if (socketRef.current && roomCode && playerId && playerName) {
      socketRef.current.emit('joinRoom', {
        roomCode: roomCode,
        playerId: playerId,
        playerName: playerName
      });
    }
  }, [roomCode, playerId, playerName]);

  const handleAnswer = (i: number) => {
    if (!canAnswer || answerResult || selectedAnswer !== null) {
      return;
    }
    
    setSelectedAnswer(i);
    const timeSpent = Date.now() - questionStartTime.current;
    
    // Convertir questionIndex de base 1 (mostrar) a base 0 (backend)
    const backendQuestionIndex = questionIndex - 1;
    
    socketRef.current?.emit('submitAnswer', { 
      roomCode, 
      questionIndex: backendQuestionIndex, 
      answer: i, 
      timeSpent 
    });
  };

  if (loading || !currentQuestion) {
    return (
      <LinearGradient colors={['#1E90FF', '#00BFFF']} style={styles.container}>
        <View style={styles.centered}> 
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Esperando inicio de la competencia…</Text>
        </View>
      </LinearGradient>
    );
  }


  return (
    <LinearGradient colors={['#1E90FF', '#00BFFF']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Pregunta {String(questionIndex || 1)} de {String(totalQuestions || 8)}</Text>
        {typeof timeLeft === 'number' && timeLeft >= 0 && (
          <Text style={styles.timer}>⏱ {String(timeLeft)}s</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{String(currentQuestion.q || 'Cargando pregunta...')}</Text>
        {(currentQuestion.options || []).map((opt, idx) => {
          let optionStyle: any = [styles.option];
          let textStyle: any = [styles.optionText];
          
          const isDisabled = !canAnswer || !!answerResult;
          
          if (answerResult) {
            if (idx === answerResult.correctAnswer) {
              optionStyle = [styles.option, styles.optionCorrect];
              textStyle = [styles.optionText, styles.optionTextCorrect];
            } else if (idx === selectedAnswer && !answerResult.isCorrect) {
              optionStyle = [styles.option, styles.optionIncorrect];
              textStyle = [styles.optionText, styles.optionTextIncorrect];
            } else {
              optionStyle = [styles.option, styles.optionDisabled];
            }
          } else if (!canAnswer) {
            optionStyle = [styles.option, styles.optionDisabled];
          }
          
          return (
            <TouchableOpacity 
              key={idx} 
              style={optionStyle} 
              onPress={() => handleAnswer(idx)} 
              disabled={!canAnswer || !!answerResult}
            >
              <Text style={textStyle}>{String(opt)}</Text>
              {answerResult && idx === selectedAnswer && (
                <Text style={styles.answerIndicator}>
                  {answerResult.isCorrect ? '✅' : '❌'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
        
        {answerResult && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>
              {answerResult.isCorrect ? '¡Correcto! 🎉' : 'Incorrecto 😔'}
            </Text>
            <Text style={styles.explanationText}>
              {String(answerResult.explanation || '¡Buena respuesta! Recuerda siempre seguir las normas de tránsito.')}
            </Text>
            {answerResult.points !== undefined && answerResult.points !== null && (
              <Text style={styles.pointsText}>+{String(answerResult.points)} puntos</Text>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 70 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  timer: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16 },
  question: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  option: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 14, borderRadius: 12, marginVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionDisabled: { opacity: 0.6 },
  optionCorrect: { backgroundColor: 'rgba(34, 197, 94, 0.3)', borderWidth: 2, borderColor: '#22c55e' },
  optionIncorrect: { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 2, borderColor: '#ef4444' },
  optionText: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  optionTextCorrect: { color: '#22c55e' },
  optionTextIncorrect: { color: '#ef4444' },
  answerIndicator: { fontSize: 20, marginLeft: 8 },
  feedbackContainer: { marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  feedbackText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  explanationText: { color: '#fff', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  pointsText: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});


