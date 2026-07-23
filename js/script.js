const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// --- 3. GAME VARIABLES ---
let currentZone = "town";
let currentMapData = [];
let currentTileset = new Image();
let collisionData = [];
let doorPaintData = [];
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
    image: new Image(),
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
        { "x": 600, "y": 368, "w": 88, "h": 72, "id": "boss", "text": "Boss Room" }
    ]
};

let activeInteractable = null;
let isOverlayActive = false;

// Interior System
const interiorOverlay = document.getElementById('interior-overlay');
const interiorBg = document.getElementById('interior-bg');
const interiorTitle = document.getElementById('interior-title');
const interiorBody = document.getElementById('interior-body');
const interiorClose = document.getElementById('interior-close');
const interiorExplore = document.getElementById('interior-explore');
const scrollWrapContainer = document.getElementById('scroll-wrap-container');

if (interiorClose) {
    interiorClose.addEventListener('click', () => {
        if (interiorOverlay) interiorOverlay.style.display = 'none';
        isOverlayActive = false;
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

function updateLabComputer() {
    const p = projectsData[currentProjectIdx];
    const pTitle = document.getElementById('project-title');
    const pTech = document.getElementById('project-tech');
    const pDesc = document.getElementById('project-description');
    const pFeat = document.getElementById('project-features');
    const pGit = document.getElementById('project-github');
    const pLive = document.getElementById('project-live');
    const pPrev = document.getElementById('project-preview');

    if(pTitle) pTitle.innerText = p.title;
    if(pTech) pTech.innerHTML = p.tech.map(t => `<li>> ${t}</li>`).join('');
    if(pDesc) pDesc.innerText = p.shortDesc;
    if(pFeat) pFeat.innerHTML = p.features.map(f => `<li style="margin-bottom:6px;">- ${f}</li>`).join('');
    if(pGit) pGit.href = p.github;
    if(pLive) pLive.href = p.live;
    if(pPrev) {
        if(p.live && p.live !== "#") {
            pPrev.innerHTML = `
                <div style="position:absolute; top:0; left:0; width:200%; height:200%; transform:scale(0.5); transform-origin:top left;">
                    <iframe src="${p.live}" style="width:100%; height:100%; border:none; background:#fff;"></iframe>
                </div>
            `;
        } else {
            pPrev.innerHTML = `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">`;
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
        status: "UNDER DEVELOPMENT",
        desc: "An open-source, full-stack web application that revolutionizes data collection. Build highly customizable forms with a drag-and-drop workspace, or let AI generate professional forms from a simple prompt. Serve your forms in both classic and conversational modes to maximize completion rates.",
        features: ["Workspace Builder", "AI Form Generator", "Small-Cohort Analytics", "AI Workflow Insights"],
        tech: "React, Node.js, Express, MongoDB, Groq API",
        repo: "https://github.com/RavikantiAkshay/NxtForm"
    },
    {
        title: "Placement-Assistant",
        status: "UNDER DEVELOPMENT",
        desc: "An open-source, full-stack AI platform that conducts real-time conversational mock interviews. Upload your resume, select your desired role and difficulty, and participate in a highly dynamic voice-to-voice interview. Receive a comprehensive analytics report detailing your technical proficiency, behavioral adherence, and communication skills to help you ace your next real-world interview.",
        features: ["Voice-to-Voice Interaction", "Resume-Driven Questions", "Comprehensive Analytics", "Intelligent Doubt Solver"],
        tech: "React 19, Express, MongoDB, Groq AI, Whisper",
        repo: "https://github.com/RavikantiAkshay/placement-assistant"
    },
    {
        title: "TestCaseGenerator",
        status: "UNDER DEVELOPMENT",
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

    if(bpTitle) bpTitle.innerText = `Blueprint: ${w.title}`;
    if(bpStatus) {
        bpStatus.innerText = `Status: ${w.status}`;
        bpStatus.style.color = w.status === 'STASHED' ? '#ff9999' : '#ffd700';
    }
    
    if (w.status === 'STASHED') {
        if(bpStashContainer) bpStashContainer.style.display = 'block';
        if(bpStashReason) bpStashReason.innerText = w.reason || "Placeholder reason";
        if(bpRepoContainer) bpRepoContainer.style.display = 'none';
    } else {
        if(bpStashContainer) bpStashContainer.style.display = 'none';
        if(bpRepoContainer) bpRepoContainer.style.display = 'block';
        if(bpRepoLink) bpRepoLink.href = w.repo || "#";
    }

    if(bpDesc) bpDesc.innerText = w.desc;
    if(bpFeat) bpFeat.innerHTML = w.features.map(f => `<li>${f}</li>`).join('');
    if(bpTech) bpTech.innerHTML = `<strong>Tech Stack:</strong> ${w.tech}`;
    if(bpPag) bpPag.innerText = `${currentWorkshopIdx + 1} / ${workshopProjectsData.length}`;
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
    keys[e.key.toLowerCase()] = true;

    // Handle Interaction (E key)
    if (e.key.toLowerCase() === 'e') {
        if (!isOverlayActive && activeInteractable) {
            isOverlayActive = true;
            
            if (activeInteractable.id === 'home') {
                if (interiorBg) {
                    interiorBg.style.backgroundImage = "url('assets/images/environments/home.jpg')";
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
                    interiorBg.style.backgroundImage = "url('assets/images/environments/post.png'), url('assets/images/environments/library.png')";
                    interiorBg.style.backgroundColor = "#2b1e16";
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
    // Uncomment this block to re-enable Edit Modes!
    /*
    if (e.key.toLowerCase() === 'c') {
        editMode = !editMode;
        
        // --- BLUE DOOR MODE ---
        debugUI.innerText = `DOOR EDIT MODE ON\nDrag to Paint Doors\n'P': Print Array to Console\n'V': Toggle Paint/Erase\n'[' / ']': Brush Size`;
        debugUI.style.color = "#55f";
        
        // --- RED COLLISION MODE ---
        // Uncomment below and comment above to use Red mode
        // debugUI.innerText = `EDIT MODE ON\nDrag to Paint\n'V': Toggle Solid/Walkable\n'[' / ']': Brush Size\n'F': Fill All Solid\n'X': Clear All`;
        // debugUI.style.color = "#f55";

        debugUI.style.display = editMode ? 'block' : 'none';
        coordUI.style.display = 'none'; // Not needed anymore
    }
    */
    
    if (!editMode) return;

    if (e.key.toLowerCase() === 'p') {
        let doors = [];
        let visited = Array.from({length: doorPaintData.length}, () => Array(doorPaintData[0].length).fill(false));
        for (let r = 0; r < doorPaintData.length; r++) {
            for (let c = 0; c < doorPaintData[0].length; c++) {
                if (doorPaintData[r][c] === 1 && !visited[r][c]) {
                    let minR = r, maxR = r, minC = c, maxC = c;
                    let queue = [[r, c]];
                    visited[r][c] = true;
                    while(queue.length > 0) {
                        let [cr, cc] = queue.shift();
                        minR = Math.min(minR, cr);
                        maxR = Math.max(maxR, cr);
                        minC = Math.min(minC, cc);
                        maxC = Math.max(maxC, cc);
                        let dirs = [[0,1], [1,0], [0,-1], [-1,0]];
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
                    doors.push({
                        x: minC * collisionSize,
                        y: minR * collisionSize,
                        w: (maxC - minC + 1) * collisionSize,
                        h: (maxR - minR + 1) * collisionSize,
                        id: "custom_door",
                        text: "Custom Door"
                    });
                }
            }
        }
        console.log("DOOR CONFIG FOR " + currentZone + ":\n", JSON.stringify(doors, null, 2));
        alert("Printed Doors array to console! Press F12 to copy it.");
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

        doorPaintData = Array.from({length: collisionRows}, () => Array(collisionCols).fill(0));

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
    for (let i = npcs.length - 1; i >= 0; i--) {
        const npc = npcs[i];
        if (npc.hp <= 0) {
            // Handle death animation timing
            if (npc.deathTimer > 0) {
                npc.deathTimer--;
            } else {
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

        ctx.drawImage(
            currentImg,
            sX, sY, fW, fH,
            player.x - (displayWidth - player.size) / 2, // Center horizontally
            player.y - (displayHeight - player.size), // align bottom of sprite to collision box
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
            ctx.save();
            
            // Death animation: fade out and float up
            if (npc.hp <= 0) {
                const progress = npc.deathTimer / 30; // Goes from 1.0 down to 0.0
                ctx.globalAlpha = progress;
                const floatOffset = (1 - progress) * 20; // Floats up by 20 pixels
                ctx.translate(0, -floatOffset);
            }

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

    // Draw Interaction Prompt
    if (activeInteractable && !isOverlayActive) {
        const pulse = Math.abs(Math.sin(Date.now() / 200)) * 5;
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.strokeText(`Press [E] to enter ${activeInteractable.text}`, player.x + player.size/2, player.y - 15 - pulse);
        ctx.fillText(`Press [E] to enter ${activeInteractable.text}`, player.x + player.size/2, player.y - 15 - pulse);
    }

    // Draw Interaction zones in edit mode
    if (editMode && interactables[currentZone]) {
        ctx.fillStyle = "rgba(0, 0, 255, 0.4)"; // blue transparent for doors
        interactables[currentZone].forEach(door => {
            ctx.fillRect(door.x, door.y, door.w, door.h);
        });
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
