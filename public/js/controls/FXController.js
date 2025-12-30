import { JetpackState } from './JetpackController.js';

export class FXController {
    static createJetpackEmitter(scene) {
        // Safe fallback for texture
        let pKey = 'bullet';
        if (!scene.textures.exists(pKey)) pKey = 'tile_rock';

        return scene.add.particles(0, 0, pKey, {
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

    static emitJetpackParticles(emitter, entity, state) {
        if (!emitter || state === JetpackState.OFF) return;

        // Coordinates
        // Depending on entity structure, we need x, y, scaleX
        // Entity could be Player or RemotePlayer
        const container = entity.container;
        if (!container) return;

        const px = container.x;
        const py = container.y;
        const facing = container.scaleX;
        const tint = (state === JetpackState.BURST) ? 0xff4500 : 0xffaa00;

        emitter.particleTint = tint;
        emitter.emitParticleAt(px + (-10 * facing), py + 28, 1);
        emitter.emitParticleAt(px + (10 * facing), py + 28, 1);
    }
}
