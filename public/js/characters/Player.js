import { Weapon } from '../weapons/Weapon.js';
import { CharacterController } from '../controls/CharacterController.js';
import { JetpackController, JetpackState } from '../controls/JetpackController.js';
import { MovementController } from '../controls/MovementController.js';
import { FXController } from '../controls/FXController.js';

const PLAYER_CONFIG = {
    moveSpeed: 220,
    jumpForce: -450,
    gravity: 600,
    drag: 500,
    bodySize: { w: 24, h: 48 }, // Increased height to cover helmet
    bodyOffset: { x: 0, y: 0 }, // Offset to center relative to 1x1 sprite
    networkRate: 50 // ms (20 Hz)
};

export class Player {
    constructor(scene, x, y, socket, customization) {
        this.scene = scene;
        this.socket = socket;
        this.id = socket.id;

        // 1. Physics Root (Invisible Sprite)
        // Using a sprite ensures proper Arcade Physics behavior vs Containers
        this.sprite = scene.physics.add.sprite(x, y, null);
        this.sprite.setVisible(false);
        this.body = this.sprite.body;

        // Physics Setup
        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(PLAYER_CONFIG.gravity);
        this.body.setDragX(PLAYER_CONFIG.drag);
        this.body.setSize(PLAYER_CONFIG.bodySize.w, PLAYER_CONFIG.bodySize.h);
        this.body.setOffset(PLAYER_CONFIG.bodyOffset.x, PLAYER_CONFIG.bodyOffset.y);


        // 2. Visuals Container
        this.container = scene.add.container(x, y);
        this.createVisuals(customization);

        // State
        this.fuel = 100;
        this.maxFuel = 100;
        this.jetpackState = JetpackState.OFF;
        this.prevJetpackState = JetpackState.OFF;
        this.lastJetpackTime = 0;
        this.lastSyncTime = 0;

        // Input
        this.playerInput = {
            left: false, right: false, up: false, jump: false, fire: false
        };
        this.onGround = false;

        this.setupControls();
        this.weapon = new Weapon(scene, this);
        this.setupParticles();

        // Cleanup hook
        this.scene.events.once('shutdown', () => this.destroy());
    }

    createVisuals(customization) {
        const visuals = CharacterController.createVisuals(this.scene, customization);
        // Align visual center to container center
        visuals.container.y = 0;

        this.container.add(visuals.container);
        this.hand = visuals.handContainer;
        this.legs = visuals.legs;
        this.pupils = visuals.pupils;
    }

    setupControls() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    setupParticles() {
        this.thruster = FXController.createJetpackEmitter(this.scene);
    }

    update(time, delta) {
        if (!this.sprite.active || !this.body) return;

        this.captureInput();

        this.container.x = this.sprite.x;
        this.container.y = this.sprite.y;

        MovementController.update(this, this.playerInput, time);

        this.updateJetpack(delta, time);
        this.handleAiming(time);
        this.syncState(time);
        this.animateVisuals(time);

        this.container.x = Math.floor(this.sprite.x);
        this.container.y = Math.floor(this.sprite.y);

        this.scene.events.emit('player:fuel', this.fuel);
    }

    captureInput() {
        this.playerInput.left = this.cursors.left.isDown || this.wasd.left.isDown;
        this.playerInput.right = this.cursors.right.isDown || this.wasd.right.isDown;
        this.playerInput.up = this.cursors.up.isDown || this.wasd.up.isDown;
        this.playerInput.jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up) || Phaser.Input.Keyboard.JustDown(this.wasd.space);
        this.playerInput.fire = this.scene.input.activePointer.isDown;
        this.playerInput.thrusting = this.playerInput.up || this.wasd.space.isDown;
    }

    updateJetpack(delta, time) {
        let intendedState = JetpackState.OFF;

        if (this.playerInput.thrusting && this.fuel > 0) {
            if (this.fuel < 15) {
                intendedState = JetpackState.TAP;
            } else {
                intendedState = JetpackState.BURST;
                if (this.body.velocity.y < -300) intendedState = JetpackState.HOVER;
            }
        }

        this.jetpackState = JetpackController.update(this, intendedState, delta, time);

        if (this.jetpackState !== JetpackState.OFF) {
            this.emitJetpackParticles();
        }

        if (this.jetpackState === JetpackState.BURST && this.prevJetpackState !== JetpackState.BURST) {
            this.scene.cameras.main.shake(100, 0.003);
        }

        this.prevJetpackState = this.jetpackState;
    }

    emitJetpackParticles() {
        const px = this.container.x;
        const py = this.container.y;
        const facing = this.container.scaleX;
        const tint = (this.jetpackState === JetpackState.BURST) ? 0xff4500 : 0xffaa00;

        this.thruster.particleTint = tint;
        this.thruster.emitParticleAt(px + (-10 * facing), py + 28, 1);
        this.thruster.emitParticleAt(px + (10 * facing), py + 28, 1);
    }

    handleAiming(time) {
        // Aiming relative to container/sprite center
        const pointer = this.scene.input.activePointer;
        const worldPoint = pointer.positionToCamera(this.scene.cameras.main);

        const dx = worldPoint.x - this.container.x;
        const dy = worldPoint.y - this.container.y;
        const angle = Math.atan2(dy, dx);

        // Face correct direction
        this.container.scaleX = dx < 0 ? -1 : 1;

        if (this.container.scaleX === -1) {
            this.hand.setRotation(Math.PI - angle);
        } else {
            this.hand.setRotation(angle);
        }

        this.aimAngle = angle;

        if (this.playerInput.fire) {
            this.weapon.fire(time);
        }
    }

    animateVisuals(time) {
        if (this.hand.recoil) {
            this.hand.x = 8 + this.hand.recoil;
            this.hand.recoil *= 0.8;
            if (Math.abs(this.hand.recoil) < 0.1) this.hand.recoil = 0;
        }

        const isFlying = this.jetpackState !== JetpackState.OFF;
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

        const pupilOffset = 2; // Movement range
        const px = Math.cos(this.aimAngle) * pupilOffset;
        const py = Math.sin(this.aimAngle) * pupilOffset;
        const facing = this.container.scaleX;

        // Side View Pupil Bases: 7 (Rear) and 15 (Front) - see CharacterController
        // Y Base: -3
        if (this.pupils.left && this.pupils.right) {
            this.pupils.left.x = 7 + (px * facing);
            this.pupils.right.x = 15 + (px * facing);
            this.pupils.left.y = -3 + py;
            this.pupils.right.y = -3 + py;
        }
    }

    syncState(time) {
        if (!this.body) return;

        if (time - this.lastSyncTime < PLAYER_CONFIG.networkRate) return;

        this.socket.emit('player_update', {
            x: this.container.x, // Sync VIsual/Physics pos (they are same)
            y: this.container.y,
            rotation: this.hand.rotation,
            scaleX: this.container.scaleX,
            jetpackState: this.jetpackState
        });

        this.lastSyncTime = time;
    }

    respawn(x, y) {
        this.sprite.setPosition(x, y);
        this.container.setPosition(x, y);
        this.fuel = this.maxFuel;
        this.lastJetpackTime = 0;
        this.body.velocity.set(0);

        this.scene.events.emit('player:fuel', 100);
        this.scene.events.emit('player:health', { current: 100, max: 100 });
    }

    destroy() {
        if (this.thruster) this.thruster.destroy();
        if (this.container) this.container.destroy();
        if (this.sprite) this.sprite.destroy();
    }
}
