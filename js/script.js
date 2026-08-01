const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// --- 3. GAME VARIABLES ---
let currentZone = "town";
let currentMapData = [];
let currentTileset = new Image();
let collisionData = [];
let doorPaintData = [];
let editMode = false;
let timeMode = 0; // 0 = day, 1 = evening, 2 = night, 3 = early morning
let seasonMode = 2; // 0 = Summer, 1 = Monsoon, 2 = Autumn, 3 = Winter

// Initialize Time and Season based on IST (Hyderabad)
function initializeRealTimeEnvironment() {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            month: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        let currentHour = 12;
        let currentMonth = 1;
        
        parts.forEach(part => {
            if (part.type === 'hour') {
                currentHour = parseInt(part.value);
                if (currentHour === 24) currentHour = 0; // Some browsers return 24 instead of 0
            }
            if (part.type === 'month') {
                currentMonth = parseInt(part.value);
            }
        });

        // Determine Season First
        if (currentMonth >= 3 && currentMonth <= 5) {
            seasonMode = 0; // Summer
        } else if (currentMonth >= 6 && currentMonth <= 9) {
            seasonMode = 1; // Monsoon
        } else if (currentMonth >= 10 && currentMonth <= 11) {
            seasonMode = 2; // Autumn
        } else {
            seasonMode = 3; // Winter
        }

        // Determine Time of Day based on Season (Longer days in Summer, shorter in Winter)
        let morningStart, dayStart, eveningStart, nightStart;

        if (seasonMode === 0) { // Summer
            morningStart = 5; dayStart = 7; eveningStart = 19; nightStart = 20;
        } else if (seasonMode === 3) { // Winter
            morningStart = 6; dayStart = 8; eveningStart = 17; nightStart = 18;
        } else { // Monsoon & Autumn
            morningStart = 5; dayStart = 7; eveningStart = 18; nightStart = 19;
        }

        // Apply Time of Day
        if (currentHour >= morningStart && currentHour < dayStart) {
            timeMode = 3; // Early Morning
        } else if (currentHour >= dayStart && currentHour < eveningStart) {
            timeMode = 0; // Day
        } else if (currentHour >= eveningStart && currentHour < nightStart) {
            timeMode = 1; // Evening
        } else {
            timeMode = 2; // Night
        }
        
    } catch (e) {
        console.error("Could not set IST timezone, falling back to defaults.");
    }
}
// Commented out by default to enforce Autumn/Day start
// initializeRealTimeEnvironment();
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

const staticLights = {
    "town": [
        { "x": 508, "y": 392, "radius": 150, "intensity": 0.8 },
        { "x": 676, "y": 392, "radius": 150, "intensity": 0.8 },
        { "x": 508, "y": 544, "radius": 150, "intensity": 0.8 },
        { "x": 676, "y": 544, "radius": 150, "intensity": 0.8 },
        { "x": 1004, "y": 712, "radius": 250, "intensity": 0.8 }
    ],
    "school": [
        { "x": 324, "y": 568, "radius": 150, "intensity": 0.8 },
        { "x": 184, "y": 584, "radius": 180, "intensity": 0.8 },
        { "x": 852, "y": 616, "radius": 150, "intensity": 0.8 },
        { "x": 1100, "y": 696, "radius": 150, "intensity": 0.8 }
    ],
    "castle": [
        { "x": 212, "y": 580, "radius": 150, "intensity": 0.8 },
        { "x": 300, "y": 580, "radius": 150, "intensity": 0.8 },
        { "x": 972, "y": 580, "radius": 150, "intensity": 0.8 },
        { "x": 1068, "y": 580, "radius": 150, "intensity": 0.8 },
        { "x": 212, "y": 732, "radius": 150, "intensity": 0.8 },
        { "x": 300, "y": 732, "radius": 150, "intensity": 0.8 },
        { "x": 964, "y": 736, "radius": 150, "intensity": 0.8 },
        { "x": 1068, "y": 736, "radius": 150, "intensity": 0.8 },
        { "x": 212, "y": 840, "radius": 150, "intensity": 0.8 },
        { "x": 308, "y": 840, "radius": 150, "intensity": 0.8 },
        { "x": 964, "y": 840, "radius": 150, "intensity": 0.8 },
        { "x": 1068, "y": 840, "radius": 150, "intensity": 0.8 },
        { "x": 512, "y": 1056, "radius": 180, "intensity": 0.8 },
        { "x": 768, "y": 1056, "radius": 180, "intensity": 0.8 }
    ]
};

const windowLights = {
    "town": [
        { "x": 840, "y": 244, "radius": 96, "intensity": 0.8 },
        { "x": 840, "y": 300, "radius": 96, "intensity": 0.8 },
        { "x": 300, "y": 364, "radius": 36, "intensity": 0.8 },
        { "x": 256, "y": 416, "radius": 48, "intensity": 0.8 },
        { "x": 344, "y": 416, "radius": 48, "intensity": 0.8 }
    ],
    "school": [
        { "x": 444, "y": 112, "radius": 84, "intensity": 0.8 },
        { "x": 176, "y": 512, "radius": 96, "intensity": 0.8 },
        { "x": 328, "y": 516, "radius": 84, "intensity": 0.8 },
        { "x": 548, "y": 544, "radius": 36, "intensity": 0.8 },
        { "x": 580, "y": 544, "radius": 36, "intensity": 0.8 },
        { "x": 712, "y": 544, "radius": 24, "intensity": 0.8 },
        { "x": 744, "y": 544, "radius": 24, "intensity": 0.8 },
        { "x": 1056, "y": 556, "radius": 36, "intensity": 0.8 },
        { "x": 548, "y": 580, "radius": 36, "intensity": 0.8 },
        { "x": 580, "y": 580, "radius": 36, "intensity": 0.8 },
        { "x": 712, "y": 576, "radius": 24, "intensity": 0.8 },
        { "x": 744, "y": 576, "radius": 24, "intensity": 0.8 },
        { "x": 1084, "y": 620, "radius": 36, "intensity": 0.8 }
    ],
    "castle": [
        { "x": 468, "y": 136, "radius": 24, "intensity": 0.8 },
        { "x": 516, "y": 136, "radius": 24, "intensity": 0.8 },
        { "x": 832, "y": 136, "radius": 24, "intensity": 0.8 },
        { "x": 492, "y": 144, "radius": 36, "intensity": 0.8 },
        { "x": 788, "y": 140, "radius": 12, "intensity": 0.8 },
        { "x": 808, "y": 144, "radius": 24, "intensity": 0.8 },
        { "x": 492, "y": 184, "radius": 48, "intensity": 0.8 },
        { "x": 640, "y": 180, "radius": 36, "intensity": 0.8 },
        { "x": 812, "y": 184, "radius": 48, "intensity": 0.8 },
        { "x": 592, "y": 220, "radius": 36, "intensity": 0.8 },
        { "x": 688, "y": 220, "radius": 36, "intensity": 0.8 },
        { "x": 768, "y": 272, "radius": 24, "intensity": 0.8 },
        { "x": 476, "y": 348, "radius": 36, "intensity": 0.8 },
        { "x": 544, "y": 348, "radius": 36, "intensity": 0.8 },
        { "x": 744, "y": 348, "radius": 36, "intensity": 0.8 },
        { "x": 808, "y": 348, "radius": 36, "intensity": 0.8 }
    ]
};
const npcImageSrcs = ["assets/images/characters/npc1.png", "assets/images/characters/npc2.png", "assets/images/characters/npc3.png", "assets/images/characters/npc4.png"]; // Add as many as you want here
npcImageSrcs.forEach(src => {
    let img = new Image();
    img.src = src;
    npcImages.push(img);
});

const player = {
    x: 400,
    y: 400,
    size: 48,
    speed: 3,
    hp: 100,
    maxHp: 100,
    attack: 10,
    isAttacking: false,
    isDefending: false,
    comboStep: 0,
    comboTimer: 0,
    hurtTimer: 0,
    image: new Image(),
    attackImage: new Image(),
    frameX: 0,
    frameY: 0,
    isMoving: false,
    animTimer: 0
};
player.image = new Image();
player.image.src = "assets/images/characters/main-character.png";

player.attackImage = new Image();
player.attackImage.src = "assets/images/characters/main-character-attack.png";

// You can tweak these or remove this block since we handle it dynamically now
const playerSpriteConfig = {
    scale: 1.0
};

const keys = {};

const interactables = {
    "town": [
        { "x": 896, "y": 304, "w": 48, "h": 48, "id": "lab", "text": "Lab" },
        { "x": 280, "y": 408, "w": 40, "h": 48, "id": "home", "text": "Home" },
        { "x": 904, "y": 656, "w": 48, "h": 56, "id": "workshop", "text": "Workshop" }
    ],
    "school": [
        { "x": 224, "y": 536, "w": 64, "h": 56, "id": "library", "text": "Library" },
        { "x": 616, "y": 576, "w": 64, "h": 80, "id": "school", "text": "School" },
        { "x": 1008, "y": 624, "w": 56, "h": 48, "id": "post", "text": "Post Office" }
    ],
    "castle": [
        { "x": 600, "y": 368, "w": 88, "h": 72, "id": "boss", "text": "???" }
    ]
};

let activeInteractable = null;
let isOverlayActive = false;

let screenShake = 0;
let currentSpeechBubble = null;
let speechBubbleSequence = null;
let speechBubbleIndex = 0;

let bossFightActive = false;
let bossSpikes = [];
let blackHoles = []; // Added for testing Phase 3
let bossMissiles = []; // Added for homing missiles
const spikeImg = new Image();
spikeImg.src = 'assets/images/fx/spikes.png';
const fireImg = new Image();
fireImg.src = 'assets/images/fx/fire.png';
const fireVerticalImg = new Image();
fireVerticalImg.src = 'assets/images/fx/fire_vertical_1.png';

function advanceSpeechBubble() {
    if (!speechBubbleSequence) return;
    if (speechBubbleIndex >= speechBubbleSequence.length) {
        currentSpeechBubble = null;
        speechBubbleSequence = null;
        isOverlayActive = false;

        // Start Boss Fight
        bossFightActive = true;
        const boss = npcs.find(n => n.isBoss);
        if (boss) {
            boss.bossAttackTimer = 60; // Start attacking in 1 second
            if (boss.isTransitioning) {
                boss.phase++;
                boss.isTransitioning = false;
                boss.attackCount = 0;
                boss.bossAttackTimer = 40; // Quick attack after dialogue
            }
        }

        return;
    }
    currentSpeechBubble = speechBubbleSequence[speechBubbleIndex];
    speechBubbleIndex++;
}

// Interior System
const interiorOverlay = document.getElementById('interior-overlay');
const interiorBg = document.getElementById('interior-bg');
const interiorTitle = document.getElementById('interior-title');
const interiorBody = document.getElementById('interior-body');
const interiorClose = document.getElementById('interior-close');
const interiorExplore = document.getElementById('interior-explore');
// Click listener for diary hotspot
const diaryHotspot = document.getElementById('diary-hotspot');
if (diaryHotspot) {
    diaryHotspot.addEventListener('click', (e) => {
        // Prevent click from bubbling up and doing weird things
        e.stopPropagation(); 
        openDiary();
    });
}

const pcHotspot = document.getElementById('pc-hotspot');
if (pcHotspot) {
    pcHotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        const pcContainer = document.getElementById('sitcom-pc-container');
        const interiorButtons = document.querySelector('.interior-buttons');
        const interiorInteractiveLayer = document.querySelector('.interior-interactive-layer');

        pcContainer.style.display = 'flex';
        if (interiorButtons) interiorButtons.style.display = 'none';
        if (interiorInteractiveLayer) interiorInteractiveLayer.style.display = 'none';

        const closePc = () => {
            pcContainer.style.display = 'none';
            if (interiorButtons) interiorButtons.style.display = 'flex';
            if (interiorInteractiveLayer) interiorInteractiveLayer.style.display = 'block';
        };

        // Add a click outside listener to close it
        pcContainer.onclick = (e) => {
            if (e.target === pcContainer) closePc();
        };
        
        const pcCloseBtn = document.getElementById('sitcom-pc-close');
        if (pcCloseBtn) {
            pcCloseBtn.onclick = (e) => {
                e.stopPropagation();
                closePc();
            };
        }
    });
}

// Click logger to find diary coordinates
interiorOverlay.addEventListener('click', (e) => {
    if (activeInteractable && activeInteractable.id === 'home' && isExploringInterior) {
        const interactiveLayer = document.querySelector('.interior-interactive-layer');
        if (interactiveLayer) {
            const rect = interactiveLayer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            console.log(`${xPercent.toFixed(2)}% ${yPercent.toFixed(2)}%`);
        }
    }
});

let isExploringInterior = false;

if (interiorClose) {
    interiorClose.addEventListener('click', () => {
        if (interiorOverlay) interiorOverlay.style.display = 'none';
        const hotspot = document.getElementById('diary-hotspot');
        if (hotspot) hotspot.style.display = 'none';
        const pcH = document.getElementById('pc-hotspot');
        if (pcH) pcH.style.display = 'none';
        
        const pcContainer = document.getElementById('sitcom-pc-container');
        if (pcContainer) pcContainer.style.display = 'none';
        
        isOverlayActive = false;
        isExploringInterior = false;
    });
}

if (interiorExplore) {
    interiorExplore.addEventListener('click', () => {
        isExploringInterior = !isExploringInterior;

        const containers = [
            'typewriter-wrap-container',
            'lab-computer-container',
            'workshop-container',
            'school-board-container',
            'library-rack-container',
            'post-office-container'
        ];

        if (isExploringInterior) {
            // Hide UI containers and remove blur filter to reveal high-res interior room image
            containers.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            if (interiorBg) interiorBg.style.filter = 'none';

            if (activeInteractable) {
                if (activeInteractable.id === 'home') {
                    const hotspot = document.getElementById('diary-hotspot');
                    if (hotspot) hotspot.style.display = 'block';
                    const pcH = document.getElementById('pc-hotspot');
                    if (pcH) pcH.style.display = 'block';
                }

                if (activeInteractable.id === 'post') {
                    interiorExplore.innerHTML = '<span class="x">✉️</span> View Letter';
                } else if (activeInteractable.id === 'school') {
                    interiorExplore.innerHTML = '<span class="x">📋</span> View Board';
                } else if (activeInteractable.id === 'library') {
                    interiorExplore.innerHTML = '<span class="x">📚</span> View Books';
                } else if (activeInteractable.id === 'lab') {
                    interiorExplore.innerHTML = '<span class="x">💻</span> View Terminal';
                } else if (activeInteractable.id === 'workshop') {
                    interiorExplore.innerHTML = '<span class="x">🛠️</span> View Projects';
                } else {
                    interiorExplore.innerHTML = '<span class="x">📜</span> View Details';
                }
            }
        } else {
            // Restore UI container and re-apply ambient background blur/brightness
            const hotspot = document.getElementById('diary-hotspot');
            if (hotspot) hotspot.style.display = 'none';
            const pcH = document.getElementById('pc-hotspot');
            if (pcH) pcH.style.display = 'none';

            if (activeInteractable) {
                if (interiorBg) {
                    if (activeInteractable.id === 'post') interiorBg.style.filter = "brightness(0.4) blur(6px)";
                    else interiorBg.style.filter = "brightness(0.5) blur(4px)";
                }

                if (activeInteractable.id === 'post') {
                    const postOffice = document.getElementById('post-office-container');
                    if (postOffice) postOffice.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Post Office';
                } else if (activeInteractable.id === 'school') {
                    const schoolBoard = document.getElementById('school-board-container');
                    if (schoolBoard) schoolBoard.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore School';
                } else if (activeInteractable.id === 'library') {
                    const libraryRack = document.getElementById('library-rack-container');
                    if (libraryRack) libraryRack.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Library';
                } else if (activeInteractable.id === 'lab') {
                    const labComputer = document.getElementById('lab-computer-container');
                    if (labComputer) labComputer.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Lab';
                } else if (activeInteractable.id === 'workshop') {
                    const workshop = document.getElementById('workshop-container');
                    if (workshop) workshop.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Workshop';
                } else if (activeInteractable.id === 'home') {
                    const typewriter = document.getElementById('typewriter-wrap-container');
                    if (typewriter) typewriter.style.display = 'flex';
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Home';
                }
            }
        }
    });
}

