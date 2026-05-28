import { CanvasCharacterRenderer } from './CanvasCharacterRenderer.js';

const NameGenerator = {
    adjectives: ['Iron', 'Neon', 'Shadow', 'Cyber', 'Atomic', 'Rogue', 'Elite', 'Storm', 'Viper', 'Ghost'],
    nouns: ['Wolf', 'Hawk', 'Strike', 'Blade', 'Falcon', 'Titan', 'Ops', 'Ranger', 'Spectre', 'Commando'],

    generate() {
        const adj = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
        const num = Math.floor(Math.random() * 99) + 1;
        return `${adj}${noun}${num}`;
    }
};

export class MenuUI {
    constructor(socket) {
        this.socket = socket;
        this.userData = null;
        this.bindEvents();
        this.bindArmoryEvents();
        this.loadCustomization();


        this.username = localStorage.getItem('mm_username');
        if (!this.username) {
            this.username = NameGenerator.generate();
            localStorage.setItem('mm_username', this.username);
        }
        this.socket.emit('login', this.username);
    }

    bindEvents() {

        this.bindNav('btn-multiplayer', 'multiplayer-panel');
        this.bindNav('btn-singleplayer', 'singleplayer-panel');
        this.bindNav('btn-settings', 'settings-panel');


        this.bindNav('btn-settings-armory', 'armory-panel');
        this.bindNav('btn-settings-controls', 'controls-panel');
        this.bindNav('btn-settings-credits', 'credits-panel');


        this.bindMapSelection();


        this.bindNav('btn-coop', 'create-room-panel');





        document.getElementById('btn-quick-play').addEventListener('click', () => this.quickJoin());


        document.getElementById('btn-training').addEventListener('click', () => this.startTraining());




        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', (e) => {

                if (document.getElementById('lobby-panel').classList.contains('active')) {
                    this.socket.emit('leave_room');
                }


                const target = e.currentTarget.getAttribute('data-back-target') || 'main-menu';
                this.showPanel(target);
            });
        });



        document.getElementById('btn-join-multi').addEventListener('click', () => this.openJoinMenu());
        document.getElementById('btn-join-confirm').addEventListener('click', () => this.joinRoom());


        document.getElementById('btn-survival').addEventListener('click', () => this.startSurvival());


        document.getElementById('btn-accept-invite').addEventListener('click', () => this.acceptInvite());
        document.getElementById('btn-decline-invite').addEventListener('click', () => {
            document.getElementById('invite-notification').classList.add('hidden');
        });

        this.socket.on('game_started', (data) => {
            console.log("MenuUI: Received game_started", data);
            if (this.onStartGame) this.onStartGame(data);
            document.getElementById('game-hud').classList.remove('hidden');
        });


        this.socket.on('profile_update_result', (data) => {
            if (data.success) {
                alert("Updated Successfully");
                this.showPanel('settings-panel');
            } else {
                alert("Update Failed: " + data.msg);
            }
        });


        this.socket.on('user_data', (user) => {
            this.userData = user;
            if (user.username) {
                this.username = user.username;
                localStorage.setItem('mm_username', user.username);
                const nameInput = document.getElementById('player-name-input');
                if (nameInput) nameInput.value = user.username;
            }
            if (user.customization) {
                localStorage.setItem('mm_customization', JSON.stringify(user.customization));
                this.loadCustomization();
            }
        });


        document.getElementById('btn-create-confirm').addEventListener('click', () => this.createRoom());






        const btnStart = document.getElementById('btn-start-game');
        if (btnStart) btnStart.addEventListener('click', () => this.socket.emit('start_game'));

        const btnLeave = document.getElementById('btn-leave-lobby');
        if (btnLeave) btnLeave.addEventListener('click', () => {
            this.socket.emit('leave_room');
            this.showPanel('multiplayer-panel');
        });

        const btnReady = document.getElementById('btn-ready');
        if (btnReady) btnReady.addEventListener('click', () => {
            this.socket.emit('toggle_ready');

        });


        const btnSave = document.getElementById('btn-save-settings');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveCustomization());
        }








        this.socket.on('room_joined', (data) => this.onRoomJoined(data));


        this.socket.on('player_joined', (data) => this.updateLobbyUser(data, true));
        this.socket.on('player_left', (id) => this.updateLobbyUser({ id }, false));
        this.socket.on('lobby_update', (data) => this.onLobbyUpdate(data));
        this.socket.on('lobbies_list', (list) => this.updateLobbyList(list));


        this.socket.on('error_message', (msg) => {
            alert(msg);
            if (msg === 'Room is full') {
                this.socket.emit('get_lobbies');
            }
        });


        const btnRefresh = document.getElementById('btn-refresh-lobbies');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.socket.emit('get_lobbies');
                document.getElementById('room-list').innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Refreshing...</div>';
            });
        }
    }

    updateLobbyList(list) {
        const container = document.getElementById('room-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No active operations found.</div>';
            return;
        }


        list.sort((a, b) => {
            const ratioA = a.playerCount / a.maxPlayers;
            const ratioB = b.playerCount / b.maxPlayers;
            return ratioB - ratioA;
        });

        list.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.style.cssText = 'background: rgba(0,0,0,0.3); padding: 10px; margin-bottom: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333;';
            div.innerHTML = `
                <span style="color: #fff; font-weight: bold;">${room.name}</span>
                <span style="color: var(--primary); font-size: 0.9em;">${room.playerCount} / ${room.maxPlayers}</span>
            `;

            div.addEventListener('click', () => {
                document.getElementById('join-room-name').value = room.name;

                this.socket.emit('join_room', {
                    roomName: room.name,
                    password: '',
                    username: this.username
                });
            });


            div.addEventListener('mouseenter', () => div.style.borderColor = 'var(--primary)');
            div.addEventListener('mouseleave', () => div.style.borderColor = '#333');

            container.appendChild(div);
        });
    }

    bindNav(btnId, panelId) {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', () => this.showPanel(panelId));
    }

    bindMapSelection() {
        const cards = document.querySelectorAll('.map-card');
        const input = document.getElementById('create-room-map');

        cards.forEach(card => {
            card.addEventListener('click', () => {

                cards.forEach(c => c.classList.remove('active'));

                card.classList.add('active');

                input.value = card.getAttribute('data-map');
            });
        });


        const slider = document.getElementById('create-room-players');
        const display = document.getElementById('player-count-display');
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                display.innerText = e.target.value;
            });
        }
    }

    showPanel(id) {
        document.querySelectorAll('.panel').forEach(p => {
            if (p.id === id) {
                p.classList.remove('hidden');
                requestAnimationFrame(() => p.classList.add('active'));
            } else {
                p.classList.remove('active');
                setTimeout(() => {
                    if (!p.classList.contains('active')) {
                        p.classList.add('hidden');
                    }
                }, 300);
            }
        });
    }

    createRoom() {
        const name = document.getElementById('create-room-name').value;
        const pass = document.getElementById('create-room-pass').value;
        const map = document.getElementById('create-room-map').value;
        const players = document.getElementById('create-room-players').value;

        if (!name) return alert("Room Name Required");

        this.socket.emit('create_room', {
            roomName: name,
            password: pass,
            map: map,
            maxPlayers: parseInt(players),
            username: this.username
        });
    }

    joinRoom() {
        const name = document.getElementById('join-room-name').value;
        const pass = document.getElementById('join-room-pass').value;

        if (!name) return alert("Room Name Required");

        this.socket.emit('join_room', {
            roomName: name,
            password: pass,
            username: this.username
        });
    }

    onRoomJoined(data) {
        this.currentRoomPlayers = data.players;
        this.hostId = data.hostId;


        if (data.gameMode === 'training' || data.gameMode === 'survival') {

            return;
        }

        this.showPanel('lobby-panel');
        document.getElementById('lobby-room-name').innerText = `OPERATION: ${data.roomName}`;
        this.updateLobbyUI();
    }

    onLobbyUpdate(players) {
        this.currentRoomPlayers = players;
        this.updateLobbyUI();
    }

    updateLobbyUser(data, isJoin) {
        if (!this.currentRoomPlayers) this.currentRoomPlayers = {};

        if (isJoin) {

            this.currentRoomPlayers[data.id] = data;
        } else {
            delete this.currentRoomPlayers[data.id];
        }
        this.updateLobbyUI();
    }

    updateLobbyUI() {
        if (!this.currentRoomPlayers) return;


        this.renderPlayerList(this.currentRoomPlayers);


        const myId = this.socket.id;
        const amIHost = (this.hostId === myId);


        const myPlayer = this.currentRoomPlayers[myId];
        const isActuallyHost = myPlayer && myPlayer.isHost;

        const btnStart = document.getElementById('btn-start-game');
        const btnReady = document.getElementById('btn-ready');


        btnStart.classList.add('hidden');
        btnReady.classList.add('hidden');

        if (isActuallyHost) {
            btnStart.classList.remove('hidden');

            const allReady = Object.values(this.currentRoomPlayers).every(p => p.isReady);
            btnStart.disabled = !allReady;
            btnStart.style.opacity = allReady ? 1 : 0.5;
            btnStart.innerText = allReady ? "START MATCH" : "WAITING...";
        } else {
            btnReady.classList.remove('hidden');
            const isReady = myPlayer ? myPlayer.isReady : false;
            btnReady.innerText = isReady ? "UNREADY" : "READY";
            btnReady.style.background = isReady ? "#555" : "";
        }
    }

    renderPlayerList(players) {
        const container = document.getElementById('lobby-players');
        container.innerHTML = '';
        Object.values(players).forEach(p => {
            const div = document.createElement('div');
            div.className = 'player-item';


            const statusClass = p.isReady ? 'ready' : 'not-ready';


            const displayName = p.username || `Player ${p.id.substr(0, 4)}`;

            div.innerHTML = `<div class="status-dot ${statusClass}"></div> ${p.isHost ? '[HOST] ' : ''}${displayName}`;
            container.appendChild(div);
        });
    }


    bindArmoryEvents() {

        const inputs = [
            'opt-head-shape', 'opt-head-color',
            'opt-hair-style', 'opt-hair-color',
            'opt-eyes-style', 'opt-eyes-color',
            'opt-eyebrows-style', 'opt-eyebrows-color',
            'opt-mouth-style', 'opt-mouth-color',
            'opt-glasses-style', 'opt-glasses-color',
            'opt-shirt-style', 'opt-shirt-color',
            'opt-pants-style', 'opt-pants-color',
            'opt-boots-style', 'opt-boots-color',
            'opt-helmet-style', 'opt-helmet-color',
            'opt-gloves-style', 'opt-gloves-color'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updatePreview());
                el.addEventListener('change', () => this.updatePreview());
            }
        });
    }

    loadCustomization() {
        const savedRaw = localStorage.getItem('mm_customization');
        let data = {};



        const defaultData = {
            head: { shape: 'human', color: '#ffe0bd' },
            hair: { style: 'none', color: '#4a4a4a' },
            eyes: { style: 'normal', color: '#000000' },
            eyebrows: { style: 'normal', color: '#000000' },
            mouth: { style: 'neutral', color: '#000000' },
            glasses: { style: 'none', color: '#333333' },
            shirt: { style: 'standard', color: '#ff0000' },
            pants: { style: 'standard', color: '#333333' },
            boots: { style: 'standard', color: '#111111' },
            helmet: { style: 'none', color: '#3a4a35' },
            gloves: { style: 'none', color: '#222222' }
        };

        if (savedRaw) {
            try {
                const saved = JSON.parse(savedRaw);
                data = { ...defaultData, ...saved };


                for (let key in defaultData) {
                    if (saved[key]) data[key] = { ...defaultData[key], ...saved[key] };
                }
            } catch (e) {
                data = defaultData;
            }
        } else {
            const legacyColor = localStorage.getItem('mm_color');
            if (legacyColor) defaultData.shirt.color = legacyColor;
            data = defaultData;
        }


        this.setVal('opt-head-shape', data.head.shape);
        this.setVal('opt-head-color', data.head.color);
        this.setVal('opt-hair-style', data.hair.style);
        this.setVal('opt-hair-color', data.hair.color);
        this.setVal('opt-eyes-style', data.eyes.style);
        this.setVal('opt-eyes-color', data.eyes.color);
        this.setVal('opt-eyebrows-style', data.eyebrows.style);
        this.setVal('opt-eyebrows-color', data.eyebrows.color);
        this.setVal('opt-mouth-style', data.mouth.style);
        this.setVal('opt-mouth-color', data.mouth.color);
        this.setVal('opt-glasses-style', data.glasses.style);
        this.setVal('opt-glasses-color', data.glasses.color);
        this.setVal('opt-shirt-style', data.shirt.style);
        this.setVal('opt-shirt-color', data.shirt.color);
        this.setVal('opt-pants-style', data.pants.style);
        this.setVal('opt-pants-color', data.pants.color);
        this.setVal('opt-boots-style', data.boots.style);
        this.setVal('opt-boots-color', data.boots.color);
        this.setVal('opt-helmet-style', data.helmet?.style || 'none');
        this.setVal('opt-helmet-color', data.helmet?.color || '#3a4a35');
        this.setVal('opt-gloves-style', data.gloves?.style || 'none');
        this.setVal('opt-gloves-color', data.gloves?.color || '#222222');


        const nameInput = document.getElementById('player-name-input');
        if (nameInput && !nameInput.value) {
            nameInput.value = this.username || '';
        }


        this.updatePreview();
    }

    setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    updatePreview() {
        const canvas = document.getElementById('preview-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;


        ctx.clearRect(0, 0, width, height);


        const centerX = width / 2;
        const centerY = height / 1.5;
        const scale = 3.5;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);


        const data = {
            head: { shape: this.getVal('opt-head-shape'), color: this.getVal('opt-head-color') },
            hair: { style: this.getVal('opt-hair-style'), color: this.getVal('opt-hair-color') },
            eyes: { style: this.getVal('opt-eyes-style'), color: this.getVal('opt-eyes-color') },
            eyebrows: { style: this.getVal('opt-eyebrows-style'), color: this.getVal('opt-eyebrows-color') },
            mouth: { style: this.getVal('opt-mouth-style'), color: this.getVal('opt-mouth-color') },
            glasses: { style: this.getVal('opt-glasses-style'), color: this.getVal('opt-glasses-color') },
            shirt: { style: this.getVal('opt-shirt-style'), color: this.getVal('opt-shirt-color') },
            pants: { style: this.getVal('opt-pants-style'), color: this.getVal('opt-pants-color') },
            boots: { style: this.getVal('opt-boots-style'), color: this.getVal('opt-boots-color') },
            helmet: { style: this.getVal('opt-helmet-style'), color: this.getVal('opt-helmet-color') },
            gloves: { style: this.getVal('opt-gloves-style'), color: this.getVal('opt-gloves-color') }
        };

        this.drawCharacter(ctx, data);

        ctx.restore();
    }

    drawCharacter(ctx, data) {
        CanvasCharacterRenderer.drawCharacter(ctx, data);
    }

    saveCustomization() {
        const nameInput = document.getElementById('player-name-input').value.trim();

        if (nameInput.length < 3) {
            alert("Codename must be at least 3 characters.");
            return;
        }

        const data = {
            head: { shape: this.getVal('opt-head-shape'), color: this.getVal('opt-head-color') },
            hair: { style: this.getVal('opt-hair-style'), color: this.getVal('opt-hair-color') },
            eyes: { style: this.getVal('opt-eyes-style'), color: this.getVal('opt-eyes-color') },
            eyebrows: { style: this.getVal('opt-eyebrows-style'), color: this.getVal('opt-eyebrows-color') },
            mouth: { style: this.getVal('opt-mouth-style'), color: this.getVal('opt-mouth-color') },
            glasses: { style: this.getVal('opt-glasses-style'), color: this.getVal('opt-glasses-color') },
            shirt: { style: this.getVal('opt-shirt-style'), color: this.getVal('opt-shirt-color') },
            pants: { style: this.getVal('opt-pants-style'), color: this.getVal('opt-pants-color') },
            boots: { style: this.getVal('opt-boots-style'), color: this.getVal('opt-boots-color') },
            helmet: { style: this.getVal('opt-helmet-style'), color: this.getVal('opt-helmet-color') },
            gloves: { style: this.getVal('opt-gloves-style'), color: this.getVal('opt-gloves-color') }
        };


        localStorage.setItem('mm_customization', JSON.stringify(data));
        localStorage.setItem('mm_username', nameInput);
        this.username = nameInput;


        this.socket.emit('update_profile', {
            username: nameInput,
            color: data.shirt.color,
            customization: data
        });


    }

    quickJoin() {

        this.socket.emit('get_lobbies');
        this.showPanel('join-room-panel');
        document.getElementById('room-list').innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Fetching operations...</div>';


        document.querySelector('#join-room-panel h2').innerText = 'QUICK JOIN';
        document.getElementById('manual-join-form').style.display = 'none';
        document.getElementById('quick-play-back-btn').style.display = 'block';
    }

    openJoinMenu() {
        this.showPanel('join-room-panel');

        document.querySelector('#join-room-panel h2').innerText = 'JOIN OPERATION';
        document.getElementById('manual-join-form').style.display = 'block';
        document.getElementById('quick-play-back-btn').style.display = 'none';
        document.getElementById('room-list').innerHTML = '';

    }

    startTraining() {
        this.socket.emit('create_room', {
            roomName: 'Training_' + Date.now(),
            password: '',
            map: 'outpost',
            maxPlayers: 1,
            autoStart: true,
            gameMode: 'training'
        });
    }

    startSurvival() {
        this.socket.emit('create_room', {
            roomName: 'Survival_' + Date.now(),
            password: '',
            map: 'catacombs',
            maxPlayers: 1,
            autoStart: true,
            gameMode: 'survival'
        });
    }
}
