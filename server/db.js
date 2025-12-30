const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

class Database {
    constructor() {
        this.data = { users: {} };
        this.load();
    }

    load() {
        try {
            if (!fs.existsSync(DB_PATH)) {
                console.log('Database file not found, creating new one...');
                this.save(); // Create if not exists
            } else {
                try {
                    const raw = fs.readFileSync(DB_PATH, 'utf8');
                    this.data = JSON.parse(raw);
                    console.log('Database loaded successfully.');
                } catch (e) {
                    console.error("Error reading DB file, resetting to empty:", e);
                    this.data = { users: {} };
                }
            }
        } catch (err) {
            console.error("CRITICAL DB LOAD ERROR:", err);
            this.data = { users: {} };
        }
    }

    save() {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 4));
        } catch (err) {
            console.error("Error writing to DB:", err);
        }
    }

    getUser(username) {
        return this.data.users[username];
    }

    createUser(username) {
        if (!this.data.users[username]) {
            this.data.users[username] = {
                username: username,
                friends: [],
                requests: [], // Pending received requests
                stats: { kills: 0, deaths: 0 }
            };
            this.save();
        }
        return this.data.users[username];
    }

    addFriendRequest(proposer, target) {
        if (!this.data.users[target]) return false; // Target doesn't exist

        // Check if already friends
        if (this.data.users[target].friends.includes(proposer)) return 'already_friends';

        // Check if already requested
        if (this.data.users[target].requests.includes(proposer)) return 'already_requested';

        this.data.users[target].requests.push(proposer);
        this.save();
        return true;
    }

    acceptFriendRequest(username, requester) {
        const user = this.data.users[username];
        const friend = this.data.users[requester];
        if (!user || !friend) return false;

        // Remove from requests
        user.requests = user.requests.filter(r => r !== requester);

        // Add to friends lists (bidirectional)
        if (!user.friends.includes(requester)) user.friends.push(requester);
        if (!friend.friends.includes(username)) friend.friends.push(username);

        this.save();
        return true;
    }

    updateUser(oldName, newName, color, customization) {
        const user = this.data.users[oldName];
        if (!user) return { success: false, msg: 'User not found' };

        // Update persistence
        user.color = color;
        if (customization) {
            user.customization = customization;
        }

        if (oldName !== newName) {
            // Check if new name exists
            if (this.data.users[newName]) {
                return { success: false, msg: 'Name already taken' };
            }

            // Rename key
            this.data.users[newName] = user;
            user.username = newName;
            delete this.data.users[oldName];
        }

        this.save();
        return { success: true };
    }
}

module.exports = new Database();
