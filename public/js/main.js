import { MenuUI } from './ui/MenuUI.js';
import { GameScene } from './game.js';

const socket = io();
const menu = new MenuUI(socket);


const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);



menu.onStartGame = (roomData) => {
    console.log("Main.js: Starting Game Scene");

    document.getElementById('ui-layer').classList.add('hidden-during-game');

    document.getElementById('ui-layer').classList.add('hidden-during-game');


    document.querySelectorAll('.panel').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });


    game.scene.start('GameScene', {
        socket: socket,
        roomName: roomData.name,
        players: roomData.players,
        map: roomData.map
    });
};


window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});


window.game = game;
window.socket = socket;
