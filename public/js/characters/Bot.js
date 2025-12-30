import { RemotePlayer } from './RemotePlayer.js';
import { JetpackController, JetpackState } from '../controls/JetpackController.js';

const BotState = {
    CHASE: 0,
    ATTACK: 1,
    EVADE: 2,
    REPOSITION: 3,
    RECOVER: 4
};

export class Bot extends RemotePlayer {
    constructor(scene, id, x, y, color) {
        super(scene, id, x, y, color, 'Bot');

        this.sprite.setVisible(false);
        this.body = this.sprite.body;
        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(600);
        this.body.setAllowGravity(true);
        this.body.setSize(24, 80);
        this.body.setOffset(0, -32);
        this.body.setImmovable(false);
        this.body.moves = true;

        this.scene.physics.add.collider(this.sprite, this.scene.platforms);

        this.isBot = true;
        this.state = BotState.CHASE;
        this.jetpackMode = JetpackState.OFF;

        this.perception = {
            hasLOS: false,
            dist: 1000,
            verticalAdvantage: 0,
            targetAbove: false,
            targetBelow: false,
            underFire: false,
            lastUpdate: 0
        };

        this.nextDecisionTime = 0;
        this.stateLockUntil = 0;
        this.shootCooldown = 0;
        this.fireBurstRemaining = 0;

        // Stats
        this.fuel = 80;
        this.maxFuel = 80;
        this.lastJetpackTime = 0;
        this.lastAimAngle = 0;

        this.targetOffsetX = Phaser.Math.Between(-80, 80);
        this.targetOffsetY = Phaser.Math.Between(-100, 0);

        this.lastX = x;
        this.lastY = y;
        this.stuckTimer = 0;
        this.isStuck = false;
        this.separationForce = 0;

        this.aggression = Phaser.Math.FloatBetween(0.4, 1.0);
        this.bravery = Phaser.Math.FloatBetween(0.2, 0.9);
        this.jetpackSkill = Phaser.Math.FloatBetween(0.5, 1.0);
        this.reactionSpeed = Phaser.Math.Between(200, 400);
        this.aimAccuracy = 0.9;

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
        this.container.setPosition(this.sprite.x, this.sprite.y);
    }

