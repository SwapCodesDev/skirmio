import { MapBuilder } from '../controls/MapBuilder.js';

export class Outpost {
    constructor(scene) {
        if (!scene) throw new Error('Outpost requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        // Layout Data: [x, y, w, h]
        this.layout = [
            // 1. Ground Floor
            [0, 1400, 2000, 200],
            // 2. Central structure
            [400, 1000, 50, 400],
            [1200, 1000, 50, 400],
            [400, 1200, 300, 40],
            [950, 1200, 300, 40],
            [450, 1000, 800, 40],
            // 3. Floating Platforms
            [100, 1100, 200, 40],
            [1400, 1100, 200, 40],
            [200, 800, 200, 40],
            [1300, 800, 200, 40],
            [730, 600, 250, 40]
        ];
    }

    create() {
        if (!this.scene.platforms) {
            throw new Error('scene.platforms must be initialized before creating Map');
        }

        this.setupBackground();
        this.createPlatforms();
        this.builder.setupBounds(2000, 1600);

        // Cleanup hook
        this.scene.events.once('shutdown', () => this.destroy());
    }

    setupBackground() {
        this.builder.createBackground(1000, 800, 2500, 2000, 'bg_jungle', {
            scrollFactor: 0.5,
            tint: 0xaaaaaa
        });
    }

    createPlatforms() {
        this.layout.forEach(([x, y, w, h]) => {
            this.builder.createPlatform(x, y, w, h, 'tile_metal');
        });
    }

    destroy() {
        this.builder.cleanup();
    }
}