// School Education Data
const educationData = [
    {
        title: "B.Tech",
        institution: "Indian Institute of Technology Bhilai",
        desc: "Electrical Engineering",
        score: "2023 – 2027 | CGPA: 8.92/10"
    },
    {
        title: "Class 12",
        institution: "Narayana Junior College, Patancheru",
        desc: "Telangana State Board of Intermediate Education",
        score: "2021 – 2023 | 99%"
    },
    {
        title: "Class X",
        institution: "Bhashyam Blooms, Maheshwaram",
        desc: "Board of Secondary Education (BSE Telangana)",
        score: "2020 – 2021 | 95% (10 CGPA)"
    }
];

let currentEduSlide = 0;
let isEduAnimating = false;

function updateSchoolBoard() {
    const slider = document.getElementById('board-slider');
    if (!slider) return;
    slider.innerHTML = "";
    educationData.forEach(edu => {
        const slide = document.createElement('div');
        slide.className = 'board-slide';
        slide.innerHTML = `
            <h2 class="board-title" style="margin-bottom: 20px;">${edu.title}</h2>
            <div class="board-detail" style="font-size: 36px; color: #fff; margin-bottom: 5px;">${edu.institution}</div>
            <div class="board-detail" style="font-size: 28px; margin-bottom: 10px;">${edu.desc}</div>
            <div class="board-detail" style="font-size: 26px; color: #f4c0ce;">${edu.score}</div>
        `;
        slider.appendChild(slide);
    });

    currentEduSlide = 0;
    slider.style.transform = `translateY(0%)`;
}

// Ensure the scroll listener is attached after DOM load
document.addEventListener('DOMContentLoaded', () => {
    const boardContainer = document.getElementById('school-board-container');
    if (boardContainer) {
        boardContainer.addEventListener('wheel', (e) => {
            if (boardContainer.style.display === 'none') return;
            e.preventDefault();
            if (isEduAnimating) return;

            if (e.deltaY > 0) {
                // Scroll down -> next slide
                if (currentEduSlide < educationData.length - 1) {
                    currentEduSlide++;
                    animateEduSlide();
                }
            } else if (e.deltaY < 0) {
                // Scroll up -> prev slide
                if (currentEduSlide > 0) {
                    currentEduSlide--;
                    animateEduSlide();
                }
            }
        });
    }
});

function animateEduSlide() {
    isEduAnimating = true;
    const slider = document.getElementById('board-slider');
    slider.style.transform = `translateY(-${currentEduSlide * 100}%)`;
    setTimeout(() => {
        isEduAnimating = false;
    }, 1200);
}

// Library Skills Data — 6 categories, split across 2 racks (3 shelves each)
const skillCategories = [
    // Rack 1 (left)
    {
        label: "Languages",
        color: "blue",
        skills: ["Python", "JavaScript", "C/C++", "Java", "TypeScript"]
    },
    {
        label: "Frontend",
        color: "green",
        skills: ["React", "Next.js", "HTML5", "CSS3", "Tailwind"]
    },
    {
        label: "Backend",
        color: "purple",
        skills: ["Node.js", "Express", "Django", "Flask", "REST APIs"]
    },
    // Rack 2 (right)
    {
        label: "Databases",
        color: "orange",
        skills: ["MongoDB", "PostgreSQL", "MySQL", "Firebase", "Redis"]
    },
    {
        label: "Tools & DevOps",
        color: "teal",
        skills: ["Git", "Docker", "Linux", "VS Code", "Postman"]
    },
    {
        label: "AI & Cloud",
        color: "navy",
        skills: ["TensorFlow", "OpenAI", "AWS", "Vercel", "Pandas"]
    }
];

const bookColors = ["red", "blue", "green", "purple", "orange", "teal", "navy", "rose", "gold", "slate"];

function renderBookRacks() {
    const leftRack = document.getElementById('book-rack-left');
    const rightRack = document.getElementById('book-rack-right');
    if (!leftRack || !rightRack) return;

    leftRack.innerHTML = '';
    rightRack.innerHTML = '';

    skillCategories.forEach((cat, catIdx) => {
        const shelf = document.createElement('div');
        shelf.className = 'rack-shelf';

        const label = document.createElement('div');
        label.className = 'shelf-label';
        label.textContent = cat.label;
        shelf.appendChild(label);

        const booksRow = document.createElement('div');
        booksRow.className = 'shelf-books';

        cat.skills.forEach((skill, skillIdx) => {
            const book = document.createElement('div');
            book.className = 'skill-book';
            // Cycle through colors for variety
            const colorIdx = (catIdx * 3 + skillIdx) % bookColors.length;
            book.setAttribute('data-color', bookColors[colorIdx]);
            book.textContent = skill;
            booksRow.appendChild(book);
        });

        shelf.appendChild(booksRow);

        // First 3 categories go to left rack, last 3 to right
        if (catIdx < 3) {
            leftRack.appendChild(shelf);
        } else {
            rightRack.appendChild(shelf);
        }
    });
}

// Lab Project Data & Logic
const projectsData = [
    {
        title: "BHILAEE LABS",
        tech: ["Next.js 15", "React 19", "Supabase", "KaTeX", "Chart.js"],
        shortDesc: "A structured, interactive virtual laboratory platform designed for EE students at IIT Bhilai. Provides digitized experiment guides with theory, circuit diagrams, and math.",
        features: ["Digitized interactive lab guides", "Viva Voce flashcards", "Mathematical rendering (KaTeX)", "Data visualization (Chart.js)", "One-click access to circuit simulator"],
        github: "https://github.com/RavikantiAkshay/bhilaee-labs",
        live: "https://labs.bhilaee.openlake.in",
        image: "assets/images/environments/lab.jpg"
    },
    {
        title: "BHILAEE SIMULATOR",
        tech: ["Vanilla JS", "HTML/CSS", "SVG Canvas", "Canvas API"],
        shortDesc: "A powerful browser-based circuit simulator built with zero dependencies. Supports DC, AC, and transient analysis with real-time oscilloscope visualization.",
        features: ["Supports DC, AC, and transient analysis", "Modified Nodal Analysis (MNA) solver", "Real-time oscilloscope visualization", "Pre-built experiment templates"],
        github: "https://github.com/RavikantiAkshay/bhilaee-simulator",
        live: "https://simulator.bhilaee.openlake.in",
        image: "assets/images/environments/lab.jpg"
    },
    {
        title: "CODE TRANSLATOR",
        tech: ["React 19", "Node.js", "Express", "Groq LLaMA-3"],
        shortDesc: "An elite full-stack utility leveraging the Groq engine to seamlessly translate, optimize, analyze, and explain code within a high-performance monochrome workspace.",
        features: ["High-fidelity Monaco editor", "Visual diff viewer", "Algorithmic complexity analysis", "Performance optimization tuning", "Google OAuth SSO integration"],
        github: "https://github.com/RavikantiAkshay/code-translator",
        live: "https://code-translator-tau.vercel.app/",
        image: "assets/images/environments/lab.jpg"
    },
    {
        title: "RESUME ANALYSER",
        tech: ["React", "Express", "MongoDB", "Groq AI"],
        shortDesc: "An open-source web application to build, optimize, and analyze resumes using AI. Features a live-preview builder and deep ATS compatibility scoring.",
        features: ["Live-preview PDF building", "One-click STAR bullet point generation", "Keyword-by-keyword JD match scoring", "Missing skills detection", "Action verb analysis"],
        github: "https://github.com/RavikantiAkshay/resume-analyzer",
        live: "https://resume-analyzer-kappa-fawn.vercel.app/",
        image: "assets/images/environments/lab.jpg"
    },
    {
        title: "CODE REVIEWER",
        tech: ["Python", "FastAPI", "Node.js", "Groq API"],
        shortDesc: "An AI-powered tool that combines static analysis with LLM insights to provide comprehensive, actionable code reviews for Python and JavaScript projects.",
        features: ["Flake8 & ESLint static analysis", "LLM-powered deeper insights", "Supports ZIP upload or Git cloning", "Configurable rulesets (PEP8, OWASP)", "Intelligent issue deduplication"],
        github: "https://github.com/RavikantiAkshay/code-review-assistant",
        live: "https://code-review-assistant-chi.vercel.app/",
        image: "assets/images/environments/lab.jpg"
    }
];

let currentProjectIdx = 0;

window.loadLabIframe = function (liveUrl) {
    const pPrev = document.getElementById('project-preview');
    if (!pPrev) return;

    pPrev.innerHTML = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0a0a0a; color:#0f0; font-family:'Share Tech Mono';">
            <div class="pixel-loader"></div>
            <p class="blink-text" style="margin-top:20px; font-size:1.2rem;">> ESTABLISHING CONNECTION...</p>
        </div>
        <div id="iframe-container" style="position:absolute; top:0; left:0; width:200%; height:200%; transform:scale(0.5); transform-origin:top left; opacity:0; transition:opacity 0.5s;">
            <iframe src="${liveUrl}" style="width:100%; height:100%; border:none; background:#fff;" onload="document.getElementById('iframe-container').style.opacity='1';"></iframe>
        </div>
    `;
};

function updateLabComputer() {
    const p = projectsData[currentProjectIdx];
    const pTitle = document.getElementById('project-title');
    const pTech = document.getElementById('project-tech');
    const pDesc = document.getElementById('project-description');
    const pFeat = document.getElementById('project-features');
    const pGit = document.getElementById('project-github');
    const pLive = document.getElementById('project-live');
    const pPrev = document.getElementById('project-preview');

    if (pTitle) pTitle.innerText = p.title;
    if (pTech) pTech.innerHTML = p.tech.map(t => `<li>> ${t}</li>`).join('');
    if (pDesc) pDesc.innerText = p.shortDesc;
    if (pFeat) pFeat.innerHTML = p.features.map(f => `<li style="margin-bottom:6px;">- ${f}</li>`).join('');
    if (pGit) pGit.href = p.github;
    if (pLive) pLive.href = p.live;
    if (pPrev) {
        if (p.live && p.live !== "#") {
            window.loadLabIframe(p.live);
        } else {
            pPrev.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#0a0a0a; color:#555; border-radius:4px;">NO PREVIEW AVAILABLE</div>`;
        }
    }
}

const prevBtn = document.getElementById('prev-project-btn');
const nextBtn = document.getElementById('next-project-btn');

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentProjectIdx = (currentProjectIdx - 1 + projectsData.length) % projectsData.length;
        updateLabComputer();
    });
}
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentProjectIdx = (currentProjectIdx + 1) % projectsData.length;
        updateLabComputer();
    });
}

const workshopProjectsData = [
    {
        title: "NxtForm",
        status: "IN PROGRESS",
        desc: "An open-source, full-stack web application that revolutionizes data collection. Build highly customizable forms with a drag-and-drop workspace, or let AI generate professional forms from a simple prompt. Serve your forms in both classic and conversational modes to maximize completion rates.",
        features: ["Workspace Builder", "AI Form Generator", "Small-Cohort Analytics", "AI Workflow Insights"],
        tech: "React, Node.js, Express, MongoDB, Groq API",
        repo: "https://github.com/RavikantiAkshay/NxtForm"
    },
    {
        title: "Placement-Assistant",
        status: "IN PROGRESS",
        desc: "An open-source, full-stack AI platform that conducts real-time conversational mock interviews. Upload your resume, select your desired role and difficulty, and participate in a highly dynamic voice-to-voice interview. Receive a comprehensive analytics report detailing your technical proficiency, behavioral adherence, and communication skills to help you ace your next real-world interview.",
        features: ["Voice-to-Voice Interaction", "Resume-Driven Questions", "Comprehensive Analytics", "Intelligent Doubt Solver"],
        tech: "React 19, Express, MongoDB, Groq AI, Whisper",
        repo: "https://github.com/RavikantiAkshay/placement-assistant"
    },
    {
        title: "TestCaseGenerator",
        status: "IN PROGRESS",
        desc: "AI-powered test case generator. Upload a repository, let AI analyze the architecture, and generate comprehensive test suites — unit, integration, API, and edge cases. Features an interactive test workspace where you can view syntax-highlighted test code, edit outputs inline, and request targeted AI regenerations.",
        features: ["Deep Architecture Analysis", "Context-Aware AI Generation", "Embedding Memory", "Interactive Test Workspace"],
        tech: "React, Node.js, Express, MongoDB, Groq SDK",
        repo: "https://github.com/RavikantiAkshay/test-case-generator"
    },
    {
        title: "bEEtcode",
        status: "STASHED",
        desc: "A modern, high-fidelity dashboard for practicing Verilog and mastering digital logic design. Features an extensive collection of Verilog problems ranging from Combinational Logic to complex FSMs. Track your coding streaks, daily goals, and topic mastery with real-time evaluation and GitHub-style activity heatmaps.",
        features: ["Interactive Dashboard", "Monaco Editor (Verilog Syntax)", "Real-time Evaluation", "Progress Tracking"],
        tech: "Next.js 15, TypeScript, Supabase",
        reason: "Content Sourcing Constraints — Generating a massive, original suite of Verilog problems is unfeasible for a solo developer, and scraping third-party content violates copyright policies."
    },
    {
        title: "gitmap",
        status: "STASHED",
        desc: "Advanced GitHub Profile Analysis & Collaboration Mapping. Provides deep profile analysis, AI-powered collaboration matching, skill trajectory mapping, and personalized growth recommendations for developers. Visualize profiles in a 2D similarity space using UMAP dimensionality reduction.",
        features: ["Multi-Axis Profile Scoring", "Tech Stack Analysis", "Trajectory Mapping", "UMAP Dimensionality Reduction"],
        tech: "FastAPI, Python, React, TypeScript",
        reason: "GitHub API Rate Limits — Frequent token exhaustion restricts the volume of deep profile analyses required for full functionality. Awaiting optimized caching strategies."
    },
    {
        title: "studybot",
        status: "STASHED",
        desc: "StudyRoom is an AI studying platform designed to ruthlessly enforce contextual learning and aggressively combat the forgetting curve. Organizes knowledge into constrained 'Rooms' and links them via a persistent Memory Lake that tracks and optimizes your cognitive retention across all subjects.",
        features: ["Smart Compartmentalization", "Memory Lake Tracker", "Cross-Room Intelligence", "Cognitive Diagnostics"],
        tech: "React, Express, Node.js, Groq/Gemini",
        reason: "Scalability & LLM Token Quotas — The continuous nature of the Memory Lake demands high-frequency LLM interactions, rapidly exceeding free API limits and restricting massive user scalability."
    }
];

let currentWorkshopIdx = 0;

