# 🚀 Skirmio

Skirmio is a premium, action-packed 2D multiplayer shooter web game built using **Phaser 3** and **Socket.io**. Take part in fast-paced tactical jungle warfare or underground cave skirmishes, battle against friends in real-time, or hone your skills against intelligent combat bots!

---

## ✨ Features

- **🎮 Real-Time Multiplayer**: Seamless room creation, lobby presence, ready/unready mechanics, and full matchmaking utilizing Socket.io.
- **🤖 Intelligent Bots & Survival Mode**: Battle against responsive, jetpack-equipped bots that chase, take cover, evade, and search for you across dynamic battlegrounds.
- **🛡️ Custom Operative Armory**: A fully customizable HTML5 canvas-driven wardrobe! Choose skin tones, hairstyles, shirts, tactical vests, gloves, helmets, shades, and boots with instant live preview.
- **🗺️ Interactive Arenas**:
  - **Outpost**: A lush jungle canopy designed for high-flying platform operations.
  - **Catacombs**: A dark, cavernous underground dungeon featuring uneven terrain and tactical choke points.
- **⚡ Advanced Physics**: Features fluid player momentum, double-thrust jetpack controllers with fuel conservation mechanics, visual recoil, and screen-shaking explosion effects.

---

## 🛠️ Tech Stack

- **Client**: HTML5 Canvas, Vanilla CSS (harmonious dark/glassmorphic theme), ES6 Javascript modules, and [Phaser 3](https://phaser.io/) Game Engine.
- **Server**: Node.js, [Express](https://expressjs.com/), and [Socket.io](https://socket.io/) for bidirectional real-time packet exchange.
- **Database**: A lightweight, file-based persistence layer (`database.json`) storing player statistics, customizing assets, and friend relationships.

---

## 🚀 Setup & Installation

Follow these quick steps to get the game running on your local machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### 1. Clone & Extract
Ensure all project files are located in your target directory:
```bash
cd skirmio
```

### 2. Install Dependencies
Install all required Node modules:
```bash
npm install
```

---

## 🎮 How to Play

### Running the Development Server
Start the local web server with **nodemon** enabled (which auto-reloads the server on code modifications):
```bash
npm run dev
```

### Running the Production Server
Start the server directly using standard Node:
```bash
npm start
```

Once started, open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🕹️ Controls

| Control | Action |
| --- | --- |
| **`A` / `D`** | Move Left / Right |
| **`W` / `Space`** | Jetpack Thrust (Uses fuel; recharges on ground) |
| **`Mouse Move`** | Aim Weapon (Operative eyes and gun follow pointer) |
| **`Left Click`** | Shoot Weapon |
| **`Tab`** | View Scoreboard (Hold to see Battle Log kills and deaths) |
| **`Esc` / `Abort`** | Leave Game and return to Multiplayer Lobby |

---

## 📂 Project Architecture

The project has been optimized into a clean, modular structure:

```text
skirmio/
├── public/                 # Client assets and game script entrypoints
│   ├── assets/             # Game audio, backgrounds, and sprites
│   ├── js/
│   │   ├── characters/     # Player, RemotePlayer, and Bot classes
│   │   ├── controls/       # Physics, Jetpacks, FX, and Map builders
│   │   ├── maps/           # Map layouts (Outpost, Catacombs)
│   │   ├── ui/             # Menu interfaces, HUD, and Canvas rendering
│   │   ├── game.js         # Core Phaser Game Scene
│   │   └── main.js         # Client-side configuration and entry point
│   ├── index.html          # Main HTML frame
│   └── style.css           # Premium glassmorphic styles and animations
├── server/                 # Backend business logic
│   ├── database.json       # Persisted user stats and friends lists
│   ├── db.js               # JSON Database manager
│   └── gameManager.js      # Socket.io connection, room, and match manager
├── server.js               # Server entry point
└── package.json            # Node project configuration
```
