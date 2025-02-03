import { Server } from 'socket.io';
import { parse } from 'url';

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        console.log('*First use, starting socket.io');

        const io = new Server(res.socket.server, {
            path: '/api/socket',
            transports: ['polling'],
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: false
            },
            allowEIO3: true,
            connectTimeout: 45000,
            pingTimeout: 30000,
            pingInterval: 25000,
            upgradeTimeout: 10000,
            allowUpgrades: false,
            serveClient: false
        });

        // Store game rooms
        const gameRooms = new Map();

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });

            // Handle player looking for a game
            socket.on('findGame', () => {
                try {
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
                        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
                } catch (error) {
                    console.error('Error in findGame:', error);
                    socket.emit('error', 'Failed to find or create game');
                }
            });

            // Handle player movement
            socket.on('paddleMove', (data) => {
                try {
                    const { roomId, position, y } = data;
                    const room = gameRooms.get(roomId);
                    if (room) {
                        socket.to(roomId).emit('opponentMove', { position, y });
                    }
                } catch (error) {
                    console.error('Error in paddleMove:', error);
                }
            });

            // Handle ball update
            socket.on('ballUpdate', (data) => {
                try {
                    const { roomId, ballState } = data;
                    const room = gameRooms.get(roomId);
                    if (room) {
                        room.gameState.ball = ballState;
                        socket.to(roomId).emit('ballSync', ballState);
                    }
                } catch (error) {
                    console.error('Error in ballUpdate:', error);
                }
            });

            // Handle score update
            socket.on('scoreUpdate', (data) => {
                try {
                    const { roomId, score } = data;
                    const room = gameRooms.get(roomId);
                    if (room) {
                        room.gameState.score = score;
                        io.to(roomId).emit('scoreSync', score);
                    }
                } catch (error) {
                    console.error('Error in scoreUpdate:', error);
                }
            });

            // Handle player ready state
            socket.on('playerReady', (data) => {
                try {
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
                } catch (error) {
                    console.error('Error in playerReady:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                try {
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
                } catch (error) {
                    console.error('Error in disconnect:', error);
                }
            });
        });

        res.socket.server.io = io;
    }

    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.writeHead(204);
        res.end();
        return;
    }

    // Handle Socket.IO requests
    if (res.socket.server.io) {
        res.socket.server.io.engine.handleRequest(req, res);
    } else {
        res.writeHead(404);
        res.end();
    }
};

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
};

export default ioHandler; 