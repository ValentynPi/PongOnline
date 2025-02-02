import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const gameRooms = new Map();

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Handle player looking for a game
            socket.on('findGame', () => {
                let joinedRoom = false;

                // Look for an available room
                for (const [roomId, room] of gameRooms.entries()) {
                    if (room.players.length === 1) {
                        // Join existing room
                        socket.join(roomId);
                        room.players.push({
                            id: socket.id,
                            position: 'right',
                            ready: false
                        });
                        joinedRoom = true;
                        
                        // Notify both players that game can start
                        io.to(roomId).emit('gameReady', {
                            roomId,
                            players: room.players
                        });
                        break;
                    }
                }

                if (!joinedRoom) {
                    // Create new room
                    const roomId = uuidv4();
                    socket.join(roomId);
                    gameRooms.set(roomId, {
                        players: [{
                            id: socket.id,
                            position: 'left',
                            ready: false
                        }],
                        gameState: {
                            ball: { x: 400, y: 300, velocityX: 0, velocityY: 0 },
                            score: { left: 0, right: 0 }
                        }
                    });
                    socket.emit('waitingForPlayer', { roomId });
                }
            });

            // Handle player movement
            socket.on('paddleMove', (data) => {
                const { roomId, position, y } = data;
                const room = gameRooms.get(roomId);
                if (room) {
                    socket.to(roomId).emit('opponentMove', { position, y });
                }
            });

            // Handle ball update
            socket.on('ballUpdate', (data) => {
                const { roomId, ballState } = data;
                const room = gameRooms.get(roomId);
                if (room) {
                    room.gameState.ball = ballState;
                    socket.to(roomId).emit('ballSync', ballState);
                }
            });

            // Handle score update
            socket.on('scoreUpdate', (data) => {
                const { roomId, score } = data;
                const room = gameRooms.get(roomId);
                if (room) {
                    room.gameState.score = score;
                    io.to(roomId).emit('scoreSync', score);
                }
            });

            // Handle player ready state
            socket.on('playerReady', (data) => {
                const { roomId } = data;
                const room = gameRooms.get(roomId);
                if (room) {
                    const player = room.players.find(p => p.id === socket.id);
                    if (player) {
                        player.ready = true;
                        
                        // Check if all players are ready
                        if (room.players.every(p => p.ready)) {
                            io.to(roomId).emit('startGame');
                        }
                    }
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                for (const [roomId, room] of gameRooms.entries()) {
                    const playerIndex = room.players.findIndex(p => p.id === socket.id);
                    if (playerIndex !== -1) {
                        room.players.splice(playerIndex, 1);
                        if (room.players.length === 0) {
                            gameRooms.delete(roomId);
                        } else {
                            io.to(roomId).emit('playerDisconnected');
                        }
                        break;
                    }
                }
            });
        });

        res.socket.server.io = io;
    }

    res.end();
};

export const config = {
    api: {
        bodyParser: false
    }
};

export default ioHandler; 