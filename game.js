import { multiplayerManager } from './multiplayer.js';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        this.isHost = false;
        this.gameStarted = false;
        this.waitingText = null;

        // Create paddles
        player = this.add.rectangle(50, 300, 20, 120, 0xffffff);
        this.physics.world.enable(player);
        player.body.immovable = true;
        player.body.allowGravity = false;

        // Create opponent paddle
        opponent = this.add.rectangle(750, 300, 20, 120, 0x00ff00);
        this.physics.world.enable(opponent);
        opponent.body.immovable = true;
        opponent.body.allowGravity = false;

        // Create ball
        ball = this.add.circle(400, 300, 12, 0xffffff);
        this.physics.world.enable(ball);
        ball.body.allowGravity = false;
        ball.body.setBounce(1, 1);
        ball.body.setCollideWorldBounds(true);
        ball.visible = false; // Hide ball until game starts

        // Create visible walls
        const topWall = this.add.rectangle(400, 5, 800, 10, 0xffffff);
        const bottomWall = this.add.rectangle(400, 595, 800, 10, 0xffffff);
        const leftWall = this.add.rectangle(5, 300, 10, 600, 0xff0000);
        const rightWall = this.add.rectangle(795, 300, 10, 600, 0xff0000);
        
        // Enable physics for walls
        this.physics.world.enable([topWall, bottomWall, leftWall, rightWall]);
        [topWall, bottomWall, leftWall, rightWall].forEach(wall => {
            wall.body.immovable = true;
            wall.body.allowGravity = false;
        });

        // Set up collisions
        this.physics.add.collider(ball, player);
        this.physics.add.collider(ball, opponent);
        this.physics.add.collider(ball, topWall);
        this.physics.add.collider(ball, bottomWall);
        this.physics.add.collider(ball, leftWall, () => this.handleScore('right'));
        this.physics.add.collider(ball, rightWall, () => this.handleScore('left'));

        // Set up controls
        cursors = this.input.keyboard.createCursorKeys();

        // Add score text
        scoreText = this.add.text(400, 30, '0 - 0', {
            fontSize: '48px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Add waiting text
        this.waitingText = this.add.text(400, 300, 'Waiting for opponent...', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Initialize multiplayer
        this.initMultiplayer();
    }

    initMultiplayer() {
        multiplayerManager.init(this);

        // Handle opponent movement
        multiplayerManager.onOpponentMove = (y) => {
            opponent.y = y;
        };

        // Handle ball sync (only for non-host players)
        multiplayerManager.onBallSync = (ballState) => {
            if (!this.isHost) {
                ball.x = ballState.x;
                ball.y = ballState.y;
                ball.body.setVelocity(ballState.velocityX, ballState.velocityY);
            }
        };

        // Handle score sync
        multiplayerManager.onScoreSync = (score) => {
            scorePlayer = score.left;
            scoreAI = score.right;
            scoreText.setText(`${scorePlayer} - ${scoreAI}`);
        };

        // Handle game start
        multiplayerManager.onGameStart = (position) => {
            this.waitingText.destroy();
            this.isHost = position === 'left';
            this.gameStarted = true;
            ball.visible = true;
            
            if (this.isHost) {
                this.resetBall();
            }
        };

        // Handle player disconnection
        multiplayerManager.onPlayerDisconnected = () => {
            this.waitingText.setText('Opponent disconnected...\nPress Space to find new game');
            this.waitingText.visible = true;
            this.gameStarted = false;
            ball.visible = false;
        };

        // Start looking for a game
        multiplayerManager.findGame();
    }

    handleScore(scorer) {
        if (scorer === 'left') {
            scorePlayer++;
        } else {
            scoreAI++;
        }

        multiplayerManager.sendScoreUpdate({
            left: scorePlayer,
            right: scoreAI
        });

        if (this.isHost) {
            this.resetBall();
        }
    }

    resetBall() {
        ball.setPosition(400, 300);
        const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
        const speed = 300;
        const velocityX = Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1);
        const velocityY = Math.sin(angle) * speed;
        
        ball.body.setVelocity(velocityX, velocityY);

        if (this.isHost) {
            multiplayerManager.sendBallUpdate({
                x: ball.x,
                y: ball.y,
                velocityX: ball.body.velocity.x,
                velocityY: ball.body.velocity.y
            });
        }
    }

    update() {
        if (!this.gameStarted) {
            if (cursors.space.isDown) {
                multiplayerManager.findGame();
                this.waitingText.setText('Waiting for opponent...');
            }
            return;
        }

        // Player paddle movement
        if (cursors.up.isDown) {
            player.body.setVelocityY(-400);
        } else if (cursors.down.isDown) {
            player.body.setVelocityY(400);
        } else {
            player.body.setVelocityY(0);
        }

        // Keep paddles within bounds
        if (player.y < 65) player.y = 65;
        if (player.y > 535) player.y = 535;
        if (opponent.y < 65) opponent.y = 65;
        if (opponent.y > 535) opponent.y = 535;

        // Send paddle position to opponent
        multiplayerManager.sendPaddleMove(player.y);

        // Host syncs ball position
        if (this.isHost) {
            multiplayerManager.sendBallUpdate({
                x: ball.x,
                y: ball.y,
                velocityX: ball.body.velocity.x,
                velocityY: ball.body.velocity.y
            });
        }

        // Update score display
        scoreText.setText(`${scorePlayer} - ${scoreAI}`);
    }
}

export const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            checkCollision: {
                up: true,
                down: true,
                left: true,
                right: true
            }
        }
    },
    scene: MainScene
};

// Global variables
let player;
let opponent;
let ball;
let cursors;
let scorePlayer = 0;
let scoreAI = 0;
let scoreText;

// Initialize the game
const game = new Phaser.Game(config); 