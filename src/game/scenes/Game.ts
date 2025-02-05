import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';

interface SceneData {
    mode?: 'online' | 'local';
    isLeftPlayer?: boolean;
    socket?: Socket;
    roomCode?: string;
}

export class PongGame extends Scene {
    private ball!: Phaser.GameObjects.Arc;
    private leftPaddle!: Phaser.GameObjects.Container;
    private rightPaddle!: Phaser.GameObjects.Container;
    private topWall!: Phaser.GameObjects.Rectangle;
    private bottomWall!: Phaser.GameObjects.Rectangle;
    private leftScore: number = 0;
    private rightScore: number = 0;
    private leftScoreText!: Phaser.GameObjects.Text;
    private rightScoreText!: Phaser.GameObjects.Text;

    // Game constants
    private readonly initialBallSpeed = 300;
    private currentBallSpeed = 300;
    private readonly paddleSpeed = 400;
    private readonly speedIncrease = 1.05;
    private readonly winningScore = 11;
    private readonly wallThickness = 3;

    private keys!: {
        W: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        UP: Phaser.Input.Keyboard.Key;
        DOWN: Phaser.Input.Keyboard.Key;
    };

    private socket?: Socket;
    private roomCode?: string;

    constructor() {
        super({ key: 'Game' });
    }

    init(): void {
        // Reset all game state
        this.leftScore = 0;
        this.rightScore = 0;
        this.currentBallSpeed = this.initialBallSpeed;
        this.socket = undefined;
        this.roomCode = undefined;
    }

    create(): void {
        const { width, height } = this.scale;
        
        // Get game mode and online data from scene init
        const data = this.scene.settings.data as SceneData;
        const isOnlineMode = data?.mode === 'online';
        const isLeftPlayer = data?.isLeftPlayer;
        this.socket = data?.socket;
        this.roomCode = data?.roomCode;

        // Create walls
        this.topWall = this.add.rectangle(width / 2, this.wallThickness / 2, width, this.wallThickness, 0xffffff);
        this.bottomWall = this.add.rectangle(width / 2, height - this.wallThickness / 2, width, this.wallThickness, 0xffffff);
        
        this.physics.add.existing(this.topWall, true);
        this.physics.add.existing(this.bottomWall, true);

        // Initialize controls
        this.keys = {
            W: this.input.keyboard!.addKey('W'),
            S: this.input.keyboard!.addKey('S'),
            UP: this.input.keyboard!.addKey('UP'),
            DOWN: this.input.keyboard!.addKey('DOWN')
        };

        // Create ball with slightly larger physics body
        this.ball = this.add.circle(width / 2, height / 2, 8, 0xffffff);
        this.physics.add.existing(this.ball);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setCircle(9); // Slightly larger physics circle than visual
        ballBody.setBounce(1, 1);
        ballBody.setCollideWorldBounds(false);
        ballBody.setAllowRotation(false);
        ballBody.setDamping(false);
        ballBody.setMaxVelocity(1000, 1000); // Prevent extreme velocities

        // Create paddles with rounded corners
        this.leftPaddle = this.createPaddle(30, height / 2);
        this.rightPaddle = this.createPaddle(width - 30, height / 2);

        // Set up score display
        const textStyle = { fontSize: '48px', color: '#ffffff', fontFamily: 'Arial' };
        this.leftScoreText = this.add.text(width * 0.25, 50, '0', textStyle).setOrigin(0.5);
        this.rightScoreText = this.add.text(width * 0.75, 50, '0', textStyle).setOrigin(0.5);

        // Add collision handlers
        this.physics.add.collider(
            this.ball,
            this.leftPaddle,
            (obj1, obj2) => this.handlePaddleCollision(
                obj1 as Phaser.GameObjects.Arc,
                obj2 as Phaser.GameObjects.Container
            ),
            undefined,
            this
        );
        this.physics.add.collider(
            this.ball,
            this.rightPaddle,
            (obj1, obj2) => this.handlePaddleCollision(
                obj1 as Phaser.GameObjects.Arc,
                obj2 as Phaser.GameObjects.Container
            ),
            undefined,
            this
        );
        this.physics.add.collider(this.ball, this.topWall);
        this.physics.add.collider(this.ball, this.bottomWall);

        if (isOnlineMode && this.socket) {
            this.setupOnlineEventHandlers();
        }

        // Start the game
        if (!isOnlineMode || isLeftPlayer) {
            this.resetBall();
        }
    }

