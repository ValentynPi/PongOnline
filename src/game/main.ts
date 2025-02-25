import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { PongGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { OnlineLobby } from './scenes/OnlineLobby';
import { BotGame } from './scenes/BotGame';
import { OnlineGame } from './scenes/OnlineGame';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x:0, y: 0 },
            debug: false
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        PongGame,
        BotGame,
        OnlineGame,
        GameOver,
        OnlineLobby
    ]
};

// For debugging
console.log('Available scenes:', [Boot, Preloader, MainMenu, PongGame, BotGame, OnlineGame, GameOver, OnlineLobby].map(scene => scene.name));

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;

