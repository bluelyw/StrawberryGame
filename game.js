// Strawberry Quest - Kid-Friendly Platformer
// A simple browser game for 6-year-olds

// Game Constants - Easy to adjust for parents and kids!
const GAME_CONFIG = {
    // Player settings
    PLAYER_SPEED: 300,           // How fast the player moves (pixels per second)
    PLAYER_JUMP_FORCE: 400,      // How high the player jumps
    PLAYER_SIZE: 30,             // Size of the player (square)
    
    // Physics settings
    GRAVITY: 800,                // How fast things fall
    GROUND_FRICTION: 0.8,        // How much the player slows down on ground
    
    // Enemy settings
    ENEMY_SPEED: 100,            // How fast enemies move
    ENEMY_SIZE: 25,              // Size of enemies
    
    // Collectible settings
    STRAWBERRY_SIZE: 20,         // Size of strawberries
    STRAWBERRY_BOUNCE: 50,       // How much strawberries bounce
    
    // Level settings
    LEVEL_TIMER: 20,             // Time limit for level 4 (seconds)
    STRAWBERRIES_NEEDED: 5,      // Strawberries needed for level 2
    
    // Visual settings
    FLAG_SIZE: 40,               // Size of the flag
    DOOR_SIZE: 50,               // Size of the boss door
    PLATFORM_HEIGHT: 20          // Height of platforms
};

// Game States
const GAME_STATES = {
    MENU: 'menu',
    PLAY: 'play',
    PAUSE: 'pause',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over',
    ALL_CLEAR: 'all_clear'
};

// Game Variables
let canvas, ctx;
let gameState = GAME_STATES.MENU;
let currentLevel = 1;
let score = 0;
let lives = 3;
let timeLeft = GAME_CONFIG.LEVEL_TIMER;
let isMuted = false;
let keys = {};
let gameObjects = [];
let particles = [];
let bestTimes = JSON.parse(localStorage.getItem('strawberryQuest_bestTimes') || '{}');

// Player object
let player = {
    x: 100,
    y: 500,
    vx: 0,
    vy: 0,
    width: GAME_CONFIG.PLAYER_SIZE,
    height: GAME_CONFIG.PLAYER_SIZE,
    onGround: false,
    color: '#FF69B4' // Pink for the little girl
};

// Sound effects (simple beep sounds using Web Audio API)
let audioContext = null;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Audio not supported, continuing without sound');
    }
}

