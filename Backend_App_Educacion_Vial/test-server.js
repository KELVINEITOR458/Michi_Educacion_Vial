const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Permitir cualquier origen durante desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Crear servidor Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Más permisivo para desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  maxHttpBufferSize: 1e8
});

// Almacenar salas
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  console.log('Dirección IP del cliente:', socket.handshake.address);
  console.log('Orígenes permitidos:', socket.handshake.headers.origin);

  socket.on('createRoom', (data) => {
    console.log('Creando sala:', data);
    console.log('Cliente ID:', socket.id, 'Player ID:', data.playerId);

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

    console.log('Sala creada:', roomCode);
  });

  socket.on('joinRoom', (data) => {
    console.log('Uniendo a sala:', data);
    console.log('Cliente ID:', socket.id, 'Player ID:', data.playerId);
    console.log('Intentando unirse a sala:', data.roomCode);

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

    console.log('Jugador unido:', data.playerName);
  });

  socket.on('startCompetition', (data) => {
    console.log('Iniciando competencia:', data);

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

    console.log('Competencia iniciada por:', player.name);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    console.log('Dirección IP del cliente desconectado:', socket.handshake.address);

    rooms.forEach((room, roomCode) => {
      if (room.players[socket.id]) {
        console.log('Eliminando jugador', socket.id, 'de sala', roomCode);
        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
          rooms.delete(roomCode);
          console.log('Sala eliminada:', roomCode);
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
  res.json({ message: 'Servidor de competencia funcionando!', timestamp: new Date().toISOString() });
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rooms: rooms.size,
    connections: io.engine.clientsCount
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
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Socket.IO disponible en ws://192.168.68.117:${PORT}`);
  console.log(`🔗 HTTP API disponible en http://192.168.68.117:${PORT}`);
  console.log(`🏥 Health check: http://192.168.68.120:${PORT}/health`);
  console.log(`📊 Salas activas: http://192.168.68.120:${PORT}/rooms`);
  console.log(`🌐 CORS configurado para aceptar conexiones desde cualquier origen`);
});

module.exports = { app, server, io };
