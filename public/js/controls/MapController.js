import { Outpost } from '../maps/Outpost.js';
import { Catacombs } from '../maps/Catacombs.js';

const MAPS = {
    outpost: Outpost,
    catacombs: Catacombs
};

export class MapController {
    constructor(scene) {
        if (!scene) {
            throw new Error('MapController requires a valid Phaser.Scene');
        }
        this.scene = scene;
    }

    preload() {
        // Backgrounds
        this.scene.load.image('bg_jungle', 'assets/bg_jungle.png');
        this.scene.load.image('bg_cave', 'assets/bg_cave.png');

        // Tiles
        this.scene.load.image('tile_rock', 'assets/tile_rock.png');
        this.scene.load.image('tile_metal', 'assets/tile_metal.png');
        this.scene.load.image('tile_grass', 'assets/tile_grass.png');

        // Props (with white bg to be processed)
        this.scene.load.image('prop_crate', 'assets/prop_crate.png');
        this.scene.load.image('prop_barrel', 'assets/prop_barrel.png');
        this.scene.load.image('prop_bush', 'assets/prop_bush.png');
        this.scene.load.image('prop_sandbag', 'assets/prop_sandbag.png');
    }

    create(mapName) {
        // Common Setup
        this.processCommonAssets();

        this.scene.platforms = this.scene.physics.add.staticGroup();
        this.scene.props = this.scene.add.group();

        // Delegate to specific map using Registry
        const MapClass = MAPS[mapName] || OutpostMap;
        const map = new MapClass(this.scene);
        map.create();
    }

    processCommonAssets() {
        this.processTexture('prop_crate', 'crate_clean');
        this.processTexture('prop_barrel', 'barrel_clean');
        this.processTexture('prop_bush', 'bush_clean');
        this.processTexture('prop_sandbag', 'sandbag_clean');
    }

    processTexture(key, newKey) {
        const textures = this.scene.textures;

        // 1. Existence Check (Prevents overwrites/leaks)
        if (!textures.exists(key) || textures.exists(newKey)) return;

        const source = textures.get(key).getSourceImage();

        // 2. Type Safety
        if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) {
            console.warn(`MapManager: Source for ${key} is not a valid image or canvas.`);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            console.error(`MapManager: Failed to get 2D context for ${key}`);
            return;
        }

        ctx.drawImage(source, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const HARD = 20;
        const SOFT = 80;

        // 3. Optimized Loop
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const diff = (255 - r) + (255 - g) + (255 - b);

            if (diff < HARD) {
                data[i + 3] = 0; // Transparent
            } else if (diff < SOFT) {
                // Linear fade
                data[i + 3] = ((diff - HARD) / (SOFT - HARD)) * 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        textures.addCanvas(newKey, canvas);

    }
}