function updateWorkshopBlueprint() {
    const w = workshopProjectsData[currentWorkshopIdx];
    const bpTitle = document.getElementById('bp-title');
    const bpStatus = document.getElementById('bp-proj-status');
    const bpDesc = document.getElementById('bp-proj-desc');
    const bpFeat = document.getElementById('bp-proj-features');
    const bpTech = document.getElementById('bp-proj-tech');
    const bpPag = document.getElementById('bp-pagination');
    const bpStashReason = document.getElementById('bp-stash-reason');
    const bpStashContainer = document.getElementById('bp-stash-reason-container');
    const bpRepoLink = document.getElementById('bp-repo-link');
    const bpRepoContainer = document.getElementById('bp-repo-container');

    if (bpTitle) bpTitle.innerText = `Blueprint: ${w.title}`;
    if (bpStatus) {
        bpStatus.innerText = `Status: ${w.status}`;
        bpStatus.style.color = w.status === 'STASHED' ? '#ff9999' : '#ffd700';
    }

    if (w.status === 'STASHED') {
        if (bpStashContainer) bpStashContainer.style.display = 'block';
        if (bpStashReason) bpStashReason.innerText = w.reason || "Placeholder reason";
        if (bpRepoContainer) bpRepoContainer.style.display = 'none';
    } else {
        if (bpStashContainer) bpStashContainer.style.display = 'none';
        if (bpRepoContainer) bpRepoContainer.style.display = 'block';
        if (bpRepoLink) bpRepoLink.href = w.repo || "#";
    }

    if (bpDesc) bpDesc.innerText = w.desc;
    if (bpFeat) bpFeat.innerHTML = w.features.map(f => `<li>${f}</li>`).join('');
    if (bpTech) bpTech.innerHTML = `<strong>Tech Stack:</strong> ${w.tech}`;
    if (bpPag) bpPag.innerText = `${currentWorkshopIdx + 1} / ${workshopProjectsData.length}`;
}

const bpPrevBtn = document.getElementById('blueprint-prev');
const bpNextBtn = document.getElementById('blueprint-next');
if (bpPrevBtn) {
    bpPrevBtn.addEventListener('click', () => {
        currentWorkshopIdx = (currentWorkshopIdx - 1 + workshopProjectsData.length) % workshopProjectsData.length;
        updateWorkshopBlueprint();
    });
}
if (bpNextBtn) {
    bpNextBtn.addEventListener('click', () => {
        currentWorkshopIdx = (currentWorkshopIdx + 1) % workshopProjectsData.length;
        updateWorkshopBlueprint();
    });
}

if (interiorExplore) {
    interiorExplore.addEventListener('click', () => {
        if (scrollWrapContainer) scrollWrapContainer.style.display = 'none'; // hide the parchment
        if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none'; // hide the typewriter
        if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none'; // hide the computer
        if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none'; // hide the school board
        if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none'; // hide the library racks

        if (interiorBg) {
            interiorBg.style.transition = 'filter 0.7s ease';
            interiorBg.style.filter = "none"; // clear the background blur smoothly
        }

        const workshopContainer = document.getElementById('workshop-container');
        if (workshopContainer) {
            workshopContainer.style.display = 'none';
        }

        interiorExplore.style.display = 'none'; // hide the explore button itself
        // isOverlayActive remains true, so player can't move. They just see the image.
    });
}

// Dialogue System
const dialogueBox = document.getElementById('dialogue-box');
const dialogueBackdrop = document.getElementById('dialogue-backdrop');
const dialogueName = document.getElementById('dialogue-name');
const dialogueText = document.getElementById('dialogue-text');

let isDialogueActive = false;
let currentDialogueQueue = [];
let currentDialogueIndex = 0;
let dialogueOnComplete = null;
let hasSeenIntro = false;

function showDialogue(name, texts, onComplete = null) {
    isDialogueActive = true;
    isOverlayActive = true;
    currentDialogueQueue = texts;
    currentDialogueIndex = 0;
    dialogueOnComplete = onComplete;
    dialogueName.innerText = name;
    dialogueText.innerText = currentDialogueQueue[currentDialogueIndex];
    if (dialogueBox) {
        dialogueBox.style.display = 'block';
        dialogueBackdrop.style.display = 'block';
    }
}

function nextDialogue() {
    currentDialogueIndex++;
    if (currentDialogueIndex < currentDialogueQueue.length) {
        dialogueText.innerText = currentDialogueQueue[currentDialogueIndex];
    } else {
        isDialogueActive = false;
        if (dialogueBox) {
            dialogueBox.style.display = 'none';
            dialogueBackdrop.style.display = 'none';
        }
        if (dialogueOnComplete) {
            dialogueOnComplete();
            dialogueOnComplete = null;
        } else {
            isOverlayActive = false;
        }
    }
}

if (dialogueBox) {
    dialogueBox.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // prevent attack click
        nextDialogue();
    });
}

// Cinematic Intro replaces the physical NPC

// Create 404 Overlay
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100vw';
overlay.style.height = '100vh';
overlay.style.background = 'rgba(0,0,0,0.9)';
overlay.style.color = 'white';
overlay.style.display = 'none';
overlay.style.flexDirection = 'column';
overlay.style.alignItems = 'center';
overlay.style.justifyContent = 'center';
overlay.style.fontFamily = 'sans-serif';
overlay.style.zIndex = '2000';
overlay.innerHTML = `
    <h1 id="overlayTitle" style="font-size: 3rem; margin-bottom: 20px;">Building Name</h1>
    <p style="font-size: 1.5rem; color: #aaa;">404 - Interior Under Construction</p>
    <p style="margin-top: 50px; font-size: 1.2rem; background: #333; padding: 10px 20px; border-radius: 5px;">Press ESC or E to return</p>
`;
document.body.appendChild(overlay);