function playSfx(name) {
    if (isMuted) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(name) {
        case 'jump':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
            break;
        case 'collect':
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            break;
        case 'hit':
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
            break;
        case 'win':
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
            break;
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Level definitions - Easy to modify!
const LEVELS = [
    // Level 1: Simple platforming to flag
    {
        platforms: [
            {x: 0, y: 650, width: 1280, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 300, y: 550, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 600, y: 450, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 900, y: 350, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT}
        ],
        strawberries: [],
        enemies: [],
        flag: {x: 1100, y: 300, width: GAME_CONFIG.FLAG_SIZE, height: GAME_CONFIG.FLAG_SIZE},
        door: null,
        timer: null,
        playerStart: {x: 100, y: 500}
    },
    
    // Level 2: Collect strawberries to make flag appear
    {
        platforms: [
            {x: 0, y: 650, width: 1280, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 200, y: 550, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 400, y: 450, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 600, y: 350, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 800, y: 250, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 1000, y: 150, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT}
        ],
        strawberries: [
            {x: 250, y: 520, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 450, y: 420, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 650, y: 320, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 850, y: 220, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 1050, y: 120, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false}
        ],
        enemies: [],
        flag: null,
        door: null,
        timer: null,
        playerStart: {x: 100, y: 500}
    },
    
    // Level 3: Add enemies
    {
        platforms: [
            {x: 0, y: 650, width: 1280, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 200, y: 550, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 500, y: 450, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 800, y: 350, width: 200, height: GAME_CONFIG.PLATFORM_HEIGHT}
        ],
        strawberries: [
            {x: 300, y: 520, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 600, y: 420, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 900, y: 320, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false}
        ],
        enemies: [
            {x: 250, y: 520, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 250, endX: 350, color: '#FFD700'}
        ],
        flag: {x: 1000, y: 300, width: GAME_CONFIG.FLAG_SIZE, height: GAME_CONFIG.FLAG_SIZE},
        door: null,
        timer: null,
        playerStart: {x: 100, y: 500}
    },
    
    // Level 4: Add timer
    {
        platforms: [
            {x: 0, y: 650, width: 1280, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 150, y: 550, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 350, y: 450, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 550, y: 350, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 750, y: 250, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 950, y: 150, width: 150, height: GAME_CONFIG.PLATFORM_HEIGHT}
        ],
        strawberries: [
            {x: 200, y: 520, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 400, y: 420, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 600, y: 320, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 800, y: 220, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 1000, y: 120, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false}
        ],
        enemies: [
            {x: 200, y: 520, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 200, endX: 300, color: '#FFD700'},
            {x: 600, y: 320, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 600, endX: 700, color: '#FFD700'}
        ],
        flag: {x: 1100, y: 100, width: GAME_CONFIG.FLAG_SIZE, height: GAME_CONFIG.FLAG_SIZE},
        door: null,
        timer: GAME_CONFIG.LEVEL_TIMER,
        playerStart: {x: 100, y: 500}
    },
    
    // Level 5: Boss door
    {
        platforms: [
            {x: 0, y: 650, width: 1280, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 100, y: 550, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 250, y: 450, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 400, y: 350, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 550, y: 250, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 700, y: 150, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 850, y: 250, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT},
            {x: 1000, y: 350, width: 100, height: GAME_CONFIG.PLATFORM_HEIGHT}
        ],
        strawberries: [
            {x: 150, y: 520, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 300, y: 420, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 450, y: 320, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 600, y: 220, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 750, y: 120, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 900, y: 220, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false},
            {x: 1050, y: 320, width: GAME_CONFIG.STRAWBERRY_SIZE, height: GAME_CONFIG.STRAWBERRY_SIZE, collected: false}
        ],
        enemies: [
            {x: 150, y: 520, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 150, endX: 200, color: '#FFD700'},
            {x: 450, y: 320, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 450, endX: 500, color: '#FFD700'},
            {x: 750, y: 120, width: GAME_CONFIG.ENEMY_SIZE, height: GAME_CONFIG.ENEMY_SIZE, vx: GAME_CONFIG.ENEMY_SPEED, startX: 750, endX: 800, color: '#FFD700'}
        ],
        flag: null,
        door: {x: 1100, y: 300, width: GAME_CONFIG.DOOR_SIZE, height: GAME_CONFIG.DOOR_SIZE},
        timer: null,
        playerStart: {x: 100, y: 500}
    }
];

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Initialize audio
    initAudio();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start game loop
    gameLoop();
}

// Set up keyboard and touch controls
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Escape' && gameState === GAME_STATES.PLAY) {
            pauseGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Touch controls for mobile
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    
    if (leftBtn) {
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys['ArrowLeft'] = true;
        });
        
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys['ArrowLeft'] = false;
        });
    }
    
    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys['ArrowRight'] = true;
        });
        
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys['ArrowRight'] = false;
        });
    }
    
    if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys['ArrowUp'] = true;
        });
        
        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys['ArrowUp'] = false;
        });
    }
    
    // Button event listeners
    const startBtn = document.getElementById('startBtn');
    const muteBtn = document.getElementById('muteBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const menuBtn = document.getElementById('menuBtn');
    const menuBtn2 = document.getElementById('menuBtn2');
    const menuBtn3 = document.getElementById('menuBtn3');
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    const retryBtn = document.getElementById('retryBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    
    if (startBtn) {
        console.log('Start button found, adding click listener');
        startBtn.addEventListener('click', () => {
            console.log('Start button clicked!');
            startGame();
        });
    } else {
        console.error('Start button not found!');
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    if (resumeBtn) {
        resumeBtn.addEventListener('click', resumeGame);
    }
    
    if (menuBtn) {
        menuBtn.addEventListener('click', showMenu);
    }
    
    if (menuBtn2) {
        menuBtn2.addEventListener('click', showMenu);
    }
    
    if (menuBtn3) {
        menuBtn3.addEventListener('click', showMenu);
    }
    
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', nextLevel);
    }
    
    if (retryBtn) {
        retryBtn.addEventListener('click', retryLevel);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', restartGame);
    }
    
    console.log('Event listeners setup complete');
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    if (gameState === GAME_STATES.PLAY) {
        updatePlayer();
        updateEnemies();
        updateCollisions();
        updateTimer();
    }
}

// Update player physics and movement
function updatePlayer() {
    const level = LEVELS[currentLevel - 1];
    
    // Handle input
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx = -GAME_CONFIG.PLAYER_SPEED;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx = GAME_CONFIG.PLAYER_SPEED;
    } else {
        player.vx *= GAME_CONFIG.GROUND_FRICTION;
    }
    
    if ((keys['ArrowUp'] || keys['KeyW']) && player.onGround) {
        player.vy = -GAME_CONFIG.PLAYER_JUMP_FORCE;
        player.onGround = false;
        playSfx('jump');
    }
    
    // Apply gravity
    player.vy += GAME_CONFIG.GRAVITY * (1/60); // Assuming 60 FPS
    
    // Update position
    player.x += player.vx * (1/60);
    player.y += player.vy * (1/60);
    
    // Check platform collisions
    player.onGround = false;
    for (let platform of level.platforms) {
        if (checkCollision(player, platform)) {
            // Landing on top of platform
            if (player.vy > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.onGround = true;
            }
            // Hitting platform from below
            else if (player.vy < 0 && player.y > platform.y) {
                player.y = platform.y + platform.height;
                player.vy = 0;
            }
            // Hitting platform from sides
            else if (player.vx > 0) {
                player.x = platform.x - player.width;
            } else if (player.vx < 0) {
                player.x = platform.x + platform.width;
            }
        }
    }
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x > 1280 - player.width) player.x = 1280 - player.width;
    if (player.y > 720) {
        playerHit();
    }
}

