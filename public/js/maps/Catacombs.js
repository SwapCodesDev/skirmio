import { MapBuilder } from '../controls/MapBuilder.js';

export class Catacombs {
    constructor(scene) {
        if (!scene) throw new Error('Catacombs requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        this.layout = [
            // 1. Floor (Uneven)
            [0, 1500, 500, 100],
            [500, 1550, 600, 100],
            [1100, 1500, 900, 100],
            // 2. Ceiling
            [0, 0, 2000, 100],
            [800, 100, 400, 200],
            // 3. Walls & Chambers
            [0, 0, 50, 1600],
            [300, 1200, 300, 40],
            [50, 900, 250, 40],
            [600, 1100, 200, 40],
            [900, 800, 200, 40],
            [1200, 1100, 200, 40],
            [1950, 0, 50, 1600],
            [1600, 1000, 350, 40],
            [1500, 600, 200, 40],
            [800, 1300, 400, 50]
        ];
    }

    create() {
        if (!this.scene.platforms) {
            throw new Error('scene.platforms must be initialized before creating Map');
        }

        this.setupBackground();
        this.createPlatforms();
        this.builder.setupBounds(2000, 1600);

        this.scene.events.once('shutdown', () => this.destroy());
    }

    setupBackground() {
        this.builder.createBackground(1000, 800, 2500, 2000, 'bg_cave', {
            scrollFactor: 0.5,
            tint: 0x888888
        });
    }

    createPlatforms() {
        this.layout.forEach(([x, y, w, h]) => {
            this.builder.createPlatform(x, y, w, h, 'tile_rock');
        });
    }

    destroy() {
        this.builder.cleanup();
    }
}

