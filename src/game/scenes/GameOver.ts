import { Scene } from 'phaser';

export class GameOver extends Scene
{
    private winner: string = '';
    private score: string = '';

    constructor()
    {
        super({ key: 'GameOver' });
    }

    init(data: { winner: string; score: string })
    {
        this.winner = data.winner;
        this.score = data.score;
    }

    create()
    {
        const { width, height } = this.scale;

        // Game Over text
        this.add.text(width / 2, height / 3, 'Game Over!', {
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Winner text
        this.add.text(width / 2, height / 2, `${this.winner} Player Wins!`, {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Score text
        this.add.text(width / 2, height / 2 + 60, `Final Score: ${this.score}`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Return to Menu button
        const menuButton = this.add.text(width / 2, height * 0.7, 'Return to Menu', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Play Again button
        const playAgainButton = this.add.text(width / 2, height * 0.7 + 60, 'Play Again', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        menuButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        playAgainButton.on('pointerdown', () => {
            this.scene.start('Game', { mode: 'local' });
        });

        // Button hover effects
        [menuButton, playAgainButton].forEach(button => {
            button.on('pointerover', () => {
                button.setTint(0x00ff00);
            });

            button.on('pointerout', () => {
                button.clearTint();
            });
        });
    }
}
