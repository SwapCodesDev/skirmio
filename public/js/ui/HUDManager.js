export class HUDManager {
    constructor(scene) {
        this.scene = scene;
        this.socket = scene.socket;

        this.healthBar = document.getElementById('health-bar');
        this.fuelBar = document.getElementById('fuel-bar');
        this.scoreTable = document.querySelector('#score-table tbody');
        this.scoreboardPanel = document.getElementById('scoreboard-panel');

        this.bindEvents();
    }

    bindEvents() {
        // Scoreboard toggle
        this.scene.input.keyboard.on('keydown-TAB', () => {
            if (this.scoreboardPanel) this.scoreboardPanel.classList.add('active');
        });
        this.scene.input.keyboard.on('keyup-TAB', () => {
            if (this.scoreboardPanel) this.scoreboardPanel.classList.remove('active');
        });

        // Scene Events
        this.scene.events.on('player:health', (data) => {
            this.updateHealth(data.current);
        });

        this.scene.events.on('player:fuel', (fuel) => {
            this.updateFuel(fuel);
        });

        this.scene.events.on('scores:update', (scores) => {
            this.updateScoreboard(scores);
        });
    }

    updateHealth(health) {
        if (this.healthBar) {
            this.healthBar.style.width = health + '%';
        }
    }

    updateFuel(fuel) {
        if (this.fuelBar) {
            this.fuelBar.style.width = fuel + '%';
        }
    }

    updateScoreboard(scores) {
        if (!this.scoreTable) return;
        this.scoreTable.innerHTML = '';
        const sorted = Object.values(scores).sort((a, b) => b.kills - a.kills);
        sorted.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${s.name}</td><td>${s.kills}</td><td>${s.deaths}</td>`;
            this.scoreTable.appendChild(tr);
        });
    }
}
