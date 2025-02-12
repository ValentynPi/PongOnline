import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export class BotGame extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private bot!: Phaser.GameObjects.Rectangle;
    private ball!: Phaser.GameObjects.Arc;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private scoreText!: Phaser.GameObjects.Text;
    private waitingText!: Phaser.GameObjects.Text;
    private instructionsText!: Phaser.GameObjects.Text;
    private difficultyText!: Phaser.GameObjects.Text;
    private playerScore: number = 0;
    private botScore: number = 0;
    private gameStarted: boolean = false;
    private difficulty: Difficulty = 'MEDIUM';
    private recognition: any;
    private isVoiceControlEnabled: boolean = false;
    private lastVoiceCommand: string = '';
    private voiceCommandTimeout: number = 0;
    private isMouseControlEnabled: boolean = true;  // Enable mouse control by default

    // Bot settings for different difficulties
    private readonly difficultySettings = {
        EASY: {
            speed: 380,           // Increased from 350
            reactionSpeed: 0.7,   // Increased from 0.5
            predictionError: 100,  // Reduced from 150
            returnToCenter: 0.7,   // Increased from 0.5
            reactionDelay: 0.4,   // Reduced from 0.7 (faster reactions)
            missChance: 0.15      // Reduced from 0.3 (fewer intentional misses)
        },
        MEDIUM: {
            speed: 400,
            reactionSpeed: 0.8,
            predictionError: 80,
            returnToCenter: 0.8,
            reactionDelay: 0.3,
            missChance: 0.15
        },
        HARD: {
            speed: 450,
            reactionSpeed: 0.95,
            predictionError: 30,
            returnToCenter: 1,
            reactionDelay: 0.1,
            missChance: 0.05
        }
    };

    constructor() {
        super({ key: 'BotGame' });
        // Initialize speech recognition if available
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new (window as any).webkitSpeechRecognition();
            this.setupVoiceRecognition();
        }
    }

    private setupVoiceRecognition() {
        if (!this.recognition) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.trim().toLowerCase();

            if (command.includes('up')) {
                this.lastVoiceCommand = 'up';
                this.voiceCommandTimeout = 20; // Hold command for 20 frames
            } else if (command.includes('down')) {
                this.lastVoiceCommand = 'down';
                this.voiceCommandTimeout = 20; // Hold command for 20 frames
            } else if (command.includes('stop')) {
                this.lastVoiceCommand = '';
            }
        };

        this.recognition.onerror = (event: any) => {
            console.warn('Voice recognition error:', event.error);
        };
    }

    private startVoiceControl() {
        if (this.recognition && !this.isVoiceControlEnabled) {
            this.recognition.start();
            this.isVoiceControlEnabled = true;
        }
    }

    private stopVoiceControl() {
        if (this.recognition && this.isVoiceControlEnabled) {
            this.recognition.stop();
            this.isVoiceControlEnabled = false;
        }
    }

    create() {
        // Create game container with lower depth
        const gameContainer = this.add.container(0, 0).setDepth(0);

        // Create visible walls - make them thicker
        const topWall = this.add.rectangle(400, 0, 600, 10, 0xffffff);
        const bottomWall = this.add.rectangle(400, 400, 600, 10, 0xffffff);
        const leftWall = this.add.rectangle(100, 200, 10, 400, 0xffffff);
        const rightWall = this.add.rectangle(700, 200, 10, 400, 0xffffff);
        
        // Add center line
        for (let y = 10; y < 400; y += 20) {
            gameContainer.add(this.add.rectangle(400, y, 4, 10, 0xffffff));
        }

        // Add all walls to game container
        gameContainer.add(topWall);
        gameContainer.add(bottomWall);
        gameContainer.add(leftWall);
        gameContainer.add(rightWall);
        
        // Create menu container with higher depth
        const menuContainer = this.add.container(0, 0).setDepth(1);
        menuContainer.setName('menuContainer'); // Add name to find it later
        
        // Add waiting text
        this.waitingText = this.add.text(400, 180, 'Select Difficulty:', {
            fontSize: '32px',
            color: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        menuContainer.add(this.waitingText);

        // Add instructions text with mouse control
        this.instructionsText = this.add.text(400, 320, 'Use Up/Down arrows or mouse to move\nSay "Up"/"Down" for voice control\nPress ESC to return to menu', {
            fontSize: '20px',
            color: '#fff',
            align: 'center',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        menuContainer.add(this.instructionsText);

        // Add voice control toggle button
        const voiceButton = this.add.rectangle(400, 380, 200, 40, 0xffffff, 0.2);
        const voiceText = this.add.text(400, 380, 'Toggle Voice Control', {
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        voiceButton.setInteractive({ useHandCursor: true });
        
        voiceButton.on('pointerover', () => {
            voiceButton.setFillStyle(0xffffff, 0.4);
        });
        
        voiceButton.on('pointerout', () => {
            voiceButton.setFillStyle(0xffffff, 0.2);
        });

        voiceButton.on('pointerdown', () => {
            if (this.isVoiceControlEnabled) {
                this.stopVoiceControl();
                voiceText.setText('Enable Voice Control');
            } else {
                this.startVoiceControl();
                voiceText.setText('Disable Voice Control');
            }
        });

        menuContainer.add(voiceButton);
        menuContainer.add(voiceText);

        // Create difficulty buttons
        const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
        const buttonWidth = 150;
        const spacing = 170;
        const startX = 400 - spacing;
        const y = 250;

        difficulties.forEach((diff, index) => {
            const x = startX + (spacing * index);
            const button = this.add.rectangle(x, y, buttonWidth, 40, 0xffffff, 0.2);
            const text = this.add.text(x, y, diff, {
                fontSize: '28px',
                color: '#fff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            button.setInteractive({ useHandCursor: true });
            
            button.on('pointerover', () => {
                button.setFillStyle(0xffffff, 0.4);
            });
            
            button.on('pointerout', () => {
                button.setFillStyle(0xffffff, 0.2);
            });

            button.on('pointerdown', () => {
                this.difficulty = diff;
                this.startGame();
            });

            menuContainer.add(button);
            menuContainer.add(text);
        });
        
        // Enable physics with smaller bounds
        this.physics.world.setBounds(100, 0, 600, 400);
        this.physics.world.setBoundsCollision(true, true, true, true);
        
        // Enable physics for all walls
        this.physics.add.existing(topWall, true);
        this.physics.add.existing(bottomWall, true);
        this.physics.add.existing(leftWall, true);
        this.physics.add.existing(rightWall, true);

        // Create paddles and ball
        this.createGameObjects();
        
        // Setup score text - split into two separate numbers
        const textConfig = {
            fontSize: '64px',
            color: '#fff',
            fontFamily: 'Arial'
        };
        
        // Left score (player)
        this.scoreText = this.add.text(300, 50, '0', textConfig).setOrigin(0.5);
        // Right score (bot)
        const botScoreText = this.add.text(500, 50, '0', textConfig).setOrigin(0.5);
        
        // Store bot score text reference
        this.scoreText.setData('botScoreText', botScoreText);

        // Setup controls
        this.setupControls();

        // Setup collisions
        this.setupCollisions(topWall, bottomWall, leftWall, rightWall);

        // Enable mouse input
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.gameStarted && this.isMouseControlEnabled) {
                // Get the mouse Y position, clamped to the game bounds
                const targetY = Phaser.Math.Clamp(pointer.y, 30, 370);
                // Move the paddle towards the mouse position
                const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
                const distance = targetY - this.player.y;
                
                if (Math.abs(distance) > 5) {  // Add a small dead zone
                    const speed = Math.min(Math.abs(distance) * 10, 400); // Speed based on distance, max 400
                    playerBody.setVelocityY(Math.sign(distance) * speed);
                } else {
                    playerBody.setVelocityY(0);
                }
            }
        });

        // Notify React that scene is ready
        EventBus.emit('current-scene-ready', this);
    }

    private createGameObjects() {
        // Create player paddle (left)
        this.player = this.add.rectangle(120, 200, 15, 60, 0xffffff);
        this.physics.add.existing(this.player, false);
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
        playerBody.setImmovable(true);

        // Create bot paddle (right)
        this.bot = this.add.rectangle(680, 200, 15, 60, 0xffffff);
        this.physics.add.existing(this.bot, false);
        const botBody = this.bot.body as Phaser.Physics.Arcade.Body;
        botBody.setCollideWorldBounds(true);
        botBody.setImmovable(true);

        // Create ball
        this.ball = this.add.circle(400, 200, 8, 0xffffff);
        this.physics.add.existing(this.ball, false);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setCollideWorldBounds(true);
        ballBody.setBounce(1);
        ballBody.setCircle(8);
        ballBody.setDamping(false);
        ballBody.setFriction(0, 0);
        this.ball.visible = false;
    }

    private setupControls() {
        if (this.input?.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ESC', () => {
                this.scene.start('MainMenu');
            });
        }
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
            [this.player, this.bot],
            (ball: any, paddle: any) => {
                const ballObj = ball as Phaser.GameObjects.Arc;
                const paddleObj = paddle as Phaser.GameObjects.Rectangle;
                this.handlePaddleCollision(ballObj, paddleObj);
            },
            undefined,
            this
        );

        // Wall collisions
        this.physics.add.collider(this.ball, topWall);
        this.physics.add.collider(this.ball, bottomWall);
        this.physics.add.collider(this.ball, leftWall, () => this.handleScore('right'));
        this.physics.add.collider(this.ball, rightWall, () => this.handleScore('left'));
    }

    private startGame() {
        this.gameStarted = true;
        this.ball.visible = true;
        
        // Start voice control if enabled
        if (this.isVoiceControlEnabled) {
            this.startVoiceControl();
        }
        
        // Find and destroy the menu container
        const menuContainer = this.children.getByName('menuContainer');
        if (menuContainer) {
            menuContainer.destroy();
        }

        this.resetBall();
    }

    private handlePaddleCollision(ball: Phaser.GameObjects.Arc, paddle: Phaser.GameObjects.Rectangle) {
        const ballBody = ball.body as Phaser.Physics.Arcade.Body;
        
        // Calculate angle based on where the ball hits the paddle
        const diff = ball.y - paddle.y;
        const normalizedDiff = diff / (paddle.height / 2);
        const angle = normalizedDiff * Math.PI / 4; // Max 45-degree angle
        const speed = 300; // Reduced speed from 500 to 300
        
        // Set new velocity
        const direction = paddle.x < 400 ? 1 : -1; // Direction based on which paddle was hit
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
        try {
            this.scoreText.setText(this.playerScore.toString());
            const botScoreText = this.scoreText.getData('botScoreText');
            if (botScoreText) {
                botScoreText.setText(this.botScore.toString());
            }
        } catch (error) {
            console.warn('Score text update failed');
        }
    }

    private handleScore(scorer: 'left' | 'right') {
        if (scorer === 'left') {
            this.playerScore++;
        } else {
            this.botScore++;
        }
        
        try {
            this.updateScore();
        } catch (error) {
            console.warn('Score update failed');
        }
        
        // Only stop the game if someone wins
        if (this.playerScore >= 11 || this.botScore >= 11) {
            this.gameStarted = false;
            this.scene.start('GameOver', { 
                winner: this.playerScore >= 11 ? 'PLAYER' : 'BOT',
                score: `${this.playerScore} - ${this.botScore}`
            });
        } else {
            // Just reset ball position and keep playing
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
    }

    update() {
        if (!this.gameStarted) return;

        // Player movement - combine keyboard, voice, and mouse controls
        if (!this.isMouseControlEnabled) {  // Only use keyboard/voice if mouse is not moving
            if (this.cursors.up.isDown || this.lastVoiceCommand === 'up') {
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(-400);
            } else if (this.cursors.down.isDown || this.lastVoiceCommand === 'down') {
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(400);
            } else {
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
            }
        }

        // Update voice command timeout
        if (this.voiceCommandTimeout > 0) {
            this.voiceCommandTimeout--;
            if (this.voiceCommandTimeout === 0) {
                this.lastVoiceCommand = '';
            }
        }

        // Bot AI
        this.updateBotMovement();
    }

    private updateBotMovement() {
        const settings = this.difficultySettings[this.difficulty];
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        const botBody = this.bot.body as Phaser.Physics.Arcade.Body;

        let targetY = 200; // Default to center

        if (ballBody.velocity.x > 0) {
            // Ball is moving towards bot
            
            // Randomly decide to miss the ball based on difficulty
            if (Math.random() < settings.missChance) {
                // Intentionally move away from the ball
                targetY = this.ball.y > 200 ? 100 : 300;
            } else {
                // Normal prediction with error
                const timeToIntercept = (this.bot.x - this.ball.x) / ballBody.velocity.x;
                const predictedY = this.ball.y + (ballBody.velocity.y * timeToIntercept);
                
                // Add more randomness based on difficulty
                const errorMultiplier = Math.random() * (1 + settings.reactionDelay);
                targetY = predictedY + (Math.random() - 0.5) * settings.predictionError * errorMultiplier;
                
                // Clamp target position to prevent wild movements
                targetY = Phaser.Math.Clamp(targetY, 30, 370);
            }
        } else {
            // Return to center when ball is moving away
            // Less precise center return for lower difficulties
            const randomOffset = (Math.random() - 0.5) * (50 / settings.reactionSpeed);
            targetY = 200 + randomOffset;
        }

        // Calculate distance to target
        const distanceToTarget = targetY - this.bot.y;
        
        // Add reaction delay based on difficulty
        const shouldMove = Math.random() > settings.reactionDelay;
        
        if (shouldMove && Math.abs(distanceToTarget) > 2) {
            const direction = distanceToTarget > 0 ? 1 : -1;
            // Add some randomness to speed
            const speedVariation = 0.8 + Math.random() * 0.4; // Speed varies by ±20%
            botBody.setVelocityY(direction * settings.speed * speedVariation);
        } else {
            botBody.setVelocityY(0);
        }
    }
} 