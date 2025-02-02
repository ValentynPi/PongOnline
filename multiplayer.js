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
            // Connect to the server
            this.socket = io({
                path: '/api/socket'
            });

            this.setupSocketListeners();
        };
        document.head.appendChild(script);
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('waitingForPlayer', (data) => {
            this.roomId = data.roomId;
            this.position = 'left';
            console.log('Waiting for opponent...');
        });

        this.socket.on('gameReady', (data) => {
            this.roomId = data.roomId;
            const player = data.players.find(p => p.id === this.socket.id);
            this.position = player.position;
            console.log('Game ready!');
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
        });
    }

    findGame() {
        this.socket.emit('findGame');
    }

    sendPaddleMove(y) {
        if (this.roomId) {
            this.socket.emit('paddleMove', {
                roomId: this.roomId,
                position: this.position,
                y: y
            });
        }
    }

    sendBallUpdate(ballState) {
        if (this.roomId) {
            this.socket.emit('ballUpdate', {
                roomId: this.roomId,
                ballState: ballState
            });
        }
    }

    sendScoreUpdate(score) {
        if (this.roomId) {
            this.socket.emit('scoreUpdate', {
                roomId: this.roomId,
                score: score
            });
        }
    }

    setReady() {
        if (this.roomId) {
            this.socket.emit('playerReady', {
                roomId: this.roomId
            });
        }
    }
}

export const multiplayerManager = new MultiplayerManager(); 