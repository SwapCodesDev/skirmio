export class Weapon {
    constructor(scene, player, config) {
        this.scene = scene;
        this.player = player;
        this.config = config || {
            name: 'Pistol',
            fireRate: 400,
            damage: 10,
            speed: 800,
            color: 0xffff00
        };
        this.lastFired = 0;

        // Ensure Bullet Texture Exists
        if (!scene.textures.exists('bullet')) {
            const g = scene.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 4, 4);
            g.generateTexture('bullet', 4, 4);
            g.destroy();
        }

        // Projectile Group
        this.projectiles = scene.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 50
        });
    }

    fire(time) {
        if (time - this.lastFired < this.config.fireRate) return;
        this.lastFired = time;

        const matrix = this.player.hand.getWorldTransformMatrix();
        const worldX = matrix.tx;
        const worldY = matrix.ty;

        // Single Source of Truth for Angle
        const angle = this.player.aimAngle;

        const muzzleLength = 40;
        const dx = Math.cos(angle) * muzzleLength;
        const dy = Math.sin(angle) * muzzleLength;

        const bullet = this.projectiles.get(worldX + dx, worldY + dy);
        if (!bullet) return;

        bullet.setActive(true).setVisible(true);
        bullet.body.setAllowGravity(false);
        bullet.body.setSize(4, 4);

        // World Bounds Kill
        bullet.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;

        // One-time listener for this bullet instance (or could be global, but this ensures it works per bullet)
        if (!bullet.hasWorldBoundsListener) {
            bullet.body.world.on('worldbounds', (body) => {
                if (body.gameObject === bullet) {
                    this.killBullet(bullet);
                }
            });
            bullet.hasWorldBoundsListener = true;
        }

        this.scene.physics.velocityFromRotation(
            angle,
            this.config.speed,
            bullet.body.velocity
        );

        if (bullet.lifeTimer) bullet.lifeTimer.remove();
        bullet.lifeTimer = this.scene.time.delayedCall(2500, () => {
            this.killBullet(bullet);
        });

        // Apply Visual Recoil
        if (this.player.hand && typeof this.player.hand.recoil !== 'undefined') {
            this.player.hand.recoil = -6;
        }

        this.player.socket?.emit('shoot', {
            x: worldX,
            y: worldY,
            angle,
            type: this.config.name
        });
    }

    killBullet(bullet) {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop();
        if (bullet.lifeTimer) {
            bullet.lifeTimer.remove();
            bullet.lifeTimer = null;
        }
    }
}
