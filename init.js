import { config } from './game.js';

// Initialize the game
const game = new Phaser.Game(config);

// Update status messages
const statusElement = document.getElementById('status');
window.updateStatus = (message) => {
    statusElement.textContent = message;
}; 