import { Bot } from './Bot.js';

export class BotManager {
    constructor(scene, {
        maxBots = 3,
        spawnInterval = 3000,
        respawnDelay = 2000
    } = {}) {
        this.scene = scene;
        this.maxBots = maxBots;
        this.spawnInterval = spawnInterval;
        this.respawnDelay = respawnDelay;

        this.bots = scene.physics.add.group();
        this.lastSpawnTime = 0;
    }

    update(time) {
        if (
            time > this.lastSpawnTime + this.spawnInterval &&
            this.bots.countActive(true) < this.maxBots
        ) {
            this.spawnBot();
            this.lastSpawnTime = time;
        }
    }

    spawnBot() {

        const x = Phaser.Math.Between(100, 1800);
        const y = 200;

        const id = 'bot_' + Phaser.Math.RND.uuid();
        const bot = new Bot(this.scene, id, x, y, 0xff0000, this.bots);




        this.scene.remotePlayers[id] = bot;

        bot.sprite.on('destroy', () => {

            delete this.scene.remotePlayers[id];

            this.scene.time.delayedCall(this.respawnDelay, () => {
                if (this.bots.countActive(true) < this.maxBots) {
                    this.spawnBot();
                }
            });
        });
    }
}