// Update enemy movement
function updateEnemies() {
    const level = LEVELS[currentLevel - 1];
    
    for (let enemy of level.enemies) {
        enemy.x += enemy.vx * (1/60);
        
        // Reverse direction at boundaries
        if (enemy.x <= enemy.startX || enemy.x >= enemy.endX) {
            enemy.vx = -enemy.vx;
        }
    }
}

// Update collision detection
function updateCollisions() {
    const level = LEVELS[currentLevel - 1];
    
    // Check strawberry collection
    for (let strawberry of level.strawberries) {
        if (!strawberry.collected && checkCollision(player, strawberry)) {
            strawberry.collected = true;
            score += 10;
            playSfx('collect');
            createParticles(strawberry.x, strawberry.y, '#FF6B6B');
        }
    }
    
    // Check enemy collisions
    for (let enemy of level.enemies) {
        if (checkCollision(player, enemy)) {
            playerHit();
        }
    }
    
    // Check flag collision
    if (level.flag && checkCollision(player, level.flag)) {
        levelComplete();
    }
    
    // Check door collision (level 5)
    if (level.door && checkCollision(player, level.door)) {
        // Check if all strawberries are collected
        const allCollected = level.strawberries.every(s => s.collected);
        if (allCollected) {
            gameComplete();
        }
    }
    
    // Check if flag should appear (level 2)
    if (!level.flag && level.strawberries.every(s => s.collected)) {
        level.flag = {x: 1100, y: 100, width: GAME_CONFIG.FLAG_SIZE, height: GAME_CONFIG.FLAG_SIZE};
    }
}

// Update timer
function updateTimer() {
    const level = LEVELS[currentLevel - 1];
    if (level.timer !== null) {
        timeLeft -= 1/60; // Assuming 60 FPS
        if (timeLeft <= 0) {
            gameOver();
        }
    }
}

// Player hit by enemy or fell off
function playerHit() {
    lives--;
    playSfx('hit');
    player.x = LEVELS[currentLevel - 1].playerStart.x;
    player.y = LEVELS[currentLevel - 1].playerStart.y;
    player.vx = 0;
    player.vy = 0;
    
    if (lives <= 0) {
        gameOver();
    }
}

// Create particle effects
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + Math.random() * 20,
            y: y + Math.random() * 20,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 1,
            color: color
        });
    }
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx * (1/60);
        particle.y += particle.vy * (1/60);
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Render everything
function render() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 1280, 720);
    
    if (gameState === GAME_STATES.PLAY) {
        renderLevel();
        renderPlayer();
        renderParticles();
        updateParticles();
    }
    
    updateHUD();
}

