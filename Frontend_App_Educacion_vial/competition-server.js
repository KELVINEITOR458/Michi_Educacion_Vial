const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configuración de CORS más permisiva para desarrollo móvil
app.use(cors({
  origin: true, // Permitir cualquier origen durante desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Crear servidor Socket.IO optimizado para móvil
const io = new Server(server, {
  cors: {
    origin: "*", // Más permisivo para desarrollo móvil
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // WebSocket primero, polling como fallback
  pingTimeout: 60000,    // Más permisivo para conexiones móviles
  pingInterval: 25000,   // Intervalo de ping más frecuente
  allowEIO3: true,       // Permitir versiones anteriores de Engine.IO
  maxHttpBufferSize: 1e8 // Buffer más grande para mensajes
});

// Almacenar salas
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('📱 Cliente móvil conectado:', socket.id);
  console.log('🌐 IP del cliente:', socket.handshake.address);
  console.log('🔗 Origen:', socket.handshake.headers.origin);

  socket.on('createRoom', (data) => {
    console.log('🏠 Creando sala desde móvil:', data);

    let roomCode;
    if (data.roomCode) {
      if (rooms.has(data.roomCode)) {
        socket.emit('error', { message: 'El código de sala ya existe' });
        return;
      }
      roomCode = data.roomCode;
    } else {
      do {
        roomCode = generateRoomCode();
      } while (rooms.has(roomCode));
    }

    const room = {
      code: roomCode,
      players: {
        [socket.id]: {
          id: data.playerId,
          name: data.playerName,
          score: 0,
          isHost: true
        }
      },
      gameState: 'waiting',
      maxPlayers: data.maxPlayers || 4
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    io.to(roomCode).emit('roomCreated', {
      roomCode,
      players: Object.values(room.players)
    });

    console.log('✅ Sala creada exitosamente:', roomCode);
  });

  socket.on('joinRoom', (data) => {
    console.log('👥 Uniendo a sala desde móvil:', data.roomCode);

    const room = rooms.get(data.roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    if (Object.keys(room.players).length >= room.maxPlayers) {
      socket.emit('error', { message: 'La sala está llena' });
      return;
    }

    room.players[socket.id] = {
      id: data.playerId,
      name: data.playerName,
      score: 0,
      isHost: false
    };

    socket.join(data.roomCode);

    io.to(data.roomCode).emit('playerJoined', {
      players: Object.values(room.players)
    });

    console.log('✅ Jugador unido exitosamente:', data.playerName);
  });

  socket.on('startCompetition', (data) => {
    console.log('🚀 Iniciando competencia desde móvil:', data);

    const room = rooms.get(data.roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    // Verificar que el jugador que inicia la competencia sea el host
    const player = room.players[socket.id];
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Solo el host puede iniciar la competencia' });
      return;
    }

    // Cambiar el estado de la sala a in_progress
    room.gameState = 'in_progress';

    // Notificar a todos los jugadores que la competencia ha iniciado
    io.to(data.roomCode).emit('competitionStarted', {
      roomCode: data.roomCode,
      players: Object.values(room.players)
    });

    console.log('✅ Competencia iniciada por:', player.name);
  });

  socket.on('leaveRoom', (data) => {
    console.log('👋 Jugador dejó la sala:', data);

    const room = rooms.get(data.roomCode);
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      socket.leave(data.roomCode);

      if (Object.keys(room.players).length === 0) {
        rooms.delete(data.roomCode);
        console.log('🗑️ Sala eliminada:', data.roomCode);
      } else {
        io.to(data.roomCode).emit('playerLeft', {
          playerId: socket.id,
          players: Object.values(room.players)
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('📱 Cliente móvil desconectado:', socket.id);

    rooms.forEach((room, roomCode) => {
      if (room.players[socket.id]) {
        console.log('🧹 Eliminando jugador', socket.id, 'de sala', roomCode);
        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
          rooms.delete(roomCode);
          console.log('🗑️ Sala eliminada por abandono:', roomCode);
        } else {
          io.to(roomCode).emit('playerLeft', {
            playerId: socket.id,
            players: Object.values(room.players)
          });
        }
      }
    });
  });
});

// Función para generar código único de sala
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor de competencia móvil funcionando!',
    timestamp: new Date().toISOString(),
    platform: 'React Native / Expo'
  });
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rooms: rooms.size,
    connections: io.engine.clientsCount,
    platform: 'React Native / Expo'
  });
});

// Información de salas activas
app.get('/rooms', (req, res) => {
  const roomsInfo = {};
  rooms.forEach((room, code) => {
    roomsInfo[code] = {
      players: Object.keys(room.players).length,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState
    };
  });
  res.json(roomsInfo);
});

const PORT = process.env.PORT || 3002;

// Solo iniciar servidor si no estamos en entorno de Expo
if (typeof window === 'undefined' && require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor móvil corriendo en puerto ${PORT}`);
    console.log(`📱 Optimizado para React Native / Expo`);
    console.log(`📡 Socket.IO disponible en ws://localhost:${PORT}`);
    console.log(`🔗 HTTP API disponible en http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Salas activas: http://localhost:${PORT}/rooms`);
    console.log(`🌐 CORS configurado para desarrollo móvil`);
  });
}

module.exports = { app, server, io, rooms };
