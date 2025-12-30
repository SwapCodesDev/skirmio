import { CharacterController } from '../controls/CharacterController.js';
import { FXController } from '../controls/FXController.js';

export class RemotePlayer {
    constructor(scene, id, x, y, color, username) {
        this.scene = scene;
        this.id = id;
        this.username = username || 'Player';
        this.maxHealth = 100;
        this.health = 100;
        this.color = color;

        // Visuals
        this.container = scene.add.container(x, y);

        // Name Tag
        this.nameText = scene.add.text(0, -70, this.username, {
            fontSize: '14px',
            fontFamily: 'Outfit, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.container.add(this.nameText);

        // Health Bar
        this.healthBar = scene.add.graphics();
        this.container.add(this.healthBar);
        this.updateHealthBar();

        // Character Visuals
        const visuals = CharacterController.createVisuals(scene, color);
        visuals.container.y = 0;
        this.container.add(visuals.container);
        this.hand = visuals.handContainer;
        this.legs = visuals.legs;
        this.pupils = visuals.pupils;

        // Physics Sprite (Invisible, for collisions only)
        // Replaces Container physics which is unstable
        this.sprite = scene.physics.add.sprite(x, y, null);
        this.sprite.setVisible(false);
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setSize(24, 80); // Match Player.js size
        this.sprite.body.setOffset(0, -32);
        this.sprite.setData('id', id); // Logic often checks sprite data

        // Interpolation Targets
        this.targetX = x;
        this.targetY = y;
        this.targetRotation = 0;

        // State
        this.jetpackState = 0;
        this.prevJetpackState = 0;
        this.lastHealthData = 100;

        // FX
        this.thruster = FXController.createJetpackEmitter(scene);
    }

    updateState(data) {
        // Validation: Verify data integrity before applying
        if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return;

        this.targetX = data.x;
        this.targetY = data.y;

        if (Number.isFinite(data.rotation)) {
            // Shortest angle interpolation could go here, but direct set for aim is usually fine
            // We'll interpolate in update() if we want super smooth, but aim is usually snappy
            this.targetRotation = data.rotation;
        }

        if (typeof data.scaleX === 'number') {
            this.container.scaleX = data.scaleX;
            this.fixTextOrientation();
        }

        if (typeof data.jetpackState === 'number') {
            this.jetpackState = data.jetpackState;
        }
    }

    update(time, delta) {
        // 1. Interpolate Position
        const t = 0.2; // Interpolation factor (tunable)
        this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, t);
        this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, t);

        // Sync physics sprite to visual container (or vice-versa, but here server drives visual target)
        this.sprite.setPosition(this.container.x, this.container.y);

        // 2. Interpolate Rotation
        this.hand.setRotation(Phaser.Math.Linear(this.hand.rotation, this.targetRotation, t));

        // 3. Visuals & FX
        this.animateVisuals(time);

        // Jetpack Particles (Throttled by update loop naturally, logic handles state)
        // Using FXController shared logic
        if (this.jetpackState !== 0) {
            FXController.emitJetpackParticles(this.thruster, this, this.jetpackState);
        }
    }

    animateVisuals(time) {
        // Leg movement based on velocity or position delta
        const dx = this.targetX - this.container.x;
        const isMoving = Math.abs(dx) > 1;
        const isFlying = this.jetpackState !== 0;

        if (isFlying) {
            this.legs.left.rotation = Phaser.Math.Linear(this.legs.left.rotation, 0.2, 0.1);
            this.legs.right.rotation = Phaser.Math.Linear(this.legs.right.rotation, 0.4, 0.1);
        } else if (isMoving) {
            const walkSpeed = 0.015;
            this.legs.left.rotation = Math.sin(time * walkSpeed) * 0.4;
            this.legs.right.rotation = Math.sin(time * walkSpeed + Math.PI) * 0.4;
        } else {
            this.legs.left.rotation = Phaser.Math.Linear(this.legs.left.rotation, 0, 0.2);
            this.legs.right.rotation = Phaser.Math.Linear(this.legs.right.rotation, 0, 0.2);
        }
    }

    fixTextOrientation() {
        const scale = this.container.scaleX;
        this.nameText.setScale(scale, 1);
        this.healthBar.setScale(scale, 1);
    }

    updateHealth(newHealth) {
        if (this.health === newHealth) return;
        this.health = newHealth;
        this.updateHealthBar();
    }

    updateHealthBar() {
        this.healthBar.clear();
        const width = 40;
        const height = 4;
        const x = -20;
        const y = -60;

        // Background
        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(x, y, width, height);

        // Health
        const healthPct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const color = healthPct > 0.5 ? 0x00ff00 : (healthPct > 0.25 ? 0xffff00 : 0xff0000);

        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRect(x, y, width * healthPct, height);
    }

    fire(data) {
        // Use pooling from GameScene
        const projectiles = this.scene.enemyProjectiles;
        if (!projectiles) return;

        // Get a bullet from the pool
        const bullet = projectiles.get(data.x, data.y);
        if (!bullet) return;

        bullet.setActive(true).setVisible(true);
        bullet.body.setAllowGravity(false);
        bullet.body.setSize(8, 8); // Slightly larger hit box for enemies? or standard?
        bullet.body.reset(data.x, data.y);

        // Visuals
        // If the pool instantiates raw Images/Sprites, we might need to set texture
        if (!bullet.texture || bullet.texture.key === '__default') {
            bullet.setTexture('bullet');
        }

        // Velocity
        this.scene.physics.velocityFromRotation(data.angle, 800, bullet.body.velocity);

        // Auto-kill logic for remote bullets
        // If we want to be safe, adding a timer similar to Weapon.js
        this.scene.time.delayedCall(2000, () => {
            if (bullet.active) {
                // If using groupkill, use kill/hide
                projectiles.killAndHide(bullet);
                bullet.body.stop();
            }
        });
    }

    destroy() {
        // Proper cleanup of all components
        if (this.thruster) this.thruster.destroy();
        if (this.nameText) this.nameText.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.container) this.container.destroy();
        if (this.sprite) this.sprite.destroy();
    }
}
