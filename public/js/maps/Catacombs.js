import { MapBuilder } from '../controls/MapBuilder.js';

export class Catacombs {
    constructor(scene) {
        if (!scene) throw new Error('Catacombs requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        this.layout = [
            [0, 0, 2000, 60],
            [0, 0, 40, 1600],
            [1960, 0, 40, 1600],

            [0, 1450, 600, 150],
            [600, 1500, 800, 100],
            [1400, 1450, 600, 150],

            [700, 1150, 600, 40],
            [850, 850, 300, 40],

            [80, 1200, 300, 30],
            [250, 950, 300, 30],
            [80, 700, 400, 30],
            [350, 450, 250, 30],

            [1620, 1200, 300, 30],
            [1450, 950, 300, 30],
            [1520, 700, 400, 30],
            [1400, 450, 250, 30],

            [750, 600, 180, 30],
            [1070, 600, 180, 30],
            [900, 350, 200, 35]
        ];

        this.spawnPoints = [
            { x: 200, y: 1350 },
            { x: 1800, y: 1350 },
            { x: 1000, y: 750 },
            { x: 500, y: 850 },
            { x: 1500, y: 850 }
        ];
    }

    create() {
        if (!this.scene.platforms) {
            throw new Error('scene.platforms must be initialized before creating Map');
        }

        this.setupBackground();
        this.createPlatforms();
        this.builder.setupBounds(2000, 1600);

        this.scene.spawnPoints = this.spawnPoints;
        this.scene.mapBuilder = this.builder;

        this.scene.events.once('shutdown', () => this.destroy());
    }

    setupBackground() {
        this.builder.createBackground(1000, 800, 2500, 2000, 'bg_cave', {
            scrollFactor: 0.2,
            tint: 0x667766
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
