import { Scene } from 'phaser';
import { io, Socket } from 'socket.io-client';

export class OnlineLobby extends Scene {
    private socket: Socket | null = null;
    private statusText!: Phaser.GameObjects.Text;
    private roomCode: string | null = null;

    constructor() {
        super({ key: 'OnlineLobby' });
    }

    create(): void {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, height / 4, 'Online Lobby', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Create Room Button
        const createButton = this.add.text(width / 2, height / 2 - 40, 'Create Game', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Join Room Button
        const joinButton = this.add.text(width / 2, height / 2 + 40, 'Join Game', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Back Button
        const backButton = this.add.text(width / 2, height * 0.8, 'Back to Menu', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 15, y: 8 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Status Text
        this.statusText = this.add.text(width / 2, height - 100, '', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Button hover effects
        [createButton, joinButton, backButton].forEach(button => {
            button.on('pointerover', () => button.setTint(0x00ff00));
            button.on('pointerout', () => button.clearTint());
        });

        // Button click handlers
        createButton.on('pointerdown', () => this.createRoom());
        joinButton.on('pointerdown', () => this.promptForRoomCode());
        backButton.on('pointerdown', () => {
            if (this.socket) {
                this.socket.disconnect();
            }
            this.scene.start('MainMenu');
        });

        // Initialize socket connection
        this.initializeSocket();
    }

    private initializeSocket(): void {
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            this.statusText.setText('Connected to server');
        });

        this.socket.on('disconnect', () => {
            this.statusText.setText('Disconnected from server');
        });

        this.socket.on('roomCreated', (roomCode: string) => {
            this.roomCode = roomCode;
            this.statusText.setText(`Room created!\nRoom Code: ${roomCode}\nWaiting for opponent...`);
        });

        this.socket.on('gameStart', (data: { leftPlayer: string; rightPlayer: string }) => {
            const isLeftPlayer = data.leftPlayer === this.socket?.id;
            this.statusText.setText('Game starting...');
            
            // Start the game scene with the appropriate player role
            this.scene.start('Game', {
                mode: 'online',
                socket: this.socket,
                roomCode: this.roomCode,
                isLeftPlayer: isLeftPlayer
            });
        });

        this.socket.on('error', (message: string) => {
            this.statusText.setText(`Error: ${message}`);
        });

        this.socket.on('playerDisconnected', () => {
            this.statusText.setText('Other player disconnected');
            setTimeout(() => {
                this.scene.start('MainMenu');
            }, 2000);
        });
    }

    private createRoom(): void {
        if (this.socket?.connected) {
            this.socket.emit('createRoom');
        } else {
            this.statusText.setText('Not connected to server');
        }
    }

    private promptForRoomCode(): void {
        const code = prompt('Enter room code:');
        if (code && this.socket?.connected) {
            this.socket.emit('joinRoom', code);
            this.roomCode = code;
            this.statusText.setText('Joining room...');
        }
    }

    shutdown(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
} 