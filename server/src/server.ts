import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { randomBytes } from 'crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:8080"], // Allow both Vite and dev server ports
        methods: ["GET", "POST"],
        credentials: true
    }
});

interface GameRoom {
    id: string;
    players: string[];
    gameState?: {
        ballPosition: { x: number; y: number };
        leftPaddleY: number;
        rightPaddleY: number;
        scores: { left: number; right: number };
    };
}

const gameRooms = new Map<string, GameRoom>();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createRoom', () => {
        const roomCode = randomBytes(3).toString('hex');
        gameRooms.set(roomCode, {
            id: roomCode,
            players: [socket.id]
        });
        
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        console.log(`Room created: ${roomCode}`);
    });

    socket.on('joinRoom', (roomCode: string) => {
        const room = gameRooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }

        room.players.push(socket.id);
        socket.join(roomCode);
        
        // Notify both players that the game can start
        io.to(roomCode).emit('gameStart', {
            leftPlayer: room.players[0],
            rightPlayer: room.players[1]
        });
        
        console.log(`Player ${socket.id} joined room ${roomCode}`);
    });

    // Handle paddle movement
    socket.on('paddleMove', (data: { roomCode: string; position: number; isLeft: boolean }) => {
        const room = gameRooms.get(data.roomCode);
        if (!room) return;

        if (data.isLeft) {
            room.gameState = {
                ...room.gameState!,
                leftPaddleY: data.position
            };
        } else {
            room.gameState = {
                ...room.gameState!,
                rightPaddleY: data.position
            };
        }

        // Broadcast the paddle position to the other player
        socket.to(data.roomCode).emit('paddleUpdate', {
            position: data.position,
            isLeft: data.isLeft
        });
    });

    // Handle ball position updates
    socket.on('ballUpdate', (data: { roomCode: string; position: { x: number; y: number } }) => {
        const room = gameRooms.get(data.roomCode);
        if (!room) return;

        room.gameState = {
            ...room.gameState!,
            ballPosition: data.position
        };

        // Broadcast ball position to the other player
        socket.to(data.roomCode).emit('ballSync', data.position);
    });

    // Handle score updates
    socket.on('scoreUpdate', (data: { roomCode: string; scores: { left: number; right: number } }) => {
        const room = gameRooms.get(data.roomCode);
        if (!room) return;

        room.gameState = {
            ...room.gameState!,
            scores: data.scores
        };

        // Broadcast score update to both players
        io.to(data.roomCode).emit('scoreSync', data.scores);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find and clean up any rooms the player was in
        for (const [roomCode, room] of gameRooms.entries()) {
            if (room.players.includes(socket.id)) {
                // Notify other player about disconnection
                socket.to(roomCode).emit('playerDisconnected');
                gameRooms.delete(roomCode);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 