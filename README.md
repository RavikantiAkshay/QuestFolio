<div align="center">

# QuestFolio

**A browser-based 2D pixel-art RPG that turns a developer's work into a playable world.**

*Walk into buildings, read documents on typewriters, flip through travel diaries, browse projects on CRT monitors, buy weapons from an armory, and fight a multi-phase boss — all inside a top-down RPG built with zero frameworks.*

---

</div>

## Overview

QuestFolio is a top-down pixel-art RPG running entirely in the browser on vanilla HTML5 Canvas, CSS3, and JavaScript. There are no external game engines, no bundlers, and no build step. You control an animated character exploring an interconnected overworld of villages, a school campus, and a dark castle. Every building you enter opens a handcrafted interactive interior — from a mechanical typewriter to a retro CRT television to a weapon shop.

---

## Controls

| Key / Input | Action |
|:---:|:-------|
| `W` `A` `S` `D` / Arrow Keys | Move character |
| `E` | Interact (enter buildings, talk to NPCs) |
| `ESC` | Close any active overlay and return to the overworld |
| Left Click | Attack (3-hit melee combo, or fire AK-47 if equipped) |
| `F` | Hold to enter defend/block stance |
| `U` | Open the Armory weapon shop (inside Workshop building) |
| `N` | Cycle time of day — Day → Evening → Night → Early Morning |
| `M` | Cycle season — Summer → Monsoon → Autumn → Winter |

---

## The World

The game is made up of three zone tilesets connected by screen-edge transitions. Walking off one edge loads the adjacent zone.

### 1. Town Village — The Starting Hub

This is where the game begins. The town contains four enterable buildings.

**Home** — A log cabin with three interactive hotspots:
- **Typewriter**: A CSS-rendered mechanical typewriter holding a personal introduction sheet. The paper slides out of the roller and text appears with a typing animation.
- **Sitcom OS (Retro TV)**: An 80s-era CRT television with antennas, knobs, and a speaker grille. The screen shows two panels — a "Sitcom DNA" breakdown with progress bars, and a corkboard of developer quotes styled as sticky notes referencing Modern Family, B99, Parks & Rec, Friends, The Middle, and Community.
- **Travel Diary**: A 3D page-flippable book powered by `StPageFlip`. Contains statistics (total trips, Haversine-calculated distance, breakdowns by year/month/transport mode) and detailed trip pages with `Leaflet.js` interactive maps showing route polylines and location markers.

**Lab Workstation** — A research station with three devices side by side:
- **Tablet** (left): Shows the active project's description and feature list.
- **PC Monitor** (center): Displays a preview image of the project. Use `◄ PREV` / `NEXT ►` buttons to cycle through projects.
- **Phone** (right): Lists the tech stack, GitHub and Live Demo links, and **Active Bounties** — clickable tasks that award coins (see Economy section below).

**Workshop** — A blacksmith-themed forge containing:
- **Drafting Table**: Blueprint paper taped to a surface with a ruler, pencil, protractor, set square, eraser, and coffee stain decorations. Navigate between project blueprints using `◀` / `▶` arrows. Each blueprint shows the project name, description, status, features, tech stack, and repository link.
- **Armory** (press `U`): A full-screen weapon shop with three wooden shelves displaying nine items — Combat Knife, Pistol, Grenade, AK-47, Sniper Rifle, RPG Launcher, Tactical Helmet, Kevlar Vest, and Medkit. Hover on any item to see its stats tooltip. The AK-47 is purchasable with coins (see Economy below); other items display "INSUFFICIENT COINS."

### 2. School Campus

Connected to the town via a screen transition. Contains three buildings:

**School Classroom** — A wooden-framed green chalkboard with a chalk ledge holding chalk pieces and an eraser. The board uses a CSS slider to animate between chalk slides showing an academic timeline from Class X through B.Tech at IIT Bhilai.

**Library** — A grand hall with two wooden book racks (left and right), each with three shelves. The six shelves are categorized by domain: Languages, Frontend, Backend, Databases, Tools & DevOps, and AI & Cloud. Each shelf displays styled book spines representing individual technologies.

**Post Office** — An L-shaped postal desk displaying an open kraft airmail envelope with a triangular flap, a postmark stamp ("EXPRESS ★ 2026 ★ MAIL"), a wax seal stamped "A", a green paperclip, and a fully visible letter on top. The letter contains a greeting message and a **Contact Directory** grid with clickable cards for Email, Phone/WhatsApp, GitHub, and LinkedIn.

