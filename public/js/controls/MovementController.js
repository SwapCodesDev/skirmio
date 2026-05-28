export class MovementController {
    static update(entity, input, delta) {
        if (!entity.body) return;


        entity.onGround = entity.body.blocked.down;


        let targetVX = 0;
        const speed = entity.moveSpeed || 220;

        if (input.left) targetVX -= speed;
        if (input.right) targetVX += speed;



        const lerpFactor = entity.onGround ? 0.2 : 0.08;

        entity.body.velocity.x = Phaser.Math.Linear(
            entity.body.velocity.x,
            targetVX,
            lerpFactor
        );


        if (input.jump && entity.onGround) {
            const jumpForce = entity.jumpForce || -450;
            entity.body.setVelocityY(jumpForce);
            entity.onGround = false;
        }


        this.applyBounds(entity);
    }

    static applyBounds(entity) {

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