// Render the current level
function renderLevel() {
    const level = LEVELS[currentLevel - 1];
    
    // Render platforms
    ctx.fillStyle = '#8B4513';
    for (let platform of level.platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    // Render strawberries
    ctx.fillStyle = '#FF6B6B';
    for (let strawberry of level.strawberries) {
        if (!strawberry.collected) {
            ctx.fillRect(strawberry.x, strawberry.y, strawberry.width, strawberry.height);
            // Draw strawberry emoji
            ctx.font = '16px Arial';
            ctx.fillText('🍓', strawberry.x + 2, strawberry.y + 16);
        }
    }
    
    // Render enemies
    for (let enemy of level.enemies) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // Draw bee emoji
        ctx.font = '16px Arial';
        ctx.fillText('🐝', enemy.x + 4, enemy.y + 16);
    }
    
    // Render flag
    if (level.flag) {
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(level.flag.x, level.flag.y, level.flag.width, level.flag.height);
        // Draw flag emoji
        ctx.font = '20px Arial';
        ctx.fillText('🏁', level.flag.x + 10, level.flag.y + 25);
    }
    
    // Render door
    if (level.door) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(level.door.x, level.door.y, level.door.width, level.door.height);
        // Draw door emoji
        ctx.font = '20px Arial';
        ctx.fillText('🚪', level.door.x + 15, level.door.y + 30);
    }
}

// Render player
function renderPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Draw girl emoji
    ctx.font = '20px Arial';
    ctx.fillText('👧', player.x + 5, player.y + 20);
}

// Render particles
function renderParticles() {
    for (let particle of particles) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 4, 4);
    }
    ctx.globalAlpha = 1;
}

// Update HUD display
function updateHUD() {
    document.getElementById('levelDisplay').textContent = currentLevel;
    document.getElementById('scoreDisplay').textContent = score;
    document.getElementById('livesDisplay').textContent = lives;
    
    const level = LEVELS[currentLevel - 1];
    if (level.timer !== null) {
        document.getElementById('timeDisplay').textContent = Math.ceil(timeLeft);
    } else {
        document.getElementById('timeDisplay').textContent = '--';
    }
}

// Game state management
function startGame() {
    console.log('startGame function called!');
    gameState = GAME_STATES.PLAY;
    currentLevel = 1;
    score = 0;
    lives = 3;
    loadLevel(currentLevel);
    hideAllScreens();
    console.log('Game started, state:', gameState);
}

function loadLevel(levelNum) {
    const level = LEVELS[levelNum - 1];
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.vx = 0;
    player.vy = 0;
    
    // Reset strawberries
    for (let strawberry of level.strawberries) {
        strawberry.collected = false;
    }
    
    // Reset flag for level 2
    if (levelNum === 2) {
        level.flag = null;
    }
    
    // Reset timer
    if (level.timer !== null) {
        timeLeft = level.timer;
    }
    
    particles = [];
}

function pauseGame() {
    gameState = GAME_STATES.PAUSE;
    showScreen('pauseScreen');
}

function resumeGame() {
    gameState = GAME_STATES.PLAY;
    hideAllScreens();
}

function levelComplete() {
    playSfx('win');
    gameState = GAME_STATES.LEVEL_COMPLETE;
    
    // Save best time
    const level = LEVELS[currentLevel - 1];
    if (level.timer !== null) {
        const timeUsed = level.timer - timeLeft;
        const bestTime = bestTimes[currentLevel] || Infinity;
        if (timeUsed < bestTime) {
            bestTimes[currentLevel] = timeUsed;
            localStorage.setItem('strawberryQuest_bestTimes', JSON.stringify(bestTimes));
        }
    }
    
    createConfetti();
    showScreen('levelCompleteScreen');
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > LEVELS.length) {
        gameComplete();
    } else {
        loadLevel(currentLevel);
        gameState = GAME_STATES.PLAY;
        hideAllScreens();
    }
}

function gameComplete() {
    playSfx('win');
    gameState = GAME_STATES.ALL_CLEAR;
    createConfetti();
    showScreen('allClearScreen');
}

function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    showScreen('gameOverScreen');
}

function retryLevel() {
    loadLevel(currentLevel);
    lives = 3;
    gameState = GAME_STATES.PLAY;
    hideAllScreens();
}

function restartGame() {
    startGame();
}

function showMenu() {
    gameState = GAME_STATES.MENU;
    showScreen('menuScreen');
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('muteBtn');
    btn.textContent = isMuted ? '🔇 声音: 关' : '🔊 声音: 开';
}

// UI helper functions
function showScreen(screenId) {
    hideAllScreens();
    document.getElementById(screenId).classList.remove('hidden');
}

function hideAllScreens() {
    const screens = ['menuScreen', 'pauseScreen', 'levelCompleteScreen', 'gameOverScreen', 'allClearScreen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    confettiContainer.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = ['#FF6B6B', '#4ECDC4', '#FFD700', '#FF69B4'][Math.floor(Math.random() * 4)];
        piece.style.animationDelay = Math.random() * 2 + 's';
        confettiContainer.appendChild(piece);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 3000);
}

// Initialize the game when the page loads
window.addEventListener('load', init); 