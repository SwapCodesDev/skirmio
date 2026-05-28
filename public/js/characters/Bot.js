import { CharacterController } from '../controls/CharacterController.js';
import { JetpackController, JetpackState } from '../controls/JetpackController.js';

const BotState = {
    IDLE: 0,
    CHASE: 1,
    ATTACK: 2,
    EVADE: 3,
    RECOVER: 4
};

export class Bot {
    constructor(scene, id, x, y, color, physicsGroup) {
        this.scene = scene;
        this.id = id;
        this.username = 'Operative Bot';
        this.maxHealth = 100;
        this.health = 100;
        this.color = color;


        this.container = scene.add.container(x, y);


        this.nameText = scene.add.text(0, -70, '', {
            fontSize: '13px',
            fontFamily: 'Outfit, sans-serif'
        });
        this.nameText.setVisible(false);
        this.container.add(this.nameText);


        this.healthBar = scene.add.graphics();
        this.container.add(this.healthBar);
        this.updateHealthBar();


        const customVisuals = {
            head: { shape: 'human', color: '#ffe0bd' },
            hair: { style: 'short', color: '#4a4a4a' },
            eyes: { style: 'angry', color: '#ff0000' },
            eyebrows: { style: 'angry', color: '#000000' },
            mouth: { style: 'neutral', color: '#000000' },
            glasses: { style: 'none', color: '#333333' },
            shirt: { style: 'tactical', color: '#3b5235' },
            pants: { style: 'standard', color: '#333333' },
            boots: { style: 'heavy', color: '#111111' },
            helmet: { style: 'tactical', color: '#3a4a35' },
            gloves: { style: 'tactical', color: '#222222' }
        };

        const visuals = CharacterController.createVisuals(scene, customVisuals);
        visuals.container.y = 0;
        this.container.add(visuals.container);
        this.hand = visuals.handContainer;
        this.legs = visuals.legs;
        this.pupils = visuals.pupils;


        this.sprite = scene.physics.add.sprite(x, y, null);
        if (physicsGroup) {
            physicsGroup.add(this.sprite);
        }
        this.sprite.setVisible(false);
        this.body = this.sprite.body;


        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(600);
        this.body.setAllowGravity(true);
        this.body.setSize(24, 80);
        this.body.setOffset(0, -32);
        this.body.setImmovable(false);
        this.body.moves = true;
        this.sprite.setData('id', id);


        scene.physics.add.collider(this.sprite, scene.platforms);


        this.isBot = true;
        this.state = BotState.CHASE;
        this.jetpackMode = JetpackState.OFF;

        this.perception = {
            dist: 1000,
            hasLOS: false,
            verticalAdvantage: 0,
            targetAbove: false,
            targetBelow: false,
            lastUpdate: 0
        };


        this.nextDecisionTime = 0;
        this.stateLockUntil = 0;
        this.shootCooldown = 0;
        this.fireBurstRemaining = 0;


        this.fuel = 80;
        this.maxFuel = 80;
        this.lastJetpackTime = 0;
        this.lastAimAngle = 0;
        this.aimAccuracy = 0.90;

        this.targetOffsetX = Phaser.Math.Between(-30, 30);
        this.targetOffsetY = Phaser.Math.Between(-50, 0);

        this.lastX = x;
        this.lastY = y;
        this.stuckTimer = 0;
        this.isStuck = false;
        this.intendedMoveX = 0;

        this.aggression = Phaser.Math.FloatBetween(0.7, 1.0);
        this.bravery = Phaser.Math.FloatBetween(0.6, 0.9);
        this.reactionSpeed = Phaser.Math.Between(200, 350);


        let pKey = 'bullet';
        if (!scene.textures.exists(pKey)) pKey = 'tile_rock';
        this.thruster = scene.add.particles(0, 0, pKey, {
            lifespan: 200,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            speed: 100,
            angle: { min: 80, max: 100 },
            tint: 0xffaa00,
            blendMode: 'ADD',
            emitting: false
        });
    }