### 3. Castle & Boss Arena

A dark fortress with its own tileset and collision map. Entering the castle triggers a multi-phase boss fight (see Combat section below).

---

## Coin Economy & Bounty System

Coins are the in-game currency displayed in a HUD element at the top-left corner of the screen (🪙 counter).

**How to Earn Coins:**
- **Defeat NPCs**: Hostile NPCs drop coins on death. Walk over the dropped coins to collect them.
- **Complete Bounties**: In the Lab Workstation's Phone device, there are four bounty tasks per project:
  - *Access Application* → +10 🪙 (opens the project's live demo)
  - *Review Source Code* → +10 🪙 (opens the GitHub repository)
  - *Create an Account* → +30 🪙 (opens the app's registration page)
  - *Star Repository* → +30 🪙 (opens the GitHub repo for starring)

  Each bounty can only be claimed once per project. Clicking a bounty opens the corresponding link in a new tab and adds the coins instantly.

**How to Spend Coins:**
- Open the **Armory** inside the Workshop (press `U`) and purchase the **AK-47** for 100 🪙. Once purchased, the character's sprite changes to show the weapon, and Left Click fires directional projectiles instead of the melee combo.

---

## Combat System

### Melee Combat
Left Click triggers a **3-hit attack combo** — the character cycles through four attack animation frames. Each hit deals damage to any NPC within range. The attack sprite uses a center-based windowed extraction from an irregular sprite sheet.

### Ranged Combat (AK-47)
After purchasing the AK-47, Left Click fires projectiles in the direction the character is facing. Projectiles travel in strictly cardinal directions (up, down, left, right) and despawn after a set lifetime or upon hitting an NPC.

### Defend Stance
Hold `F` to raise a shield. While defending, incoming damage from boss attacks is blocked.

### Visual Feedback
- **Screen shake** on heavy impacts
- **Red damage flash** overlay when the player takes damage
- **Dynamic health bars** rendered above the player and boss
- **Hurt timer** providing brief invincibility frames after taking a hit

---

## Boss Fight — 4 Phases

Entering the Castle triggers a cinematic dialogue sequence with the boss, followed by a multi-phase battle. The boss's HP and attack patterns escalate through four phases:

### Phase 1 — Spike Traps
The boss summons ground spikes at the player's position. A red warning indicator appears for 1 second before the spikes erupt. The number of simultaneous spikes increases as the boss takes damage. Triggers transition to Phase 2 when the boss drops below 70% HP or after enough attacks.

### Phase 2 — Flame Walls
Introduced with cinematic dialogue ("*Let's see if you can survive the flames of destruction!*"). The boss summons horizontal and vertical fire lines that form cross patterns targeting the player. Transition at 40% HP.

### Phase 3 — Black Holes & Homing Missiles
Dialogue transition ("*Let's see if you can escape the void itself!*"). The boss alternates between:
- **Black Holes**: Spawn under the player with a warning period, then activate with a gravitational pull radius. Getting sucked in traps the player and deals damage.
- **Homing Missiles**: Launched from the boss and smoothly curve toward the player with limited turn radius.

Transition at 10% HP.

### Phase 4 — Rage Mode (Disaster)
Dialogue transition ("*I WILL SHOW YOU TRUE DESPAIR!*"). All attack types (spikes, fire walls, black holes, missiles) are randomly launched in rapid succession with shorter warning timers and faster cooldowns.

### Game Over & AKBot-e7
If the player dies, a **Game Over** overlay appears with two options:
- **RESPAWN** — Reloads the game from the start.
- **CALL AKBot-e7** — Summons an autonomous AI companion (see below).

---

## AKBot-e7 — Autonomous Combat Companion

AKBot-e7 is a cinematic ally summoned from the Game Over screen. When called:

1. **Cinematic Entry**: The player is revived at full HP. AKBot-e7 drops from above with a dramatic fall animation, landing next to the player with a ground-shake impact.
2. **Dialogue Sequence**: The boss spots AKBot and fires a homing missile at it. The player shouts "Watch out!!" — but the missile hits AKBot harmlessly. AKBot turns to face the camera (fourth-wall break) and displays a dictionary-style definition card explaining that it is "indestructible."
3. **Combat Phase**: After the main character says "Woah...", AKBot enters autonomous combat mode:
   - **Movement AI**: AKBot orbits the boss at 140–220px distance, alternating between horizontal and vertical alignment axes. It uses `isWalkable` collision checks and falls back to single-axis movement when blocked.
   - **Firing**: Continuously fires 3-round AK-47 bursts every 24 frames (~0.4s) in cardinal directions toward the boss. Bullets deal 22 damage each.
   - **Invincibility**: AKBot's HP is permanently locked at 9999 and `isInvincible` is always true. Boss attacks pass through it harmlessly.
   - **Boss Retargeting**: All boss attacks (spikes, fire, black holes, missiles) redirect to target AKBot instead of the player. The boss enters Phase 4 (Rage Mode) immediately.
   - **Player Safety**: The player becomes fully invincible during the AKBot battle, acting purely as a spectator.
4. **Victory**: When AKBot reduces the boss to 0 HP, all active projectiles/hazards are cleared and the Victory overlay appears.

The AK-47 weapon is visually overlaid on AKBot's sprite with rotation matching its facing direction, and includes animated muzzle flash effects with recoil kickback when firing.

---

## Weather & Day/Night System

All atmospheric effects are rendered as Canvas overlays on the game world. Interior zones (buildings) are exempt from these effects.

### Time of Day (press `N`)

| Mode | Visual Effect |
|------|--------------|
| Day | Full brightness, no overlay |
| Evening | Warm orange-to-purple gradient with a breathing pulse animation |
| Night | Dark overlay with emissive light sources — streetlamps, building windows, and a player-centered lantern rendered using radial gradients and `destination-out` compositing on an offscreen canvas |
| Early Morning | Cool pale-blue mist overlay |

### Seasons (press `M`)

| Season | Particle Effect |
|--------|----------------|
| Summer | Converging world-space god-rays fanning from the sun position |
| Monsoon | Angled rain animation with expanding splash ripples and specular puddle highlights |
| Autumn | Wind-blown falling leaf particles with wobble physics (default season) |
| Winter | Gentle snow flurry particles with horizontal drift and a frosty blue overlay |

---

## Interior System

Walking up to a building door and pressing `E` opens a full-screen **Interior Overlay**. Each interior is a custom CSS/HTML composition rendered on top of the game canvas. The overlay provides:
- **Explore** button — Reveals the interior's interactive content (typewriter, devices, chalkboard, etc.)
- **Return to Town** button — Closes the overlay and returns control to the overworld

Interiors use absolutely-positioned hotspot `<div>` elements that respond to clicks. For example, the Home interior has a `diary-hotspot`, `pc-hotspot`, and `armory-hotspot` that each open their respective sub-overlays.

---

## Resume & Map Overlays

- **Resume**: A parchment-styled overlay displaying a full resume with education, skills, experience, and projects. Includes decorative coffee stains, fold lines, and aged paper textures — all pure CSS.
- **Town Map**: A proximity-triggered parchment mini-map showing the world layout.

---

## Technical Architecture

### Engine & Rendering
- **Canvas Rendering**: Single `<canvas>` element with a 60fps `requestAnimationFrame` game loop. All world tiles, characters, NPCs, projectiles, particles, and HUD elements are drawn per frame.
- **Camera System**: The viewport follows the player with a smooth offset. Tile rendering is culled to only draw tiles within the camera bounds for performance.
- **Offscreen Lighting Canvas**: Night mode uses a separate offscreen `<canvas>` for compositing light sources using `destination-out` blending before overlaying onto the main canvas.

### Sprite System
- **Walk Cycles**: 4-direction walk sprites extracted from sprite sheets using frame-based windowed coordinates (`sX = 190 + frameX * 160`, `sY = 50 + frameY * 214`).
- **Attack Sprites**: Irregular sprite sheet with center-based extraction using pre-mapped coordinate arrays. Orientation mapping converts walk-direction rows to attack-direction rows.
- **AKBot-e7**: Uses its own sprite sheet with different frame dimensions (`134×223` frames at `256 + frameX * 199` offsets).

### Collision Detection
- **Tile-Based**: Pre-computed collision arrays (`collisionData.js`, `collisionDataSchool.js`, `collisionDataCastle.js`) store walkability per tile. The `isWalkable()` function checks the four corners of an entity's bounding box against these arrays.
- **AABB Rect Intersection**: Used for projectile-vs-NPC and player-vs-hazard collision via `rectIntersect()`.

### Zone System
- **Multi-Zone World**: The `world` object maps zone IDs to their configuration — tileset image, map data array, collision array, NPCs, and north/south/east/west neighbor zone IDs.
- **Screen Transitions**: Walking past a map boundary triggers `loadZone()`, which swaps the active tileset, collision data, map array, and NPC list.
- **Static Zones**: Some zones (like the castle) use a single pre-rendered background image instead of tile-based rendering.

### Boss Fight AI
- **Phase State Machine**: The boss tracks `phase` (1–4), `attackCount`, `bossAttackTimer`, `isCharging`, `isAttacking`, and `isTransitioning`. Phase transitions trigger `isOverlayActive = true` to freeze the game during dialogue.
- **Target Redirection**: Boss attacks use `activeTarget` which points to either `player` or `window.bossTarget` (AKBot-e7 when summoned), allowing all hazard spawns to dynamically retarget.
- **Homing Missiles**: Missiles use angle-based steering with a capped turn rate (`0.04 radians/frame`) for smooth curved trajectories.

### AKBot-e7 Combat AI
- **Orbit Pattern**: Maintains 140–220px distance from the boss. Alternates between X-axis and Y-axis alignment on a random timer (40–120 frames), creating a natural orbiting pattern.
- **Cardinal Firing**: Computes `aimDirX` / `aimDirY` toward the boss, snaps to the dominant axis, and fires strictly horizontal or vertical bullets.
- **Burst Fire**: Each fire event pushes 3 projectiles via `setTimeout` at 50ms intervals into the shared `playerProjectiles` array, reusing the same collision logic as player bullets.

### NPC System
- **Hostile NPCs**: Have HP, can be damaged by player projectiles, drop coins on death, and respawn after 5 seconds at a random walkable location.
- **Dialogue NPCs**: Trigger speech bubble sequences on interaction. Speech bubbles are rendered as Canvas-drawn rounded rectangles with tail pointers.
- **AKBot-e7**: A special NPC type (`type: 'akbot'`) with custom update logic that bypasses normal NPC movement when `inCombat` is true.

### Data Architecture
- **Pre-loaded Modules**: All game data is loaded synchronously via `<script>` tags — `collisionData.js`, `collisionDataSchool.js`, `collisionDataCastle.js`, `mapData.js`, `tripsData.js`.
- **No Build Step**: The entire project runs from static files. No webpack, no npm, no transpilation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game Engine | Vanilla JavaScript (ES6+), HTML5 Canvas API |
| Styling | Vanilla CSS3 (no Tailwind, no frameworks) |
| Page Flip | StPageFlip library |
| Maps | Leaflet.js (trip diary interactive maps) |
| Typography | Google Fonts — Share Tech Mono, Permanent Marker, Special Elite, Kalam, Caveat |
| Data | Pre-loaded JS modules (map arrays, collision arrays, trip data) |
| Hosting | GitHub Pages |

---

## Running Locally

No build tools or npm dependencies required.

```bash
git clone https://github.com/RavikantiAkshay/QuestFolio.git
cd QuestFolio

# Start any static file server:
python -m http.server 8080
# Or: npx serve .
# Or: use VS Code Live Server extension
```

Open `http://localhost:8080` in your browser.

---

## File Structure

```
QuestFolio/
├── index.html                    # Single-page game shell with all overlay HTML
├── css/style.css                 # All visual styling (interiors, typewriter, armory, etc.)
├── js/
│   ├── script.js                 # Core game engine (~4700 lines)
│   └── data/
│       ├── mapData.js            # Tile map arrays for all zones
│       ├── collisionData.js      # Town collision grid
│       ├── collisionDataSchool.js # School collision grid
│       ├── collisionDataCastle.js # Castle collision grid
│       └── tripsData.js          # Travel diary trip entries
├── assets/
│   └── images/
│       ├── characters/           # Player & NPC sprite sheets
│       ├── environments/         # Interior background images
│       ├── fx/                   # Visual effect assets
│       ├── items/                # Weapon & item sprites (ak47, knife, etc.)
│       └── tilesets/             # Zone tileset sprite sheets
└── tools/
    └── autoCollision.html        # Dev tool for generating collision arrays
```

---

<div align="center">

[![Email](https://img.shields.io/badge/Email-ravikantiakshay15@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:ravikantiakshay15@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-RavikantiAkshay-181717?style=flat-square&logo=github)](https://github.com/RavikantiAkshay)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-ravikanti--akshay-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/ravikanti-akshay)

Built with vanilla JS, pixel art, and no frameworks.

</div>
