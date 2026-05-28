export class MapBuilder {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.spawnPoints = [];
    }

    createPlatform(x, y, w, h, key) {
        if (!this.scene.platforms) return null;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const platform = this.scene.add.tileSprite(cx, cy, w, h, key);
        this.scene.physics.add.existing(platform, true);
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


    createDecoration(x, y, key, config = {}) {
        const deco = this.scene.add.image(x, y, key);
        deco.setDepth(config.depth !== undefined ? config.depth : -5);
        if (config.scale !== undefined) deco.setScale(config.scale);
        if (config.alpha !== undefined) deco.setAlpha(config.alpha);
        if (config.tint !== undefined) deco.setTint(config.tint);
        if (config.rotation !== undefined) deco.setRotation(config.rotation);
        if (config.flipX !== undefined) deco.setFlipX(config.flipX);
        this.objects.push(deco);
        return deco;
    }


    createParallaxLayer(key, scrollFactor, config = {}) {
        const cam = this.scene.cameras.main;
        const w = cam.getBounds().width || cam.width;
        const h = cam.getBounds().height || cam.height;
        const yPos = config.y !== undefined ? config.y : h / 2;
        const depth = config.depth !== undefined ? config.depth : Math.floor(-30 + scrollFactor * 10);

        const layer = this.scene.add.tileSprite(w / 2, yPos, w, h, key);
        layer.setScrollFactor(scrollFactor);
        layer.setDepth(depth);
        if (config.tint !== undefined) layer.setTint(config.tint);
        if (config.alpha !== undefined) layer.setAlpha(config.alpha);
        this.objects.push(layer);
        return layer;
    }


    createHazard(x, y, w, h, config = {}) {
        const color = config.color !== undefined ? config.color : 0xff4400;
        const alpha = config.alpha !== undefined ? config.alpha : 0.7;
        const depth = config.depth !== undefined ? config.depth : -2;

        const hazard = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, color, alpha);
        hazard.setDepth(depth);


        this.scene.tweens.add({
            targets: hazard,
            alpha: alpha * 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.objects.push(hazard);
        return hazard;
    }


    createWall(x, y, w, h, key) {
        return this.createPlatform(x, y, w, h, key);
    }


    setSpawnPoints(points) {
        this.spawnPoints = points;
    }


    getSpawnPoint() {
        if (!this.spawnPoints || this.spawnPoints.length === 0) {
            return { x: 100, y: 200 };
        }
        const index = Math.floor(Math.random() * this.spawnPoints.length);
        return this.spawnPoints[index];
    }

    cleanup() {
        this.objects.forEach(obj => {
            if (obj.destroy) obj.destroy();
        });
        this.objects = [];
        this.spawnPoints = [];
    }
}