    update(time, delta) {
        this.syncVisualsToPhysics();
    }

    syncVisualsToPhysics() {
        if (!this.body) return;
        this.container.setPosition(this.sprite.x, this.sprite.y);
    }

    updateAI(time, delta, target, enemies) {
        if (!target || !target.active || !this.body) return;

        if (!this.lastLogTime) this.lastLogTime = 0;
        if (time > this.lastLogTime + 1000) {
            console.log(`[BOT ${this.id}] Pos: (${Math.round(this.sprite.x)}, ${Math.round(this.sprite.y)}), State: ${this.state}, Jetpack: ${this.jetpackMode}, Fuel: ${Math.round(this.fuel)}, Stuck: ${this.isStuck}, Grounded: ${this.body.blocked.down}, TargetDist: ${Math.round(this.perception.dist)}, HasLOS: ${this.perception.hasLOS}`);
            this.lastLogTime = time;
        }


        if (time > this.perception.lastUpdate + 100) {
            this.updatePerception(target);
            this.perception.lastUpdate = time;
        }

        this.updateStuckCheck(delta);


        if (time > this.nextDecisionTime && time > this.stateLockUntil) {
            this.decideState();
            this.nextDecisionTime = time + this.reactionSpeed;
        }


        if (this.state === BotState.RECOVER) {
            this.fuel = Math.min(this.maxFuel, this.fuel + delta * 0.05);
        }

        this.executeMovement(target, delta);
        this.updateCombat(time, target);


        JetpackController.update(this, this.jetpackMode, delta, time);

        this.applySoftBounds();
        this.animateVisuals(time);
    }

    updatePerception(target) {
        this.perception.dist = Phaser.Math.Distance.Between(this.container.x, this.container.y, target.x, target.y);
        this.perception.hasLOS = this.checkLineOfSight(target);
        this.perception.verticalAdvantage = this.container.y - target.y;

        this.perception.targetAbove = target.y < this.container.y - 80;
        this.perception.targetBelow = target.y > this.container.y + 80;
    }

    decideState() {

        if (this.state === BotState.RECOVER) {
            if (!this.body.blocked.down) {
                return;
            }
            if (this.fuel >= this.maxFuel * 0.95) {

                this.changeState(BotState.CHASE);
                return;
            }
        }


        if (this.fuel < 15) {
            this.changeState(BotState.RECOVER);
            return;
        }


        if (this.health < 30 && this.perception.dist < 400 && this.state !== BotState.EVADE) {
            this.changeState(BotState.EVADE);
            return;
        }

        let bestState = BotState.CHASE;
        let bestScore = 0.2;

        const attackScore = this.scoreAttack();
        if (attackScore > bestScore) {
            bestScore = attackScore;
            bestState = BotState.ATTACK;
        }

        this.changeState(bestState);
    }

