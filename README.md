<div align="center">

# QuestFolio

**A browser-based pixel-art RPG that doubles as a developer portfolio.**

[![Play Now](https://img.shields.io/badge/▶_Play_Now-Visit_QuestFolio-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ravikantiakshay.github.io/my-game/)
[![GitHub Stars](https://img.shields.io/github/stars/RavikantiAkshay/my-game?style=for-the-badge&logo=github)](https://github.com/RavikantiAkshay/my-game)

*Walk through a handcrafted world. Enter buildings. Discover a developer's story told through interactive interiors — typewriters, CRT terminals, chalkboards, bookshelves, blueprints, sealed letters, and a travel diary.*

---

</div>

## Overview

QuestFolio is a top-down RPG built with vanilla HTML, CSS, and JavaScript — zero frameworks, zero bundlers. You control a character exploring an interconnected world of villages, schools, and castles. Every building you enter is a fully interactive experience: the Lab boots up a CRT monitor with live project demos, the Library lines its shelves with skill books, the Workshop lays out blueprints, the School writes on a chalkboard, and the Post Office delivers a sealed letter with your contact info.

It's part game, part portfolio, part cinematic experience — and it runs entirely in your browser.

---

## Controls

| Key | Action |
|:---:|:-------|
| `W` `A` `S` `D` / Arrow Keys | Move |
| `E` | Interact with buildings / NPCs |
| `ESC` | Return to overworld |
| `Click` | Attack (3-hit combo) |
| `F` | Defend |
| `N` | Cycle time of day |
| `M` | Cycle season |
| `T` | Open travel diary |

---

## The World

Three interconnected zones, each with its own tileset, collision map, NPCs, and interactable buildings.

**Town** — The starting village. Pine forests, dirt paths, streetlamps.
- **Home** — A log cabin with a typewriter. The page stuck in it is your personal introduction.
- **Lab** — A research facility. Boot up the CRT monitor to browse live project demos with embedded iframes, feature lists, tech stacks, and direct links to GitHub repos and deployed apps. A phone-shaped panel shows "Active Bounties" — gamified calls to action.
- **Workshop** — A blacksmith forge turned drafting table. Flip through blueprints for active projects and stashed concepts (with honest reasons why they were shelved). Decorative rulers, protractors, pencils, and coffee stains on the table.

**School** — A sprawling campus with a bell tower and classrooms.
- **School** — Step inside and face the chalkboard. Slide through an animated education timeline from Class X through B.Tech at IIT Bhilai. Chalk pieces and an eraser sit on the ledge.
- **Library** — A grand hall with two floor-to-ceiling wooden book racks. Six shelves: Languages, Frontend, Backend, Databases, Tools & DevOps, AI & Cloud. Each book spine is a technology.
- **Post Office** — An L-shaped post office. A kraft envelope sits open on the desk — complete with an airmail border, a wax seal stamped "A", a postmark, and a green paperclip. The letter inside has a personal note and a contact directory (Email, Phone, GitHub, LinkedIn).

**Castle** — A dark fortress at the edge of the map. Boss encounter inside.

---

## Combat & Boss

- 3-hit combo attack system with directional sprite animations and attack frames
- Defend stance that blocks incoming damage
- Health bars rendered above both player and NPCs
- Screen shake on impact
- Hurt flash (red tint) on taking damage

**Boss Fight** — A multi-phase encounter in the Castle zone:
- **Phase 1**: Boss summons ground spikes that target the player's position. Warning markers appear before impact. Attack frequency escalates with each wave. Multiple simultaneous spikes spawn as the fight progresses.
- **Phase 2**: Triggered at 70% HP. Boss transitions with dialogue, then switches to fire attacks — horizontal and vertical flame walls that form cross patterns. Rendered with actual fire sprite sheets.
- Boss has custom AI: advances when far, retreats when close, faces the player directionally, and plays charging/attacking animations tied to the spike cycle.

---

## Atmospheric Systems

**Time of Day** — 4-state cycle toggled with `N`:
| Mode | Rendering |
|:-----|:----------|
| Day | Clear, no overlay |
| Evening | Warm orange-to-purple breathing gradient |
| Night | Near-opaque darkness with `destination-out` light holes punched for player lantern, streetlamps, and window lights. Emissive glow cores on light sources. |
| Early Morning | Cool pale-blue mist gradient with soft pulsing |

All atmospheric overlays use an offscreen canvas composited with `screen` / `destination-out` blending for correct light stacking — overlapping lights never exceed daylight brightness.

**Seasons** — 4-state cycle toggled with `M`:
| Season | Effects |
|:-------|:--------|
| Summer | Converging god-rays fanning from a sun point, rendered with a radial gradient that fades from source to ground. Rays are world-space positioned so you walk through them. |
| Monsoon | Angled rain streaks, expanding ripple animations on impact, procedurally hashed puddles on the ground with specular highlights, gray-blue overcast tint. |
| Autumn | Wind-blown leaf particles with wobble physics and randomized green tones. Default season. |
| Winter | Dense slow-falling snowflakes with horizontal drift and wobble. Frosty white-blue overcast tint. |

---

## Interactive Interiors

Every building has a hand-crafted pixel-art interior rendered as a 3/4 orthographic cutaway with exterior walls, grass, trees, and furniture. An "Explore" button toggles between viewing the room art and the interactive overlay.

<table>
  <tr>
    <td align="center"><b>Home</b><br><img src="assets/images/environments/home.png" width="250"/></td>
    <td align="center"><b>Lab</b><br><img src="assets/images/environments/lab.jpg" width="250"/></td>
    <td align="center"><b>Workshop</b><br><img src="assets/images/environments/workshop.jpg" width="250"/></td>
  </tr>
  <tr>
    <td align="center"><b>School</b><br><img src="assets/images/environments/school.png" width="250"/></td>
    <td align="center"><b>Library</b><br><img src="assets/images/environments/library.png" width="250"/></td>
    <td align="center"><b>Post Office</b><br><img src="assets/images/environments/post.png" width="250"/></td>
  </tr>
</table>

---

## Travel Diary

Press `T` to open a page-flippable travel diary powered by StPageFlip. It loads trip data from a JSON file and renders:
- A statistics overview page with total trips, total days, total distance (Haversine-calculated), unique places, longest/shortest trip, and breakdowns by year, month, and transport mode.
- Individual trip pages with dates, places visited, a Leaflet.js interactive map with route lines, and trip highlights.

---

## Characters

<table>
  <tr>
    <td align="center" width="50%">
      <img src="assets/images/characters/main-character.png" width="180"/>
      <br><b>The Player</b>
      <br><sub>4-directional animated sprite with idle, walking, and attack frames. 3-hit combo system with defend stance.</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/images/characters/akbot-e7.png" width="180"/>
      <br><b>AKBOT-E7</b>
      <br><sub>AI companion. Appears in a cinematic intro sequence and narrates each building with contextual speech bubbles.</sub>
    </td>
  </tr>
</table>

4 additional NPC sprites with per-zone placement, directional animation, and interaction prompts.

---

## Tech Stack

Zero dependencies — no React, no bundlers, no npm.

| Layer | Details |
|:------|:--------|
| Rendering | HTML5 Canvas — tile-based maps, sprite animation, offscreen lighting canvas |
| Styling | ~1,700 lines of hand-written CSS — interior UIs, typewriter, chalkboard, blueprints, envelope, diary |
| Logic | ~3,000 lines of vanilla JS — game loop, combat, boss AI, weather, lighting, interiors, diary |
| Map Data | ~25K lines of tile IDs across 3 zones |
| Collision | ~196K of fine-grained 8px grid collision data, per-zone, with dev tools for painting/exporting |
| Lighting | Per-zone static light arrays, window light arrays, player lantern, radial gradients, emissive cores |
| Assets | AI-generated 16-bit pixel art interiors, custom sprite sheets, fire/spike FX textures |
| Fonts | Google Fonts — Share Tech Mono, Permanent Marker, Special Elite, Caveat |
| Libraries | StPageFlip (diary), Leaflet.js (trip maps) — loaded via CDN |
| Hosting | GitHub Pages |

---

## Project Structure

```
questfolio/
├── index.html                     # Single-page entry point
├── css/
│   └── style.css                  # All styles — interiors, overlays, animations
├── js/
│   ├── script.js                  # Game engine — rendering, input, combat, weather, interiors
│   └── data/
│       ├── mapData.js             # Tile map definitions for all zones
│       ├── collisionData.js       # Town collision grid
│       ├── collisionDataSchool.js # School collision grid
│       └── collisionDataCastle.js # Castle collision grid
├── assets/
│   ├── images/
│   │   ├── characters/            # Player, AKBOT-E7, NPCs, boss sprites
│   │   ├── environments/          # Interior backgrounds
│   │   ├── fx/                    # Fire, spike, and effect textures
│   │   └── tilesets/              # Overworld tilesets per zone
│   ├── trips.json                 # Travel diary data
│   └── india_map.png              # Map asset for diary
└── tools/
    ├── autoCollision.html         # Dev tool — auto-generate collision grids
    └── exportCollision.html       # Dev tool — export collision data
```

---

## Run Locally

No build step. Serve the files and open in a browser.

```bash
git clone https://github.com/RavikantiAkshay/my-game.git
cd my-game

# Any static server works
python -m http.server 8080    # Python
npx serve .                   # Node.js
# or VS Code Live Server
```

---

## Roadmap

- [x] Day/night cycle with dynamic lighting
- [x] Four-season weather system
- [x] Multi-phase boss encounter
- [x] Travel diary with page-flip and maps
- [ ] Background music and sound effects
- [ ] Mobile touch controls
- [ ] Achievement system
- [ ] Expanded NPC dialogue trees

---

## About

Built by **Akshay Ravikanti** — IIT Bhilai, B.Tech CSE.

<div align="center">

[![Email](https://img.shields.io/badge/Email-ravikantiakshay15@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:ravikantiakshay15@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-RavikantiAkshay-181717?style=flat-square&logo=github)](https://github.com/RavikantiAkshay)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-ravikanti--akshay-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/ravikanti-akshay)

</div>

---

<div align="center">
<sub>Built with vanilla code, pixel art, and an unreasonable amount of CSS. No frameworks were harmed.</sub>
</div>
