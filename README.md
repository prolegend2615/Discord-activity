# Short Circuit (HTML5) - Discord Activity

> **A high-voltage turn-based bluffing & risk management duel game for Discord Activities and web browsers.**

![Short Circuit Banner](https://img.shields.io/badge/Discord-Activity-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Tech Stack](https://img.shields.io/badge/HTML5-Canvas%20%2F%20Web%20Audio-00ffcc?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Two runners sit across a workbench hooked to an experimental capacitor bank. Each round, an undisclosed sequence of **Live Wires** (damage) and **Dud Wires** (harmless) are randomized into the chamber. Players gamble on shocking themselves for bonus turns, or blast their rival with single-use tools to manipulate the odds.

---

## ⚡ Core Gameplay & Rules

### The Circuit Setup
- At the start of each round, the console displays the total wire pool (e.g. `⚡ 3 LIVE | ⚪ 2 DUD`).
- The chamber wires are shuffled secretly.
- 1–2 items are added to each player's toolbox (max inventory 4).

### Player Turn Choices
1. **Shock Opponent**:
   - **Live Wire**: Inflicts 1 HP damage (2 HP if Voltage Booster active) and passes turn.
   - **Dud Wire**: Harmless metallic click and passes turn.
2. **Shock Yourself (The Gambit)**:
   - **Live Wire**: Suffer 1 HP damage (2 HP if boosted) and turn passes.
   - **Dud Wire**: Suffer 0 damage **AND earn an immediate bonus turn**!

### 🧰 Toolbox Items
- 📟 **Multimeter (Scanner)**: Secretly reveals whether the active chamber wire is Live or Dud (visible only to the user).
- ✂️ **Wire Cutters**: Safely snips the active wire out of the system without firing it.
- ⚡ **Voltage Booster**: Overdrives capacitor cells so the next Live wire inflicts **2 HP damage** instead of 1.
- 🧤 **Insulated Glove**: Stuns the rival terminal, skipping their next turn action.

---

## 🤖 AI Bot ("BOLT-v9")
- Single-player offline mode against **BOLT-v9**.
- Calculates live probabilities of remaining Live vs. Dud wires.
- Strategically deploys tools (e.g., uses Multimeter, and if Dud is scanned, 100% self-shocks for the extra turn).
- Dynamic terminal chatter.

---

## 🎮 Discord Activities & Multiplayer
- **Discord Embedded App SDK**: Detects Discord contexts, loads player avatars, and triggers native Discord invite dialogs.
- **Discord TOS Compliant**: Pure skill/bluff gaming with virtual voltage health mechanics (no real-money gambling or predatory loops).
- **Hybrid Networking**:
  - WebSocket server for multi-device cross-network duel play.
  - Cross-tab `BroadcastChannel` fallback for 2-player testing in two tabs with zero setup.
- **Lobby Setup**:
  - Room code generation (`#X7K9P` with click-to-copy).
  - Seat 1 (Host) and Seat 2 (Opponent or `+ Add AI Bot`).
  - Max HP toggle (3 HP Fast / 5 HP Standard).
  - Items per round toggle (1 or 2).

---

## 🔊 Procedural Web Audio API
- **Zero external sound files**: 100% synthesized via the browser's Web Audio API.
- Capacitor hum, tactile mechanical switches, explosive live shock zaps with sub-bass kick, scanner telemetry chirps, wire cutter snip, and victory/defeat fanfares.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/prolegend2615/Discord-activity.git
cd Discord-activity
npm install
```

### 2. Run Locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests
```bash
node test/game-test.js
```

---

## 📁 Project Structure

```
├── index.html               # Main retro cyberpunk terminal UI & modals
├── css/
│   └── style.css            # Dark synthwave terminal, CRT scanlines, screen shake, colorblind themes
├── js/
│   ├── audio.js             # Web Audio API procedural synthesizer
│   ├── discord-bridge.js    # Discord Embedded App SDK bridge + fallback mock
│   ├── items.js             # Toolbox catalog (Multimeter, Cutters, Booster, Glove)
│   ├── bot-ai.js            # Strategic AI bot ('BOLT-v9')
│   ├── game-engine.js       # Turn-based state machine
│   ├── multiplayer.js       # WebSocket & BroadcastChannel synchronization
│   ├── canvas-fx.js         # Oscilloscope visualization, spark particles, screen shake
│   └── app.js               # UI controller, screen router, event handlers
├── test/
│   └── game-test.js         # Automated headless test suite
├── server.js                # Node.js HTTP & WebSocket multiplayer server
└── package.json             # Scripts & dependencies
```

---

## 📜 License
MIT License. Free to play, modify, and integrate into Discord Activities.