    private setupOnlineEventHandlers(): void {
        if (!this.socket) return;

        // Handle opponent paddle movement
        this.socket.on('paddleUpdate', (data: { position: number; isLeft: boolean }) => {
            const paddle = data.isLeft ? this.leftPaddle : this.rightPaddle;
            paddle.y = data.position;
            (paddle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
        });

        // Handle ball sync from other player
        this.socket.on('ballSync', (position: { x: number; y: number }) => {
            this.ball.setPosition(position.x, position.y);
        });

        // Handle score updates
        this.socket.on('scoreSync', (scores: { left: number; right: number }) => {
            this.leftScore = scores.left;
            this.rightScore = scores.right;
            this.leftScoreText.setText(scores.left.toString());
            this.rightScoreText.setText(scores.right.toString());
        });

        // Handle player disconnection
        this.socket.on('playerDisconnected', () => {
            this.scene.start('MainMenu');
        });
    }

    // Resets the ball to the center with a random initial angle and direction
    private resetBall(): void {
        this.currentBallSpeed = this.initialBallSpeed;
        const { width, height } = this.scale;
        this.ball.setPosition(width / 2, height / 2);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        // Randomly choose left (-1) or right (1) starting direction
        const direction = Math.random() > 0.5 ? 1 : -1;
        // Random angle between -60° and +60°
        const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-60, 60));
        ballBody.setVelocity(
            Math.cos(angle) * this.currentBallSpeed * direction,
            Math.sin(angle) * this.currentBallSpeed
        );
    }

    // Create paddles with rounded corners using a container and graphics
    private createPaddle(x: number, y: number): Phaser.GameObjects.Container {
        const paddleWidth = 15;
        const paddleHeight = 80;
        const cornerRadius = 8;
        const physicsWidth = paddleWidth + 4; // Reduced from +8 to +4 for more precise collision

        const container = this.add.container(x, y);
        
        // Create the rounded rectangle paddle using Graphics
        const graphics = this.add.graphics();
        graphics.fillStyle(0xFFFFFF);
        graphics.beginPath();
        
        // Draw rounded rectangle path
        graphics.moveTo(cornerRadius, 0);
        graphics.lineTo(paddleWidth - cornerRadius, 0);
        graphics.arc(paddleWidth - cornerRadius, cornerRadius, cornerRadius, -Math.PI/2, 0);
        graphics.lineTo(paddleWidth, paddleHeight - cornerRadius);
        graphics.arc(paddleWidth - cornerRadius, paddleHeight - cornerRadius, cornerRadius, 0, Math.PI/2);
        graphics.lineTo(cornerRadius, paddleHeight);
        graphics.arc(cornerRadius, paddleHeight - cornerRadius, cornerRadius, Math.PI/2, Math.PI);
        graphics.lineTo(0, cornerRadius);
        graphics.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, -Math.PI/2);
        graphics.closePath();
        graphics.fill();

        // Center the graphics in the container
        graphics.x = -paddleWidth / 2;
        graphics.y = -paddleHeight / 2;

        // Add the graphics to the container
        container.add(graphics);
        
        // Set the container's size for physics - make it wider than visual paddle
        container.setSize(physicsWidth-2, paddleHeight);
        
        // Add physics to the container
        this.physics.world.enable(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setAllowGravity(false);
        body.setCollideWorldBounds(true);
        
        // Debug visualization of physics body
        const debugRect = this.add.rectangle(0, 0, physicsWidth-2, paddleHeight, 0xff0000, 0.3);
        container.add(debugRect);
        
        return container;
    }

    // Adjusts the ball's trajectory based on paddle movement and collision point
    private handlePaddleCollision(ball: Phaser.GameObjects.Arc, paddle: Phaser.GameObjects.Container): boolean {
        const ballBody = ball.body as Phaser.Physics.Arcade.Body;
        const paddleBody = paddle.body as Phaser.Physics.Arcade.Body;

        // Ensure we're not handling multiple collisions too quickly
        if (ballBody.velocity.x === 0) return false;

        // Calculate relative velocity between ball and paddle
        const paddleVelocityY = (paddleBody.y - paddleBody.prev.y) / this.game.loop.delta;
        
        // Increase speed upon paddle hit
        this.currentBallSpeed *= this.speedIncrease;
        
        // Calculate the hit position relative to the paddle center (-1 to 1)
        const hitFactor = (ball.y - paddle.y) / (paddle.height / 2);
        
        // Constrain the hit factor to prevent extreme angles
        const clampedHitFactor = Phaser.Math.Clamp(hitFactor, -0.8, 0.8);
        
        // Convert hit factor to angle (maximum ±60 degrees)
        const angle = clampedHitFactor * Math.PI / 3;
        
        // Determine the direction based on which paddle was hit
        const direction = (paddle === this.leftPaddle) ? 1 : -1;
        
        // Calculate new velocities
        const minHorizontalComponent = 0.5;
        const horizontalSpeed = Math.max(Math.abs(Math.cos(angle)), minHorizontalComponent) * this.currentBallSpeed * direction;
        
        // Add paddle's vertical velocity to the ball's vertical speed (scaled down for better gameplay)
        const paddleInfluence = 0.7;
        const verticalSpeed = (Math.sin(angle) * this.currentBallSpeed) + (paddleVelocityY * paddleInfluence);
        
        // Apply new velocities immediately
        ballBody.setVelocity(horizontalSpeed, verticalSpeed);
        
        // Adjust ball position to prevent sticking
        const offset = 4; // Increased separation to prevent multiple collisions
        if (direction > 0) {
            ball.x = paddle.x + (paddle.width / 2) + ball.width + offset;
        } else {
            ball.x = paddle.x - (paddle.width / 2) - ball.width - offset;
        }

        return false;
    }

    update(time: number, delta: number): void {
        const { width, height } = this.scale;
        const deltaSec = delta / 1000;
        const data = this.scene.settings.data as SceneData;
        const isOnlineMode = data?.mode === 'online';
        const isLeftPlayer = data?.isLeftPlayer;

        // Handle paddle movement based on game mode
        if (!isOnlineMode || isLeftPlayer) {
            // Left paddle (W/S keys)
            const leftPaddleBody = this.leftPaddle.body as Phaser.Physics.Arcade.Body;
            if (this.keys.W.isDown && this.leftPaddle.y - this.leftPaddle.height / 2 > this.wallThickness) {
                leftPaddleBody.setVelocityY(-this.paddleSpeed);
                if (isOnlineMode && this.socket) {
                    this.socket.emit('paddleMove', {
                        roomCode: this.roomCode,
                        position: this.leftPaddle.y,
                        isLeft: true
                    });
                }
            } else if (this.keys.S.isDown && this.leftPaddle.y + this.leftPaddle.height / 2 < height - this.wallThickness) {
                leftPaddleBody.setVelocityY(this.paddleSpeed);
                if (isOnlineMode && this.socket) {
                    this.socket.emit('paddleMove', {
                        roomCode: this.roomCode,
                        position: this.leftPaddle.y,
                        isLeft: true
                    });
                }
            } else {
                leftPaddleBody.setVelocityY(0);
            }
        }

        if (!isOnlineMode || !isLeftPlayer) {
            // Right paddle (UP/DOWN keys)
            const rightPaddleBody = this.rightPaddle.body as Phaser.Physics.Arcade.Body;
            if (this.keys.UP.isDown && this.rightPaddle.y - this.rightPaddle.height / 2 > this.wallThickness) {
                rightPaddleBody.setVelocityY(-this.paddleSpeed);
                if (isOnlineMode && this.socket) {
                    this.socket.emit('paddleMove', {
                        roomCode: this.roomCode,
                        position: this.rightPaddle.y,
                        isLeft: false
                    });
                }
            } else if (this.keys.DOWN.isDown && this.rightPaddle.y + this.rightPaddle.height / 2 < height - this.wallThickness) {
                rightPaddleBody.setVelocityY(this.paddleSpeed);
                if (isOnlineMode && this.socket) {
                    this.socket.emit('paddleMove', {
                        roomCode: this.roomCode,
                        position: this.rightPaddle.y,
                        isLeft: false
                    });
                }
            } else {
                rightPaddleBody.setVelocityY(0);
            }
        }

        // Check for scoring
        if (this.ball.x < 0) {
            this.rightScore++;
            this.rightScoreText.setText(this.rightScore.toString());
            if (isOnlineMode && this.socket) {
                this.socket.emit('scoreUpdate', {
                    roomCode: this.roomCode,
                    scores: { left: this.leftScore, right: this.rightScore }
                });
            }
            this.resetBall();
        } else if (this.ball.x > width) {
            this.leftScore++;
            this.leftScoreText.setText(this.leftScore.toString());
            if (isOnlineMode && this.socket) {
                this.socket.emit('scoreUpdate', {
                    roomCode: this.roomCode,
                    scores: { left: this.leftScore, right: this.rightScore }
                });
            }
            this.resetBall();
        }

        // Sync ball position in online mode
        if (isOnlineMode && this.socket && isLeftPlayer) {
            this.socket.emit('ballUpdate', {
                roomCode: this.roomCode,
                position: { x: this.ball.x, y: this.ball.y }
            });
        }

        // Check for game over
        if (this.leftScore >= this.winningScore || this.rightScore >= this.winningScore) {
            const gameOverData = { 
                winner: this.leftScore > this.rightScore ? 'Left' : 'Right',
                score: `${this.leftScore} - ${this.rightScore}`
            };

            // Remove all socket listeners before disconnecting
            if (isOnlineMode && this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = undefined;
            }

            this.scene.start('GameOver', gameOverData);
            return; // Stop further updates after game over
        }
    }
}