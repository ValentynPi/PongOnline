import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super({ key: 'Boot' });
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/bg.png');
    }

    create ()
    {
        // Configure physics
        this.physics.world.setBounds(0, 0, 800, 600);
        this.physics.world.setBoundsCollision(false, false, true, true);

        // Set background color
        this.cameras.main.setBackgroundColor('#000000');

        // Move to the main menu
        this.scene.start('MainMenu');
    }
}
