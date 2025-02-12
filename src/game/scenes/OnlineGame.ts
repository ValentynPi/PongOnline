import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';
import { EventBus } from '../EventBus';

interface OnlineGameConfig {
    socket: Socket;
    roomCode: string;
    isLeftPlayer: boolean;
}

export class OnlineGame extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private opponent!: Phaser.GameObjects.Rectangle;
    private ball!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private scoreText!: Phaser.GameObjects.Text;
    private socket: Socket;
    private roomCode: string;
    private isLeftPlayer: boolean;
    private playerScore: number = 0;
    private opponentScore: number = 0;
    private lastUpdateTime: number = 0;
    private isMouseControlEnabled: boolean = true;

    constructor() {
        super({ key: 'OnlineGame' });
    }

    init(data: OnlineGameConfig) {
        this.socket = data.socket;
        this.roomCode = data.roomCode;
        this.isLeftPlayer = data.isLeftPlayer;
        this.setupSocketHandlers();
    }

    private setupSocketHandlers() {
        // Handle opponent paddle movement
        this.socket.on('paddleUpdate', (data: { position: number; isLeft: boolean }) => {
            if (data.isLeft !== this.isLeftPlayer) {
                this.opponent.setY(data.position);
            }
        });

        // Handle ball sync
        this.socket.on('ballSync', (position: { x: number; y: number }) => {
            if (!this.isLeftPlayer) { // Only right player syncs ball position
                this.ball.setPosition(position.x, position.y);
            }
        });

        // Handle score sync
        this.socket.on('scoreSync', (scores: { left: number; right: number }) => {
            this.playerScore = this.isLeftPlayer ? scores.left : scores.right;
            this.opponentScore = this.isLeftPlayer ? scores.right : scores.left;
            this.updateScore();
        });

        // Handle opponent disconnection
        this.socket.on('playerDisconnected', () => {
            this.scene.start('MainMenu');
            alert('Opponent disconnected');
        });
    }

    create() {
        // Create game container
        const gameContainer = this.add.container(0, 0);

        // Create visible walls
        const topWall = this.add.rectangle(400, 0, 600, 10, 0xffffff);
        const bottomWall = this.add.rectangle(400, 400, 600, 10, 0xffffff);
        const leftWall = this.add.rectangle(100, 200, 10, 400, 0xffffff);
        const rightWall = this.add.rectangle(700, 200, 10, 400, 0xffffff);
        
        // Add center line
        for (let y = 10; y < 400; y += 20) {
            gameContainer.add(this.add.rectangle(400, y, 4, 10, 0xffffff));
        }

        // Add walls to container
        gameContainer.add([topWall, bottomWall, leftWall, rightWall]);

        // Setup physics
        this.physics.world.setBounds(100, 0, 600, 400);
        this.physics.world.setBoundsCollision(true, true, true, true);
        
        // Enable physics for walls
        [topWall, bottomWall, leftWall, rightWall].forEach(wall => {
            this.physics.add.existing(wall, true);
        });

        // Create game objects
        this.createGameObjects();
        
        // Setup score display
        const textConfig = {
            fontSize: '64px',
            color: '#fff',
            fontFamily: 'Arial'
        };
        
        this.scoreText = this.add.text(300, 50, '0', textConfig).setOrigin(0.5);
        const opponentScoreText = this.add.text(500, 50, '0', textConfig).setOrigin(0.5);
        this.scoreText.setData('opponentScoreText', opponentScoreText);

        // Setup controls
        this.setupControls();

        // Setup collisions
        this.setupCollisions(topWall, bottomWall, leftWall, rightWall);

        // Enable mouse control
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isMouseControlEnabled) {
                const targetY = Phaser.Math.Clamp(pointer.y, 30, 370);
                const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
                const distance = targetY - this.player.y;
                
                if (Math.abs(distance) > 5) {
                    const speed = Math.min(Math.abs(distance) * 10, 400);
                    playerBody.setVelocityY(Math.sign(distance) * speed);
                    
                    // Send paddle position to server
                    this.socket.emit('paddleMove', {
                        roomCode: this.roomCode,
                        position: this.player.y,
                        isLeft: this.isLeftPlayer
                    });
                } else {
                    playerBody.setVelocityY(0);
                }
            }
        });

        // Notify React
        EventBus.emit('current-scene-ready', this);

        // If left player, start the ball
        if (this.isLeftPlayer) {
            this.resetBall();
        }
    }

    private createGameObjects() {
        // Create paddles based on player side
        const playerX = this.isLeftPlayer ? 120 : 680;
        const opponentX = this.isLeftPlayer ? 680 : 120;

        // Create player paddle
        this.player = this.add.rectangle(playerX, 200, 15, 60, 0xffffff);
        this.physics.add.existing(this.player, false);
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
        playerBody.setImmovable(true);

        // Create opponent paddle
        this.opponent = this.add.rectangle(opponentX, 200, 15, 60, 0xffffff);
        this.physics.add.existing(this.opponent, false);
        const opponentBody = this.opponent.body as Phaser.Physics.Arcade.Body;
        opponentBody.setCollideWorldBounds(true);
        opponentBody.setImmovable(true);

        // Create ball
        this.ball = this.add.circle(400, 200, 8, 0xffffff);
        this.physics.add.existing(this.ball, false);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setCollideWorldBounds(true);
        ballBody.setBounce(1);
        ballBody.setCircle(8);
        ballBody.setDamping(false);
        ballBody.setFriction(0, 0);
    }

    private setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-ESC', () => {
            this.socket.disconnect();
            this.scene.start('MainMenu');
        });
    }

    private setupCollisions(
        topWall: Phaser.GameObjects.Rectangle,
        bottomWall: Phaser.GameObjects.Rectangle,
        leftWall: Phaser.GameObjects.Rectangle,
        rightWall: Phaser.GameObjects.Rectangle
    ) {
        // Paddle collisions
        this.physics.add.collider(
            this.ball,
            [this.player, this.opponent],
            this.handlePaddleCollision,
            undefined,
            this
        );

        // Wall collisions
        this.physics.add.collider(this.ball, topWall);
        this.physics.add.collider(this.ball, bottomWall);
        this.physics.add.collider(this.ball, leftWall, () => this.handleScore('right'));
        this.physics.add.collider(this.ball, rightWall, () => this.handleScore('left'));
    }

    private handlePaddleCollision(ball: Phaser.GameObjects.Arc, paddle: Phaser.GameObjects.Rectangle) {
        const ballBody = ball.body as Phaser.Physics.Arcade.Body;
        const diff = ball.y - paddle.y;
        const normalizedDiff = diff / (paddle.height / 2);
        const angle = normalizedDiff * Math.PI / 4;
        const speed = 300;
        
        const direction = paddle.x < 400 ? 1 : -1;
        const velocityX = direction * speed * Math.cos(angle);
        const velocityY = speed * Math.sin(angle);
        
        ballBody.setVelocity(velocityX, velocityY);
    }

    private resetBall() {
        this.ball.setPosition(400, 200);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        const angle = (Math.random() - 0.5) * Math.PI / 4;
        const speed = 300;
        const direction = Math.random() < 0.5 ? -1 : 1;
        
        ballBody.setVelocity(
            direction * speed * Math.cos(angle),
            speed * Math.sin(angle)
        );
    }

    private updateScore() {
        this.scoreText.setText(this.playerScore.toString());
        const opponentScoreText = this.scoreText.getData('opponentScoreText');
        if (opponentScoreText) {
            opponentScoreText.setText(this.opponentScore.toString());
        }
    }

    private handleScore(scorer: 'left' | 'right') {
        const isPlayerPoint = (this.isLeftPlayer && scorer === 'left') || 
                            (!this.isLeftPlayer && scorer === 'right');
        
        if (isPlayerPoint) {
            this.playerScore++;
        } else {
            this.opponentScore++;
        }

        // Send score update to server
        this.socket.emit('scoreUpdate', {
            roomCode: this.roomCode,
            scores: {
                left: this.isLeftPlayer ? this.playerScore : this.opponentScore,
                right: this.isLeftPlayer ? this.opponentScore : this.playerScore
            }
        });

        // Check for game over
        if (this.playerScore >= 11 || this.opponentScore >= 11) {
            this.scene.start('GameOver', {
                winner: this.playerScore >= 11 ? 'PLAYER' : 'OPPONENT',
                score: `${this.playerScore} - ${this.opponentScore}`
            });
        } else {
            // Reset ball if you're the left player
            if (this.isLeftPlayer) {
                this.resetBall();
            }
        }
    }

    update() {
        // Handle keyboard controls if mouse is not being used
        if (!this.isMouseControlEnabled) {
            if (this.cursors.up.isDown) {
                this.player.body.setVelocityY(-400);
            } else if (this.cursors.down.isDown) {
                this.player.body.setVelocityY(400);
            } else {
                this.player.body.setVelocityY(0);
            }
        }

        // Sync ball position if you're the left player (host)
        if (this.isLeftPlayer) {
            const currentTime = this.time.now;
            if (currentTime - this.lastUpdateTime > 16) { // ~60 times per second
                this.socket.emit('ballUpdate', {
                    roomCode: this.roomCode,
                    position: {
                        x: this.ball.x,
                        y: this.ball.y
                    }
                });
                this.lastUpdateTime = currentTime;
            }
        }
    }
} 