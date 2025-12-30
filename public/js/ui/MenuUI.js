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

        // Auto-Login
        this.username = localStorage.getItem('mm_username');
        if (!this.username) {
            this.username = NameGenerator.generate();
            localStorage.setItem('mm_username', this.username);
        }
        this.socket.emit('login', this.username);
    }

    bindEvents() {
        // Navigation - Main
        this.bindNav('btn-multiplayer', 'multiplayer-panel');
        this.bindNav('btn-singleplayer', 'singleplayer-panel');
        this.bindNav('btn-settings', 'settings-panel');

        // Settings Submenus
        this.bindNav('btn-settings-armory', 'armory-panel');
        this.bindNav('btn-settings-controls', 'controls-panel');
        this.bindNav('btn-settings-credits', 'credits-panel');

        // Map Selection & Sliders
        this.bindMapSelection();

        // Navigation - Submenus
        this.bindNav('btn-coop', 'create-room-panel'); // Co-op essentially leads to Create Room for now (or Join)
        // For Co-op we might want a 'Co-op Hub' later, but Create Room works for hosting.
        // Actually, let's splits Create/Join inside Co-op or just show 'Create Room' panel which has both usually?
        // Let's repurpose 'create-room-panel' to be the setup for Co-op hosting.

        // Quick Play
        document.getElementById('btn-quick-play').addEventListener('click', () => this.quickJoin());

        // Training
        document.getElementById('btn-training').addEventListener('click', () => this.startTraining());

        // Friends REMOVED

        // Back Buttons
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // If in lobby, leave room
                if (document.getElementById('lobby-panel').classList.contains('active')) {
                    this.socket.emit('leave_room');
                }

                // Smart Back Navigation
                const target = e.currentTarget.getAttribute('data-back-target') || 'main-menu';
                this.showPanel(target);
            });
        });

        // Join Room Menu
        // this.bindNav('btn-join-multi', 'join-room-panel'); // Replaced by manual handler
        document.getElementById('btn-join-multi').addEventListener('click', () => this.openJoinMenu());
        document.getElementById('btn-join-confirm').addEventListener('click', () => this.joinRoom());

        // Survival
        document.getElementById('btn-survival').addEventListener('click', () => this.startSurvival());

        // Invites
        document.getElementById('btn-accept-invite').addEventListener('click', () => this.acceptInvite());
        document.getElementById('btn-decline-invite').addEventListener('click', () => {
            document.getElementById('invite-notification').classList.add('hidden');
        });

        this.socket.on('game_started', (data) => {
            console.log("MenuUI: Received game_started", data);
            if (this.onStartGame) this.onStartGame(data);
            document.getElementById('game-hud').classList.remove('hidden');
        });

        // Profile update feedback
        this.socket.on('profile_update_result', (data) => {
            if (data.success) {
                alert("Updated Successfully");
                this.showPanel('settings-panel');
            } else {
                alert("Update Failed: " + data.msg);
            }
        });

        // Forms
        document.getElementById('btn-create-confirm').addEventListener('click', () => this.createRoom());
        // For Join, we removed the direct button from main menu, but 'Co-op' could have a 'Join' option.
        // For now Co-op -> Create. We need a Join UI accessible from somewhere.
        // Let's add 'Join Room' button to Multiplayer panel? 
        // Or keep it simple: Co-op = Host/Join?

        // Lobby Actions
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
            // Optimistic update? Better wait for server
        });

        // Armory Save (Confirm)
        const btnSave = document.getElementById('btn-save-settings');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveCustomization());
        }

        // Re-adding Join button to Multiplayer layout logic in HTML would be best if needed.
        // But for now let's assume 'Co-op' opens the Create panel, and we can add a 'Join' tab there?
        // Or just repurpose the existing Join Panel if accessed via a new button?
        // Let's add 'btn-join-menu' logic back if I added it to Multiplayer panel, but I didn't.
        // I should have added 'Join Room' to Multiplayer panel. Let's fix HTML next step if needed.

        // Create/Join Success
        this.socket.on('room_joined', (data) => this.onRoomJoined(data));

        // Lobby Updates
        this.socket.on('player_joined', (data) => this.updateLobbyUser(data, true));
        this.socket.on('player_left', (id) => this.updateLobbyUser({ id }, false));
        this.socket.on('lobby_update', (data) => this.onLobbyUpdate(data));
        this.socket.on('lobbies_list', (list) => this.updateLobbyList(list));

        // Error Feedback
        this.socket.on('error_message', (msg) => {
            alert(msg);
            if (msg === 'Room is full') {
                this.socket.emit('get_lobbies');
            }
        });

        // Refresh Lobbies
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

        // Sort by Fill Ratio (descending)
        list.sort((a, b) => {
            const ratioA = a.playerCount / a.maxPlayers;
            const ratioB = b.playerCount / b.maxPlayers;
            return ratioB - ratioA;
        });

        list.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item'; // We need to style this or reuse player-item style
            div.style.cssText = 'background: rgba(0,0,0,0.3); padding: 10px; margin-bottom: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333;';
            div.innerHTML = `
                <span style="color: #fff; font-weight: bold;">${room.name}</span>
                <span style="color: var(--primary); font-size: 0.9em;">${room.playerCount} / ${room.maxPlayers}</span>
            `;

            div.addEventListener('click', () => {
                document.getElementById('join-room-name').value = room.name;
                // Auto join? or just fill
                this.socket.emit('join_room', {
                    roomName: room.name,
                    password: '',
                    username: this.username
                });
            });

            // Hover effect
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
                // Remove active class from all
                cards.forEach(c => c.classList.remove('active'));
                // Add active to clicked
                card.classList.add('active');
                // Update hidden input
                input.value = card.getAttribute('data-map');
            });
        });

        // Player count slider display update
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
            username: this.username // Explicitly send username
        });
    }

    joinRoom() {
        const name = document.getElementById('join-room-name').value;
        const pass = document.getElementById('join-room-pass').value;

        if (!name) return alert("Room Name Required");

        this.socket.emit('join_room', {
            roomName: name,
            password: pass,
            username: this.username // Explicitly send username
        });
    }

    onRoomJoined(data) {
        this.currentRoomPlayers = data.players;
        this.hostId = data.hostId; // Store Host ID

        // Single Player Bypass
        if (data.gameMode === 'training' || data.gameMode === 'survival') {
            // Do not show lobby, wait for auto-start
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
            // Server now sends full player object including username
            this.currentRoomPlayers[data.id] = data;
        } else {
            delete this.currentRoomPlayers[data.id];
        }
        this.updateLobbyUI();
    }

    updateLobbyUI() {
        if (!this.currentRoomPlayers) return;

        // Render List
        this.renderPlayerList(this.currentRoomPlayers);

        // Update Buttons
        const myId = this.socket.id;
        const amIHost = (this.hostId === myId); // Use stored host id
        // Fallback: check if I am marked as host in players list
        // (Server sends updated host info in players)
        const myPlayer = this.currentRoomPlayers[myId];
        const isActuallyHost = myPlayer && myPlayer.isHost; // Authoritative source

        const btnStart = document.getElementById('btn-start-game');
        const btnReady = document.getElementById('btn-ready');

        // Reset visibility
        btnStart.classList.add('hidden');
        btnReady.classList.add('hidden');

        if (isActuallyHost) {
            btnStart.classList.remove('hidden');
            // Enable start only if all ready
            const allReady = Object.values(this.currentRoomPlayers).every(p => p.isReady);
            btnStart.disabled = !allReady;
            btnStart.style.opacity = allReady ? 1 : 0.5;
            btnStart.innerText = allReady ? "START MATCH" : "WAITING...";
        } else {
            btnReady.classList.remove('hidden');
            const isReady = myPlayer ? myPlayer.isReady : false;
            btnReady.innerText = isReady ? "UNREADY" : "READY";
            btnReady.style.background = isReady ? "#555" : ""; // Grey if unreadying (cancel ready)
        }
    }

    renderPlayerList(players) {
        const container = document.getElementById('lobby-players');
        container.innerHTML = '';
        Object.values(players).forEach(p => {
            const div = document.createElement('div');
            div.className = 'player-item';

            // Status Dot
            const statusClass = p.isReady ? 'ready' : 'not-ready';

            // Display Name logic
            const displayName = p.username || `Player ${p.id.substr(0, 4)}`;

            div.innerHTML = `<div class="status-dot ${statusClass}"></div> ${p.isHost ? '[HOST] ' : ''}${displayName}`;
            container.appendChild(div);
        });
    }

    // Customization
    bindArmoryEvents() {
        // Armory Inputs that trigger preview update
        const inputs = [
            'opt-head-shape', 'opt-head-color',
            'opt-hair-style', 'opt-hair-color',
            'opt-eyes-style', 'opt-eyes-color',
            'opt-eyebrows-style', 'opt-eyebrows-color',
            'opt-mouth-style', 'opt-mouth-color',
            'opt-glasses-style', 'opt-glasses-color',
            'opt-shirt-style', 'opt-shirt-color',
            'opt-pants-style', 'opt-pants-color',
            'opt-boots-style', 'opt-boots-color'
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


        // Updated Default Data
        const defaultData = {
            head: { shape: 'human', color: '#ffe0bd' },
            hair: { style: 'none', color: '#4a4a4a' }, // Default Bald
            eyes: { style: 'normal', color: '#000000' },
            eyebrows: { style: 'normal', color: '#000000' },
            mouth: { style: 'neutral', color: '#000000' },
            glasses: { style: 'none', color: '#333333' },
            shirt: { style: 'standard', color: '#ff0000' },
            pants: { style: 'standard', color: '#333333' },
            boots: { style: 'standard', color: '#111111' },
            helmet: { style: 'none', color: '#3a4a35' }, // New
            gloves: { style: 'none', color: '#222222' }  // New
        };

        if (savedRaw) {
            try {
                const saved = JSON.parse(savedRaw);
                data = { ...defaultData, ...saved };
                // Deep merge needed or simple top level? 
                // Since structure is nested, let's manual merge safe properties to avoid undefined errors if new schema
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

        // Apply to Inputs
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
        // Initial Preview
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

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Center Player
        const centerX = width / 2;
        const centerY = height / 1.5;
        const scale = 3.5;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);

        // Get Current Values
        const data = {
            head: { shape: this.getVal('opt-head-shape'), color: this.getVal('opt-head-color') },
            hair: { style: this.getVal('opt-hair-style'), color: this.getVal('opt-hair-color') },
            eyes: { style: this.getVal('opt-eyes-style'), color: this.getVal('opt-eyes-color') },
            eyebrows: { style: this.getVal('opt-eyebrows-style'), color: this.getVal('opt-eyebrows-color') },
            mouth: { style: this.getVal('opt-mouth-style'), color: this.getVal('opt-mouth-color') },
            glasses: { style: this.getVal('opt-glasses-style'), color: this.getVal('opt-glasses-color') },
            shirt: { style: this.getVal('opt-shirt-style'), color: this.getVal('opt-shirt-color') },
            pants: { style: this.getVal('opt-pants-style'), color: this.getVal('opt-pants-color') },
            boots: { style: this.getVal('opt-boots-style'), color: this.getVal('opt-boots-color') }
        };

        this.drawCharacter(ctx, data);

        ctx.restore();
    }

    drawCharacter(ctx, data) {
        // --- Helper: Rounded Rect ---
        const drawRoundedRect = (x, y, w, h, r, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
            else ctx.rect(x, y, w, h); // Fallback
            ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        };

        // --- Helper: Tapered Limb ---
        const drawTaperedLimb = (len, wStart, wEnd, color) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, wStart / 2, Math.PI / 2, -Math.PI / 2);
            ctx.lineTo(len, -wEnd / 2);
            ctx.arc(len, 0, wEnd / 2, -Math.PI / 2, Math.PI / 2);
            ctx.lineTo(0, wStart / 2);
            ctx.fill();
            ctx.stroke();
        };

        // --- 1. Legs (Symmetrical Stance) ---
        const drawLeg = (x) => {
            ctx.save();
            ctx.translate(x, 10);
            // Leg
            drawRoundedRect(-5, 0, 10, 18, 4, data.pants.color);
            // Front Facing Boot
            ctx.fillStyle = data.boots.color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-6, 16, 12, 5, 2);
            else ctx.rect(-6, 16, 12, 5);
            ctx.fill();
            // Sole detail
            ctx.fillStyle = '#111';
            ctx.fillRect(-6, 21, 12, 2);
            ctx.restore();
        };

        drawLeg(-8); // Left Leg
        drawLeg(8);  // Right Leg

        // --- 2. Body (Front) ---
        // Torso
        drawRoundedRect(-14, -15, 28, 32, 8, data.shirt.color);

        // Vest / Shirt Details
        if (data.shirt.style === 'tactical') {
            ctx.fillStyle = '#3b5235';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-10, -12, 20, 20, 6);
            else ctx.rect(-10, -12, 20, 20);
            ctx.fill();
            // Center Line
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-1, -12, 2, 20);
        } else if (data.shirt.style === 'suit') {
            // Tie or buttons
            ctx.fillStyle = '#111'; ctx.fillRect(-1, -15, 2, 32);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-1, -15); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(1, -15); ctx.fill();
        }

        // Belt
        ctx.fillStyle = '#222'; ctx.fillRect(-14, 10, 28, 5);
        ctx.fillStyle = '#555'; ctx.fillRect(-4, 10, 8, 5); // Buckle

        // --- 3. Arms (Hanging at sides) ---
        const drawArm = (side) => {
            ctx.save();
            // Shoulder position
            ctx.translate(side * 16, -12);
            // Slight rotation away from body
            ctx.rotate(side * 0.15);

            ctx.rotate(Math.PI / 2); // Point down

            // Upper Arm
            drawTaperedLimb(12, 12, 9, data.shirt.color);

            // Forearm
            ctx.translate(12, 0);
            drawTaperedLimb(12, 9, 6, data.shirt.color);

            // Hand / Gloves
            ctx.translate(12, 0);
            if (data.gloves && data.gloves.style !== 'none') {
                ctx.fillStyle = data.gloves.color;
            } else {
                ctx.fillStyle = data.head.color; // Skin
            }
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            // Fingerless details
            if (data.gloves && data.gloves.style === 'fingerless') {
                ctx.fillStyle = data.head.color;
                ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI * 2); ctx.fill();
            }

            ctx.restore();
        };

        drawArm(-1); // Left Arm
        drawArm(1);  // Right Arm

        // --- 4. Head (Front) ---
        ctx.save();
        ctx.translate(0, -25);

        // Base Face
        ctx.fillStyle = data.head.color; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (data.head.shape === 'square') {
            ctx.rect(-16, -18, 32, 36);
        } else {
            ctx.arc(0, -5, 18, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.stroke();


        // Hair (Layer 1)
        // Check if helmet hides hair
        const hasHelmet = data.helmet && data.helmet.style !== 'none';

        if (!hasHelmet && data.hair.style !== 'none') {
            ctx.fillStyle = data.hair.color;
            ctx.beginPath();
            if (data.hair.style === 'mohawk') {
                ctx.moveTo(-2, -25); ctx.lineTo(0, -35); ctx.lineTo(2, -25); // Front view mohawk is thin
                ctx.rect(-2, -25, 4, 15);
            }
            else if (data.hair.style === 'buzz') {
                ctx.arc(0, -10, 19.5, Math.PI, 0); // Cap
                ctx.lineTo(19.5, -4); ctx.lineTo(-19.5, -4);
            }
            else if (data.hair.style === 'long') {
                ctx.arc(0, -5, 21, Math.PI, 0); // Top
                ctx.lineTo(21, 15); ctx.lineTo(18, 15); ctx.lineTo(18, 0); // Sides down
                ctx.lineTo(-18, 0); ctx.lineTo(-18, 15); ctx.lineTo(-21, 15);
            }
            else {
                // Short
                ctx.arc(0, -8, 19, Math.PI, 0);
            }
            ctx.fill(); ctx.stroke();
        }

        // Face Elements
        // Lower Position per user request
        const eyeY = 0;

        // Eyes
        if (data.eyes.style !== 'scanner') {
            ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#111';

            const drawEyeBase = (x) => {
                ctx.save(); ctx.translate(x, eyeY);
                if (data.eyes.style === 'angry') ctx.rotate(x < 0 ? 0.2 : -0.2);
                ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEyeBase(-6);
            drawEyeBase(6);

            // Pupils
            ctx.fillStyle = data.eyes.color;
            ctx.beginPath(); ctx.arc(-6, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
        } else {
            // Scanner Visor
            ctx.fillStyle = 'red'; ctx.strokeStyle = '#333';
            ctx.fillRect(-15, eyeY - 3, 30, 6);
            ctx.fillStyle = '#f00'; ctx.fillRect(-5, eyeY - 2, 10, 4); // Glow
        }

        // Eyebrows
        if (data.eyebrows.style !== 'none') {
            const browY = eyeY - 6;
            ctx.lineWidth = 2; ctx.strokeStyle = data.eyebrows.color;
            ctx.beginPath();
            if (data.eyebrows.style === 'angry') {
                ctx.moveTo(-2, browY + 2); ctx.lineTo(-10, browY);
                ctx.moveTo(2, browY + 2); ctx.lineTo(10, browY);
            } else if (data.eyebrows.style === 'arched') {
                ctx.moveTo(-2, browY); ctx.quadraticCurveTo(-6, browY - 4, -10, browY + 1);
                ctx.moveTo(2, browY); ctx.quadraticCurveTo(6, browY - 4, 10, browY + 1);
            } else {
                ctx.moveTo(-2, browY); ctx.lineTo(-10, browY);
                ctx.moveTo(2, browY); ctx.lineTo(10, browY);
            }
            ctx.stroke();
        }

        /* Mouth */
        const mouthY = 12;
        ctx.fillStyle = data.mouth.color; ctx.strokeStyle = data.mouth.color; ctx.lineWidth = 2;
        ctx.beginPath();
        if (data.mouth.style === 'smile') {
            ctx.arc(0, mouthY, 6, 0.2, Math.PI - 0.2); ctx.stroke();
        } else if (data.mouth.style === 'frown') {
            ctx.arc(0, mouthY + 6, 6, Math.PI + 0.2, -0.2); ctx.stroke();
        } else if (data.mouth.style === 'open') {
            ctx.ellipse(0, mouthY + 3, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.moveTo(-4, mouthY + 3); ctx.lineTo(4, mouthY + 3); ctx.stroke();
        }

        /* Glasses */
        if (data.glasses.style !== 'none') {
            ctx.fillStyle = data.glasses.color;
            if (data.glasses.style === 'shades') {
                ctx.globalAlpha = 0.9;
                ctx.fillRect(-16, eyeY - 3, 14, 8); ctx.fillRect(2, eyeY - 3, 14, 8);
                ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.moveTo(-16, eyeY); ctx.lineTo(16, eyeY); ctx.stroke();
                ctx.globalAlpha = 1.0;
            } else if (data.glasses.style === 'visor') {
                ctx.fillStyle = data.glasses.color;
                ctx.fillRect(-18, eyeY - 6, 36, 12);
            } else if (data.glasses.style === 'nerd') {
                ctx.strokeStyle = data.glasses.color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(-8, eyeY, 7, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(8, eyeY, 7, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-1, eyeY); ctx.lineTo(1, eyeY); ctx.stroke();
            }
        }

        // Helmet (Layer 2)
        if (hasHelmet) {
            ctx.fillStyle = data.helmet.color;
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath();
            if (data.helmet.style === 'tactical') {
                ctx.arc(0, -10, 20, Math.PI, 0);
                ctx.lineTo(20, -2); ctx.lineTo(-20, -2); ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Detail
                ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-16, 10); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(16, 10); ctx.stroke();
            } else if (data.helmet.style === 'cap') {
                ctx.arc(0, -10, 19, Math.PI, 0);
                ctx.lineTo(19, -4); ctx.lineTo(-19, -4); ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Bill
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.rect(-18, -5, 36, 4); ctx.fill();
            } else if (data.helmet.style === 'pilot') {
                ctx.fillStyle = data.helmet.color;
                ctx.beginPath(); ctx.arc(0, -5, 22, Math.PI, 0); ctx.lineTo(22, 10); ctx.lineTo(-22, 10); ctx.fill(); ctx.stroke();
            }
        }

        ctx.restore(); // End Head
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

        // Save locally
        localStorage.setItem('mm_customization', JSON.stringify(data));
        localStorage.setItem('mm_username', nameInput);
        this.username = nameInput;

        // Emit update to server
        this.socket.emit('update_profile', {
            username: nameInput,
            color: data.shirt.color, // Fallback for simple games
            customization: data
        });

        // Note: Panel navigation moved to socket listener on success
    }

    quickJoin() {
        // Request lobbies list
        this.socket.emit('get_lobbies');
        this.showPanel('join-room-panel');
        document.getElementById('room-list').innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Fetching operations...</div>';

        // UI Adjustments for Quick Play
        document.querySelector('#join-room-panel h2').innerText = 'QUICK JOIN';
        document.getElementById('manual-join-form').style.display = 'none';
        document.getElementById('quick-play-back-btn').style.display = 'block';
    }

    openJoinMenu() {
        this.showPanel('join-room-panel');
        // UI Adjustments for Manual Join
        document.querySelector('#join-room-panel h2').innerText = 'JOIN OPERATION';
        document.getElementById('manual-join-form').style.display = 'block';
        document.getElementById('quick-play-back-btn').style.display = 'none';
        document.getElementById('room-list').innerHTML = ''; // Clear list in manual mode? Or maybe list is useful?
        // Let's clear it to avoid confusion or stale data
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
            map: 'catacombs', // Survival typically in catacombs?
            maxPlayers: 1,
            autoStart: true,
            gameMode: 'survival'
        });
    }
}
