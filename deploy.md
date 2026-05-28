# Deployment Guide - Deploying Skirmio on Free Hosting

Skirmio is a real-time multiplayer game powered by a Node.js backend and Socket.io (WebSockets). Standard static hosting platforms (such as GitHub Pages, Netlify, or static Vercel) **will not work** because Socket.io requires a persistent, running server process to manage game state and bridge player connections.

Below are step-by-step instructions to deploy Skirmio completely free on modern cloud hosting providers that fully support WebSockets.

---

## Technical Prerequisites (Already Configured)
The codebase is fully production-ready:
1. **Dynamic Port Allocation**: [server.js](file:///d:/Projects/skirmio/server.js) dynamically binds to `process.env.PORT || 3000`. This allows the host platform to assign ports dynamically.
2. **Relative Client Connection**: [main.js](file:///d:/Projects/skirmio/public/js/main.js) connects using `const socket = io();`. Because the frontend is served by the same server hosting the WebSockets, it automatically connects to your production URL without requiring code changes.

---

## Option 1: Render.com (Easiest & Automated)
Render is a fully free cloud platform that links directly to your GitHub repository and redeploys automatically whenever you push code changes.

### Step-by-Step Guide:
1. **Push Code to GitHub**:
   - Create a new public or private repository on GitHub.
   - Push your `skirmio` workspace code to your repository.

2. **Create a Render Account**:
   - Go to [https://render.com](https://render.com) and sign up using your GitHub account.

3. **Deploy a New Web Service**:
   - In the Render Dashboard, click **New +** and select **Web Service**.
   - Connect your GitHub repository.
   - Configure the following settings:
     - **Name**: `skirmio` (or any unique name).
     - **Region**: Select the region closest to your player base (e.g., Oregon, Frankfurt, Singapore) for lower ping.
     - **Branch**: `main` (or your active repository branch).
     - **Runtime**: `Node`.
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Select the **Free** plan.

4. **Verify WebSocket Support**:
   - Render automatically supports WebSockets out-of-the-box. There is no additional configuration required.

5. **Deploy**:
   - Click **Create Web Service**. Render will build and deploy your app.
   - Once completed, your live URL will be shown at the top of the dashboard (e.g., `https://skirmio.onrender.com`).

> [!NOTE]
> Render's free tier VM spins down (goes to sleep) after 15 minutes of inactivity. When a new player visits the site after it is asleep, it will take about 50 seconds to spin back up, after which game sessions will run smoothly.

---

## Option 2: Fly.io (Best Performance for Low Latency)
Fly.io runs applications on micro-VMs in regions worldwide. It has a generous free tier allowance (3 shared-cpu VMs, 3GB volume storage, and 160GB outbound data) and offers superb, low-latency WebSocket connection performance.

### Step-by-Step Guide:
1. **Install Flyctl CLI**:
   - On Windows, open PowerShell and run:
     ```powershell
     iwr https://fly.io/install.ps1 -useb | iex
     ```
   - Restart your terminal after installation to load the path.

2. **Log In or Sign Up**:
   - Run the following command and authenticate in your browser:
     ```bash
     fly auth signup
     ```
   - (Or `fly auth login` if you already have an account).

3. **Initialize App Configuration**:
   - Navigate to your project directory and run:
     ```bash
     fly launch
     ```
   - This command scans your project, detects that it is a Node.js application, and creates a configuration file (`fly.toml`) and a `Dockerfile` for you.
   - **Configuration prompts**:
     - *Choose an app name*: Press Enter for auto-generated or input a custom name.
     - *Select organization*: Select your personal organization.
     - *Select region*: Pick a region closest to your target players.
     - *Would you like to set up a Postgres database?* No.
     - *Would you like to set up an Upstash Redis database?* No.
     - *Would you like to deploy now?* No (we will double-check port bindings first).

4. **Verify Port Mappings in `fly.toml`**:
   - Open the generated `fly.toml` in your editor. Ensure that the internal port under `[http_service]` is mapped to `3000` (which is the default port in `server.js`):
     ```toml
     [http_service]
       internal_port = 3000
       force_https = true
       auto_start_machines = true
       auto_stop_machines = true
     ```

5. **Deploy**:
   - Run:
     ```bash
     fly deploy
     ```
   - Once the deployment finishes, you can open your live game in the browser by running:
     ```bash
     fly open
     ```

---

## Troubleshooting & Latency Optimization

### Minimizing Latency (Ping)
Because Skirmio is an action game, lower latency is critical for smooth gameplay.
- **Select the Right Region**: When deploying on Render or Fly.io, always choose the region geographically closest to your physical location or your player base.
- **Avoid VPNs**: Turn off active VPNs when playing to prevent routing delays.

### Database Persistence
Currently, Skirmio uses a simple, local JSON-file database (`server/database.json`) to persist profile saves and friends list data.
* **On Render Free Tier**: The local file system is ephemeral. Any data saved to `database.json` will be reset whenever your Render instance sleeps or redeploys. To make it persistent on Render without paying, you can easily integrate a free database cloud provider like MongoDB Atlas or Supabase.
* **On Fly.io**: You can attach a free 1GB persistent volume to your VM to keep the `database.json` file safe across restarts.