    changeState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateLockUntil = this.scene.time.now + Phaser.Math.Between(400, 800);
    }

    scoreAttack() {
        if (!this.perception.hasLOS) return 0;

        if (this.perception.dist < 800) return 0.9 * this.aggression;
        return 0.1;
    }

    executeMovement(target, delta) {
        let moveX = 0;
        let nextJetpackMode = JetpackState.OFF;

        const targetX = target.x + this.targetOffsetX;
        const dx = targetX - this.container.x;
        const dy = (target.y + this.targetOffsetY) - this.container.y;

        switch (this.state) {
            case BotState.CHASE:

                moveX = dx > 0 ? 170 : -170;


                const needsToClimb = (dy < -80) || this.body.blocked.left || this.body.blocked.right || this.isStuck;
                if (needsToClimb && !this.body.blocked.up && this.fuel > 15) {
                    nextJetpackMode = JetpackState.TAP;
                }
                break;

            case BotState.ATTACK:

                if (this.perception.dist > 350) {

                    moveX = dx > 0 ? 150 : -150;
                } else if (this.perception.dist < 150) {

                    moveX = dx > 0 ? -110 : 110;
                } else {

                    moveX = 0;
                }


                if (dy < -100 && this.fuel > 15 && !this.body.blocked.up) {
                    nextJetpackMode = JetpackState.BURST;
                } else if (this.perception.dist < 250 && !this.body.blocked.down && this.fuel > 15 && Math.abs(dy) < 100) {
                    nextJetpackMode = JetpackState.HOVER;
                }
                break;

            case BotState.EVADE:

                moveX = dx > 0 ? -190 : 190;
                if (!this.body.blocked.up && this.fuel > 15) {
                    nextJetpackMode = JetpackState.BURST;
                }
                break;

            case BotState.RECOVER:

                nextJetpackMode = JetpackState.OFF;
                const mapCenter = this.scene.physics.world.bounds.centerX;
                moveX = this.container.x < mapCenter ? 90 : -90;
                break;
        }


        if (this.state !== BotState.RECOVER && this.state !== BotState.EVADE && dy > 80 && this.body.blocked.down && Math.abs(dx) < 150) {
            if (!this.descentDir) {
                this.descentDir = Math.random() < 0.5 ? 1 : -1;
            }
            moveX = this.descentDir * 150;


            if (this.descentDir > 0 && this.body.blocked.right) {
                this.descentDir = -1;
            } else if (this.descentDir < 0 && this.body.blocked.left) {
                this.descentDir = 1;
            }
        } else {
            this.descentDir = null;
        }


        if (moveX !== 0) {
            this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, moveX, 0.12);
            if ((moveX > 0 && this.body.blocked.right) || (moveX < 0 && this.body.blocked.left)) {
                this.body.velocity.x = 0;
            }
            this.container.scaleX = moveX > 0 ? 1 : -1;
            this.healthBar.setScale(this.container.scaleX, 1);
        } else {
            this.body.velocity.x *= 0.82;
        }


        if (this.container.y > 1500 && this.fuel > 0) nextJetpackMode = JetpackState.BURST;


        if (this.state !== BotState.RECOVER && this.isStuck && this.fuel > 15 && !this.body.blocked.up) {
            nextJetpackMode = JetpackState.BURST;
        }


        if (this.fuel <= 0) nextJetpackMode = JetpackState.OFF;

        this.jetpackMode = nextJetpackMode;
        this.intendedMoveX = moveX;


        if (this.jetpackMode !== JetpackState.OFF && this.fuel > 0) {
            const tint = (this.jetpackMode === JetpackState.BURST) ? 0xff4500 : 0xffaa00;
            this.thruster.particleTint = tint;
            if (!this.thruster.emitting) this.thruster.start();
            this.thruster.setPosition(this.container.x, this.container.y + 24);
        } else {
            if (this.thruster.emitting) this.thruster.stop();
        }
    }

    updateCombat(time, target) {
        this.aimContainer(target);

        if (this.fireBurstRemaining > 0) {
            if (time > this.shootCooldown) {
                this.fireAtTarget();
                this.shootCooldown = time + 110;
                this.fireBurstRemaining--;
            }
        } else {
            if (this.perception.hasLOS && this.perception.dist < 800) {
                if (time > this.shootCooldown) {
                    this.fireBurstRemaining = Phaser.Math.Between(2, 5);
                    this.shootCooldown = time + Phaser.Math.Between(500, 1000);
                }
            }
        }
    }

    updateStuckCheck(delta) {
        const movedDist = Phaser.Math.Distance.Between(this.container.x, this.container.y, this.lastX, this.lastY);
        const isTryingToMove = (this.intendedMoveX !== undefined && this.intendedMoveX !== 0);

        if (isTryingToMove && movedDist < 1) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 1000) this.isStuck = true;
        } else {
            this.stuckTimer = 0;
            this.isStuck = false;
        }
        this.lastX = this.container.x;
        this.lastY = this.container.y;
    }

    aimContainer(target) {
        if (!target.body) return;


        const leadX = target.body.velocity.x * 0.15;
        const leadY = target.body.velocity.y * 0.10;

        const dx = (target.x + leadX) - this.container.x;
        const dy = (target.y + leadY) - this.container.y;

        let angle = Math.atan2(dy, dx);


        const error = (1 - this.aimAccuracy) * (Math.random() - 0.5);
        angle += error;


        if (this.container.scaleX === -1) {
            this.hand.setRotation(Math.PI - angle);
        } else {
            this.hand.setRotation(angle);
        }
        this.lastAimAngle = angle;
    }

    fireAtTarget() {
        let fireAngle = this.hand.rotation;
        if (this.container.scaleX === -1) {
            fireAngle = Math.PI - fireAngle;
        }


        const muzzleLength = 30;
        const bx = this.container.x + Math.cos(fireAngle) * muzzleLength;
        const by = this.container.y + Math.sin(fireAngle) * muzzleLength;

        this.fire({
            x: bx,
            y: by,
            angle: fireAngle
        });
    }

    fire(data) {
        const projectiles = this.scene.enemyProjectiles;
        if (!projectiles) return;

        const bullet = projectiles.get(data.x, data.y);
        if (!bullet) return;

        bullet.setActive(true).setVisible(true);
        bullet.body.setAllowGravity(false);
        bullet.body.setSize(6, 6);
        bullet.body.reset(data.x, data.y);

        if (!bullet.texture || bullet.texture.key === '__default') {
            bullet.setTexture('bullet');
        }


        this.scene.physics.velocityFromRotation(data.angle, 800, bullet.body.velocity);


        this.scene.time.delayedCall(2000, () => {
            if (bullet.active) {
                this.scene.killEnemyBullet(bullet);
            }
        });
    }

    checkLineOfSight(target) {
        if (!target || !this.scene.platforms) return false;

        const start = { x: this.container.x, y: this.container.y - 20 };
        const end = { x: target.x, y: target.y - 20 };

        const line = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
        const platforms = this.scene.platforms.getChildren();
        const lineBounds = Phaser.Geom.Rectangle.FromPoints([start, end]);

        for (let i = 0; i < platforms.length; i++) {
            const platform = platforms[i];
            const bounds = platform.getBounds();

            if (!Phaser.Geom.Intersects.RectangleToRectangle(bounds, lineBounds)) {
                continue;
            }
            const shrunkBounds = new Phaser.Geom.Rectangle(
                bounds.x + 2,
                bounds.y + 2,
                bounds.width - 4,
                bounds.height - 4
            );

            if (Phaser.Geom.Intersects.LineToRectangle(line, shrunkBounds)) {
                return false;
            }
        }
        return true;
    }

    applySoftBounds() {
        const bounds = this.scene.physics.world.bounds;
        if (this.container.x < bounds.x + 50) {
            this.body.setVelocityX(Math.max(this.body.velocity.x, 10));
        }
        if (this.container.x > bounds.right - 50) {
            this.body.setVelocityX(Math.min(this.body.velocity.x, -10));
        }
    }

    animateVisuals(time) {
        if (this.hand.recoil) {
            this.hand.x = 8 + this.hand.recoil;
            this.hand.recoil *= 0.8;
            if (Math.abs(this.hand.recoil) < 0.1) this.hand.recoil = 0;
        }

        const isFlying = this.jetpackMode !== JetpackState.OFF;
        const isMoving = Math.abs(this.body.velocity.x) > 10;

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

        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(x, y, width, height);

        const healthPct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const color = healthPct > 0.5 ? 0x2ed573 : (healthPct > 0.25 ? 0xffa502 : 0xff4757);

        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRect(x, y, width * healthPct, height);
    }

    destroy() {
        if (this.thruster) this.thruster.destroy();
        if (this.nameText) this.nameText.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.container) this.container.destroy();
        if (this.sprite) this.sprite.destroy();
    }
}