    updateAI(time, delta, target, enemies) {
        if (!target || !target.active || !this.body) return;

        if (time > this.perception.lastUpdate + 100) {
            this.updatePerception(target);
            this.perception.lastUpdate = time;
        }

        this.updateStuckCheck(delta);

        this.updateSeparation(enemies);

        if (time > this.nextDecisionTime && time > this.stateLockUntil) {
            this.decideState();
            this.nextDecisionTime = time + this.reactionSpeed;
        }

        // Logic Fix: Regenerate fuel when in RECOVER state
        if (this.state === BotState.RECOVER) {
            this.fuel = Math.min(this.maxFuel, this.fuel + delta * 0.05); // Recharge rate

            // Exit RECOVER if we have enough fuel and are on ground
            if (this.fuel > this.maxFuel * 0.6 && this.body.blocked.down) {
                this.changeState(BotState.CHASE);
            }
        }

        this.executeMovement(target, delta);
        this.updateCombat(time, target);

        if (this.jetpackMode !== JetpackState.OFF && this.fuel > 0) {
            JetpackController.update(this, this.jetpackMode, delta, time);
        } else {
            this.body.setAllowGravity(true);
            this.body.setAccelerationY(0);
            this.body.setAccelerationY(this.body.gravity.y || 600);

            if (this.body.velocity.y < 0 && !this.body.blocked.down) {
                this.body.velocity.y += 20;
            }
        }

        if (
            this.jetpackMode === JetpackState.OFF &&
            !this.body.blocked.down &&
            Math.abs(this.body.velocity.y) < 5
        ) {
            this.body.velocity.y = 50;
        }

        this.applySoftBounds();

        this.animateVisuals(time);
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

    updatePerception(target) {
        this.perception.dist = Phaser.Math.Distance.Between(this.container.x, this.container.y, target.x, target.y);
        this.perception.hasLOS = this.checkLineOfSight(target);
        this.perception.verticalAdvantage = this.container.y - target.y;

        this.perception.targetAbove = target.y < this.container.y - 80;
        this.perception.targetBelow = target.y > this.container.y + 80;
    }

    decideState() {
        if (!this.body.blocked.down && this.fuel < 15) {
            this.changeState(BotState.RECOVER);
            return;
        }

        let bestState = BotState.CHASE;
        let bestScore = 0.3;

        const attackScore = this.scoreAttack();
        if (attackScore > bestScore) {
            bestScore = attackScore;
            bestState = BotState.ATTACK;
        }

        const evadeScore = this.scoreEvade();
        if (evadeScore > bestScore) {
            bestScore = evadeScore;
            bestState = BotState.EVADE;
        }

        const repositionScore = this.scoreReposition();
        if (repositionScore > bestScore) {
            bestScore = repositionScore;
            bestState = BotState.REPOSITION;
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
        const distScore = Phaser.Math.Clamp(1 - (this.perception.dist / 800), 0, 1);
        return distScore * this.aggression;
    }

    scoreEvade() {
        if (this.perception.dist < 200) return 1.0 - this.bravery;
        return 0.1;
    }

    scoreReposition() {
        if (this.perception.targetAbove) return 0.6;
        return 0.2;
    }

    executeMovement(target, delta) {
        let moveX = 0;
        let nextJetpackMode = JetpackState.OFF;

        const targetX = target.x + this.targetOffsetX;
        const dx = targetX - this.container.x;
        const dy = (target.y + this.targetOffsetY) - this.container.y;

        switch (this.state) {
            case BotState.CHASE:
                const FAR_DISTANCE = 600;

                if (this.perception.dist > FAR_DISTANCE) {
                    // Long-range Pursuit Behavior: Aggressively seek target
                    moveX = dx > 0 ? 180 : -180;

                    // Use jetpack to cross terrain even if dy is small
                    if (!this.body.blocked.up && this.fuel > 30) {
                        nextJetpackMode = JetpackState.TAP;
                    }
                } else {
                    // Standard short-range chase
                    if (dx > 20) moveX = 150;
                    else if (dx < -20) moveX = -150;

                    if (this.shouldClimb(dy)) {
                        nextJetpackMode = this.chooseJetpackMode();
                    }
                }
                break;

            case BotState.ATTACK:
                if (this.perception.dist < 150) moveX = dx > 0 ? -150 : 150;
                else moveX = dx > 0 ? 100 : -100;

                if (this.perception.targetAbove && this.fuel > 20) {
                    nextJetpackMode = JetpackState.BURST;
                } else if (this.perception.targetBelow && dy > 150) {
                    nextJetpackMode = JetpackState.OFF; // Drop
                } else if (
                    !this.body.blocked.down &&
                    this.fuel > 40 &&
                    this.perception.hasLOS &&
                    Math.abs(dy) < 120
                ) {
                    nextJetpackMode = JetpackState.HOVER;
                }
                break;

            case BotState.EVADE:
                moveX = dx > 0 ? -200 : 200;
                if (!this.body.blocked.up && this.fuel > 10) nextJetpackMode = JetpackState.BURST;
                break;

            case BotState.REPOSITION:
                moveX = dx > 0 ? 150 : -150;
                if (!this.body.blocked.up && this.fuel > 20) nextJetpackMode = JetpackState.BURST;
                break;

            case BotState.RECOVER:
                const mapCenter = this.scene.physics.world.bounds.centerX;
                moveX = this.container.x < mapCenter ? 100 : -100;
                break;
        }

        moveX += this.separationForce;

        if (moveX !== 0) {
            this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, moveX, 0.1);

            if ((moveX > 0 && this.body.blocked.right) || (moveX < 0 && this.body.blocked.left)) {
                this.body.velocity.x = 0;
            }
            this.container.scaleX = moveX > 0 ? 1 : -1;
        } else {
            this.body.velocity.x *= 0.85;
        }

        if (this.container.y > 1500 && this.fuel > 0) nextJetpackMode = JetpackState.BURST;

        if (this.isStuck && this.fuel > 5 && !this.body.blocked.up) {
            nextJetpackMode = JetpackState.BURST;
        }

        if (this.fuel <= 0) {
            nextJetpackMode = JetpackState.OFF;
        }

        this.jetpackMode = nextJetpackMode;

        if (this.body.blocked.down) {
            this.body.setAllowGravity(true);
            if (this.jetpackMode === JetpackState.OFF) {
                this.body.velocity.y = Math.max(this.body.velocity.y, 0);
            }
        }

        if (this.jetpackMode !== JetpackState.OFF && this.fuel > 0) {
            const tint = (this.jetpackMode === JetpackState.BURST) ? 0xff4500 : 0xffaa00;
            this.thruster.particleTint = tint;

            if (!this.thruster.emitting) {
                this.thruster.start();
            }

            this.thruster.setPosition(this.container.x, this.container.y + 24);
        } else {
            if (this.thruster.emitting) {
                this.thruster.stop();
            }
        }
    }

    shouldClimb(dy) {
        const isBlockedByWall = this.body.blocked.left || this.body.blocked.right;
        if ((isBlockedByWall || this.isStuck) && !this.body.blocked.up) {
            return this.fuel > 10;
        }
        // Allow climbing with simpler moves if fuel is low but not empty
        return (dy < -100 && this.fuel > 5 && !this.body.blocked.up);
    }

    chooseJetpackMode() {
        if (this.fuel < 20) return JetpackState.TAP; // Conserve fuel
        if (this.jetpackSkill > 0.85 && this.fuel > 40) return JetpackState.BURST;
        return JetpackState.TAP;
    }

    updateCombat(time, target) {
        this.aimContainer(target);
        if (this.fireBurstRemaining > 0) {
            if (time > this.shootCooldown) {
                this.fireAtTarget();
                this.shootCooldown = time + 100;
                this.fireBurstRemaining--;
            }
        } else {
            if (this.perception.hasLOS && this.perception.dist < 800) {
                if (time > this.shootCooldown) {
                    this.fireBurstRemaining = Phaser.Math.Between(2, 5);
                    this.shootCooldown = time + Phaser.Math.Between(400, 1000);
                }
            }
        }
    }

    updateStuckCheck(delta) {
        const movedDist = Phaser.Math.Distance.Between(this.container.x, this.container.y, this.lastX, this.lastY);
        if (movedDist < 1) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 1000) this.isStuck = true;
        } else {
            this.stuckTimer = 0;
            this.isStuck = false;
        }
        this.lastX = this.container.x;
        this.lastY = this.container.y;
    }

    updateSeparation(enemies) {
        this.separationForce = 0;
        if (enemies) {
            const myX = this.container.x;
            const myY = this.container.y;

            enemies.getChildren().forEach(other => {
                if (other === this.sprite) return;

                let otherX = other.x;
                let otherY = other.y;

                if (other.parentContainer) {
                    otherX = other.parentContainer.x + other.x;
                    otherY = other.parentContainer.y + other.y;
                }
                else if (other.type === 'Container') {
                    otherX = other.x;
                    otherY = other.y;
                }

                const d = Phaser.Math.Distance.Between(myX, myY, otherX, otherY);
                if (d < 50) {
                    this.separationForce += (myX < otherX) ? -40 : 40;
                }
            });
        }
    }

    aimContainer(target) {
        if (!target.body) return;

        const leadX = target.body.velocity.x * 0.15;
        const leadY = target.body.velocity.y * 0.1;

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

        if (this.fire) {
            this.fire({
                x: this.container.x,
                y: this.container.y,
                angle: fireAngle
            });
        } else {
        }
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
        if (this.container.y < bounds.y) {
            this.body.setVelocityY(Math.max(this.body.velocity.y, 50));
        }
    }

    destroy() {
        if (this.thruster) this.thruster.destroy();
        super.destroy();
    }
}
