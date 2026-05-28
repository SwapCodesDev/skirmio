# Deployment Guide - Deploying Skirmio on Render.com

Skirmio is a real-time multiplayer game powered by a Node.js backend and Socket.io (WebSockets). This guide details the step-by-step process of deploying the game completely free on **Render.com**, which fully supports WebSockets and automatically syncs with your GitHub repository.

---

## Technical Prerequisites (Already Configured)
The codebase is fully production-ready for Render:
1. **Dynamic Port Allocation**: [server.js](file:///d:/Projects/skirmio/server.js) dynamically binds to `process.env.PORT || 3000`. Render will assign a port dynamically at runtime.
2. **Relative Client Connection**: [main.js](file:///d:/Projects/skirmio/public/js/main.js) connects using `const socket = io();`. Because the frontend is served by the same server hosting the WebSockets, it automatically connects to your Render production URL without requiring code changes.

---

## Step-by-Step Render Deployment Guide

### Step 1: Push Code to GitHub
1. Create a new repository on GitHub (public or private).
2. Initialize Git in your local project folder and push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 2: Create a Render Account
1. Visit [https://render.com](https://render.com) and click **Sign Up**.
2. Sign up using your **GitHub** account to allow easy repository linking.

### Step 3: Create a New Web Service
1. In the Render Dashboard, click **New +** (top right) and select **Web Service**.
2. Under **Connect a repository**, select your `skirmio` repository.
3. Configure the following deployment settings:
   * **Name**: `skirmio` (or any custom name).
   * **Region**: Select the region geographically closest to you and your players (e.g., Singapore for Asia, Frankfurt for Europe, Oregon/Ohio for the US) to ensure low ping during multiplayer matches.
   * **Branch**: `main`.
   * **Runtime**: `Node`.
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: Select **Free**.

### Step 4: Deploy Your App
1. Click **Create Web Service** at the bottom of the page.
2. Render will automatically fetch your code, run `npm install`, and launch the server.
3. Once the logs show `Server running on port 3000` and the status changes to `Live`, your game is online.
4. Your unique production URL will be displayed at the top of the Render dashboard page (e.g., `https://skirmio.onrender.com`).

---

## Technical Details Specific to Render Free Tier

### 1. Cold Start Behavior (Sleeping)
* **Behavior**: Render’s free tier Web Services go to "sleep" after 15 minutes of inactivity (no visitors).
* **Impact**: When the next player visits the game site, it takes approximately 50 seconds for the instance to boot back up. 
* **Gameplay**: Once the server wakes up and the page loads, WebSockets will connect and gameplay will run smoothly.

### 2. Ephemeral Local File System (Database Persistence)
* **Behavior**: Render Free Tier instances use an ephemeral file system. Every time the server goes to sleep, restarts, or you redeploy code, any modifications to local files are lost.
* **Impact on Skirmio**: Local database changes (saves to `server/database.json` containing registered profiles and friends lists) will reset to the original file content.
* **Free Solution for Full Persistence**:
  If you want user accounts to persist forever on the free tier, you can integrate a free cloud database:
  1. **MongoDB Atlas** (Free M0 Sandbox): Integrate the `mongoose` or `mongodb` package in Node.js.
  2. **Supabase / PostgreSQL** (Free Tier): Use `pg` or an ORM like Prisma.
  Both MongoDB and Supabase provide excellent free tiers that do not reset and link cleanly with your Render app using environment variables.
