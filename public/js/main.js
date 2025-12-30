import { MenuUI } from './ui/MenuUI.js';
import { GameScene } from './game.js';

const socket = io();
const menu = new MenuUI(socket);

// Game Config
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // We might apply custom gravity or use 500
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);
// Start scene paused or waiting?
// Actually we can pass data to scene start

menu.onStartGame = (roomData) => {
    console.log("Main.js: Starting Game Scene");
    // Switch UI
    document.getElementById('ui-layer').classList.add('hidden-during-game'); // We might want to keep HUD
    // Switch UI
    document.getElementById('ui-layer').classList.add('hidden-during-game');

    // Hide ALL active panels
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });

    // Start Game Scene with data
    game.scene.start('GameScene', {
        socket: socket,
        roomName: roomData.name,
        players: roomData.players,
        map: roomData.map
    });
};

// Resize handler
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

// Expose for debugging
window.game = game;
window.socket = socket;
