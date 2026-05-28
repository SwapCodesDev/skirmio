const db = require('./db');

class GameManager {
    constructor(io) {
        this.io = io;
        this.rooms = {};
        this.socketToRoom = {};
        this.socketToUser = {};
    }

    handleConnection(socket) {
        console.log('User connected:', socket.id);


        socket.on('login', (username) => {
            if (!username) return;
            const user = db.createUser(username);
            this.socketToUser[socket.id] = username;


            socket.emit('user_data', user);


            socket.join('global_lobby');
        });


        socket.on('update_profile', (data) => {
            const oldName = this.socketToUser[socket.id];
            if (!oldName) return;

            const result = db.updateUser(oldName, data.username, data.color, data.customization);
            if (result.success) {
                this.socketToUser[socket.id] = data.username;
                socket.emit('profile_update_result', { success: true, msg: 'Updated and Saved Successfully' });


                const roomId = this.socketToRoom[socket.id];
                if (roomId && this.rooms[roomId]) {
                    const room = this.rooms[roomId];
                    const player = room.players[socket.id];
                    if (player) {
                        player.username = data.username;
                        player.customization = data.customization;

                        this.io.to(roomId).emit('lobby_update', room.players);
                    }
                }
            } else {
                socket.emit('profile_update_result', { success: false, msg: result.msg });
            }
        });


        socket.on('add_friend', (targetName) => {
            const myName = this.socketToUser[socket.id];
            if (!myName) return;

            const result = db.addFriendRequest(myName, targetName);
            if (result === true) {
                socket.emit('friend_result', { success: true, msg: `Request sent to ${targetName}` });

                this.notifyUser(targetName, 'friend_request', { from: myName });
            } else {
                socket.emit('friend_result', { success: false, msg: result });
            }
        });

        socket.on('accept_friend', (requester) => {
            const myName = this.socketToUser[socket.id];
            if (db.acceptFriendRequest(myName, requester)) {

                socket.emit('user_data', db.getUser(myName));
                this.notifyUser(requester, 'user_data', db.getUser(requester));
                this.notifyUser(requester, 'friend_accepted', { from: myName });
            }
        });

        socket.on('send_invite', (data) => {
            const myName = this.socketToUser[socket.id];
            const targetName = data.targetName;


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
        socket.on('bot_killed', () => {
            const roomId = this.socketToRoom[socket.id];
            if (!roomId || !this.rooms[roomId]) return;
            const room = this.rooms[roomId];
            const scores = room.scores;
            if (scores && scores[socket.id]) {
                scores[socket.id].kills++;
                this.io.to(roomId).emit('score_update', scores);
            }
        });
        socket.on('disconnect', () => {
            this.leaveRoom(socket);
            delete this.socketToUser[socket.id];
            delete this.socketToRoom[socket.id];
        });
        socket.on('get_lobbies', () => this.sendLobbies(socket));
    }

    async createRoom(socket, { roomName, password, map, maxPlayers, autoStart, username, gameMode }) {
        const roomId = roomName;

        if (this.rooms[roomId]) {
            socket.emit('error_message', 'Room already exists');
            return;
        }

        this.rooms[roomId] = {
            id: roomId,
            name: roomName,
            hostId: socket.id,
            password: password,
            map: map,
            maxPlayers: maxPlayers,
            players: {},
            scores: {},
            state: 'waiting',
            gameMode: gameMode || 'multiplayer'
        };

        await this.joinRoom(socket, { roomName: roomId, password: password, username: username });

        if (autoStart) {
            this.startGame(socket);
        }
    }

    async joinRoom(socket, { roomName, password, username }) {
        const room = this.rooms[roomName];
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


        if (this.socketToRoom[socket.id]) {
            this.leaveRoom(socket);
        }

        await socket.join(roomName);


        this.socketToRoom[socket.id] = roomName;

        console.log(`Socket ${socket.id} joined room ${roomName} (Socket.io room size: ${this.io.sockets.adapter.rooms.get(roomName)?.size})`);

        const isHost = (socket.id === room.hostId);

        const playerUsername = username || this.socketToUser[socket.id] || `Player ${socket.id.substr(0, 4)}`;


        if (username) this.socketToUser[socket.id] = username;


        const dbUser = db.getUser(playerUsername);
        const customization = dbUser?.customization || { shirt: { color: dbUser?.color || '#ff0000' } };

        room.players[socket.id] = {
            id: socket.id,
            username: playerUsername,
            isHost: isHost,
            isReady: isHost,
            x: 100 + Math.random() * 400,
            y: 200,
            health: 100,
            rotation: 0,
            customization: customization
        };

        socket.emit('room_joined', {
            roomName: room.name,
            map: room.map,
            players: room.players,
            hostId: room.hostId,
            gameMode: room.gameMode
        });


        socket.to(roomName).emit('player_joined', room.players[socket.id]);
        console.log(`Emitting player_joined for ${playerUsername} (${socket.id}) to room ${roomName}`);


        if (room.state === 'playing') {
            socket.emit('game_started', {
                name: room.name,
                map: room.map,
                players: room.players
            });
            socket.emit('score_update', room.scores);
        } else {

            this.io.to(roomName).emit('lobby_update', room.players);
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


        if (room.hostId !== socket.id) {
            return;
        }


        const allReady = Object.values(room.players).every(p => p.isReady);
        if (!allReady) {
            socket.emit('error_message', 'Not all players are ready!');
            return;
        }

        this.rooms[roomId].state = 'playing';

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
        this.io.to(roomId).emit('score_update', this.rooms[roomId].scores);
    }

    handlePlayerUpdate(socket, data) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];
        const player = room.players[socket.id];

        if (player) {

            Object.assign(player, data);


            socket.to(roomId).emit('player_moved', {
                id: socket.id,
                ...data
            });
        }
    }

    handleShoot(socket, data) {
        const roomId = this.socketToRoom[socket.id];
        if (roomId && this.rooms[roomId]) {
            socket.to(roomId).emit('player_shoot', {
                id: socket.id,
                ...data
            });
        }
    }

    handleHit(socket, data) {

        const roomId = this.socketToRoom[socket.id];
        if (!roomId || !this.rooms[roomId]) return;

        const room = this.rooms[roomId];
        const shooter = room.players[socket.id];
        const target = room.players[data.targetId];

        if (shooter && target) {


            if (shooter.x !== undefined && target.x !== undefined) {
                const dx = shooter.x - target.x;
                const dy = shooter.y - target.y;
                const distSq = dx * dx + dy * dy;



                if (distSq > 4000000) {
                    console.log(`[Cheat Detection] Suspicious hit from ${socket.id} on ${data.targetId}. Dist: ${Math.sqrt(distSq)}`);
                    return;
                }
            }

            target.health = (target.health || 100) - data.damage;


            this.io.to(roomId).emit('player_health_update', {
                id: data.targetId,
                health: target.health
            });

            if (target.health <= 0) {
                target.health = 100;

                this.io.to(roomId).emit('player_health_update', {
                    id: data.targetId,
                    health: 100
                });

                const scores = room.scores;
                if (scores[data.targetId]) scores[data.targetId].deaths++;
                if (socket.id !== data.targetId) {
                    if (scores[socket.id]) scores[socket.id].kills++;
                }

                this.io.to(roomId).emit('player_respawn', { id: data.targetId, x: 100 + Math.random() * 600, y: 100 });
                this.io.to(roomId).emit('score_update', scores);
            }
        }
    }

    leaveRoom(socket) {
        const roomId = this.socketToRoom[socket.id];
        if (!roomId) return;

        const room = this.rooms[roomId];
        if (room && room.players[socket.id]) {
            console.log(`Socket ${socket.id} leaving room ${roomId}`);
            delete room.players[socket.id];
            delete this.socketToRoom[socket.id];

            socket.leave(roomId);
            socket.to(roomId).emit('player_left', socket.id);


            if (Object.keys(room.players).length === 0) {
                delete this.rooms[roomId];
            } else {

                if (room.hostId === socket.id) {
                    const remainingIds = Object.keys(room.players);
                    if (remainingIds.length > 0) {
                        room.hostId = remainingIds[0];
                        room.players[room.hostId].isHost = true;
                        room.players[room.hostId].isReady = true;
                    }
                }
                this.io.to(roomId).emit('lobby_update', room.players);
            }
        }
    }

    notifyUser(username, event, data) {


        for (const [sid, name] of Object.entries(this.socketToUser)) {
            if (name === username) {
                this.io.to(sid).emit(event, data);
            }
        }
    }

    sendLobbies(socket) {
        const lobbyList = [];
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            const playerCount = Object.keys(room.players).length;


            if (!room.password && room.gameMode === 'multiplayer' && playerCount < room.maxPlayers) {
                lobbyList.push({
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
