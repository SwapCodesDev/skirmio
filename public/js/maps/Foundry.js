import { MapBuilder } from '../controls/MapBuilder.js';

export class Foundry {
    constructor(scene) {
        if (!scene) throw new Error('Foundry requires a valid Phaser.Scene');
        this.scene = scene;
        this.builder = new MapBuilder(scene);

        this.layout = [
            [0, 0, 2000, 50],
            [0, 0, 35, 1600],
            [1965, 0, 35, 1600],

            [35, 1400, 350, 200],
            [650, 1400, 700, 200],
            [1615, 1400, 350, 200],

            [450, 600, 60, 800],
            [1490, 600, 60, 800],

            [100, 1100, 300, 30],
            [1600, 1100, 300, 30],

            [550, 1000, 400, 30],
            [1050, 1000, 400, 30],

            [700, 700, 600, 35],

            [150, 500, 250, 30],
            [1600, 500, 250, 30],
            [750, 400, 500, 30]
        ];
    }

    create() {
        if (!this.scene.platforms) {
            throw new Error('scene.platforms must be initialized before creating Map');
        }

        this.setupBackground();
        this.createPlatforms();
        this.createHazards();
        this.builder.setupBounds(2000, 1600);

        this.builder.setSpawnPoints([
            { x: 200, y: 1300 },
            { x: 1800, y: 1300 },
            { x: 1000, y: 600 },
            { x: 1000, y: 900 }
        ]);

        this.scene.mapBuilder = this.builder;

        this.scene.events.once('shutdown', () => this.destroy());
    }

    setupBackground() {
        this.builder.createBackground(1000, 800, 2500, 2000, 'bg_foundry', {
            scrollFactor: 0.2,
            tint: 0x884422
        });
    }

    createPlatforms() {
        this.layout.forEach(([x, y, w, h]) => {
            this.builder.createPlatform(x, y, w, h, 'tile_metal');
        });
    }

    createHazards() {
        this.builder.createHazard(385, 1450, 265, 150, { color: 0xff4400 });
        this.builder.createHazard(1350, 1450, 265, 150, { color: 0xff4400 });
    }

    destroy() {
        this.builder.cleanup();
    }
}
