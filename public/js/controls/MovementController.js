export class MovementController {
    static update(entity, input, delta) {
        if (!entity.body) return;

        // Ground Check (Update entity state)
        entity.onGround = entity.body.blocked.down;

        // 1. Horizontal Movement
        let targetVX = 0;
        const speed = entity.moveSpeed || 220; // Default fallback

        if (input.left) targetVX -= speed;
        if (input.right) targetVX += speed;

        // Smooth Acceleration / Friction
        // Ground = sharp control (0.2), Air = floaty (0.08)
        const lerpFactor = entity.onGround ? 0.2 : 0.08;

        entity.body.velocity.x = Phaser.Math.Linear(
            entity.body.velocity.x,
            targetVX,
            lerpFactor
        );

        // 2. Jump
        if (input.jump && entity.onGround) {
            const jumpForce = entity.jumpForce || -450;
            entity.body.setVelocityY(jumpForce);
            entity.onGround = false;
        }

        // 3. Soft Bounds (Optional constraints)
        this.applyBounds(entity);
    }

    static applyBounds(entity) {
        // Use body.x (physics position)
        if (entity.body.x < 50) {
            entity.body.setVelocityX(Math.max(entity.body.velocity.x, 10));
        }
        if (entity.body.x > 1950) {
            entity.body.setVelocityX(Math.min(entity.body.velocity.x, -10));
        }
        if (entity.body.y < 0) {
            entity.body.setVelocityY(Math.max(entity.body.velocity.y, 50));
        }
    }
}
