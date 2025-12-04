import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Definir interfaces para las competencias
interface Player {
  id: string;
  socketId: string;
  name: string;
  score: number;
  time: number;
  isReady: boolean;
  isHost: boolean;
}

interface Question {
  id: string;
  q: string;
  options: string[];
  answer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: string;
}

interface Room {
  code: string;
  players: { [socketId: string]: Player };
  gameState: 'waiting' | 'starting' | 'in_progress' | 'finished';
  maxPlayers: number;
  questions?: Question[];
  currentQuestionIndex?: number;
  timer?: NodeJS.Timeout;
  timerInterval?: NodeJS.Timeout; // Timer para actualizaciones de tiempo
  startTime?: number; // Tiempo de inicio de la competencia
  questionStartTime?: number; // Tiempo de inicio de la pregunta actual
  answeredPlayers?: Set<string>; // Track players who have answered
  roundEndTimer?: NodeJS.Timeout; // Timer for auto-advancing after answers
}

// Preguntas del quiz (Nivel 1 - 8 preguntas aleatorias)
const QUIZ_QUESTIONS: Question[] = [
  {
    id: '1',
    q: '¿Dónde deben caminar los peatones?',
    options: ['En la calzada', 'En la acera', 'En el carril de buses', 'En la ciclovía'],
    answer: 1,
    category: 'Normas básicas',
    difficulty: 'easy',
    image: 'peatones.png'
  },
  {
    id: '2',
    q: '¿Qué debes hacer antes de cruzar la calle?',
    options: ['Mirar a ambos lados', 'Cerrar los ojos', 'Correr rápido', 'Escuchar música'],
    answer: 0,
    category: 'Cruces y semáforos',
    difficulty: 'easy',
    image: 'mirar-ambos-lados.png'
  },
  {
    id: '3',
    q: '¿Qué es una acera?',
    options: ['Un lugar para los carros', 'Un lugar para caminar', 'Un parque', 'Un semáforo'],
    answer: 1,
    category: 'Normas básicas',
    difficulty: 'easy',
    image: 'acera.png'
  },
  {
    id: '4',
    q: '¿Qué significa la luz roja del semáforo?',
    options: ['Seguir caminando', 'Esperar', 'Correr rápido', 'Cruzar sin mirar'],
    answer: 1,
    category: 'Cruces y semáforos',
    difficulty: 'easy',
    image: 'semaforo-rojo.png'
  },
  {
    id: '5',
    q: '¿Qué significa la luz verde para peatones?',
    options: ['Esperar', 'Cruzar', 'Correr', 'Sentarse'],
    answer: 1,
    category: 'Cruces y semáforos',
    difficulty: 'easy',
    image: 'semaforo-verde.png'
  },
  {
    id: '6',
    q: '¿Qué significa la señal redonda con borde rojo?',
    options: ['Se puede pasar', 'No se puede pasar', 'Cuidado', 'Zona de juegos'],
    answer: 1,
    category: 'Señales de tráfico',
    difficulty: 'medium',
    image: 'senal-prohibicion.png'
  },
  {
    id: '7',
    q: '¿Qué debes hacer cuando ves un paso de peatones?',
    options: ['Correr más rápido', 'Mirar bien', 'Saltar', 'Gritar'],
    answer: 1,
    category: 'Seguridad vial',
    difficulty: 'medium',
    image: 'paso-peatones.png'
  },
  {
    id: '8',
    q: '¿Dónde se debe esperar para cruzar la calle?',
    options: ['En medio de la calle', 'Detrás de la línea blanca', 'En cualquier lugar', 'Corriendo'],
    answer: 1,
    category: 'Normas básicas',
    difficulty: 'medium',
    image: 'linea-blanca.png'
  },
  {
    id: '9',
    q: '¿Qué significa la señal de "CEDA EL PASO"?',
    options: ['Detenerse', 'Dejar pasar', 'Acelerar', 'Saltar'],
    answer: 1,
    category: 'Señales de tráfico',
    difficulty: 'medium',
    image: 'senal-ceda-paso.png'
  },
  {
    id: '10',
    q: '¿Por qué es importante mirar a ambos lados?',
    options: ['Para ver mejor', 'Para ver si vienen autos', 'Para correr más rápido', 'Para jugar'],
    answer: 1,
    category: 'Seguridad vial',
    difficulty: 'medium',
    image: 'mirar-autos.png'
  },
  {
    id: '11',
    q: '¿Qué debes hacer si ves una zona escolar?',
    options: ['Correr', 'Ir más despacio', 'Tocar el claxon', 'Acelerar'],
    answer: 1,
    category: 'Seguridad vial',
    difficulty: 'hard',
    image: 'zona-escolar.png'
  },
  {
    id: '12',
    q: '¿Dónde está prohibido estacionar?',
    options: ['En cualquier lugar', 'En el garaje', 'Frente a una entrada', 'En la casa'],
    answer: 2,
    category: 'Normas de circulación',
    difficulty: 'hard',
    image: 'prohibido-estacionar.png'
  },
  {
    id: '13',
    q: '¿Qué significa la luz amarilla del semáforo?',
    options: ['Detenerse', 'Precaución', 'Acelerar', 'Seguir normal'],
    answer: 1,
    category: 'Cruces y semáforos',
    difficulty: 'hard',
    image: 'semaforo-amarillo.png'
  },
  {
    id: '14',
    q: '¿Por qué es importante usar el cinturón de seguridad?',
    options: ['Para estar cómodo', 'Para no caerse', 'Para estar más guapo', 'Para jugar mejor'],
    answer: 1,
    category: 'Seguridad vial',
    difficulty: 'hard',
    image: 'cinturon-seguridad.png'
  },
  {
    id: '15',
    q: '¿Qué debes hacer en un cruce sin semáforo?',
    options: ['Correr rápido', 'Mirar bien y esperar', 'Saltar', 'Gritar'],
    answer: 1,
    category: 'Normas básicas',
    difficulty: 'hard',
    image: 'cruce-sin-semaforo.png'
  }
];

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      /^http:\/\/localhost:\d+$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io/',
  serveClient: false,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private rooms = new Map<string, Room>(); // Almacenar salas con tipado

  handleConnection(client: Socket) {
    // Cliente conectado
  }

  handleDisconnect(client: Socket) {
    // Cliente desconectado
    // Limpiar salas cuando un jugador se desconecta
    this.rooms.forEach((room, roomCode) => {
      if (room.players[client.id]) {
        const player = room.players[client.id];
        delete room.players[client.id];

        // Limpiar timers si la sala está en progreso
        if (room.timer) {
          clearTimeout(room.timer);
          room.timer = undefined;
        }

        // Si la sala queda vacía, eliminarla
        if (Object.keys(room.players).length === 0) {
          this.rooms.delete(roomCode);
        } else {
          // Notificar a los demás jugadores
          this.server.to(roomCode).emit('playerLeft', {
            playerId: client.id,
            players: Object.values(room.players)
          });

          // Si era el host y hay otros jugadores, asignar nuevo host
          if (player.isHost) {
            const remainingPlayers = Object.values(room.players);
            if (remainingPlayers.length > 0) {
              const newHost = remainingPlayers[0];
              room.players[newHost.socketId].isHost = true;
              this.server.to(roomCode).emit('hostChanged', { newHost });
            }
          }
        }
      }
    });
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(client: Socket, data: { roomCode?: string; maxPlayers?: number; playerId: string; playerName: string }) {
    let roomCode: string;

    if (data.roomCode) {
      // Si se proporciona un código de sala específico, verificar si existe
      if (this.rooms.has(data.roomCode)) {
        client.emit('error', { message: 'El código de sala ya existe' });
        return;
      }
      roomCode = data.roomCode;
    } else {
      // Generar código único
      do {
        roomCode = this.generateRoomCode();
      } while (this.rooms.has(roomCode));
    }

    const room: Room = {
      code: roomCode,
      players: {
        [client.id]: {
          id: data.playerId,
          socketId: client.id,
          name: data.playerName,
          score: 0,
          time: 0,
          isReady: true,
          isHost: true
        }
      },
      gameState: 'waiting',
      maxPlayers: data.maxPlayers || 4
    };

    this.rooms.set(roomCode, room);
    client.join(roomCode);

    // Emitir evento a todos en la sala (incluyendo al creador)
    this.server.to(roomCode).emit('roomCreated', {
      roomCode,
      players: Object.values(room.players)
    });

    // Sala creada
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: { roomCode: string; playerId: string; playerName: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) {
      client.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    if (room.gameState === 'finished') {
      client.emit('error', { message: 'La competencia ya ha terminado' });
      return;
    }

    // Permitir unirse durante 'waiting', 'starting' o 'in_progress'

    // Verificar si el jugador ya existe en el room
    const existingPlayerEntry = Object.entries(room.players).find(([_, player]) => player.id === data.playerId);

    if (existingPlayerEntry) {
      // El jugador ya existe, actualizar su socketId y limpiar entrada anterior
      const [oldSocketId, existingPlayer] = existingPlayerEntry;
      delete room.players[oldSocketId]; // Limpiar entrada anterior

      // Preservar el estado del jugador (incluyendo isHost)
      existingPlayer.socketId = client.id;
      room.players[client.id] = existingPlayer;
    } else {
      // Nuevo jugador
      if (Object.keys(room.players).length >= room.maxPlayers) {
        client.emit('error', { message: 'La sala está llena' });
        return;
      }

      room.players[client.id] = {
        id: data.playerId,
        socketId: client.id,
        name: data.playerName,
        score: 0,
        time: 0,
        isReady: true,
        isHost: false // Solo los nuevos jugadores son no-host por defecto
      };
      // Nuevo jugador unido
    }

    client.join(data.roomCode);

    // Notificar a todos en la sala
    this.server.to(data.roomCode).emit('playerJoined', {
      players: Object.values(room.players)
    });

    // Jugador unido a la sala

    // NO enviar roundStarted en reconexión para evitar conflictos
    // El frontend recibirá el próximo roundStarted cuando se ejecute startNextQuestion
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, data: { roomCode: string; playerId: string }) {
    const room = this.rooms.get(data.roomCode);

    if (room && room.players[client.id]) {
      const player = room.players[client.id];
      delete room.players[client.id];
      client.leave(data.roomCode);

      // Limpiar timers si la sala está en progreso
      if (room.timer) {
        clearTimeout(room.timer);
        room.timer = undefined;
      }

      if (Object.keys(room.players).length === 0) {
        this.rooms.delete(data.roomCode);
        // Sala eliminada por abandono
      } else {
        // Notificar a los demás jugadores
        this.server.to(data.roomCode).emit('playerLeft', {
          playerId: data.playerId,
          players: Object.values(room.players)
        });

        // Si era el host y hay otros jugadores, asignar nuevo host
        if (player.isHost) {
          const remainingPlayers = Object.values(room.players);
          if (remainingPlayers.length > 0) {
            const newHost = remainingPlayers[0];
            room.players[newHost.socketId].isHost = true;
            this.server.to(data.roomCode).emit('hostChanged', { newHost });
          }
        }
      }
    }
  }

  @SubscribeMessage('startCompetition')
  handleStartCompetition(client: Socket, data: { roomCode: string; playerId: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) {
      client.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    // Verificar que el jugador que inicia la competencia sea el host
    const player = room.players[client.id];
    if (!player || !player.isHost) {
      client.emit('error', { message: 'Solo el host puede iniciar la competencia' });
      return;
    }

    // Verificar que hay al menos 1 jugador
    const players = Object.values(room.players);
    if (players.length < 1) {
      client.emit('error', { message: 'Se necesita al menos 1 jugador para iniciar' });
      return;
    }

    // Seleccionar 8 preguntas aleatorias
    const selectedQuestions = this.selectRandomQuestions(8);

    // Configurar la sala para la competencia
    room.gameState = 'starting';
    room.questions = selectedQuestions;
    room.currentQuestionIndex = 0;
    room.startTime = Date.now();

    // Resetear puntuaciones de todos los jugadores
    Object.values(room.players).forEach(p => {
      p.score = 0;
      p.time = 0;
    });

    // Emitir evento de competencia iniciada
    this.server.to(data.roomCode).emit('competitionStarted', {
      roomCode: data.roomCode,
      players: Object.values(room.players)
    });

    // Iniciar la primera pregunta después de un breve delay
    setTimeout(() => {
      this.startNextQuestion(data.roomCode);
    }, 2000);

    // Competencia iniciada
  }

  @SubscribeMessage('submitAnswer')
  handleSubmitAnswer(client: Socket, data: { roomCode: string; questionIndex: number; answer: number; timeSpent: number }) {
    const room = this.rooms.get(data.roomCode);

    if (!room || !room.questions || room.gameState !== 'in_progress') {
      client.emit('error', { message: 'No hay una competencia activa' });
      return;
    }

    const player = room.players[client.id];
    if (!player) {
      client.emit('error', { message: 'Jugador no encontrado en la sala' });
      return;
    }

    const question = room.questions[data.questionIndex];
    if (!question) {
      client.emit('error', { message: 'Pregunta no encontrada' });
      return;
    }

    const isCorrect = data.answer === question.answer;

    // Calcular puntuación basada en tiempo y corrección
    let points = 0;
    if (isCorrect) {
      // Máximo 100 puntos, menos puntos si toma más tiempo
      const maxTime = 30000; // 30 segundos
      const timeBonus = Math.max(0, (maxTime - data.timeSpent) / maxTime);
      points = Math.round(100 + (timeBonus * 50)); // 100-150 puntos
    }

    // Actualizar puntuación del jugador
    player.score += points;
    player.time += data.timeSpent;

    // Marcar que este jugador ya respondió
    room.answeredPlayers!.add(client.id);

    // Notificar resultado al jugador

    client.emit('answerResult', {
      questionIndex: data.questionIndex,
      isCorrect,
      points,
      correctAnswer: question.answer,
      explanation: this.getExplanation(question)
    });

    // Notificar a todos los jugadores sobre la actualización de puntuación
    this.server.to(data.roomCode).emit('scoreUpdated', {
      players: Object.values(room.players)
    });

    // Verificar si todos los jugadores han respondido
    const totalPlayers = Object.keys(room.players).length;
    const answeredCount = room.answeredPlayers!.size;

    // Si todos han respondido o es el primer jugador en responder, iniciar timer de 2 segundos
    if (answeredCount === totalPlayers || answeredCount === 1) {
      // Limpiar timer de auto-advance si ya existe
      if (room.roundEndTimer) {
        clearTimeout(room.roundEndTimer);
      }

      // Configurar timer de 2 segundos para avanzar
      room.roundEndTimer = setTimeout(() => {
        this.endQuestion(data.roomCode);
      }, 2000);
    }
  }

  @SubscribeMessage('requestLeaderboard')
  handleRequestLeaderboard(client: Socket, data: { roomCode: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) {
      client.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    const players = Object.values(room.players);
    const sortedPlayers = players.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.time - b.time; // Menor tiempo en caso de empate
    });

    client.emit('leaderboardUpdate', {
      players: sortedPlayers,
      currentQuestion: room.currentQuestionIndex,
      totalQuestions: room.questions?.length || 0
    });
  }

  // Método para generar código único de sala
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Método para seleccionar preguntas aleatorias
  private selectRandomQuestions(count: number): Question[] {
    const shuffled = [...QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Método para iniciar la siguiente pregunta
  private startNextQuestion(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.questions || room.currentQuestionIndex === undefined) {
      return;
    }

    // Verificar que el índice esté dentro del rango válido
    if (room.currentQuestionIndex < 0 || room.currentQuestionIndex >= room.questions.length) {
      return;
    }

    room.gameState = 'in_progress';
    const question = room.questions[room.currentQuestionIndex];
    const questionTime = 10000; // 10 segundos por pregunta

    // Resetear tracking de respuestas para esta pregunta
    room.answeredPlayers = new Set();

    // Limpiar todos los timers existentes
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = undefined;
    }
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = undefined;
    }
    if (room.roundEndTimer) {
      clearTimeout(room.roundEndTimer);
      room.roundEndTimer = undefined;
    }

    // Guardar tiempo de inicio de la pregunta
    room.questionStartTime = Date.now();

    // Emitir evento de ronda iniciada
    console.log(`🚀 BACKEND: Enviando roundStarted - Pregunta ${room.currentQuestionIndex + 1}: "${question.q.substring(0, 50)}..." con ${questionTime}ms`);

    this.server.to(roomCode).emit('roundStarted', {
      index: room.currentQuestionIndex,
      total: room.questions.length,
      question: {
        id: question.id,
        q: question.q,
        options: question.options,
        image: question.image
      },
      time: questionTime
    });

    // Configurar timer para la pregunta
    room.timer = setTimeout(() => {
      this.endQuestion(roomCode);
    }, questionTime);

    // Emitir actualizaciones de tiempo cada segundo
    let timeLeft = questionTime;
    room.timerInterval = setInterval(() => {
      timeLeft -= 1000;
      if (timeLeft <= 0) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = undefined;
        }
      } else {
        this.server.to(roomCode).emit('timer', { time: timeLeft });
      }
    }, 1000);

    // Pregunta iniciada
  }

  // Método para finalizar una pregunta
  private endQuestion(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.questions || room.currentQuestionIndex === undefined) {
      return;
    }

    // Limpiar todos los timers
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = undefined;
    }
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = undefined;
    }
    if (room.roundEndTimer) {
      clearTimeout(room.roundEndTimer);
      room.roundEndTimer = undefined;
    }

    const question = room.questions[room.currentQuestionIndex];

    // Emitir evento de ronda terminada con la respuesta correcta
    this.server.to(roomCode).emit('roundEnded', {
      questionIndex: room.currentQuestionIndex,
      correctAnswer: question.answer,
      explanation: this.getExplanation(question)
    });

    // Avanzar a la siguiente pregunta después de un delay
    setTimeout(() => {
      if (!room.questions || room.currentQuestionIndex === undefined) {
        return;
      }

      room.currentQuestionIndex++;

      // Verificar si ya terminamos todas las preguntas
      if (room.currentQuestionIndex >= room.questions.length) {
        this.endCompetition(roomCode);
      } else {
        this.startNextQuestion(roomCode);
      }
    }, 3000); // 3 segundos para mostrar resultados

    // Pregunta terminada
  }

  // Método para finalizar la competencia
  private endCompetition(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    room.gameState = 'finished';

    // Calcular rankings finales
    const players = Object.values(room.players);
    const finalRankings = players.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.time - b.time; // Menor tiempo en caso de empate
    });

    // Emitir evento de competencia terminada
    this.server.to(roomCode).emit('competitionFinished', {
      rankings: finalRankings,
      totalQuestions: room.questions?.length || 0,
      totalTime: Date.now() - (room.startTime || 0)
    });

    // Limpiar datos de la competencia después de un tiempo
    setTimeout(() => {
      if (room.gameState === 'finished') {
        room.gameState = 'waiting';
        room.questions = undefined;
        room.currentQuestionIndex = undefined;
        room.startTime = undefined;
        if (room.timer) {
          clearTimeout(room.timer);
          room.timer = undefined;
        }
      }
    }, 60000); // 1 minuto para limpiar

    // Competencia terminada
  }

  // Método para obtener explicación de una pregunta
  private getExplanation(question: Question): string {
    const explanations: { [key: string]: string } = {
      '1': 'Los peatones deben caminar siempre por la acera para estar seguros.',
      '2': 'Siempre debes mirar a ambos lados antes de cruzar para verificar que no vengan autos.',
      '3': 'Una acera es el lugar seguro para caminar, separado de la calzada donde circulan los vehículos.',
      '4': 'La luz roja significa que debes detenerte y esperar hasta que cambie a verde.',
      '5': 'La luz verde indica que es seguro cruzar, pero siempre con precaución.',
      '6': 'Las señales redondas con borde rojo indican prohibición.',
      '7': 'En un paso de peatones debes mirar bien antes de cruzar.',
      '8': 'Siempre espera detrás de la línea blanca para cruzar de forma segura.',
      '9': 'La señal de "CEDA EL PASO" significa que debes permitir que pasen otros vehículos.',
      '10': 'Mirar a ambos lados te ayuda a ver si vienen autos y evitar accidentes.',
      '11': 'En las zonas escolares debes ir más despacio para proteger a los niños.',
      '12': 'Está prohibido estacionar frente a entradas para no obstaculizar el paso.',
      '13': 'La luz amarilla indica precaución, debes prepararte para detenerte.',
      '14': 'El cinturón de seguridad previene que te caigas o te lastimes en un accidente.',
      '15': 'En cruces sin semáforo debes mirar bien y esperar a que sea seguro cruzar.'
    };

    return explanations[question.id] || '¡Buena respuesta! Recuerda siempre seguir las normas de tránsito.';
  }
}