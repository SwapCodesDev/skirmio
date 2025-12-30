const db = require('./server/db');
const crypto = require('crypto');

const MAX_DAMAGE = 100;
const MAX_HIT_DISTANCE_SQ = 4000000;


class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = {}; // { roomID: { name, password, players: [], map, maxPlayers, state } }
        this.socketToRoom = {}; // Cache map
        this.socketToUser = {}; // Map socket -> username
        this.userToSocket = new Map(); // Map username -> socketId (Reverse index for O(1) lookup)
        this.rateLimiters = new Map(); // socketId -> { event: timestamp }

        // Start Cleanup Interval (every 1 min)
        setInterval(() => this.cleanupStaleRooms(), 60000);
    }

    handleConnection(socket) {
        console.log('User connected:', socket.id);

        // Login / Register (Auto-based on emit)
        socket.on('login', (username) => {
            if (!username) return;

            // Simple "Auth": Prevent hijacking active sessions
            // Real auth needs tokens, but for now verify if name is taken locally
            if (this.userToSocket.has(username)) {
                socket.emit('error_message', 'User already logged in.');
                return;
            }

            const user = db.createUser(username);
            this.socketToUser[socket.id] = username;
            this.userToSocket.set(username, socket.id);

            // Send back full user data (friends, requests)
            socket.emit('user_data', user);

            // Join a global lobby channel for presence?
            socket.join('global_lobby');
        });

        // Profile Update
        socket.on('update_profile', (data) => {
            const oldName = this.socketToUser[socket.id];
            if (!oldName) return;

            const result = db.updateUser(oldName, data.username, data.color, data.customization);
            if (result.success) {
                this.socketToUser[socket.id] = data.username; // Update session
                socket.emit('profile_update_result', { success: true, msg: 'Updated and Saved Successfully' });
            } else {
                socket.emit('profile_update_result', { success: false, msg: result.msg });
            }
        });

        // Friend Logic
        socket.on('add_friend', (targetName) => {
            const myName = this.socketToUser[socket.id];
            if (!myName) return;

            const result = db.addFriendRequest(myName, targetName);
            if (result === true) {
                socket.emit('friend_result', { success: true, msg: `Request sent to ${targetName}` });
                // Notify target if online
                this.notifyUser(targetName, 'friend_request', { from: myName });
            } else {
                socket.emit('friend_result', { success: false, msg: result });
            }
        });

        socket.on('accept_friend', (requester) => {
            const myName = this.socketToUser[socket.id];
            if (db.acceptFriendRequest(myName, requester)) {
                // Return updated data to both
                socket.emit('user_data', db.getUser(myName));
                this.notifyUser(requester, 'user_data', db.getUser(requester));
                this.notifyUser(requester, 'friend_accepted', { from: myName });
            }
        });

        socket.on('send_invite', (data) => {
            const myName = this.socketToUser[socket.id];
            const targetName = data.targetName;

            // O(1) Room Lookup
            const roomId = this.socketToRoom[socket.id];

            if (roomId && targetName) {
                this.notifyUser(targetName, 'invitation', { from: myName, room: roomId });
            } else {
                socket.emit('error_message', 'You must be in a room to invite.');
            }
        });

        socket.on('create_room', (data) => this.createRoom(socket, data));
        socket.on('join_room', (data) => this.joinRoom(socket, data));
        socket.on('start_game', () => this.startGame(socket));
        socket.on('player_update', (data) => this.handlePlayerUpdate(socket, data));
        socket.on('shoot', (data) => this.handleShoot(socket, data));
        socket.on('player_hit', (data) => this.handleHit(socket, data));
        socket.on('toggle_ready', () => this.toggleReady(socket));
        socket.on('leave_room', () => this.leaveRoom(socket));
        socket.on('disconnect', () => {
            const username = this.socketToUser[socket.id];
            if (username) {
                this.userToSocket.delete(username);
                delete this.socketToUser[socket.id];
            }
            this.rateLimiters.delete(socket.id);
            this.leaveRoom(socket);
        });
        socket.on('get_lobbies', () => this.sendLobbies(socket));
    }

    async createRoom(socket, { roomName, password, map, maxPlayers, autoStart, username, gameMode }) {
        const roomId = crypto.randomUUID();


        if (this.rooms[roomId]) {
            socket.emit('error_message', 'Room already exists');
            return;
        }

        this.rooms[roomId] = {
            id: roomId,
            name: roomName,
            hostId: socket.id, // Set Creator as Host
            password: password,
            map: map,
            maxPlayers: maxPlayers,
            players: {},
            scores: {},
            state: 'waiting',
            lastActivity: Date.now(),
            gameMode: gameMode || 'multiplayer'
        };

        await this.joinRoom(socket, { roomId: roomId, password: password, username: username });

        if (autoStart) {
            this.startGame(socket);
        }
    }

    async joinRoom(socket, { roomId, password, username }) {
        const room = this.rooms[roomId];
        if (!room) {
            socket.emit('error_message', 'Room not found');
            return;
        }

        if (room.password && room.password !== password) {
            socket.emit('error_message', 'Incorrect password');
            return;
        }

        if (Object.keys(room.players).length >= room.maxPlayers) {
            socket.emit('error_message', 'Room is full');
            return;
        }

        // Leave previous room if any
        if (this.socketToRoom[socket.id]) {
            this.leaveRoom(socket);
        }

        await socket.join(roomId);

        // Update Cache
        this.socketToRoom[socket.id] = roomId;

        console.log(`Socket ${socket.id} joined room ${roomId} (Socket.io room size: ${this.io.sockets.adapter.rooms.get(roomId)?.size})`);

        const isHost = (socket.id === room.hostId);
        // Use provided username, fallback to session, fallback to default
        const playerUsername = username || this.socketToUser[socket.id] || `Player ${socket.id.substr(0, 4)}`;

        // Update session if provided (re-sync)
        if (username) this.socketToUser[socket.id] = username;

        room.players[socket.id] = {
            id: socket.id,
            username: playerUsername,
            isHost: isHost,
            isReady: isHost, // Host is ready by default
            x: 100 + Math.random() * 400,
            y: 200,
            health: 100, // Explicit init
            rotation: 0
        };

        socket.emit('room_joined', {
            roomName: room.name,
            map: room.map,
            players: room.players,
            hostId: room.hostId,
            gameMode: room.gameMode
        });

        // Broadcast to others
        socket.to(roomId).emit('player_joined', room.players[socket.id]);
        console.log(`Emitting player_joined for ${playerUsername} (${socket.id}) to room ${roomId}`);

        // If game is already playing, send game_started to the new joiner
        if (room.state === 'playing') {
            socket.emit('game_started', {
                name: room.name,
                map: room.map,
                players: room.players,
                scores: room.scores // Sync scores
            });
        } else {
            // Broadcast full lobby update to everyone so they see new player/statuses
            this.io.to(roomId).emit('lobby_update', room.players);
        }
    }

    toggleReady(socket) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];
        if (room.players[socket.id]) {
            room.players[socket.id].isReady = !room.players[socket.id].isReady;
            this.io.to(roomId).emit('lobby_update', room.players);
        }
    }

    startGame(socket) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];

        // Check Host
        if (room.hostId !== socket.id) {
            return;
        }

        // Check All Ready
        const allReady = Object.values(room.players).every(p => p.isReady);
        if (!allReady) {
            socket.emit('error_message', 'Not all players are ready!');
            return;
        }

        this.rooms[roomId].state = 'playing';
        // init scores
        if (!this.rooms[roomId].scores) this.rooms[roomId].scores = {};
        for (let pid in this.rooms[roomId].players) {
            if (!this.rooms[roomId].scores[pid]) {
                const p = this.rooms[roomId].players[pid];
                this.rooms[roomId].scores[pid] = { kills: 0, deaths: 0, name: p.username || pid.substr(0, 4) };
            }
        }

        this.io.to(roomId).emit('game_started', {
            name: this.rooms[roomId].name,
            map: this.rooms[roomId].map,
            players: this.rooms[roomId].players
        });
    }

    handlePlayerUpdate(socket, data) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];
        const player = room.players[socket.id];

        if (player) {
            // Internal Reconcilliation / Whitelist
            if (Number.isFinite(data.x)) player.x = data.x;
            if (Number.isFinite(data.y)) player.y = data.y;
            if (Number.isFinite(data.rotation)) player.rotation = data.rotation;
            // Add velocity if needed for server-side prediction
            if (Number.isFinite(data.velocityX)) player.velocityX = data.velocityX;
            if (Number.isFinite(data.velocityY)) player.velocityY = data.velocityY;

            // Broadcast to others in room
            socket.to(roomId).emit('player_moved', {
                id: socket.id,
                x: player.x,
                y: player.y,
                rotation: player.rotation,
                velocityX: player.velocityX,
                velocityY: player.velocityY
            });

            // Update Activity
            room.lastActivity = Date.now();
        }
    }

    handleShoot(socket, data) {
        if (!this.checkRateLimit(socket.id, 'shoot', 200)) return; // 5 shots/sec max

        const roomId = this.socketToRoom[socket.id];
        if (roomId && this.rooms[roomId]) {
            socket.to(roomId).emit('player_shoot', {
                id: socket.id,
                ...data
            });
        }
    }

    handleHit(socket, data) {
        // data: { targetId, damage }
        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];
        const shooter = room.players[socket.id];
        const target = room.players[data.targetId];

        if (shooter && target) {
            if (!this.checkRateLimit(socket.id, 'hit', 100)) return;

            // Security: Distance Check
            // Calculate distance between shooter and target if positions are available
            if (shooter.x !== undefined && target.x !== undefined) {
                const dx = shooter.x - target.x;
                const dy = shooter.y - target.y; // Assuming y is tracked
                const distSq = dx * dx + dy * dy;

                // Strict server-side distance check
                if (distSq > MAX_HIT_DISTANCE_SQ) {
                    console.log(`[Cheat Detection] Suspicious hit from ${socket.id} on ${data.targetId}. Dist: ${Math.sqrt(distSq)}`);
                    return; // Ignore hit
                }
            }

            // Server-determined damage or capped damage
            const damage = Math.min(data.damage || 0, MAX_DAMAGE);
            if (damage <= 0) return;

            target.health = (target.health || 100) - damage;

            // Broadcast Health Update
            this.io.to(roomId).emit('player_health_update', {
                id: data.targetId,
                health: target.health
            });

            if (target.health <= 0) {
                target.health = 100; // Respawn logic

                // Update Scores
                const scores = room.scores;
                if (scores[data.targetId]) scores[data.targetId].deaths++;
                if (scores[socket.id]) scores[socket.id].kills++;

                // Broadcast Respawn & Score
                this.io.to(roomId).emit('player_respawn', { id: data.targetId, x: 100 + Math.random() * 600, y: 100 });
                this.io.to(roomId).emit('score_update', scores);
            }
        }
    }

    leaveRoom(socket) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId) return; // Not in a room

        const room = this.rooms[roomId];
        if (room && room.players[socket.id]) {
            console.log(`Socket ${socket.id} leaving room ${roomId}`);
            delete room.players[socket.id];
            delete this.socketToRoom[socket.id]; // Clear Cache

            socket.leave(roomId);
            socket.to(roomId).emit('player_left', socket.id);

            // Cleanup empty rooms
            if (Object.keys(room.players).length === 0) {
                delete this.rooms[roomId];
            } else {
                // If Host Left, assign new host
                if (room.hostId === socket.id) {
                    const remainingIds = Object.keys(room.players);
                    if (remainingIds.length > 0) {
                        room.hostId = remainingIds[0];
                        room.players[room.hostId].isHost = true;
                        // Do NOT force ready, let them decide
                        // room.players[room.hostId].isReady = true; 
                    }
                }
                this.io.to(roomId).emit('lobby_update', room.players);
            }
        }
    }

    cleanupStaleRooms() {
        const now = Date.now();
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            // If empty or inactive for 30 mins
            if (Object.keys(room.players).length === 0) {
                console.log(`Cleaning up empty room ${roomId}`);
                delete this.rooms[roomId];
            } else if (now - room.lastActivity > 1800000) { // 30 mins
                // Force close stales? Or just log? For now, if players are there, maybe don't kill it unless we want to enforce timeouts.
                // Let's just track empty ones primarily or really old ones.
            }
        }
    }
    notifyUser(username, event, data) {
        const socketId = this.userToSocket.get(username);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    checkRateLimit(socketId, eventType, minIntervalMs = 100) {
        if (!this.rateLimiters.has(socketId)) {
            this.rateLimiters.set(socketId, {});
        }
        const userLimits = this.rateLimiters.get(socketId);
        const now = Date.now();
        const last = userLimits[eventType] || 0;

        if (now - last < minIntervalMs) {
            return false;
        }
        userLimits[eventType] = now;
        return true;
    }

    sendLobbies(socket) {
        const lobbyList = [];
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            const playerCount = Object.keys(room.players).length;

            // Filter: No password, Not Full, Multiplayer Only
            if (!room.password && room.gameMode === 'multiplayer' && playerCount < room.maxPlayers) {
                lobbyList.push({
                    id: roomId,
                    name: room.name,
                    playerCount: playerCount,
                    maxPlayers: room.maxPlayers,
                    state: room.state,
                    map: room.map
                });
            }
        }
        socket.emit('lobbies_list', lobbyList);
    }
}

module.exports = GameManager;
