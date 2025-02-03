class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.position = null;
        this.game = null;
        this.onGameStart = null;
        this.onOpponentMove = null;
        this.onBallSync = null;
        this.onScoreSync = null;
        this.onPlayerDisconnected = null;
        this.pendingGameSearch = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
    }

    init(game) {
        this.game = game;
        this.connectToServer();
    }

    connectToServer() {
        // Load Socket.IO client from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
        script.onload = () => {
            this.initializeSocket();
        };
        script.onerror = (error) => {
            console.error('Error loading Socket.IO:', error);
            document.getElementById('status').textContent = 'Error loading game components. Please refresh.';
        };
        document.head.appendChild(script);
    }

    initializeSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
            const host = window.location.hostname === 'localhost' ? 
                'localhost:3000' : window.location.host;

            // Connect to the server
            this.socket = io(`${protocol}://${host}`, {
                path: '/api/socket',
                transports: ['polling'],
                reconnection: true,
                reconnectionAttempts: this.maxConnectionAttempts,
                reconnectionDelay: 1000,
                timeout: 45000,
                autoConnect: true,
                forceNew: true,
                withCredentials: false,
                upgrade: false,
                rememberUpgrade: false,
                rejectUnauthorized: false
            });

            // Add connection state logging
            this.socket.on('connect', () => {
                console.log('Connected to server');
                document.getElementById('status').textContent = 'Connected to server';
                this.connectionAttempts = 0;
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                document.getElementById('status').textContent = 'Disconnected from server. Reconnecting...';
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.connectionAttempts++;
                document.getElementById('status').textContent = `Connection error (${this.connectionAttempts}/${this.maxConnectionAttempts})`;
            });

            this.setupSocketListeners();

            // If there was a pending game search, execute it now
            if (this.pendingGameSearch) {
                setTimeout(() => {
                    this.findGame();
                    this.pendingGameSearch = false;
                }, 1000);
            }
        } catch (error) {
            console.error('Socket initialization error:', error);
            document.getElementById('status').textContent = 'Failed to connect to server. Please refresh.';
        }
    }

    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('waitingForPlayer', (data) => {
            this.roomId = data.roomId;
            this.position = 'left';
            console.log('Waiting for opponent...');
            document.getElementById('status').textContent = 'Waiting for opponent...';
        });

        this.socket.on('gameReady', (data) => {
            this.roomId = data.roomId;
            const player = data.players.find(p => p.id === this.socket.id);
            this.position = player.position;
            console.log('Game ready!');
            document.getElementById('status').textContent = 'Game ready!';
            this.setReady();
        });

        this.socket.on('startGame', () => {
            if (this.onGameStart) {
                this.onGameStart(this.position);
            }
        });

        this.socket.on('opponentMove', (data) => {
            if (this.onOpponentMove) {
                this.onOpponentMove(data.y);
            }
        });

        this.socket.on('ballSync', (ballState) => {
            if (this.onBallSync) {
                this.onBallSync(ballState);
            }
        });

        this.socket.on('scoreSync', (score) => {
            if (this.onScoreSync) {
                this.onScoreSync(score);
            }
        });

        this.socket.on('playerDisconnected', () => {
            if (this.onPlayerDisconnected) {
                this.onPlayerDisconnected();
            }
            document.getElementById('status').textContent = 'Opponent disconnected. Press Space to find new game.';
        });
    }

    findGame() {
        if (!this.socket?.connected) {
            this.pendingGameSearch = true;
            return;
        }
        this.socket.emit('findGame');
    }

    sendPaddleMove(y) {
        if (!this.socket?.connected || !this.roomId) return;
        this.socket.emit('paddleMove', {
            roomId: this.roomId,
            position: this.position,
            y: y
        });
    }

    sendBallUpdate(ballState) {
        if (!this.socket?.connected || !this.roomId) return;
        this.socket.emit('ballUpdate', {
            roomId: this.roomId,
            ballState: ballState
        });
    }

    sendScoreUpdate(score) {
        if (!this.socket?.connected || !this.roomId) return;
        this.socket.emit('scoreUpdate', {
            roomId: this.roomId,
            score: score
        });
    }

    setReady() {
        if (!this.socket?.connected || !this.roomId) return;
        this.socket.emit('playerReady', {
            roomId: this.roomId
        });
    }
}

export const multiplayerManager = new MultiplayerManager(); 