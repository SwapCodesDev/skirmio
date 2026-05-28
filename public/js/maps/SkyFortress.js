import { MapBuilder } from '../controls/MapBuilder.js';

export class SkyFortress {
    constructor(scene) {
        if (!scene) throw new Error('SkyFortress requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        this.layout = [
            [500, 900, 1000, 40],

            [50, 1150, 400, 30],
            [1550, 1150, 400, 30],

            [150, 750, 350, 30],
            [300, 500, 200, 25],

            [1500, 750, 350, 30],
            [1500, 500, 200, 25],

            [750, 600, 500, 30],

            [900, 350, 200, 30],
            [600, 350, 150, 25],
            [1250, 350, 150, 25]
        ];
    }

    create() {
        if (!this.scene.platforms) {
            throw new Error('scene.platforms must be initialized before creating Map');
        }

        this.setupBackground();
        this.createPlatforms();
        this.builder.setupBounds(2000, 1600);

        this.builder.setSpawnPoints([
            { x: 200, y: 1050 },
            { x: 1800, y: 1050 },
            { x: 1000, y: 800 },
            { x: 1000, y: 500 }
        ]);

        this.scene.mapBuilder = this.builder;

        this.scene.events.once('shutdown', () => this.destroy());
    }

    setupBackground() {
        this.builder.createBackground(1000, 800, 2500, 2000, 'bg_sky', {
            scrollFactor: 0.15,
            tint: 0x445566
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
