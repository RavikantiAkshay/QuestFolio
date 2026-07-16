const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// --- 3. GAME VARIABLES ---
let currentZone = "town";
let currentMapData = [];
let currentTileset = new Image();
let collisionData = [];
let editMode = false;
let isDragging = false;
let paintMode = 1;
let brushRadius = 0; // 0 = 1x1, 1 = 3x3, 2 = 5x5
const collisionSize = 8; // Fine-grained collision grid
let undoStack = [];
let redoStack = [];

// --- WIND & NPCS ---
let npcs = [];
let particles = [];
let globalTime = 0;
let cameraX = 0;
let cameraY = 0;
const npcImages = [];
const npcImageSrcs = ["npc1.png", "npc2.png", "npc3.png", "npc4.png"]; // Add as many as you want here
npcImageSrcs.forEach(src => {
    let img = new Image();
    img.src = src;
    npcImages.push(img);
});

const player = {
    x: 400,
    y: 400,
    size: 48,
    speed: 5,
    image: new Image(),
    frameX: 0,
    frameY: 0,
    isMoving: false,
    animTimer: 0
};
player.image.src = "main-character.png";

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'c') {
        editMode = !editMode;
        debugUI.innerText = `EDIT MODE ON\nDrag to Paint\n'V': Toggle Solid/Walkable\n'[' / ']': Brush Size\n'F': Fill All Solid\n'X': Clear All`;
        debugUI.style.color = "#f55";
        debugUI.style.display = editMode ? 'block' : 'none';
    }
    
    if (!editMode) return;

    if (e.key.toLowerCase() === 'z' && e.ctrlKey) {
        if (undoStack.length > 0) {
            redoStack.push(JSON.stringify(collisionData));
            collisionData = JSON.parse(undoStack.pop());
            localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }
    else if (e.key.toLowerCase() === 'y' && e.ctrlKey) {
        if (redoStack.length > 0) {
            undoStack.push(JSON.stringify(collisionData));
            collisionData = JSON.parse(redoStack.pop());
            localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }
    else if (e.key.toLowerCase() === 'v') {
        paintMode = paintMode === 1 ? 0 : 1;
    }
    else if (e.key === ']') brushRadius = Math.min(5, brushRadius + 1);
    else if (e.key === '[') brushRadius = Math.max(0, brushRadius - 1);
    else if (e.key.toLowerCase() === 'f') {
        if (confirm("Are you sure you want to FILL the entire map with solid walls?")) {
            undoStack.push(JSON.stringify(collisionData));
            if (undoStack.length > 20) undoStack.shift();
            redoStack = [];
            collisionData = collisionData.map(row => row.map(() => 1));
            localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }
    else if (e.key.toLowerCase() === 'x') {
        if (confirm("Are you sure you want to CLEAR all invisible walls from the map?")) {
            undoStack.push(JSON.stringify(collisionData));
            if (undoStack.length > 20) undoStack.shift();
            redoStack = [];
            collisionData = collisionData.map(row => row.map(() => 0));
            localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }

    if (editMode) {
        const size = (brushRadius * 2) + 1;
        debugUI.innerText = `EDIT MODE ON\nBrush: ${paintMode === 1 ? 'SOLID (Red)' : 'ERASE'}\nSize: ${size}x${size}\n'Ctrl+Z/Y': Undo/Redo\n'V' to toggle, 'F' Fill, 'X' Clear`;
    }
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

let mapWidth = 0;
let mapHeight = 0;
let scale = 2; // Default retro zoom factor

function resize() {
    // Ensure the map fills the screen by dynamically scaling if the window is too large
    if (mapWidth > 0 && mapHeight > 0) {
        scale = Math.max(1.2, window.innerWidth / mapWidth, window.innerHeight / mapHeight);
    }
    canvas.width = window.innerWidth / scale;
    canvas.height = window.innerHeight / scale;
    ctx.imageSmoothingEnabled = false; // Keep pixel art sharp
}
window.addEventListener("resize", resize);
resize(); // Initial sizing

// --- 4. LOAD A NEW ZONE ---
function loadZone(zoneName, startX, startY) {
    if (!zoneName) return;

    currentZone = zoneName;
    currentMapData = world[zoneName].data;
    currentTileset.src = world[zoneName].tilesetSrc;

    if (currentMapData.length > 0) {
        mapWidth = currentMapData[0].length * tileSize;
        mapHeight = currentMapData.length * tileSize;
        resize(); // Update the canvas bounds based on the new map size
        
        const collisionRows = mapHeight / collisionSize;
        const collisionCols = mapWidth / collisionSize;
        undoStack = [];
        redoStack = [];

        // Priority: 1) Hardcoded data  2) localStorage  3) Empty grid
        const hardcodedMap = {
            town: typeof collision_town_data !== 'undefined' ? collision_town_data : null,
            school: typeof collision_school_data !== 'undefined' ? collision_school_data : null,
            castle: typeof collision_castle_data !== 'undefined' ? collision_castle_data : null
        };

        const savedCollision = localStorage.getItem('collision_' + zoneName);
        if (savedCollision) {
            const parsed = JSON.parse(savedCollision);
            if (parsed.length === collisionRows && parsed[0] && parsed[0].length === collisionCols) {
                collisionData = parsed;
            } else if (hardcodedMap[zoneName]) {
                collisionData = hardcodedMap[zoneName].map(r => [...r]);
            } else {
                collisionData = Array.from({length: collisionRows}, () => Array(collisionCols).fill(0));
            }
        } else if (hardcodedMap[zoneName]) {
            collisionData = hardcodedMap[zoneName].map(r => [...r]);
        } else {
            collisionData = Array.from({length: collisionRows}, () => Array(collisionCols).fill(0));
        }
    }

    player.x = startX;
    player.y = startY;

    // Spawn NPCs in Town and School
    npcs = [];
    if (zoneName === "town" || zoneName === "school") {
        // Wait for collisionData to be populated before spawning NPCs
        setTimeout(() => {
            for (let i = 0; i < 6; i++) {
                let spawnX, spawnY;
                let attempts = 0;
                do {
                    spawnX = Math.random() * (mapWidth - 100) + 50;
                    spawnY = Math.random() * (mapHeight - 100) + 50;
                    attempts++;
                } while (!isWalkable(spawnX, spawnY, 48) && attempts < 100);
                
                npcs.push({
                    x: spawnX,
                    y: spawnY,
                    size: 48,
                    speed: 1 + Math.random(), // 1 to 2 speed
                    frameX: 0,
                    frameY: Math.floor(Math.random() * 4),
                    isMoving: false,
                    animTimer: 0,
                    directionTimer: Math.random() * 100,
                    image: npcImages[Math.floor(Math.random() * npcImages.length)]
                });
            }
        }, 100); // slight delay to ensure map load
    }

    // Ensure player spawns in a walkable area to prevent getting stuck in walls
    if (collisionData.length > 0 && typeof isWalkable === 'function' && !isWalkable(player.x, player.y)) {
        let found = false;
        const maxDist = 400; // Search radius in pixels
        const step = collisionSize; // Usually 8
        for (let r = step; r < maxDist && !found; r += step) {
            for (let dx = -r; dx <= r; dx += step) {
                for (let dy = -r; dy <= r; dy += step) {
                    // Check only the perimeter of the current search square
                    if (Math.abs(dx) === r || Math.abs(dy) === r) {
                        let testX = player.x + dx;
                        let testY = player.y + dy;
                        // Ensure we stay completely inside the map so we don't accidentally teleport into the out-of-bounds transition area
                        if (testX >= 0 && testX + player.size <= mapWidth && testY >= 0 && testY + player.size <= mapHeight) {
                            if (isWalkable(testX, testY)) {
                                player.x = testX;
                                player.y = testY;
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (found) break;
            }
        }
    }
}

// --- 5. UPDATE LOGIC & ZONE TRANSITIONS ---
function rectIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.w || 
             r2.x + r2.w <= r1.x || 
             r2.y >= r1.y + r1.h || 
             r2.y + r2.h <= r1.y);
}

function isWalkable(nextX, nextY, entitySize = player.size, ignoreEntity = null) {
    if (!collisionData || collisionData.length === 0 || !collisionData[0]) return true;

    // Adjust these margins to make the collision box fit the sprite's feet
    const marginX = 12;
    const marginTop = 24; // Character head/shoulders don't collide
    const marginBot = 4;
    
    // 1. Check Map Collision
    const left = Math.floor((nextX + marginX) / collisionSize);
    const right = Math.floor((nextX + entitySize - marginX) / collisionSize);
    const top = Math.floor((nextY + marginTop) / collisionSize);
    const bottom = Math.floor((nextY + entitySize - marginBot) / collisionSize);

    // Clamp coordinates to prevent array out-of-bounds errors, 
    // but still check the edge tiles to see if they are walls or paths.
    // This allows transitions only on open paths, but blocks walking on edge walls.
    const maxRow = collisionData.length - 1;
    const maxCol = collisionData[0].length - 1;

    const clampedLeft = Math.max(0, Math.min(left, maxCol));
    const clampedRight = Math.max(0, Math.min(right, maxCol));
    const clampedTop = Math.max(0, Math.min(top, maxRow));
    const clampedBottom = Math.max(0, Math.min(bottom, maxRow));

    if (collisionData[clampedTop][clampedLeft] === 1) return false;
    if (collisionData[clampedTop][clampedRight] === 1) return false;
    if (collisionData[clampedBottom][clampedLeft] === 1) return false;
    if (collisionData[clampedBottom][clampedRight] === 1) return false;

    // 2. Check Dynamic Entity Collision
    const hitBox = {
        x: nextX + marginX,
        y: nextY + marginTop,
        w: entitySize - marginX * 2,
        h: entitySize - marginTop - marginBot
    };

    if (ignoreEntity !== player) {
        const playerBox = {
            x: player.x + marginX,
            y: player.y + marginTop,
            w: player.size - marginX * 2,
            h: player.size - marginTop - marginBot
        };
        if (rectIntersect(hitBox, playerBox)) return false;
    }

    for (let i = 0; i < npcs.length; i++) {
        const npc = npcs[i];
        if (npc === ignoreEntity) continue;
        const npcBox = {
            x: npc.x + marginX,
            y: npc.y + marginTop,
            w: npc.size - marginX * 2,
            h: npc.size - marginTop - marginBot
        };
        if (rectIntersect(hitBox, npcBox)) return false;
    }

    return true;
}

function update() {
    player.isMoving = false;

    // Sprint logic: double speed if Shift is held
    const currentSpeed = keys["shift"] ? player.speed * 2 : player.speed;

    if (keys["arrowup"] || keys["w"]) { 
        if (isWalkable(player.x, player.y - currentSpeed, player.size, player)) player.y -= currentSpeed; 
        player.frameY = 2; player.isMoving = true; 
    }
    else if (keys["arrowdown"] || keys["s"]) { 
        if (isWalkable(player.x, player.y + currentSpeed, player.size, player)) player.y += currentSpeed; 
        player.frameY = 0; player.isMoving = true; 
    }
    else if (keys["arrowleft"] || keys["a"]) { 
        if (isWalkable(player.x - currentSpeed, player.y, player.size, player)) player.x -= currentSpeed; 
        player.frameY = 1; player.isMoving = true; 
    }
    else if (keys["arrowright"] || keys["d"]) { 
        if (isWalkable(player.x + currentSpeed, player.y, player.size, player)) player.x += currentSpeed; 
        player.frameY = 3; player.isMoving = true; 
    }

    // Animation loop
    if (player.isMoving) {
        player.animTimer++;
        // Speed up animation when sprinting
        const animSpeedLimit = keys["shift"] ? 4 : 8;
        if (player.animTimer >= animSpeedLimit) { // change frame based on speed
            player.frameX = (player.frameX + 1) % 4; // 4 frames per animation
            player.animTimer = 0;
        }
    } else {
        player.frameX = 0; // idle frame
        player.animTimer = 0;
    }

    // Update Camera Center
    cameraX = player.x + (player.size / 2) - (canvas.width / 2);
    cameraY = player.y + (player.size / 2) - (canvas.height / 2);
    if (cameraX < 0) cameraX = 0;
    if (cameraY < 0) cameraY = 0;
    if (cameraX > mapWidth - canvas.width) cameraX = Math.max(0, mapWidth - canvas.width);
    if (cameraY > mapHeight - canvas.height) cameraY = Math.max(0, mapHeight - canvas.height);

    // --- WIND PARTICLES (LEAVES) ---
    globalTime++;
    if (Math.random() < 0.2) { // 20% chance per frame to spawn leaf
        particles.push({
            x: cameraX - 100 + Math.random() * (canvas.width + 100),
            y: cameraY - 50 - Math.random() * 100,
            vx: 3 + Math.random() * 3, // Blow right
            vy: 2 + Math.random() * 2, // Blow down
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#27ae60' : '#2ecc71',
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.05 + Math.random() * 0.1
        });
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx + Math.sin(p.wobble) * 2;
        p.y += p.vy;
        p.wobble += p.wobbleSpeed;
        if (p.y > cameraY + canvas.height + 50 || p.x > cameraX + canvas.width + 50) {
            particles.splice(i, 1);
        }
    }

    // --- UPDATE NPCs ---
    npcs.forEach(npc => {
        npc.directionTimer--;
        if (npc.directionTimer <= 0) {
            npc.directionTimer = Math.random() * 120 + 60; // 1-3 seconds
            npc.isMoving = Math.random() > 0.4; // 60% chance to move
            if (npc.isMoving) {
                npc.frameY = Math.floor(Math.random() * 4); // New direction
            }
        }

        if (npc.isMoving) {
            let nextX = npc.x;
            let nextY = npc.y;
            if (npc.frameY === 2) nextY -= npc.speed; // up
            if (npc.frameY === 0) nextY += npc.speed; // down
            if (npc.frameY === 1) nextX -= npc.speed; // left
            if (npc.frameY === 3) nextX += npc.speed; // right

            if (isWalkable(nextX, nextY, npc.size, npc)) {
                npc.x = nextX;
                npc.y = nextY;
            } else {
                npc.isMoving = false; // Stop if hit wall
                npc.directionTimer = 10; // Turn around sooner
            }

            npc.animTimer++;
            if (npc.animTimer >= 12) {
                npc.frameX = (npc.frameX + 1) % 4;
                npc.animTimer = 0;
            }
        } else {
            npc.frameX = 0;
            npc.animTimer = 0;
        }
    });

    // Screen Transitions (now using mapWidth/mapHeight instead of canvas bounds)
    if (player.y < 0) {
        loadZone(world[currentZone].north, player.x, mapHeight - player.size - 10);
    }
    else if (player.y > mapHeight) {
        loadZone(world[currentZone].south, player.x, 10);
    }
    else if (player.x < 0) {
        loadZone(world[currentZone].west, mapWidth - player.size - 10, player.y);
    }
    else if (player.x > mapWidth) {
        loadZone(world[currentZone].east, 10, player.y);
    }
}

// --- 6. DRAW THE GAME ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Draw the Map blocks
    if (currentTileset.complete && currentMapData.length > 1) {
        // Only draw tiles within the camera view for performance
        const startCol = Math.max(0, Math.floor(cameraX / tileSize));
        const endCol = Math.min(currentMapData[0].length, Math.ceil((cameraX + canvas.width) / tileSize));
        const startRow = Math.max(0, Math.floor(cameraY / tileSize));
        const endRow = Math.min(currentMapData.length, Math.ceil((cameraY + canvas.height) / tileSize));

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                let tileID = currentMapData[row][col];
                let sourceX = (tileID % tilesPerRow) * tileSize;
                let sourceY = Math.floor(tileID / tilesPerRow) * tileSize;

                ctx.drawImage(
                    currentTileset,
                    sourceX, sourceY, tileSize, tileSize,
                    col * tileSize, row * tileSize, tileSize, tileSize
                );
            }
        }
        
        // Draw collision debug overlay
        if (editMode && collisionData.length > 0) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
            const startCol = Math.max(0, Math.floor(cameraX / collisionSize));
            const endCol = Math.min(collisionData[0].length, Math.ceil((cameraX + canvas.width) / collisionSize));
            const startRow = Math.max(0, Math.floor(cameraY / collisionSize));
            const endRow = Math.min(collisionData.length, Math.ceil((cameraY + canvas.height) / collisionSize));

            for (let row = startRow; row < endRow; row++) {
                for (let col = startCol; col < endCol; col++) {
                    if (collisionData[row] && collisionData[row][col] === 1) {
                        ctx.fillRect(col * collisionSize, row * collisionSize, collisionSize, collisionSize);
                    }
                }
            }
        }
    } else if (currentMapData.length === 0) {
        ctx.fillStyle = "white";
        ctx.fillText("Map data missing! Did you paste the arrays?", cameraX + canvas.width / 2 - 100, cameraY + canvas.height / 2);
    }

    // Draw the Player
    if (player.image.complete && player.image.width > 0) {
        // The sprite sheet has transparent padding. Custom offsets and frame sizes:
        const offsetX = 190;
        const offsetY = 50;
        const frameWidth = 160;
        const frameHeight = 214;

        // Calculate display size maintaining aspect ratio
        const displayWidth = player.size;
        const displayHeight = player.size * (frameHeight / frameWidth);

        ctx.drawImage(
            player.image,
            offsetX + (player.frameX * frameWidth),
            offsetY + (player.frameY * frameHeight),
            frameWidth, frameHeight,
            player.x, player.y - (displayHeight - player.size), // align bottom of sprite to collision box
            displayWidth, displayHeight
        );
    } else {
        // Fallback if image not loaded
        ctx.fillStyle = "red";
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }

    // Draw NPCs
    npcs.forEach(npc => {
        if (npc.image && npc.image.complete && npc.image.width > 0) {
            const offsetX = 190;
            const offsetY = 50;
            const frameWidth = 160;
            const frameHeight = 214;
            const displayWidth = npc.size;
            const displayHeight = npc.size * (frameHeight / frameWidth);
            
            // Draw a tiny shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(npc.x + npc.size/2, npc.y + npc.size - 4, npc.size/3, npc.size/6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(
                npc.image,
                offsetX + (npc.frameX * frameWidth),
                offsetY + (npc.frameY * frameHeight),
                frameWidth, frameHeight,
                npc.x, npc.y - (displayHeight - npc.size),
                displayWidth, displayHeight
            );
        }
    });

    // Draw Wind Particles (Leaves)
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Draw a leaf-like shape (oval rotated)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.wobble);
        ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    ctx.restore();
}