window.addEventListener("keydown", (e) => {
    let key = e.key.toLowerCase();
    keys[key] = true;

    // Quick test shortcut for PC UI
    if (key === 'p') {
        const pcContainer = document.getElementById('sitcom-pc-container');
        const interiorButtons = document.querySelector('.interior-buttons');
        const interiorInteractiveLayer = document.querySelector('.interior-interactive-layer');

        if (pcContainer) {
            const isOpening = pcContainer.style.display !== 'flex';
            pcContainer.style.display = isOpening ? 'flex' : 'none';
            if (interiorButtons) interiorButtons.style.display = isOpening ? 'none' : 'flex';
            if (interiorInteractiveLayer) interiorInteractiveLayer.style.display = isOpening ? 'none' : 'block';
        }
    }

    if (key === 'n') {
        timeMode = (timeMode + 1) % 4;
    }

    if (key === 'm') {
        seasonMode = (seasonMode + 1) % 4;
    }

    if (key === 't') {
        openDiary();
    }

    // Handle Interaction (E key)
    if (key === 'e') {
        if (!isOverlayActive && activeInteractable) {
            isOverlayActive = true;
            isExploringInterior = false;

            if (activeInteractable.id === 'home') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/home.png')";
                    interiorBg.style.filter = "none"; // clear image during dialogue
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none'; // hide scroll initially
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Home';
                    interiorExplore.style.display = 'flex'; // make sure explore button is visible again
                }
                const typewriterWrapContainer = document.getElementById('typewriter-wrap-container');
                if (typewriterWrapContainer) typewriterWrapContainer.style.display = 'block';
                if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none'; // hide lab computer
                if (document.getElementById('workshop-container')) document.getElementById('workshop-container').style.display = 'none';
                if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none';
                if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none';
                if (document.getElementById('post-office-container')) document.getElementById('post-office-container').style.display = 'none';

                showDialogue("AKBOT-E7", [
                    "Welcome to Akshay's Home! Oh, look... a page is still stuck in his old typewriter. Let's see what it says."
                ], () => {
                    // On dialogue complete, show the typewriter paper
                    if (interiorBg) interiorBg.style.filter = "brightness(0.5) blur(6px)";
                    if (interiorTitle) interiorTitle.innerText = "";
                    if (interiorBody) interiorBody.innerHTML = `
                        <h1 class="typewriter-title" style="margin-bottom: 30px;">Akshay Ravikanti</h1>
                        <p class="typewriter-text">
                            Welcome to my home! I'm a developer who is passionate
                            about creating immersive and interactive experiences.
                        </p>
                        <p class="typewriter-text">
                            I specialize in building scalable web applications, and
                            I love turning complex problems into simple, beautiful,
                            and intuitive designs.
                        </p>
                    `;
                    if (intContent) intContent.style.display = 'flex';
                });

                // CRITICAL: Hide the dark backdrop so the interior image is bright and clear during dialogue!
                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

            } else if (activeInteractable.id === 'lab') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/lab.jpg')";
                    interiorBg.style.filter = "none";
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none';
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Lab';
                    interiorExplore.style.display = 'flex'; // Enable explore in lab
                }
                if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none';
                if (document.getElementById('workshop-container')) document.getElementById('workshop-container').style.display = 'none';
                if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none';
                if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none';
                if (document.getElementById('post-office-container')) document.getElementById('post-office-container').style.display = 'none';
                const labComputer = document.getElementById('lab-computer-container');
                if (labComputer) labComputer.style.display = 'none'; // hidden during dialogue

                showDialogue("AKBOT-E7", [
                    "Welcome to the Lab! Let me boot up one of these terminals so you can check out his projects."
                ], () => {
                    if (interiorBg) interiorBg.style.filter = "brightness(0.4) blur(8px)";
                    if (intContent) intContent.style.display = 'flex';
                    if (labComputer) {
                        labComputer.style.display = 'flex';
                        updateLabComputer();
                    }
                });

                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

            } else if (activeInteractable.id === 'workshop') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/workshop.jpg')";
                    interiorBg.style.filter = "none";
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none';
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Workshop';
                    interiorExplore.style.display = 'flex';
                }
                if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none';
                if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none';
                if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none';
                if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none';
                if (document.getElementById('post-office-container')) document.getElementById('post-office-container').style.display = 'none';
                const workshopContainer = document.getElementById('workshop-container');
                if (workshopContainer) workshopContainer.style.display = 'none'; // hidden during dialogue

                showDialogue("AKBOT-E7", [
                    "Ah, the Workshop. Here you can review active blueprints and stashed concepts."
                ], () => {
                    if (interiorBg) interiorBg.style.filter = "brightness(0.3) blur(10px)";
                    if (intContent) intContent.style.display = 'flex';
                    if (workshopContainer) {
                        workshopContainer.style.display = 'flex';
                        updateWorkshopBlueprint();
                    }
                });

                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';
            } else if (activeInteractable.id === 'school') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/school.png')";
                    interiorBg.style.backgroundColor = "transparent";
                    interiorBg.style.filter = "none";
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none';
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore School';
                    interiorExplore.style.display = 'flex';
                }
                if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none';
                if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none';
                if (document.getElementById('workshop-container')) document.getElementById('workshop-container').style.display = 'none';
                if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none';
                if (document.getElementById('post-office-container')) document.getElementById('post-office-container').style.display = 'none';

                const schoolBoard = document.getElementById('school-board-container');
                if (schoolBoard) schoolBoard.style.display = 'none';

                showDialogue("AKBOT-E7", [
                    "Welcome to the School! Let's take a look at his education history on the chalkboard."
                ], () => {
                    if (interiorBg) interiorBg.style.filter = "brightness(0.5) blur(4px)";
                    if (intContent) intContent.style.display = 'flex';
                    if (schoolBoard) {
                        schoolBoard.style.display = 'flex';
                        updateSchoolBoard();
                    }
                });

                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

            } else if (activeInteractable.id === 'library') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/library.png')";
                    interiorBg.style.backgroundColor = "transparent";
                    interiorBg.style.filter = "none";
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none';
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Library';
                    interiorExplore.style.display = 'flex';
                }
                if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none';
                if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none';
                if (document.getElementById('workshop-container')) document.getElementById('workshop-container').style.display = 'none';
                if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none';
                if (document.getElementById('post-office-container')) document.getElementById('post-office-container').style.display = 'none';

                const libraryRack = document.getElementById('library-rack-container');
                if (libraryRack) libraryRack.style.display = 'none';

                showDialogue("AKBOT-E7", [
                    "Welcome to the Library! Each book on these shelves represents a skill Akshay has picked up. Take a look!"
                ], () => {
                    if (interiorBg) interiorBg.style.filter = "brightness(0.5) blur(4px)";
                    if (intContent) intContent.style.display = 'flex';
                    if (libraryRack) {
                        libraryRack.style.display = 'flex';
                        renderBookRacks();
                    }
                });

                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

            } else if (activeInteractable.id === 'post') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/post.png')";
                    interiorBg.style.backgroundColor = "transparent";
                    interiorBg.style.filter = "none";
                    interiorBg.style.backgroundSize = "contain";
                    interiorBg.style.backgroundRepeat = "no-repeat";
                }
                const intContent = document.querySelector('.interior-content');
                if (intContent) intContent.style.display = 'none';
                if (interiorOverlay) interiorOverlay.style.display = 'block';
                if (interiorExplore) {
                    interiorExplore.innerHTML = '<span class="x">🔍</span> Explore Post Office';
                    interiorExplore.style.display = 'flex';
                }
                if (document.getElementById('typewriter-wrap-container')) document.getElementById('typewriter-wrap-container').style.display = 'none';
                if (document.getElementById('lab-computer-container')) document.getElementById('lab-computer-container').style.display = 'none';
                if (document.getElementById('workshop-container')) document.getElementById('workshop-container').style.display = 'none';
                if (document.getElementById('school-board-container')) document.getElementById('school-board-container').style.display = 'none';
                if (document.getElementById('library-rack-container')) document.getElementById('library-rack-container').style.display = 'none';

                const postOffice = document.getElementById('post-office-container');
                if (postOffice) postOffice.style.display = 'none';

                showDialogue("AKBOT-E7", [
                    "Welcome to the Post Office! Here is Akshay's personal letter and contact directory. Feel free to reach out!"
                ], () => {
                    if (interiorBg) interiorBg.style.filter = "brightness(0.4) blur(6px)";
                    if (intContent) intContent.style.display = 'flex';
                    if (postOffice) {
                        postOffice.style.display = 'flex';
                    }
                });

                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

            } else if (activeInteractable.id === 'boss') {
                if (dialogueBackdrop) dialogueBackdrop.style.display = 'none';

                isOverlayActive = true; // Freeze game during dialogue

                showDialogue("AKBOT-E7", [
                    "Oh no, it seems like you have awakened the Guardian! Prepare yourself for a challenge..."
                ], () => {
                    // Start screen shake
                    screenShake = 40;

                    // Position Player on the road facing right
                    player.x = 580;
                    player.y = 632;
                    player.frameY = 3; // Right
                    player.isMoving = false;

                    // Load Boss Images
                    const bossImg = new Image();
                    bossImg.src = 'assets/images/characters/boss.png';
                    const bossAttackImg = new Image();
                    bossAttackImg.src = 'assets/images/characters/boss-attack-2.png';

                    // Spawn Boss on the road facing left
                    const bossNpc = {
                        x: 680,
                        y: 600,
                        size: 80, // Bigger than player
                        speed: 0,
                        hp: 500,
                        maxHp: 500,
                        frameX: 0, // Idle
                        frameY: 1, // Left
                        isMoving: false,
                        isAttacking: false,
                        isCharging: false,
                        attackFrame: 0,
                        animTimer: 0,
                        directionTimer: 999999, // Prevent random movement
                        isBoss: true,
                        image: bossImg,
                        attackImage: bossAttackImg,
                        phase: 1,
                        attackCount: 0,
                        maxPhase1Attacks: 8,
                        isTransitioning: false
                    };

                    // Clear other NPCs and add Boss
                    npcs = [bossNpc];

                    // Update Camera to center on the encounter
                    cameraX = player.x + (player.size / 2) - (canvas.width / 2);
                    cameraY = player.y + (player.size / 2) - (canvas.height / 2);
                    if (cameraX < 0) cameraX = 0;
                    if (cameraY < 0) cameraY = 0;
                    if (cameraX > mapWidth - canvas.width) cameraX = Math.max(0, mapWidth - canvas.width);
                    if (cameraY > mapHeight - canvas.height) cameraY = Math.max(0, mapHeight - canvas.height);

                    // Wait a bit for screen shake, then start speech bubbles
                    setTimeout(() => {
                        speechBubbleSequence = [
                            { entity: bossNpc, text: "Ah... so you've finally arrived." },
                            { entity: player, text: "Wait... who are you?" },
                            { entity: bossNpc, text: "I am the Guardian of this town, and I have seen you traversing all around..." },
                            { entity: player, text: "I just wanted to explore the town and get to know the creator a little." },
                            { entity: bossNpc, text: "You have done well to make it this far. But before you take another step, you must defeat me and prove your worth!" }
                        ];
                        speechBubbleIndex = 0;
                        advanceSpeechBubble();
                    }, 800);
                });

            } else {
                document.getElementById('overlayTitle').innerText = activeInteractable.text;
                overlay.style.display = 'flex';
            }
        } else if (isOverlayActive && !isDialogueActive) {
            overlay.style.display = 'none';
            if (interiorOverlay) interiorOverlay.style.display = 'none';
            const workshopContainer = document.getElementById('workshop-container');
            if (workshopContainer) workshopContainer.style.display = 'none';
            const schoolBoard = document.getElementById('school-board-container');
            if (schoolBoard) schoolBoard.style.display = 'none';
            const libraryRack = document.getElementById('library-rack-container');
            if (libraryRack) libraryRack.style.display = 'none';
            const postOffice = document.getElementById('post-office-container');
            if (postOffice) postOffice.style.display = 'none';
            isOverlayActive = false;
        }
    }
    if (e.key === 'Escape' && isOverlayActive && !isDialogueActive) {
        overlay.style.display = 'none';
        if (interiorOverlay) interiorOverlay.style.display = 'none';
        const workshopContainer = document.getElementById('workshop-container');
        if (workshopContainer) workshopContainer.style.display = 'none';
        const schoolBoard = document.getElementById('school-board-container');
        if (schoolBoard) schoolBoard.style.display = 'none';
        const libraryRack = document.getElementById('library-rack-container');
        if (libraryRack) libraryRack.style.display = 'none';
        const postOffice = document.getElementById('post-office-container');
        if (postOffice) postOffice.style.display = 'none';
        isOverlayActive = false;
    }
    // --- LIGHT SOURCE MODE ---
    if (e.key.toLowerCase() === 'i') {
        editMode = !editMode;

        debugUI.innerText = `LIGHT SOURCE MODE ON\nDrag to Paint Light Centers\n'P': Print Array to Console\n'V': Toggle Paint/Erase\n'[' / ']': Brush Size`;
        debugUI.style.color = "#ffdd55";

        debugUI.style.display = editMode ? 'block' : 'none';
        coordUI.style.display = 'none'; // Not needed anymore
    }

    if (!editMode) return;

    if (e.key.toLowerCase() === 'p') {
        let lights = [];
        let visited = Array.from({ length: doorPaintData.length }, () => Array(doorPaintData[0].length).fill(false));
        for (let r = 0; r < doorPaintData.length; r++) {
            for (let c = 0; c < doorPaintData[0].length; c++) {
                if (doorPaintData[r][c] === 1 && !visited[r][c]) {
                    let minR = r, maxR = r, minC = c, maxC = c;
                    let queue = [[r, c]];
                    visited[r][c] = true;
                    while (queue.length > 0) {
                        let [cr, cc] = queue.shift();
                        minR = Math.min(minR, cr);
                        maxR = Math.max(maxR, cr);
                        minC = Math.min(minC, cc);
                        maxC = Math.max(maxC, cc);
                        let dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                        for (let d of dirs) {
                            let nr = cr + d[0];
                            let nc = cc + d[1];
                            if (nr >= 0 && nr < doorPaintData.length && nc >= 0 && nc < doorPaintData[0].length) {
                                if (doorPaintData[nr][nc] === 1 && !visited[nr][nc]) {
                                    visited[nr][nc] = true;
                                    queue.push([nr, nc]);
                                }
                            }
                        }
                    }

                    const w = (maxC - minC + 1) * collisionSize;
                    const h = (maxR - minR + 1) * collisionSize;
                    const cx = (minC * collisionSize) + (w / 2);
                    const cy = (minR * collisionSize) + (h / 2);
                    const radius = Math.max(w, h) * 1.5; // Scale radius based on drawn area

                    lights.push({
                        x: Math.floor(cx),
                        y: Math.floor(cy),
                        radius: Math.floor(radius),
                        intensity: 0.8
                    });
                }
            }
        }
        console.log("LIGHT CONFIG FOR " + currentZone + ":\n", JSON.stringify(lights, null, 2));
        alert("Printed Lights array to console! Press F12 to copy it.");
    }
    else if (e.key.toLowerCase() === 'z' && e.ctrlKey) {
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
        if (confirm("Are you sure you want to CLEAR all painted doors?")) {
            doorPaintData = doorPaintData.map(row => row.map(() => 0));
        }
    }

    if (editMode) {
        const size = (brushRadius * 2) + 1;
        debugUI.innerText = `DOOR EDIT MODE ON\nBrush: ${paintMode === 1 ? 'PAINT (Blue)' : 'ERASE'}\nSize: ${size}x${size}\n'P': Print Array\n'V' to toggle, 'X' Clear Doors`;
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

    // Show intro dialogue once on first load
    if (zoneName === 'town' && !hasSeenIntro) {
        hasSeenIntro = true;
        setTimeout(() => {
            showDialogue("AKBOT-E7", [
                "Hi there! You've just entered the Town of Akshay.",
                "Every building you see holds hidden details and information about him.",
                "Use W, A, S, D to move around. Left-Click to attack, and hold 'F' to defend if you run into trouble.",
                "Go on, uncover his story... the more you know, the better it gets!"
            ]);
        }, 500);
    }
    let zoneConfig = world[zoneName];
    if (zoneConfig.type === "static") {
        currentMapData = [];
        if (!zoneConfig.imgElement) {
            let img = new Image();
            img.src = zoneConfig.src;
            img.onload = () => {
                zoneConfig.width = img.width;
                zoneConfig.height = img.height;
                mapWidth = img.width;
                mapHeight = img.height;
                resize();
            };
            zoneConfig.imgElement = img;
        } else {
            mapWidth = zoneConfig.width;
            mapHeight = zoneConfig.height;
            resize();
        }
    } else {
        currentMapData = zoneConfig.data;
        currentTileset.src = zoneConfig.tilesetSrc;
        if (currentMapData.length > 0) {
            mapWidth = currentMapData[0].length * tileSize;
            mapHeight = currentMapData.length * tileSize;
            resize();
        }
    }

    if (zoneConfig.type !== "static" && currentMapData.length > 0) {
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

        doorPaintData = Array.from({ length: collisionRows }, () => Array(collisionCols).fill(0));

        const savedCollision = localStorage.getItem('collision_' + zoneName);
        if (savedCollision) {
            const parsed = JSON.parse(savedCollision);
            if (parsed.length === collisionRows && parsed[0] && parsed[0].length === collisionCols) {
                collisionData = parsed;
            } else if (hardcodedMap[zoneName]) {
                collisionData = hardcodedMap[zoneName].map(r => [...r]);
            } else {
                collisionData = Array.from({ length: collisionRows }, () => Array(collisionCols).fill(0));
            }
        } else if (hardcodedMap[zoneName]) {
            collisionData = hardcodedMap[zoneName].map(r => [...r]);
        } else {
            collisionData = Array.from({ length: collisionRows }, () => Array(collisionCols).fill(0));
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
                    hp: 30,
                    maxHp: 30,
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
        if (npc === ignoreEntity || npc.hp <= 0) continue;
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
    if (player.hp <= 0) {
        const gameOverOverlay = document.getElementById('game-over-overlay');
        if (gameOverOverlay && gameOverOverlay.style.display !== 'flex') {
            gameOverOverlay.style.display = 'flex';
            isOverlayActive = true;
        }
        return; // Freeze game
    }

    if (isOverlayActive) return; // Freeze game when reading

    // Update interactables
    activeInteractable = null;

    if (interactables[currentZone]) {
        for (let item of interactables[currentZone]) {
            let interactBox = { x: item.x - 20, y: item.y - 20, w: item.w + 40, h: item.h + 40 };
            let playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
            if (rectIntersect(playerBox, interactBox)) {
                activeInteractable = item;
                break;
            }
        }
    }

    player.isMoving = false;

    // Sprint logic: double speed if Shift is held
    const currentSpeed = keys["shift"] ? player.speed * 2 : player.speed;

    if (!player.isTrapped) {
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
    }

    // Decrement combo window timer
    if (player.comboTimer > 0) {
        player.comboTimer--;
    } else {
        player.comboStep = 0;
    }

    // Defense takes priority
    if (keys["f"]) { // using 'f' instead of 'd' to prevent breaking movement
        player.isDefending = true;
        player.isAttacking = false;
        player.frameX = 4; // defense frame from sample7
        player.isMoving = false;
    } else {
        player.isDefending = false;
    }

    // Animation loop
    if (!player.isDefending) {
        if (player.isAttacking) {
            player.animTimer++;
            // Hold the attack frame for a short duration to show the attack
            if (player.animTimer >= 10) {
                player.isAttacking = false;
            }
        } else if (player.isMoving) {
            player.animTimer++;
            // Speed up animation when sprinting
            const animSpeedLimit = keys["shift"] ? 4 : 8;
            if (player.animTimer >= animSpeedLimit) { // change frame based on speed
                // Since we use the original walk sprite when moving, we need 4 frames for the walk cycle
                player.frameX = (player.frameX + 1) % 4;
                player.animTimer = 0;
            }
        } else {
            player.frameX = 0; // idle frame
            player.animTimer = 0;
        }
    }

    // Update Camera Center
    cameraX = player.x + (player.size / 2) - (canvas.width / 2);
    cameraY = player.y + (player.size / 2) - (canvas.height / 2);
    if (cameraX < 0) cameraX = 0;
    if (cameraY < 0) cameraY = 0;
    if (cameraX > mapWidth - canvas.width) cameraX = Math.max(0, mapWidth - canvas.width);
    if (cameraY > mapHeight - canvas.height) cameraY = Math.max(0, mapHeight - canvas.height);

    // Update hurt timer
    if (player.hurtTimer > 0) player.hurtTimer--;

    // --- WEATHER PARTICLES ---
    globalTime++;
    if (seasonMode === 2 && Math.random() < 0.2) { // Autumn Leaves
        particles.push({
            type: 'leaf',
            x: cameraX - 100 + Math.random() * (canvas.width + 100),
            y: cameraY - 50 - Math.random() * 100,
            vx: 3 + Math.random() * 3, 
            vy: 2 + Math.random() * 2, 
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#d35400' : '#f39c12', // Autumn orange/yellow instead of green
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.05 + Math.random() * 0.1
        });
    } else if (seasonMode === 1) { // Monsoon Rain
        for (let i = 0; i < 3; i++) { // Spawn multiple drops per frame
            particles.push({
                type: 'rain',
                x: cameraX - 100 + Math.random() * (canvas.width + 200),
                y: cameraY - 100 - Math.random() * 50,
                vx: 1 + Math.random() * 2,
                vy: 12 + Math.random() * 6,
                length: 15 + Math.random() * 10,
                targetY: cameraY + 100 + Math.random() * canvas.height
            });
        }
    } else if (seasonMode === 3) { // Winter Snow
        if (Math.random() < 0.6) { // High chance for dense snow
            particles.push({
                type: 'snow',
                x: cameraX - 200 + Math.random() * (canvas.width + 400),
                y: cameraY - 50,
                vx: -1 + Math.random() * 2, // Drift left or right
                vy: 1 + Math.random() * 2,  // Slow falling
                size: 1.5 + Math.random() * 2.5, // Flake size
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.04
            });
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        if (p.type === 'leaf' || !p.type) {
            p.x += p.vx + Math.sin(p.wobble) * 2;
            p.y += p.vy;
            p.wobble += p.wobbleSpeed;
            if (p.y > cameraY + canvas.height + 50 || p.x > cameraX + canvas.width + 50) {
                particles.splice(i, 1);
            }
        } else if (p.type === 'snow') {
            p.x += p.vx + Math.sin(p.wobble) * 1.5;
            p.y += p.vy;
            p.wobble += p.wobbleSpeed;
            if (p.y > cameraY + canvas.height + 50 || p.x > cameraX + canvas.width + 50 || p.x < cameraX - 50) {
                particles.splice(i, 1);
            }
        } else if (p.type === 'rain') {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > p.targetY) {
                p.type = 'ripple';
                p.radius = 1;
                p.alpha = 0.5;
            }
        } else if (p.type === 'ripple') {
            p.radius += 0.8;
            p.alpha -= 0.03;
            if (p.alpha <= 0) particles.splice(i, 1);
        }
    }

    // --- BOSS FIGHT LOGIC ---
    if (bossFightActive) {
        const boss = npcs.find(n => n.isBoss);
        if (boss && boss.hp > 0) {

            let dx = player.x - boss.x;
            let dy = player.y - boss.y;

            // Boss looks at player
            if (Math.abs(dx) > Math.abs(dy)) {
                boss.frameY = dx > 0 ? 3 : 1;
            } else {
                boss.frameY = dy > 0 ? 0 : 2;
            }

            // Boss movement AI
            if (!boss.isAttacking && !boss.isCharging) {
                let dist = Math.hypot(dx, dy);
                let moving = false;
                if (dist > 180) { // move closer
                    boss.x += (dx / dist) * 1.5;
                    boss.y += (dy / dist) * 1.5;
                    moving = true;
                } else if (dist < 100) { // step back
                    boss.x -= (dx / dist) * 1.5;
                    boss.y -= (dy / dist) * 1.5;
                    moving = true;
                }

                if (moving) {
                    boss.animTimer++;
                    if (boss.animTimer >= 12) {
                        boss.frameX = (boss.frameX + 1) % 4;
                        boss.animTimer = 0;
                    }
                } else {
                    boss.frameX = 0;
                }
            } else {
                boss.frameX = 0; // stop walking animation if attacking or charging
            }

            if (boss.bossAttackTimer > 0) {
                boss.bossAttackTimer--;
            } else if (!boss.isAttacking && !boss.isCharging && !boss.isTransitioning) {

                // Transition to Phase 2 after surviving enough spikes OR if boss loses 30% HP
                if (boss.phase === 1 && (boss.attackCount >= boss.maxPhase1Attacks || boss.hp <= boss.maxHp * 0.7)) {
                    boss.isTransitioning = true;
                    isOverlayActive = true; // Freeze the game
                    boss.frameX = 0; // Stop moving anim

                    speechBubbleSequence = [
                        { entity: boss, text: "Seems like you practiced hard enough..." },
                        { entity: boss, text: "But let's see if you can survive the flames of destruction!" }
                    ];
                    speechBubbleIndex = 0;
                    advanceSpeechBubble();
                    return; // Skip normal attack logic this frame
                } else if (boss.phase === 2 && (boss.attackCount >= 15 || boss.hp <= boss.maxHp * 0.4)) {
                    // Transition to Phase 3 after enough fire OR if boss loses 60% HP
                    boss.isTransitioning = true;
                    isOverlayActive = true; // Freeze the game
                    boss.frameX = 0;

                    speechBubbleSequence = [
                        { entity: boss, text: "You're tough..." },
                        { entity: boss, text: "But let's see if you can escape the void itself!" }
                    ];
                    speechBubbleIndex = 0;
                    advanceSpeechBubble();
                    return;
                } else if (boss.phase === 3 && (boss.attackCount >= 15 || boss.hp <= boss.maxHp * 0.10)) {
                    // Transition to Phase 4 (Rage Phase) after 15 voids/missiles OR if boss HP <= 10%
                    boss.isTransitioning = true;
                    isOverlayActive = true;
                    boss.frameX = 0;

                    speechBubbleSequence = [
                        { entity: boss, text: "ENOUGH!" },
                        { entity: boss, text: "I WILL SHOW YOU TRUE DESPAIR!" }
                    ];
                    speechBubbleIndex = 0;
                    advanceSpeechBubble();
                    return;
                }

                boss.isCharging = true; // start charging (static old image)
                boss.attackCount++;

                if (boss.phase === 1) { // Restored Phase 1
                    let numSpikes = 1;
                    if (boss.attackCount >= 5 || boss.hp <= boss.maxHp * 0.85) {
                        numSpikes = 2 + Math.floor(Math.random() * 2); // 2 or 3 spikes
                    }

                    for (let s = 0; s < numSpikes; s++) {
                        let offsetX = 0;
                        let offsetY = 0;
                        if (s > 0) {
                            offsetX = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 60);
                            offsetY = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 60);
                        }

                        bossSpikes.push({
                            x: player.x - 10 + offsetX,
                            y: player.y + player.size - 40 + offsetY, // target near feet
                            width: 70,
                            height: 70,
                            state: 'warning',
                            timer: 60, // 1 second warning at 60fps
                            damage: 25,
                            type: 'spike'
                        });
                    }

                    // Attack timer (speed) decreases for 1-4, and repeats trend for 5-8
                    let speedIndex = (boss.attackCount - 1) % 4;
                    boss.bossAttackTimer = 140 - (speedIndex * 20);
                } else if (boss.phase === 2) { // Restored Phase 2
                    let isCross = false;

                    if (boss.attackCount >= 5 || boss.hp <= boss.maxHp * 0.55) {
                        isCross = true;
                    }

                    if (isCross) {
                        bossSpikes.push({
                            x: player.x - 150 + (player.size / 2),
                            y: player.y + player.size - 30,
                            width: 300,
                            height: 60,
                            state: 'warning',
                            timer: 50,
                            damage: 35,
                            type: 'fire',
                            orientation: 'horizontal'
                        });
                        bossSpikes.push({
                            x: player.x + (player.size / 2) - 30,
                            y: player.y - 150,
                            width: 60,
                            height: 300,
                            state: 'warning',
                            timer: 50,
                            damage: 35,
                            type: 'fire',
                            orientation: 'vertical'
                        });
                    } else {
                        const isHorizontal = (boss.attackCount % 2 === 0);

                        if (isHorizontal) {
                            bossSpikes.push({
                                x: player.x - 150 + (player.size / 2),
                                y: player.y + player.size - 30,
                                width: 300,
                                height: 60,
                                state: 'warning',
                                timer: 50,
                                damage: 35,
                                type: 'fire',
                                orientation: 'horizontal'
                            });
                        } else {
                            bossSpikes.push({
                                x: player.x + (player.size / 2) - 30,
                                y: player.y - 150,
                                width: 60,
                                height: 300,
                                state: 'warning',
                                timer: 50,
                                damage: 35,
                                type: 'fire',
                                orientation: 'vertical'
                            });
                        }
                    }

                    // Same speed trend as phase 1, but maybe slightly faster base speed since it's fire
                    let speedIndex = (boss.attackCount - 1) % 4;
                    boss.bossAttackTimer = 120 - (speedIndex * 20);
                } else if (boss.phase === 3) {
                    // Phase 3: Combine Black Holes and Missiles
                    // Alternate between them to keep pressure high but manageable
                    if (boss.attackCount % 2 !== 0) {
                        // Summon one black hole directly under the player
                        blackHoles.push({ 
                            x: player.x + player.size / 2, 
                            y: player.y + player.size / 2, 
                            radius: 40, 
                            pullRadius: 100, 
                            angle: 0,
                            state: 'warning',
                            timer: 45, // 0.75s warning
                            lifetime: 180 // 3 seconds active
                        });
                        boss.bossAttackTimer = 160;
                    } else {
                        // Shoot a homing missile
                        bossMissiles.push({
                            x: boss.x + boss.size / 2, // spawn at boss center
                            y: boss.y + boss.size / 2,
                            width: 15,
                            height: 15,
                            speed: 3.5, // slightly faster than player
                            damage: 15,
                            angle: Math.random() * Math.PI * 2,
                            lifetime: 240
                        });
                        boss.bossAttackTimer = 90; // shorter cooldown for missiles
                        
                        // Instant attack, skip charging phase
                        boss.isCharging = false;
                        boss.isAttacking = true;
                        boss.attackFrame = (boss.frameY === 1) ? 0 : 1;
                        
                        // Reset attacking state after a short delay
                        setTimeout(() => {
                            if (boss && boss.isAttacking) boss.isAttacking = false;
                        }, 500);
                    }
                } else if (boss.phase === 4) { // CRAZY RAGE PHASE - DISASTER MODE
                    let choice = Math.floor(Math.random() * 4); // Completely random single spawn
                    
                    if (choice === 0) { // 1 Spike
                        let offsetX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 120);
                        let offsetY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 120);
                        bossSpikes.push({
                            x: player.x - 10 + offsetX,
                            y: player.y + player.size - 40 + offsetY,
                            width: 70, height: 70, state: 'warning',
                            timer: 30, damage: 25, type: 'spike'
                        });
                    } else if (choice === 1) { // 1 Fire line
                        if (Math.random() > 0.5) { // Horizontal
                            bossSpikes.push({
                                x: player.x - 150 + (player.size / 2) + (Math.random() * 60 - 30),
                                y: player.y + player.size - 30 + (Math.random() * 60 - 30),
                                width: 300, height: 60, state: 'warning',
                                timer: 35, damage: 35, type: 'fire', orientation: 'horizontal'
                            });
                        } else { // Vertical
                            bossSpikes.push({
                                x: player.x + (player.size / 2) - 30 + (Math.random() * 60 - 30),
                                y: player.y - 150 + (Math.random() * 60 - 30),
                                width: 60, height: 300, state: 'warning',
                                timer: 35, damage: 35, type: 'fire', orientation: 'vertical'
                            });
                        }
                    } else if (choice === 2) { // 1 Black hole
                        let offsetX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 80);
                        let offsetY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 80);
                        blackHoles.push({ 
                            x: player.x + player.size / 2 + offsetX, 
                            y: player.y + player.size / 2 + offsetY, 
                            radius: 40, pullRadius: 100, angle: 0,
                            state: 'warning', timer: 35, lifetime: 90 
                        });
                    } else if (choice === 3) { // 1 Missile
                        bossMissiles.push({
                            x: boss.x + boss.size / 2 + (Math.random() * 60 - 30), 
                            y: boss.y + boss.size / 2 + (Math.random() * 60 - 30),
                            width: 15, height: 15, speed: 5.5, // extremely fast
                            damage: 15, angle: Math.random() * Math.PI * 2, lifetime: 240
                        });
                    }
                    
                    // Very short, continuous stream of attacks
                    boss.bossAttackTimer = 12 + Math.floor(Math.random() * 8); // 12-20 frames
                    
                    // Ensure boss doesn't freeze and looks chaotic
                    boss.isCharging = false;
                    boss.isAttacking = true;
                    boss.attackFrame = (boss.frameY === 1) ? 0 : 1;
                    setTimeout(() => { if (boss && boss.isAttacking) boss.isAttacking = false; }, 200);
                }
            }
        } else if (!boss || boss.hp <= 0) {
            bossFightActive = false; // Boss is dead
            blackHoles.length = 0;
            bossSpikes.length = 0;
            bossMissiles.length = 0;

            // Remove boss from npcs array so he vanishes
            if (boss) {
                const bossIndex = npcs.indexOf(boss);
                if (bossIndex > -1) {
                    npcs.splice(bossIndex, 1);
                }
            }

            const victoryOverlay = document.getElementById('victory-overlay');
            if (victoryOverlay && victoryOverlay.style.display !== 'flex') {
                victoryOverlay.style.display = 'flex';
                isOverlayActive = true;
            }
        }
    }

    // Update Black Holes
    blackHoles.forEach(bh => {
        bh.angle += 0.05; // Visual spin
        if (bossFightActive) {
            if (bh.state === 'warning') {
                bh.timer--;
                if (bh.timer <= 0) {
                    bh.state = 'active';
                    const boss = npcs.find(n => n.isBoss);
                    if (boss && boss.isCharging) {
                        boss.isCharging = false;
                        boss.isAttacking = true;
                        if (boss.frameY === 1) {
                            boss.attackFrame = 0;
                        } else {
                            boss.attackFrame = 1;
                        }
                        
                        // Robustly reset attacking state so AI doesn't freeze
                        setTimeout(() => {
                            if (boss && boss.isAttacking) boss.isAttacking = false;
                        }, 500);
                    }
                }
            } else if (bh.state === 'active') {
                bh.lifetime--;
                
                let px = player.x + player.size / 2;
                let py = player.y + player.size / 2;
                let dx = bh.x - px;
                let dy = bh.y - py;
                let dist = Math.hypot(dx, dy);

                if (player.isTrapped) {
                    if (player.trappedBh === bh) {
                        player.trappedTimer--;
                        // Spin player visually IN PLACE
                        player.x = bh.x - player.size / 2;
                        player.y = bh.y - player.size / 2;
                        player.trappedRotation = (player.trappedRotation || 0) + 0.1; // rotate slower like a top
                        
                        if (player.trappedTimer <= 0 || bh.lifetime <= 0) { // release if timer ends or hole fades
                            player.isTrapped = false;
                            player.trappedBh = null;
                            player.trappedRotation = 0;
                            // Spit player out safely
                            let angles = [0, Math.PI/2, Math.PI, Math.PI*1.5, Math.PI/4, Math.PI*0.75, Math.PI*1.25, Math.PI*1.75];
                            let safeFound = false;
                            for (let a of angles) {
                                let testX = bh.x + Math.cos(a) * 90;
                                let testY = bh.y + Math.sin(a) * 90;
                                if (isWalkable(testX, testY, player.size, player)) {
                                    player.x = testX;
                                    player.y = testY;
                                    safeFound = true;
                                    break;
                                }
                            }
                            if (!safeFound) { // fallback
                                player.x = bh.x; 
                                player.y = bh.y + 100;
                            }
                        }
                    }
                } else if (dist < bh.pullRadius && bh.lifetime > 0) {
                    if (dist < bh.radius / 2) {
                        // Sucked in!
                        player.isTrapped = true;
                        player.trappedBh = bh;
                        player.trappedTimer = 90; // Trapped for 1.5 seconds
                        player.hp -= 20; // Damage on suck
                        if (player.hp < 0) player.hp = 0;
                        player.hurtTimer = 30;
                    } else {
                        // Constant pulling force
                        player.x += (dx / dist) * 2.5; 
                        player.y += (dy / dist) * 2.5;
                    }
                }
            }
        }
    });

    // Clean up expired black holes
    blackHoles = blackHoles.filter(bh => bh.state !== 'active' || bh.lifetime > 0 || (player.isTrapped && player.trappedBh === bh));

    // Update Spikes
    for (let i = bossSpikes.length - 1; i >= 0; i--) {
        let spike = bossSpikes[i];
        spike.timer--;
        if (spike.state === 'warning' && spike.timer <= 0) {
            spike.state = 'active';
            spike.timer = 20; // 0.33s active
            screenShake = 10; // small shake

            const boss = npcs.find(n => n.isBoss);
            if (boss && boss.isCharging) {
                boss.isCharging = false;
                boss.isAttacking = true;
                if (boss.frameY === 1) {
                    boss.attackFrame = 0; // 3rd frame for left-facing
                } else {
                    boss.attackFrame = 1; // 2nd frame for all others
                }
            }

            // Check collision with player
            let spikeBox = { x: spike.x, y: spike.y, w: spike.width, h: spike.height };
            let playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
            // A bit of leniency on collision (hitbox slightly smaller)
            spikeBox.x += 15; spikeBox.y += 15; spikeBox.w -= 30; spikeBox.h -= 30;

            if (rectIntersect(spikeBox, playerBox)) {
                // Deal damage if not defending
                if (!player.isDefending) {
                    player.hp -= spike.damage;
                    if (player.hp < 0) player.hp = 0;
                    player.hurtTimer = 30; // Flash red for half a second
                }
            }
        } else if (spike.state === 'active' && spike.timer <= 0) {
            spike.state = 'fading';
            spike.timer = 15;

            const boss = npcs.find(n => n.isBoss);
            if (boss && boss.isAttacking) {
                boss.isAttacking = false; // back to normal
            }
        } else if (spike.state === 'fading' && spike.timer <= 0) {
            bossSpikes.splice(i, 1);
        }
    }

    // Update Boss Missiles
    for (let i = bossMissiles.length - 1; i >= 0; i--) {
        let m = bossMissiles[i];
        m.lifetime--;
        
        if (bossFightActive) {
            let dx = (player.x + player.size / 2) - m.x;
            let dy = (player.y + player.size / 2) - m.y;
            let targetAngle = Math.atan2(dy, dx);
            
            // Smoothly rotate towards player
            let angleDiff = targetAngle - m.angle;
            // Normalize angle difference to -PI to PI
            angleDiff = (angleDiff + Math.PI * 3) % (2 * Math.PI) - Math.PI;
            
            m.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.04); // max turn speed (0.04 limits turning sharpness)
        }
        
        // Move forward constantly
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;

        // Collision check
        let mBox = { x: m.x - m.width/2, y: m.y - m.height/2, w: m.width, h: m.height };
        let playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
        if (rectIntersect(mBox, playerBox)) {
            if (!player.isDefending) {
                player.hp -= m.damage;
                if (player.hp < 0) player.hp = 0;
                player.hurtTimer = 30;
            }
            bossMissiles.splice(i, 1);
            screenShake = 10;
        } else if (m.lifetime <= 0) {
            bossMissiles.splice(i, 1);
        }
    }

    // --- UPDATE NPCs ---
    for (let i = npcs.length - 1; i >= 0; i--) {
        const npc = npcs[i];
        if (npc.hp <= 0) {
            // Handle death animation timing
            if (npc.deathTimer > 0) {
                npc.deathTimer--;
            } else {
                if (npc.isBoss) {
                    npcs.splice(i, 1);
                    continue;
                }
                // Wait for respawn instead of removing
                if (npc.respawnTimer === undefined) {
                    npc.respawnTimer = 300; // 5 seconds (60fps * 5)
                }

                if (npc.respawnTimer > 0) {
                    npc.respawnTimer--;
                } else {
                    // Respawn NPC at a random walkable location
                    let spawnX, spawnY;
                    let attempts = 0;
                    do {
                        spawnX = Math.random() * mapWidth;
                        spawnY = Math.random() * mapHeight;
                        attempts++;
                    } while (!isWalkable(spawnX, spawnY, npc.size, npc) && attempts < 100);

                    if (attempts < 100) {
                        npc.x = spawnX;
                        npc.y = spawnY;
                    }
                    // Reset stats for respawn
                    npc.hp = npc.maxHp;
                    npc.respawnTimer = undefined;
                    npc.deathTimer = undefined;
                }
            }
            continue; // Dead NPCs don't move or act
        }

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
    }

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

    if (screenShake > 0) {
        ctx.translate(Math.random() * screenShake - screenShake / 2, Math.random() * screenShake - screenShake / 2);
        screenShake--;
    }

    let zoneConfig = world[currentZone];

    // Draw the Map blocks or Static Background
    if (zoneConfig && zoneConfig.type === "static") {
        if (zoneConfig.imgElement && zoneConfig.imgElement.complete) {
            ctx.drawImage(zoneConfig.imgElement, 0, 0);
        }
    } else if (currentTileset.complete && currentMapData.length > 1) {
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

        // --- MONSOON PUDDLES REMOVED ---

        // Draw collision debug overlay
        if (editMode && collisionData.length > 0) {
            ctx.fillStyle = "rgba(0, 0, 255, 0.6)"; // Blue for doors
            const startCol = Math.max(0, Math.floor(cameraX / collisionSize));
            const endCol = Math.min(collisionData[0].length, Math.ceil((cameraX + canvas.width) / collisionSize));
            const startRow = Math.max(0, Math.floor(cameraY / collisionSize));
            const endRow = Math.min(collisionData.length, Math.ceil((cameraY + canvas.height) / collisionSize));

            for (let row = startRow; row < endRow; row++) {
                for (let col = startCol; col < endCol; col++) {
                    if (doorPaintData[row] && doorPaintData[row][col] === 1) {
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
    const useAttackSprite = player.isAttacking || player.isDefending;
    const currentImg = useAttackSprite ? player.attackImage : player.image;
    if (currentImg.complete && currentImg.width > 0) {
        let fW, fH, sX, sY, displayWidth, displayHeight;

        if (useAttackSprite) {
            // Centers of the irregular sprite frames in sample7.png
            const attackCentersX = [88, 250, 414, 555, 707, 872]; // 0:stand, 1:att1, 2:att2, 3:att3, 4:def, 5:att4
            const attackCentersY = [115, 311, 522, 741];

            // If the character is facing the wrong way when attacking, swap the values here!
            // Format: { Walk_Row : Attack_Row }
            const orientationMap = {
                0: 0, // Walk Down (0) uses Attack Row 0
                1: 3, // Walk Left (1) uses Attack Row 3
                2: 2, // Walk Up (2) uses Attack Row 2
                3: 1  // Walk Right (3) uses Attack Row 1
            };
            const mappedRow = orientationMap[player.frameY];

            fW = 170; // Safe window size around the center
            fH = 170;
            sX = attackCentersX[player.frameX] - fW / 2;
            sY = attackCentersY[mappedRow] - fH / 2;

            // Fix overlap issue where Left-Facing Attack 3 catches the back of Attack 2
            if (mappedRow === 3 && player.frameX === 3) {
                sX += 15; // Shift the capture window 15 pixels to the right
            }

            // Slightly reduced scale to prevent the character from looking too big
            displayWidth = player.size * 1.2;
            displayHeight = player.size * 1.2;
        } else {
            // Original walk cycle dimensions
            fW = 160;
            fH = 214;
            sX = 190 + (player.frameX * fW);
            sY = 50 + (player.frameY * fH);
            displayWidth = player.size;
            displayHeight = player.size * (fH / fW);
        }

        ctx.save();
        if (player.hurtTimer > 0) {
            // Flash white/red when hurt
            ctx.filter = (Math.floor(Date.now() / 100) % 2 === 0) ? "brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)" : "none";
        }

        let drawX = player.x - (displayWidth - player.size) / 2;
        let drawY = player.y - (displayHeight - player.size);
        
        // Spin if trapped
        if (player.isTrapped && player.trappedRotation !== undefined) {
            ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
            ctx.rotate(player.trappedRotation);
            ctx.translate(-(player.x + player.size / 2), -(player.y + player.size / 2));
        }

        ctx.drawImage(
            currentImg,
            sX, sY, fW, fH,
            drawX, drawY,
            displayWidth, displayHeight
        );
        ctx.restore();
    } else {
        // Fallback if image not loaded
        ctx.fillStyle = "red";
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }

    // Draw NPCs
    npcs.forEach(npc => {
        if (npc.image && npc.image.complete && npc.image.width > 0) {
            ctx.save();

            // Death animation: fade out and float up
            if (npc.hp <= 0) {
                const progress = npc.deathTimer / 30; // Goes from 1.0 down to 0.0
                ctx.globalAlpha = progress;
                const floatOffset = (1 - progress) * 20; // Floats up by 20 pixels
                ctx.translate(0, -floatOffset);
            }

            let drawImg = npc.image;
            let fW = 160;
            let fH = 214;
            let sX = 190 + (npc.frameX * fW);
            let sY = 50 + (npc.frameY * fH);

            let drawXOffset = 0;

            if (npc.isBoss && npc.isAttacking && npc.attackImage && npc.attackImage.complete && npc.attackImage.width > 0) {
                drawImg = npc.attackImage;
                sX = 190 + (npc.attackFrame * fW);
                sY = 50 + (npc.frameY * fH);

                // Fix for left-facing hand clipping and right-side artifacts
                if (npc.frameY === 1) {
                    sX -= 30; // Shift capture window left to include the hand (sX becomes 160)
                    fW = 175;  // Reduce width slightly to chop off the next frame's artifacts
                    drawXOffset = -30 * (npc.size / 160); // Shift draw position left so body stays anchored
                }
            }

            const displayWidth = npc.size * (fW / 160);
            const displayHeight = npc.size * (fH / 160);

            // Draw a tiny shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(npc.x + npc.size / 2, npc.y + npc.size - 4, npc.size / 3, npc.size / 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(
                drawImg,
                sX, sY, fW, fH,
                npc.x + drawXOffset, npc.y - (displayHeight - npc.size),
                displayWidth, displayHeight
            );

            ctx.restore();
        }
    });

    // Helper to draw health bars
    function drawHealthBar(entity, isPlayer = false) {
        if (entity.hp === undefined || entity.hp <= 0) return;

        // For NPCs, only show if damaged or player is very close (within 75 pixels)
        if (!isPlayer) {
            const dist = Math.hypot(player.x - entity.x, player.y - entity.y);
            if (entity.hp >= entity.maxHp && dist > 75) {
                return;
            }
        }

        const barWidth = 40;
        const barHeight = 6;
        const hpPercent = Math.max(0, entity.hp / entity.maxHp);
        // Position just above the character's head
        const bx = entity.x + (entity.size / 2) - (barWidth / 2);
        const by = entity.y - 25;

        ctx.fillStyle = "black";
        ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = "red";
        ctx.fillRect(bx, by, barWidth, barHeight);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(bx, by, barWidth * hpPercent, barHeight);
    }

    // Draw Health Bars
    drawHealthBar(player, true);
    npcs.forEach(npc => drawHealthBar(npc, false));

    // Draw Weather Particles
    particles.forEach(p => {
        if (p.type === 'leaf' || !p.type) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.wobble);
            ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'snow') {
            ctx.fillStyle = `rgba(255, 255, 255, 0.85)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'rain') {
            ctx.strokeStyle = "rgba(200, 220, 255, 0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx, p.y - p.length);
            ctx.stroke();
        } else if (p.type === 'ripple') {
            ctx.strokeStyle = `rgba(200, 220, 255, ${p.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Draw Interaction Prompt
    if (activeInteractable && !isOverlayActive) {
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 5;
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";

        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.strokeText(`Press [E] to enter ${activeInteractable.text}`, player.x + player.size / 2, player.y - 15 - pulse);
        ctx.fillText(`Press [E] to enter ${activeInteractable.text}`, player.x + player.size / 2, player.y - 15 - pulse);
    }

    // Draw Interaction zones in edit mode
    if (editMode && interactables[currentZone]) {
        ctx.fillStyle = "rgba(0, 0, 255, 0.4)"; // blue transparent for doors
        interactables[currentZone].forEach(door => {
            ctx.fillRect(door.x, door.y, door.w, door.h);
        });
    }

    // Draw Black Holes
    blackHoles.forEach(bh => {
        ctx.save();
        ctx.translate(bh.x, bh.y);
        
        if (bh.state === 'warning') {
            // Draw pulsating warning zone
            ctx.beginPath();
            ctx.arc(0, 0, bh.pullRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 0, 200, ${(bh.timer % 15 < 7) ? 0.3 : 0.1})`;
            ctx.fill();
        } else if (bh.state === 'active') {
            // Fade out effect at the end of lifetime
            if (bh.lifetime < 30) {
                ctx.globalAlpha = bh.lifetime / 30;
            }

            // Pulling aura (pulsing)
            let pulse = Math.sin(Date.now() / 150) * 10;
            ctx.beginPath();
            ctx.arc(0, 0, bh.pullRadius + pulse, 0, Math.PI * 2);
            let grad = ctx.createRadialGradient(0, 0, bh.radius, 0, 0, bh.pullRadius + pulse);
            grad.addColorStop(0, "rgba(50, 0, 100, 0.5)");
            grad.addColorStop(1, "rgba(50, 0, 100, 0)");
            ctx.fillStyle = grad;
            ctx.fill();

            // Dark Event Horizon (Vertical Ellipse) - NOT ROTATING
            ctx.beginPath();
            let radiusX = bh.radius * 0.5;
            let radiusY = bh.radius * 0.9; // Vertical shape
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(5, 0, 17, 0.4)"; // semi-transparent black
            ctx.fill();

            // Inner glowing ring (Vertical Ellipse) - NOT ROTATING
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(220, 150, 255, 0.8)";
            ctx.stroke();

            // Rotate for the aura particles ONLY
            ctx.rotate(bh.angle);
            
            // Particle Swirl (Ombre aura of tiny particles)
            ctx.fillStyle = "rgba(180, 80, 255, 0.8)";
            for (let i = 0; i < 50; i++) {
                let pAngle = (i / 50) * Math.PI * 2 * 3; // swirl 3 times around
                let pDist = bh.radius + (i / 50) * bh.radius * 1.5;
                let px = Math.cos(pAngle) * pDist;
                let py = Math.sin(pAngle) * pDist;
                
                // Pulse particle size slightly (made smaller)
                let pSize = 0.5 + Math.sin(Date.now() / 200 + i) * 1;
                if (pSize < 0) pSize = 0;

                ctx.beginPath();
                ctx.arc(px, py, pSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    });

    // Draw Boss Spikes & Fire
    bossSpikes.forEach(spike => {
        ctx.save();
        if (spike.state === 'warning') {
            // Draw a pulsating red zone
            const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.15 + pulse * 0.25})`;
            ctx.beginPath();

            if (spike.type === 'fire') {
                ctx.fillRect(spike.x, spike.y, spike.width, spike.height);
                ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
                ctx.lineWidth = 2;
                ctx.strokeRect(spike.x, spike.y, spike.width, spike.height);
            } else {
                // Draw an ellipse on the ground
                ctx.ellipse(spike.x + spike.width / 2, spike.y + spike.height / 2, spike.width / 2, spike.height / 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw an expanding ring
                ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                const ringSize = spike.width / 2 * (1 - spike.timer / 60);
                ctx.ellipse(spike.x + spike.width / 2, spike.y + spike.height / 2, ringSize, ringSize * 0.66, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

        } else if (spike.state === 'active' || spike.state === 'fading') {
            if (spike.state === 'fading') {
                ctx.globalAlpha = spike.timer / 15;
            }

            if (spike.type === 'fire') {
                if (spike.orientation === 'vertical' && fireVerticalImg.complete && fireVerticalImg.width > 0) {
                    const scale = spike.height / fireVerticalImg.height; // Scale to fit height perfectly
                    const drawWidth = fireVerticalImg.width * scale;
                    const drawHeight = spike.height;

                    const dx = spike.x + (spike.width / 2) - (drawWidth / 2);
                    const dy = spike.y; // Align exactly to the top of the strip to prevent clipping the top flames

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(spike.x, spike.y, spike.width, spike.height);
                    ctx.clip();

                    // Draw exactly twice to fill gaps, as requested
                    ctx.drawImage(fireVerticalImg, dx, dy, drawWidth, drawHeight);
                    // Second copy shifted down perfectly to interleave in the gaps (~25px for 50px spacing)
                    ctx.drawImage(fireVerticalImg, dx, dy + 25, drawWidth, drawHeight);

                    ctx.restore();
                } else if (spike.orientation !== 'vertical' && fireImg.complete && fireImg.width > 0) {
                    const targetHeight = 180;
                    const scaleY = targetHeight / fireImg.height;
                    const scaleX = spike.width / fireImg.width;
                    const scale = Math.max(scaleX, scaleY);

                    const drawWidth = fireImg.width * scale;
                    const drawHeight = fireImg.height * scale;

                    const dx = spike.x + (spike.width / 2) - (drawWidth / 2);
                    const dy = spike.y + (spike.height / 2) - (drawHeight / 2);

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(spike.x, spike.y, spike.width, spike.height);
                    ctx.clip();

                    ctx.drawImage(fireImg, dx, dy, drawWidth, drawHeight);
                    ctx.restore();
                } else {
                    ctx.fillStyle = "rgba(255, 100, 0, 0.8)";
                    ctx.fillRect(spike.x, spike.y, spike.width, spike.height);
                }
            } else {
                if (spikeImg.complete && spikeImg.width > 0) {
                    // Draw spike image
                    ctx.drawImage(spikeImg, spike.x - 10, spike.y - 20, spike.width + 20, spike.height + 20);
                } else {
                    // Draw a grid of upright metallic spikes
                    const rows = 4;
                    const cols = 5;
                    const spikeBaseWidth = 8;
                    const spikeHeight = 18;

                    // Draw cracked earth base
                    const cx = spike.x + spike.width / 2;
                    const cy = spike.y + spike.height / 2;
                    ctx.fillStyle = "#4a3b2c";
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + 5, spike.width * 0.45, spike.height * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Draw grid of spikes from back to front
                    for (let r = 0; r < rows; r++) {
                        const py = spike.y + 20 + (r * 12);
                        for (let c = 0; c < cols; c++) {
                            const px = spike.x + 10 + (c * 12);

                            // Spike base rim
                            ctx.fillStyle = "#33383d";
                            ctx.beginPath();
                            ctx.ellipse(px + spikeBaseWidth / 2, py, spikeBaseWidth / 2 + 1, 3, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // Left side (highlight)
                            ctx.fillStyle = "#9ca5b0";
                            ctx.beginPath();
                            ctx.moveTo(px, py);
                            ctx.lineTo(px + spikeBaseWidth / 2, py - spikeHeight);
                            ctx.lineTo(px + spikeBaseWidth / 2, py + 2);
                            ctx.fill();

                            // Right side (shadow)
                            ctx.fillStyle = "#5c656d";
                            ctx.beginPath();
                            ctx.moveTo(px + spikeBaseWidth / 2, py - spikeHeight);
                            ctx.lineTo(px + spikeBaseWidth, py);
                            ctx.lineTo(px + spikeBaseWidth / 2, py + 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }
        ctx.restore();
    });

    // Draw Boss Missiles
    bossMissiles.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);
        
        const scale = 0.55;
        ctx.scale(scale, scale);

        // 1. Draw thick white outline by drawing the silhouette
        ctx.lineJoin = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';

        // Outer silhouette path
        ctx.beginPath();
        ctx.moveTo(35, 0); // Nose tip
        ctx.lineTo(15, -7); // Body top
        ctx.lineTo(-5, -7); // Fin start top
        ctx.lineTo(-20, -25); // Fin tip top
        ctx.lineTo(-15, -7); // Fin end top
        ctx.lineTo(-25, -7); // Base top
        ctx.lineTo(-25, 7); // Base bottom
        ctx.lineTo(-15, 7); // Fin end bottom
        ctx.lineTo(-20, 25); // Fin tip bottom
        ctx.lineTo(-5, 7); // Fin start bottom
        ctx.lineTo(15, 7); // Body bottom
        ctx.closePath();
        ctx.stroke();

        // 2. Red Fins
        ctx.fillStyle = "#C32313";
        ctx.beginPath();
        // Top fin
        ctx.moveTo(-5, -7);
        ctx.lineTo(-20, -25);
        ctx.lineTo(-15, -7);
        ctx.closePath();
        ctx.fill();
        // Bottom fin
        ctx.beginPath();
        ctx.moveTo(-5, 7);
        ctx.lineTo(-20, 25);
        ctx.lineTo(-15, 7);
        ctx.closePath();
        ctx.fill();

        // 3. Yellow Base (thruster section)
        ctx.fillStyle = "#C09419";
        ctx.fillRect(-25, -7, 10, 14);

        // 4. Main Yellow Body
        ctx.fillStyle = "#F6C824";
        ctx.fillRect(-15, -7, 30, 14);

        // 5. Red Stripe
        ctx.fillStyle = "#B21E14";
        ctx.fillRect(0, -7, 6, 14);

        // 6. Orange Nose Cone
        ctx.fillStyle = "#E97D02";
        ctx.beginPath();
        ctx.moveTo(15, -7);
        ctx.lineTo(35, 0);
        ctx.lineTo(15, 7);
        ctx.closePath();
        ctx.fill();

        // 7. Specular Highlights (White, semi-transparent)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath(); // Top highlight on body
        ctx.rect(-22, -5, 35, 3);
        ctx.fill();

        ctx.beginPath(); // Highlight on nose cone
        ctx.moveTo(16, -4);
        ctx.lineTo(28, 0);
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath(); // Nose tip bright spot
        ctx.arc(31, -1, 1.5, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();

        // 8. Engine exhaust pulsing
        if (Math.random() > 0.3) {
            ctx.fillStyle = (Math.random() > 0.5) ? "#ffea00" : "#ffaa00"; // Yellow or Orange
            ctx.beginPath();
            ctx.arc(-28, 0, 4 + Math.random() * 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner white hot core
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(-28, 0, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    // Draw Night/Lighting Mode (And Overcast Seasons)
    if ((timeMode > 0 || (timeMode === 0 && (seasonMode === 1 || seasonMode === 3))) && (!zoneConfig || zoneConfig.type !== "static")) {
        // Create offscreen lighting canvas if it doesn't exist
        if (!window.lightingCanvas) {
            window.lightingCanvas = document.createElement('canvas');
            window.lightingCtx = window.lightingCanvas.getContext('2d');
        }
        // Resize to match main canvas if needed
        if (window.lightingCanvas.width !== canvas.width || window.lightingCanvas.height !== canvas.height) {
            window.lightingCanvas.width = canvas.width;
            window.lightingCanvas.height = canvas.height;
        }

        const lightCtx = window.lightingCtx;

        // 1. Clear previous frame and Fill Darkness on offscreen canvas
        lightCtx.clearRect(0, 0, canvas.width, canvas.height);
        lightCtx.globalCompositeOperation = "source-over";
        if (timeMode === 1) {
            // Dynamic sunset gradient with a gentle breathing effect to avoid the "flat glass" look
            const pulse = Math.sin(Date.now() / 2500) * 0.04;
            const grad = lightCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, `rgba(255, 140, 40, ${0.35 + pulse})`); // Bright, warm sun from top-left
            grad.addColorStop(0.5, `rgba(220, 90, 20, ${0.25 + pulse})`); // Mid-town evening orange
            grad.addColorStop(1, `rgba(120, 40, 60, ${0.15 + pulse})`); // Cooler purple/red shadows at bottom-right

            lightCtx.fillStyle = grad;
        } else if (timeMode === 3) {
            // Early Morning: Cool, misty pale blue with subtle breathing
            const pulse = Math.sin(Date.now() / 3000) * 0.03;
            const grad = lightCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, `rgba(100, 140, 255, ${0.25 + pulse})`); // Crisp cool blue from above
            grad.addColorStop(1, `rgba(200, 220, 255, ${0.15 + pulse})`); // Soft pale mist near the ground

            lightCtx.fillStyle = grad;
        } else if (timeMode === 0 && seasonMode === 1) {
            // Monsoon Daytime: Cloudy Overcast Tint
            const pulse = Math.sin(Date.now() / 4000) * 0.05;
            lightCtx.fillStyle = `rgba(70, 80, 100, ${0.45 + pulse})`; // Gray/blue clouds
        } else if (timeMode === 0 && seasonMode === 3) {
            // Winter Daytime: Bright, cold overcast
            const pulse = Math.sin(Date.now() / 4000) * 0.03;
            lightCtx.fillStyle = `rgba(200, 210, 230, ${0.15 + pulse})`; // Frosty white/blue tint
        } else {
            lightCtx.fillStyle = "rgba(10, 15, 30, 0.97)"; // Darker, moody night tint
        }
        lightCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Punch holes in darkness using destination-out
        // This ensures that overlapping lights never get brighter than the original daylight map!
        lightCtx.globalCompositeOperation = "destination-out";

        function drawLightHole(worldX, worldY, radius, intensity) {
            const screenX = worldX - cameraX;
            const screenY = worldY - cameraY;

            // Optimization: Don't draw if completely off screen
            if (screenX < -radius || screenX > canvas.width + radius) return;
            if (screenY < -radius || screenY > canvas.height + radius) return;

            // Simpler color stops create a more natural, seamless falloff
            const grad = lightCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            grad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            grad.addColorStop(0.3, `rgba(0, 0, 0, ${intensity * 0.7})`);
            grad.addColorStop(0.7, `rgba(0, 0, 0, ${intensity * 0.2})`);
            grad.addColorStop(1, `rgba(0, 0, 0, 0)`);

            lightCtx.fillStyle = grad;
            lightCtx.beginPath();
            lightCtx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            lightCtx.fill();
        }

        if (timeMode === 2) {
            // Player's Lantern (Soft dim glow)
            drawLightHole(player.x + player.size / 2, player.y + player.size / 2, 100, 0.35);

            // Static Lights (Streetlamps, etc.)
            if (staticLights[currentZone]) {
                staticLights[currentZone].forEach(light => {
                    // Dimmer and slightly smaller cutout so the night feeling remains
                    drawLightHole(light.x, light.y, light.radius * 1.6, light.intensity * 0.4);
                });
            }

            // Window Lights
            if (typeof windowLights !== 'undefined' && windowLights[currentZone]) {
                windowLights[currentZone].forEach(light => {
                    // Soft light spilling onto the ground (Increased range)
                    drawLightHole(light.x, light.y, light.radius * 1.8, light.intensity * 0.35);
                });
            }
        }

        // Boss Fire Spikes
        if (typeof bossSpikes !== 'undefined') {
            bossSpikes.forEach(spike => {
                if (spike.type === 'fire' && (spike.state === 'active' || spike.state === 'fading')) {
                    const cx = spike.x + spike.width / 2;
                    const cy = spike.y + spike.height / 2;
                    const size = Math.max(spike.width, spike.height) * 1.5;
                    drawLightHole(cx, cy, Math.max(size, 200), 0.8);
                }
            });
        }

        // Draw the lighting canvas over the main canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform to draw UI fixed to screen
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(window.lightingCanvas, 0, 0);

        // 3. Draw Emissive Cores & Warmth
        // This gives the light source an obvious glowing center so the user knows where the light originates
        ctx.globalCompositeOperation = "screen";

        function drawLightCore(worldX, worldY, radius, r, g, b, intensity) {
            const screenX = worldX - cameraX;
            const screenY = worldY - cameraY;
            if (screenX < -radius || screenX > canvas.width + radius) return;
            if (screenY < -radius || screenY > canvas.height + radius) return;

            const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity})`);
            grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${intensity * 0.5})`);
            grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (timeMode === 2) {
            // Draw soft glowing bulb centers for static lights
            if (staticLights[currentZone]) {
                staticLights[currentZone].forEach(light => {
                    // Much softer core so it isn't glaringly bright
                    drawLightCore(light.x, light.y, light.radius * 0.25, 255, 240, 200, 0.4);
                    // Subtler warm glow
                    drawLightCore(light.x, light.y, light.radius * 1.2, 255, 180, 80, 0.15);
                });
            }

            // Draw warm window spill glow (no tiny bulb core needed)
            if (typeof windowLights !== 'undefined' && windowLights[currentZone]) {
                windowLights[currentZone].forEach(light => {
                    // Increased range for window spill
                    drawLightCore(light.x, light.y, light.radius * 1.5, 255, 200, 100, 0.25);
                });
            }
        }

        ctx.restore();
    }

    // --- SUMMER SUN RAYS ---
    if (seasonMode === 0 && timeMode === 0 && (!zoneConfig || zoneConfig.type !== "static")) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Define the sun's position (high up, slightly left of the camera center)
        const sunX = cameraX + canvas.width * 0.2; 
        const sunY = cameraY - 200; 
        
        // Create a radial gradient so the rays are intense near the sun and fade out near the ground
        const rayGrad = ctx.createRadialGradient(sunX, sunY, 50, sunX, sunY, canvas.height + 400);
        rayGrad.addColorStop(0, "rgba(255, 255, 230, 0.25)"); // Bright at the source
        rayGrad.addColorStop(1, "rgba(255, 255, 230, 0)"); // Fades away completely

        ctx.fillStyle = rayGrad;

        const offset = Math.sin(Date.now() / 3000) * 30; // Gentle sway
        
        // Tile the rays across the map horizontally at ground level.
        const gridSpacing = 450; 
        const startX = Math.floor(cameraX / gridSpacing) * gridSpacing;

        ctx.beginPath();
        for (let i = -2; i <= Math.ceil(canvas.width / gridSpacing) + 2; i++) {
            let groundX = startX + (i * gridSpacing) + offset;
            
            // Ray 1 (Main distinct ray fanning out from the sun)
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(groundX - 80, cameraY + canvas.height + 200);
            ctx.lineTo(groundX + 40, cameraY + canvas.height + 200);
            
            // Ray 2 (Secondary thinner ray)
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(groundX + 100, cameraY + canvas.height + 200);
            ctx.lineTo(groundX + 140, cameraY + canvas.height + 200);
        }
        
        ctx.fill();
        ctx.restore();
    }

    // Draw Speech Bubble
    if (currentSpeechBubble) {
        const entity = currentSpeechBubble.entity;
        const text = currentSpeechBubble.text;

        ctx.save();
        ctx.font = "bold 14px sans-serif";
        const padding = 10;

        // Basic text wrapping
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = 180;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const textHeight = 16;
        const bubbleHeight = lines.length * textHeight + padding * 2;
        const metricsLongest = ctx.measureText(lines.reduce((a, b) => a.length > b.length ? a : b));
        const bubbleWidth = Math.max(50, metricsLongest.width) + padding * 2;

        const bx = entity.x + entity.size / 2 - bubbleWidth / 2;
        const by = entity.y - bubbleHeight - 15;

        // Draw bubble background
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 8);
        } else {
            ctx.fillRect(bx, by, bubbleWidth, bubbleHeight);
            ctx.strokeRect(bx, by, bubbleWidth, bubbleHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Draw tail
        ctx.beginPath();
        ctx.moveTo(bx + bubbleWidth / 2 - 8, by + bubbleHeight);
        ctx.lineTo(bx + bubbleWidth / 2 + 8, by + bubbleHeight);
        ctx.lineTo(bx + bubbleWidth / 2, by + bubbleHeight + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], bx + padding, by + padding + i * textHeight);
        }
        ctx.restore();
    }

    ctx.restore();
}

// --- 7. GAME LOOP ---
const fps = 60;
const step = 1000 / fps;
let lastTime = performance.now();
let accumulator = 0;

function loop(currentTime) {
    if (!currentTime) currentTime = performance.now();
    let dt = currentTime - lastTime;
    if (dt > 250) dt = 250; // cap dt to avoid spiral of death
    lastTime = currentTime;
    accumulator += dt;

    while (accumulator >= step) {
        update();
        accumulator -= step;
    }

    draw();
    requestAnimationFrame(loop);
}

// Start the game!
loadZone("town", 400, 400);
requestAnimationFrame(loop);

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

const coordUI = document.createElement('div');
coordUI.style.position = 'absolute';
coordUI.style.top = '10px';
coordUI.style.right = '10px';
coordUI.style.background = 'rgba(0,0,0,0.8)';
coordUI.style.color = '#5f5';
coordUI.style.padding = '10px 15px';
coordUI.style.fontFamily = 'monospace';
coordUI.style.fontSize = '16px';
coordUI.style.pointerEvents = 'none';
coordUI.style.borderRadius = '5px';
coordUI.style.zIndex = '1000';
coordUI.style.display = 'none'; // Hidden by default
coordUI.innerText = `Hover over doors!`;
document.body.appendChild(coordUI);

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
                        doorPaintData[r][c] = paintMode; // Paint doors instead of collision
                        // collisionData[r][c] = paintMode;
                    }
                }
            }
            // localStorage.setItem('collision_' + currentZone, JSON.stringify(collisionData));
        }
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (editMode) {
        undoStack.push(JSON.stringify(collisionData));
        if (undoStack.length > 20) undoStack.shift();
        redoStack = [];
    } else if (currentSpeechBubble) {
        advanceSpeechBubble();
    } else {
        // Left click to attack
        if (e.button === 0 && !player.isDefending && !isOverlayActive) {

            if (player.comboTimer <= 0) {
                player.comboStep = 1; // start at attack 1
            } else {
                player.comboStep++;
                if (player.comboStep === 4) player.comboStep = 5; // skip defense, go to attack 4
                if (player.comboStep > 5) player.comboStep = 1; // loop back to attack 1
            }

            player.isAttacking = true;
            player.frameX = player.comboStep;
            player.animTimer = 0;
            player.comboTimer = 60; // 1 second combo window

            // Attack hitbox logic
            let attackBox = { x: player.x, y: player.y, w: player.size, h: player.size };
            const range = 15; // Shorter attack range for fists (previously 40)

            if (player.frameY === 2) { attackBox.y -= range; attackBox.h += range; } // up
            if (player.frameY === 0) { attackBox.y += range; attackBox.h += range; } // down
            if (player.frameY === 1) { attackBox.x -= range; attackBox.w += range; } // left
            if (player.frameY === 3) { attackBox.x += range; attackBox.w += range; } // right

            // Check if NPCs got hit
            npcs.forEach(npc => {
                if (npc.hp > 0) {
                    let npcBox = { x: npc.x, y: npc.y, w: npc.size, h: npc.size };
                    if (rectIntersect(attackBox, npcBox)) {
                        npc.hp -= player.attack;
                        if (npc.hp <= 0) {
                            npc.hp = 0;
                            npc.deathTimer = 30; // 30 frames for death animation
                        }
                    }
                }
            });
        }
    }
    isDragging = true;
    handleMouse(e);
});
canvas.addEventListener('mousemove', (e) => {
    if (editMode) {
        const clickX = e.clientX / scale;
        const clickY = e.clientY / scale;
        let cX = player.x + (player.size / 2) - (canvas.width / 2);
        let cY = player.y + (player.size / 2) - (canvas.height / 2);
        if (cX < 0) cX = 0;
        if (cY < 0) cY = 0;
        if (cX > mapWidth - canvas.width) cX = Math.max(0, mapWidth - canvas.width);
        if (cY > mapHeight - canvas.height) cY = Math.max(0, mapHeight - canvas.height);

        const worldX = Math.floor(clickX + cX);
        const worldY = Math.floor(clickY + cY);
        // Display top-left corner coordinates for a 64x64 box centered on mouse
        coordUI.innerText = `Door Hover Coordinates:\nx: ${worldX - 32}, y: ${worldY - 32}`;
    }
    if (isDragging) handleMouse(e);
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// --- DIARY SYSTEM (StPageFlip) ---
let pageFlipInstance = null;

function openDiary() {
    const overlay = document.getElementById('diary-overlay');
    overlay.style.display = 'flex';
    isOverlayActive = true;

    if (!pageFlipInstance) {
        document.getElementById('diary-book').style.opacity = '0';
        initDiary();
    } else {
        // Reset to first page if already open
        try {
            pageFlipInstance.flip(0);
        } catch(e) {
            try { pageFlipInstance.turnToPage(0); } catch(err) {}
        }
    }
}

document.getElementById('diary-close').addEventListener('click', () => {
    document.getElementById('diary-overlay').style.display = 'none';
    isOverlayActive = false;
});

async function initDiary() {
    const bookContainer = document.getElementById('diary-book');
    bookContainer.innerHTML = '';

    // Use the official stpageflip HTML structure: data-density="hard"
    let html = `
        <div class="diary-page" data-density="hard">
            <div class="diary-page-content" style="background-color: #4a3424; color: #e8dcc4; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; border: 2px solid #2a1f15;">
                <h1 style="font-family: 'Special Elite', cursive; font-size: 48px; text-align: center; padding: 20px; border: 2px solid rgba(232, 220, 196, 0.4);">Travel Diary</h1>
            </div>
        </div>
        <div class="diary-page" data-density="hard">
            <div class="diary-page-content" style="background-color: #4a3424; border: 2px solid #2a1f15; height: 100%;"></div>
        </div>
    `;

    try {
        const res = await fetch('assets/trips.json');
        const data = await res.json();

        const totalTrips = data.trips.length;
        const yearsCount = {};
        const monthCount = {};
        const transportCount = {};
        const uniquePlaces = new Set();
        let totalDays = 0;
        let longestTrip = 0;
        let shortestTrip = Infinity;
        let totalDistance = 0;
        let totalPlacesCount = 0;
        const tripDates = [];

        // Haversine distance function for accurate KM approximation
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        data.trips.forEach(trip => {
            if (trip.startDate) {
                const date = new Date(trip.startDate);
                tripDates.push(date.getTime());
                const year = date.getFullYear();
                yearsCount[year] = (yearsCount[year] || 0) + 1;

                const month = date.toLocaleString('default', { month: 'short' });
                monthCount[month] = (monthCount[month] || 0) + 1;
            }

            let tripDays = 1;
            if (trip.startDate && trip.endDate) {
                const start = new Date(trip.startDate);
                const end = new Date(trip.endDate);
                tripDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }
            if (tripDays > 0) {
                totalDays += tripDays;
                if (tripDays > longestTrip) longestTrip = tripDays;
                if (tripDays < shortestTrip) shortestTrip = tripDays;
            }

            if (trip.places) {
                totalPlacesCount += trip.places.length;
                let prevCoords = null;
                trip.places.forEach(p => {
                    const name = p.name ? p.name.trim() : null;
                    if (name) uniquePlaces.add(name);

                    if (p.transportFromPrevious) {
                        let mode = p.transportFromPrevious.toLowerCase();
                        if (mode === 'ferry') mode = 'boat';
                        if (mode !== 'other' && mode !== '') {
                            const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
                            transportCount[formattedMode] = (transportCount[formattedMode] || 0) + 1;
                        }
                    }

                    if (p.coordinates) {
                        if (prevCoords) {
                            totalDistance += getDistance(prevCoords.lat, prevCoords.lng, p.coordinates.lat, p.coordinates.lng);
                        }
                        prevCoords = p.coordinates;
                    }
                });
            }
        });

        if (shortestTrip === Infinity) shortestTrip = 0;
        const totalPlaces = uniquePlaces.size;
        const busiestYear = Object.keys(yearsCount).sort((a, b) => yearsCount[b] - yearsCount[a])[0];
        const peakMonth = Object.keys(monthCount).sort((a, b) => monthCount[b] - monthCount[a])[0];
        const topTransport = Object.entries(transportCount).sort((a, b) => b[1] - a[1]).map(t => t[0]).join(', ') || 'Various';
        const yearsTraveled = Object.keys(yearsCount).length || 1;

        const avgTripsYear = (totalTrips / yearsTraveled).toFixed(1);
        const avgPlacesTrip = (totalPlacesCount / (totalTrips || 1)).toFixed(1);
        const avgDaysTrip = (totalDays / (totalTrips || 1)).toFixed(1);

        tripDates.sort((a, b) => a - b);
        let longestGap = 0;
        for (let i = 1; i < tripDates.length; i++) {
            const gap = Math.round((tripDates[i] - tripDates[i - 1]) / (1000 * 60 * 60 * 24));
            if (gap > longestGap) longestGap = gap;
        }

        // Add static image map and stats spread
        html += `
            <div class="diary-page">
                <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;">
                    <h2 style="font-family: 'Special Elite', cursive; font-size: 24px; margin: 0 0 10px 0; text-align: center; color: #3b3024; border-bottom: 2px solid rgba(0,0,0,0.1); padding-bottom: 5px;">Footprints in India</h2>
                    <img src="assets/india_map.png" alt="India Map" style="width: 100%; height: 350px; object-fit: cover; margin: 5px 0; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); pointer-events: none; mix-blend-mode: multiply;">
                    <p style="font-family: 'Share Tech Mono', monospace; font-size: 14px; color: #666; text-align: center; margin-top: 10px; margin-bottom: 5px;">An overview of the journey so far.</p>
                    
                    <div style="display: flex; justify-content: space-around; margin-top: auto; border-top: 1px dashed rgba(0,0,0,0.2); padding-top: 15px; font-family: 'Special Elite', cursive;">
                        <div style="text-align: center;">
                            <div style="font-size: 22px; font-weight: bold; color: #7a2828;">${totalTrips}</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #555; font-family: 'Share Tech Mono', monospace;">Trips</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 22px; font-weight: bold; color: #7a2828;">${totalPlaces}</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #555; font-family: 'Share Tech Mono', monospace;">Locations</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 22px; font-weight: bold; color: #7a2828;">${Math.round(totalDistance).toLocaleString()}</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #555; font-family: 'Share Tech Mono', monospace;">KM Tracked</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="diary-page">
                <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%; padding: 20px; display: flex; flex-direction: column; box-sizing: border-box;">
                    <h2 style="font-family: 'Special Elite', cursive; font-size: 24px; text-align: center; color: #3b3024; margin-bottom: 10px; border-bottom: 2px solid rgba(0,0,0,0.1); padding-bottom: 5px;">Travel Statistics</h2>
                    
                    <!-- Averages (Circles) -->
                    <h3 style="font-size: 14px; margin-top: 5px; margin-bottom: 8px; border-bottom: 1px dashed rgba(0,0,0,0.2); padding-bottom: 4px; color: #444; font-family: 'Special Elite', cursive;">Averages</h3>
                    <div style="display: flex; justify-content: space-between; font-family: 'Share Tech Mono', monospace; margin-bottom: 15px;">
                        <div style="width: 30%; aspect-ratio: 1; border: 2px solid #a69886; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(0,0,0,0.02);">
                            <div style="font-size: 18px; font-weight: bold; color: #7a2828;">${avgTripsYear}</div>
                            <div style="font-size: 9px; text-align: center; line-height: 1.1; color: #555; margin-top: 2px;">Trips/Yr</div>
                        </div>
                        <div style="width: 30%; aspect-ratio: 1; border: 2px solid #a69886; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(0,0,0,0.02);">
                            <div style="font-size: 18px; font-weight: bold; color: #7a2828;">${avgPlacesTrip}</div>
                            <div style="font-size: 9px; text-align: center; line-height: 1.1; color: #555; margin-top: 2px;">Places/Trip</div>
                        </div>
                        <div style="width: 30%; aspect-ratio: 1; border: 2px solid #a69886; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(0,0,0,0.02);">
                            <div style="font-size: 18px; font-weight: bold; color: #7a2828;">${avgDaysTrip}</div>
                            <div style="font-size: 9px; text-align: center; line-height: 1.1; color: #555; margin-top: 2px;">Days/Trip</div>
                        </div>
                    </div>

                    <!-- Duration Extremes (Data Block) -->
                    <h3 style="font-size: 14px; margin-bottom: 8px; border-bottom: 1px dashed rgba(0,0,0,0.2); padding-bottom: 4px; color: #444; font-family: 'Special Elite', cursive;">Time on the Road</h3>
                    <div style="background-color: rgba(0,0,0,0.03); padding: 8px 10px; border-radius: 4px; font-family: 'Share Tech Mono', monospace; font-size: 13px; margin-bottom: 15px; border-left: 3px solid #7a2828;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #555;">Total Days</span> <strong style="color: #3b3024;">${totalDays}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #555;">Longest Trip</span> <strong style="color: #3b3024;">${longestTrip} days</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #555;">Shortest Trip</span> <strong style="color: #3b3024;">${shortestTrip} days</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #555;">Max Gap</span> <strong style="color: #3b3024;">${longestGap} days</strong>
                        </div>
                    </div>

                    <!-- Trends (Ribbons) -->
                    <h3 style="font-size: 14px; margin-bottom: 8px; border-bottom: 1px dashed rgba(0,0,0,0.2); padding-bottom: 4px; color: #444; font-family: 'Special Elite', cursive;">Trends & Transport</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; font-family: 'Special Elite', cursive; font-size: 12px;">
                        <div style="background-color: #d1c8b4; color: #3b3024; padding: 4px 8px; border-radius: 2px; box-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
                            Busiest Year: <strong>${busiestYear}</strong>
                        </div>
                        <div style="background-color: #d1c8b4; color: #3b3024; padding: 4px 8px; border-radius: 2px; box-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
                            Peak Month: <strong>${peakMonth}</strong>
                        </div>
                        <div style="background-color: #d1c8b4; color: #3b3024; padding: 4px 8px; border-radius: 2px; width: 100%; box-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
                            Modes: <strong>${topTransport}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        data.trips.forEach((trip, index) => {
            const placesArray = trip.places ? [...new Set(trip.places.map(p => p.name))] : [];
            const columnStyle = placesArray.length > 10 ? 'column-count: 2; column-gap: 15px;' : '';
            const placesHtml = placesArray.length > 0
                ? `<ul style="list-style-type: square; padding-left: 20px; margin: 5px 0 0 0; font-size: 12px; line-height: 1.3; ${columnStyle}">` + placesArray.map(p => `<li style="break-inside: avoid-column;">${p}</li>`).join('') + `</ul>`
                : '<div style="font-size: 12px; margin-top: 5px;">No places recorded</div>';

            const coverHtml = trip.coverImage ? `<img src="${trip.coverImage}" class="diary-img" alt="${trip.title}" style="width: 100%; height: 160px; object-fit: cover; margin: 10px 0; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">` : '';

            html += `
                <div class="diary-page">
                    <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%; padding: 20px; color: #3b3024; font-family: 'Special Elite', cursive; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
                        <h2 style="font-size: 28px; margin: 0 0 5px 0; border-bottom: 2px solid rgba(0,0,0,0.1); padding-bottom: 5px;">${trip.title}</h2>
                        <div style="font-family: 'Share Tech Mono', monospace; font-size: 14px; color: #666; margin-bottom: 10px;">Year: ${trip.startDate.split('-')[0]}</div>
                        ${coverHtml}
                        <div style="margin-bottom: 10px; flex: 1; display: flex; flex-direction: column;">
                            <strong style="font-size: 14px;">Places Visited:</strong> 
                            ${placesHtml}
                        </div>
                        <div style="font-family: 'Share Tech Mono', monospace; font-size: 12px; text-align: right; margin-top: auto;">${index + 1}</div>
                    </div>
                </div>
            `;
        });

        // Add blank page if odd number of internal pages
        if (data.trips.length % 2 !== 0) {
            html += `
                <div class="diary-page">
                    <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%;"></div>
                </div>
            `;
        }

    } catch (e) {
        console.error("Failed to load trips.json", e);
        html += `
            <div class="diary-page">
                <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%; padding: 30px;"><p style="font-family: 'Caveat', cursive; font-size: 24px;">Could not load diary entries.</p></div>
            </div>
            <div class="diary-page">
                <div class="diary-page-content" style="background-color: #fdf6e3; height: 100%;"></div>
            </div>
        `;
    }

    html += `
        <div class="diary-page" data-density="hard">
            <div class="diary-page-content" style="background-color: #4a3424; border: 2px solid #2a1f15; height: 100%;"></div>
        </div>
        <div class="diary-page" data-density="hard">
            <div class="diary-page-content" style="background-color: #4a3424; border: 2px solid #2a1f15; height: 100%; display: flex; align-items: center; justify-content: center;">
                <h2 style="font-family: 'Special Elite', cursive; color: #e8dcc4; font-size: 32px;">The End</h2>
            </div>
        </div>
    `;

    bookContainer.innerHTML = html;

    setTimeout(() => {
        const pageFlip = new St.PageFlip(bookContainer, {
            width: 400,
            height: 550,
            size: "fixed",
            drawShadow: true,
            showCover: true,
            usePortrait: false,
            mobileScrollSupport: false,
            useMouseEvents: true, // Re-enable drag & drop since user liked Nodlik demo
            maxShadowOpacity: 0.5 // Standard shadow
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.diary-page'));
        pageFlipInstance = pageFlip;

        let isFlipping = false;
        document.getElementById('diary-overlay').addEventListener('wheel', (e) => {
            if (isFlipping || !pageFlipInstance) return;

            if (Math.abs(e.deltaY) > 30) {
                isFlipping = true;
                if (e.deltaY > 0) {
                    pageFlipInstance.flipNext();
                } else {
                    pageFlipInstance.flipPrev();
                }

                // Debounce to prevent multiple pages flipping at once
                setTimeout(() => {
                    isFlipping = false;
                }, 800);
            }
        });

        // Show the book smoothly after initialization
        bookContainer.style.transition = 'opacity 0.3s ease';
        bookContainer.style.opacity = '1';
    }, 100);
}

