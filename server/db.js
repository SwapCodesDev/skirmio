const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

class Database {
    constructor() {
        this.data = { users: {} };
        this.load();
    }

    load() {
        if (!fs.existsSync(DB_PATH)) {
            this.save();
        } else {
            try {
                const raw = fs.readFileSync(DB_PATH, 'utf8');
                this.data = JSON.parse(raw);
            } catch (e) {
                console.error("Error reading DB", e);
                this.data = { users: {} };
            }
        }
    }

    save() {
        fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 4));
    }

    getUser(username) {
        return this.data.users[username];
    }

    createUser(username) {
        if (!this.data.users[username]) {
            this.data.users[username] = {
                username: username,
                friends: [],
                requests: [],
                stats: { kills: 0, deaths: 0 }
            };
            this.save();
        }
        return this.data.users[username];
    }

    addFriendRequest(proposer, target) {
        if (proposer === target) return 'cannot_add_self';
        if (!this.data.users[target]) return false;


        if (this.data.users[target].friends.includes(proposer)) return 'already_friends';


        if (this.data.users[target].requests.includes(proposer)) return 'already_requested';

        this.data.users[target].requests.push(proposer);
        this.save();
        return true;
    }

    acceptFriendRequest(username, requester) {
        const user = this.data.users[username];
        const friend = this.data.users[requester];
        if (!user || !friend) return false;


        user.requests = user.requests.filter(r => r !== requester);


        if (!user.friends.includes(requester)) user.friends.push(requester);
        if (!friend.friends.includes(username)) friend.friends.push(username);

        this.save();
        return true;
    }

    updateUser(oldName, newName, color, customization) {
        const user = this.data.users[oldName];
        if (!user) return { success: false, msg: 'User not found' };


        user.color = color;
        if (customization) {
            user.customization = customization;
        }

        if (oldName !== newName) {

            if (this.data.users[newName]) {
                return { success: false, msg: 'Name already taken' };
            }


            this.data.users[newName] = user;
            user.username = newName;
            delete this.data.users[oldName];
        }

        this.save();
        return { success: true };
    }
}

module.exports = new Database();
