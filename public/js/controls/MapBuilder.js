export class MapBuilder {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
    }

    createPlatform(x, y, w, h, key) {
        if (!this.scene.platforms) return null;

        const cx = x + w / 2;
        const cy = y + h / 2;

        const platform = this.scene.add.tileSprite(cx, cy, w, h, key);
        this.scene.physics.add.existing(platform, true);

        // Critical Fix: Explicit sizing
        if (platform.body) {
            platform.body.setSize(w, h);
            platform.body.updateFromGameObject();
        }

        this.scene.platforms.add(platform);
        this.objects.push(platform);
        return platform;
    }

    createBackground(x, y, w, h, key, config = {}) {
        const bg = this.scene.add.tileSprite(x, y, w, h, key);
        bg.setScrollFactor(config.scrollFactor || 0.5);
        bg.setDepth(config.depth || -20);
        if (config.tint) bg.setTint(config.tint);

        this.objects.push(bg);
        return bg;
    }

    setupBounds(w, h) {
        this.scene.physics.world.setBounds(0, 0, w, h);
        this.scene.cameras.main.setBounds(0, 0, w, h);
    }

    cleanup() {
        this.objects.forEach(obj => {
            if (obj.destroy) obj.destroy();
        });
        this.objects = [];
    }
}
