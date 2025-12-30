import { Player } from './characters/Player.js';
import { RemotePlayer } from './characters/RemotePlayer.js';
import { BotManager } from './characters/BotManager.js';
import { MapController } from './controls/MapController.js';
import { HUDManager } from './ui/HUDManager.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.mapController = new MapController(this);
    }

    preload() {
        this.mapController.preload();

        this.load.on('complete', () => {
            if (!this.textures.exists('bullet')) {
                const graphics = this.make.graphics({ x: 0, y: 0, add: false });
                graphics.fillStyle(0xffff00, 1);
                graphics.fillCircle(4, 4, 4);
                graphics.generateTexture('bullet', 8, 8);
            }
        });
    }

    create(data) {
        console.log("GameScene: Created", data);
        if (!data || !data.socket) {
            this.scene.stop();
            return;
        }

        this.hudManager = new HUDManager(this);
        this.mapController.create(data.map || 'outpost');

        this.socket = data.socket;
        this.roomName = data.roomName;

        let customization = {};
        try {
            customization = JSON.parse(localStorage.getItem('mm_customization')) || {};
        } catch (e) { console.error("Failed to load customization", e); }

        if (!customization.shirt) customization.shirt = { color: localStorage.getItem('mm_color') || '#ffffff' };
        this.customization = customization;

        // Setup Player
        this.player = new Player(this, 100, 100, this.socket, this.customization);
        this.physics.add.collider(this.player.sprite, this.platforms);

        this.cameras.main.startFollow(this.player.container);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.setBackgroundColor('#2f3542');

        // Remote Players
        this.remotePlayers = {};
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 100,
            runChildUpdate: false
        });

        this.socket.on('player_health_update', (data) => this.onHealthUpdate(data));
        this.physics.add.overlap(this.player.weapon.projectiles, this.enemies, this.handleHit, null, this);

        this.physics.add.collider(this.player.weapon.projectiles, this.platforms, (bullet, platform) => {
            if (bullet.active) {
                this.createExplosion(bullet.x, bullet.y, 0xffff00);
                this.player.weapon.killBullet(bullet);
            }
        });

        this.physics.add.collider(this.enemyProjectiles, this.platforms, (bullet, platform) => {
            if (bullet.active) {
                this.createExplosion(bullet.x, bullet.y, 0xffff00);
                bullet.destroy();
            }
        });

        this.physics.add.overlap(this.enemyProjectiles, this.player.container, this.handlePlayerHit, null, this);

        this.socket.on('player_joined', (data) => this.addRemotePlayer(data));
        this.socket.on('player_moved', (data) => {
            if (this.remotePlayers[data.id]) this.remotePlayers[data.id].updateState(data);
        });
        this.socket.on('player_left', (id) => {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].destroy();
                delete this.remotePlayers[id];
            }
        });
        this.socket.on('player_shoot', (data) => {
            if (this.remotePlayers[data.id]) this.remotePlayers[data.id].fire(data);
        });

        if (data.players) {
            Object.values(data.players).forEach(p => this.addRemotePlayer(p));
        }

        this.socket.on('player_respawn', (data) => this.handleRespawn(data));
        this.socket.on('score_update', (scores) => this.hudManager.updateScoreboard(scores));

        // Survival Mode Logic - Driven by BotManager
        if (this.roomName && this.roomName.startsWith('Survival')) {
            // Use defaults from BotManager (customized by user)
            this.botManager = new BotManager(this);

            // Add collision overlap for BotManager's group
            this.physics.add.overlap(this.player.weapon.projectiles, this.botManager.bots, this.handleHit, null, this);
        }
    }

    updateBots(time, delta) {
        Object.values(this.remotePlayers).forEach(player => {
            if (player.update) {
                player.update(time, delta);
            }
            if (player.isBot && player.updateAI) {
                const target = this.player && this.player.sprite && this.player.sprite.active ? this.player.sprite : null;
                player.updateAI(time, delta, target, this.enemies);
            }
        });

        if (this.botManager) {
            this.botManager.update(time);
        }
    }

    handleRespawn(data) {
        if (data.id === this.socket.id) {
            this.player.respawn(data.x, data.y);
        } else if (this.remotePlayers[data.id]) {
            this.remotePlayers[data.id].container.x = data.x;
            this.remotePlayers[data.id].container.y = data.y;
        }
    }

    addRemotePlayer(data) {
        if (!data || data.id === this.socket.id) return;
        if (this.remotePlayers[data.id]) return;

        const rp = new RemotePlayer(
            this,
            data.id,
            data.x ?? 100,
            data.y ?? 100,
            data.customization || { shirt: { color: '#ff0000' } },
            data.username
        );

        if (data.rotation !== undefined) {
            rp.hand.setRotation(data.rotation);
        }

        this.remotePlayers[data.id] = rp;
        this.enemies.add(rp.sprite);
    }

    handleHit(projectile, enemyContainer) {
        const targetId = enemyContainer.getData('id');
        if (projectile.active) {
            this.createExplosion(projectile.x, projectile.y, 0xff0000);
            this.player.weapon.killBullet(projectile);

            if (this.remotePlayers[targetId] && this.remotePlayers[targetId].isBot) {
                const bot = this.remotePlayers[targetId];
                bot.health = (bot.health || 100) - 10;
                bot.updateHealth(bot.health);
                if (bot.health <= 0) {
                    bot.destroy();
                    delete this.remotePlayers[targetId];
                    // Removed onBotKilled(), BotManager handles respawn
                }
            } else {
                this.socket.emit('player_hit', { targetId: targetId, damage: 10 });
            }
        }
    }

    handlePlayerHit(playerContainer, bullet) {
        if (!bullet.active) return;
        this.createExplosion(bullet.x, bullet.y, 0xff0000);
        bullet.destroy();
        this.socket.emit('player_hit', { targetId: this.socket.id, damage: 5 });
    }

    createExplosion(x, y, color) {
        if (!this.particleManager) {
            let key = 'bullet';
            if (!this.textures.exists('bullet')) key = 'tile_rock';

            this.particleManager = this.add.particles(0, 0, key, {
                speed: { min: 50, max: 150 },
                scale: { start: 0.4, end: 0 },
                lifespan: 300,
                blendMode: 'ADD',
                emitting: false
            });
        }
        this.particleManager.emitParticleAt(x, y, 8);
    }

    onHealthUpdate(data) {
        if (data.id === this.socket.id) {
            this.hudManager.updateHealth(data.health);
        } else if (this.remotePlayers[data.id]) {
            this.remotePlayers[data.id].updateHealth(data.health);
        }
    }

    update(time, delta) {
        if (this.player) {
            this.player.update(time, delta);
            this.hudManager.updateFuel(this.player.fuel);
        }
        this.updateBots(time, delta);
    }
}