// --- 7. GAME LOOP ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start the game!
loadZone("town", 400, 400);
loop();

// --- 8. EDIT MODE UI ---
const debugUI = document.createElement('div');
debugUI.style.position = 'absolute';
debugUI.style.top = '10px';
debugUI.style.left = '10px';
debugUI.style.background = 'rgba(0,0,0,0.8)';
debugUI.style.color = '#f55';
debugUI.style.padding = '10px 15px';
debugUI.style.fontFamily = 'monospace';
debugUI.style.fontSize = '16px';
debugUI.style.pointerEvents = 'none'; // let clicks pass through
debugUI.style.borderRadius = '5px';
debugUI.style.zIndex = '1000';
debugUI.style.display = 'none'; // Hidden by default
debugUI.innerText = `EDIT MODE ON\nDrag to Paint\n'V': Toggle Solid/Walkable\n'[' / ']': Brush Size\n'F': Fill All Solid\n'X': Clear All`;
document.body.appendChild(debugUI);

function handleMouse(e) {
    const clickX = e.clientX / scale;
    const clickY = e.clientY / scale;

    let cameraX = player.x + (player.size / 2) - (canvas.width / 2);
    let cameraY = player.y + (player.size / 2) - (canvas.height / 2);
    if (cameraX < 0) cameraX = 0;
    if (cameraY < 0) cameraY = 0;
    if (cameraX > mapWidth - canvas.width) cameraX = Math.max(0, mapWidth - canvas.width);
    if (cameraY > mapHeight - canvas.height) cameraY = Math.max(0, mapHeight - canvas.height);

    const worldX = clickX + cameraX;
    const worldY = clickY + cameraY;
    const col = Math.floor(worldX / collisionSize);
    const row = Math.floor(worldY / collisionSize);

    // Make sure we are within the collision grid bounds
    if (row >= 0 && row < collisionData.length && col >= 0 && col < collisionData[0].length) {
        if (editMode) {
            for (let r = row - brushRadius; r <= row + brushRadius; r++) {
                for (let c = col - brushRadius; c <= col + brushRadius; c++) {
                    if (r >= 0 && r < collisionData.length && c >= 0 && c < collisionData[0].length) {
                        collisionData[r][c] = paintMode;
                    }
                }
            }
            localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }
}

canvas.addEventListener('mousedown', (e) => { 
    if (editMode) {
        undoStack.push(JSON.stringify(collisionData));
        if (undoStack.length > 20) undoStack.shift();
        redoStack = [];
    }
    isDragging = true; 
    handleMouse(e); 
});
canvas.addEventListener('mousemove', (e) => { if (isDragging) handleMouse(e); });
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });
