import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(0, { // Puerto del servidor HTTP (0 = asignar automáticamente)
  cors: {
    origin: [
      'http://localhost:19006',
      'http://192.168.68.114:19006',
      'http://192.168.68.114:9999',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:8000',
      'http://localhost:8080',
      'http://localhost:9999',
      'http://localhost:*', // Permitir cualquier puerto localhost
      'exp://192.168.68.114:19000',
      /^https?:\/\/192\.168\.68\.\d{1,3}:\d+$/,
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
  private rooms = new Map<string, any>(); // Almacenar salas

  handleConnection(client: Socket) {
    console.log('Cliente conectado:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Cliente desconectado:', client.id);
    // Limpiar salas cuando un jugador se desconecta
    this.rooms.forEach((room, roomCode) => {
      if (room.players[client.id]) {
        delete room.players[client.id];
        // Si la sala queda vacía, eliminarla
        if (Object.keys(room.players).length === 0) {
          this.rooms.delete(roomCode);
          console.log('Sala eliminada:', roomCode);
        } else {
          // Notificar a los demás jugadores
          this.server.to(roomCode).emit('playerLeft', { playerId: client.id, players: Object.values(room.players) });
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

    const room = {
      code: roomCode,
      players: {
        [client.id]: {
          id: data.playerId,
          name: data.playerName,
          score: 0,
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

    console.log('Sala creada:', roomCode, 'por', data.playerName);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: { roomCode: string; playerId: string; playerName: string }) {
    const room = this.rooms.get(data.roomCode);

    if (!room) {
      client.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    if (Object.keys(room.players).length >= room.maxPlayers) {
      client.emit('error', { message: 'La sala está llena' });
      return;
    }

    room.players[client.id] = {
      id: data.playerId,
      name: data.playerName,
      score: 0,
      isHost: false
    };

    client.join(data.roomCode);

    // Notificar a todos en la sala
    this.server.to(data.roomCode).emit('playerJoined', {
      players: Object.values(room.players)
    });

    console.log('Jugador unido:', data.playerName, 'a sala:', data.roomCode);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, data: { roomCode: string; playerId: string }) {
    const room = this.rooms.get(data.roomCode);

    if (room && room.players[client.id]) {
      delete room.players[client.id];
      client.leave(data.roomCode);

      if (Object.keys(room.players).length === 0) {
        this.rooms.delete(data.roomCode);
        console.log('Sala eliminada por abandono:', data.roomCode);
      } else {
        // Notificar a los demás jugadores
        this.server.to(data.roomCode).emit('playerLeft', {
          playerId: data.playerId,
          players: Object.values(room.players)
        });
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

    // Cambiar el estado de la sala a 'in_progress'
    room.gameState = 'in_progress';

    this.server.to(data.roomCode).emit('competitionStarted', {
      roomCode: data.roomCode,
      players: Object.values(room.players)
    });

    console.log('Competencia iniciada por:', player.name, 'en sala:', data.roomCode);
  }

  // Método para generar código único de sala
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}