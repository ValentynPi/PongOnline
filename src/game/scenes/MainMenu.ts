import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor()
    {
        super({ key: 'MainMenu' });
    }

    create(): void
    {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, height / 4, 'PONG', {
            fontSize: '64px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Local Multiplayer Button
        const localButton = this.add.text(width / 2, height / 2, 'Local Multiplayer', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Online Multiplayer Button
        const onlineButton = this.add.text(width / 2, height / 2 + 80, 'Online Multiplayer', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Button hover effects
        [localButton, onlineButton].forEach(button => {
            button.on('pointerover', () => {
                button.setTint(0x00ff00);
            });

            button.on('pointerout', () => {
                button.clearTint();
            });
        });

        // Button click handlers
        localButton.on('pointerdown', () => {
            this.startLocalGame();
        });

        onlineButton.on('pointerdown', () => {
            this.startOnlineGame();
        });
    }

    private startLocalGame(): void
    {
        // Start the regular local multiplayer game
        this.scene.start('Game', { mode: 'local' });
    }

    private startOnlineGame(): void
    {
        // Start the online multiplayer game
        // This will transition to a lobby/connection scene
        this.scene.start('OnlineLobby');
    }
}
