import { MapBuilder } from '../controls/MapBuilder.js';

export class Outpost {
    constructor(scene) {
        if (!scene) throw new Error('Outpost requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        this.layout = [
            [0, 1400, 2000, 200],

            [200, 700, 40, 700],
            [450, 700, 40, 700],
            [240, 1200, 210, 30],
            [240, 950, 210, 30],
            [200, 700, 290, 40],

            [1510, 700, 40, 700],
            [1760, 700, 40, 700],
            [1550, 1200, 210, 30],
            [1550, 950, 210, 30],
            [1510, 700, 290, 40],

            [700, 1100, 600, 30],
            [850, 800, 300, 30],
            [550, 900, 120, 25],
            [1330, 900, 120, 25],
            [650, 500, 700, 30]
        ];

        this.spawnPoints = [
            { x: 320, y: 1100 },
            { x: 1680, y: 1100 },
            { x: 1000, y: 700 },
            { x: 1000, y: 1300 }
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
