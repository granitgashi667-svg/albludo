// ================== SISTEMI I MONEDHAVE DHE PROFILIT ==================
// (i shtuar në fillim të kodit origjinal)

let playerCoins = parseInt(localStorage.getItem('ludoCoins')) || 100;
let playerName = localStorage.getItem('ludoPlayerName') || 'Lojtari';
let purchasedSkins = JSON.parse(localStorage.getItem('ludoSkins')) || [];
let purchasedEffects = JSON.parse(localStorage.getItem('ludoEffects')) || [];

function updateCoinUI() {
    const span = document.getElementById('coin-amount');
    if (span) span.innerText = playerCoins;
    localStorage.setItem('ludoCoins', playerCoins);
}
function updateProfileNameUI() {
    const span = document.getElementById('profile-name');
    if (span) span.innerText = playerName;
    localStorage.setItem('ludoPlayerName', playerName);
}
function addCoins(amount) {
    playerCoins += amount;
    updateCoinUI();
    if (typeof logMessage === 'function') {
        logMessage(`✨ Fituat ${amount} monedha! Gjithsej: ${playerCoins} ✨`);
    } else {
        console.log(`✨ Fituat ${amount} monedha! Gjithsej: ${playerCoins} ✨`);
    }
}

// Inicializimi i profilit dhe marketit (pasi DOM të jetë gati)
document.addEventListener('DOMContentLoaded', () => {
    updateCoinUI();
    updateProfileNameUI();
    const editBtn = document.getElementById('edit-name-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            let newName = prompt('Shkruani emrin tuaj:', playerName);
            if (newName && newName.trim()) {
                playerName = newName.trim().substring(0, 15);
                updateProfileNameUI();
            }
        });
    }
    const marketBtn = document.getElementById('market-btn');
    const modal = document.getElementById('market-modal');
    if (marketBtn && modal) {
        marketBtn.addEventListener('click', () => modal.style.display = 'flex');
        const closeSpan = modal.querySelector('.close');
        if (closeSpan) closeSpan.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }
    // Blerjet në market
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            if (!item) return;
            const cost = parseInt(item.dataset.cost);
            const type = item.dataset.type;
            const value = item.dataset.value;
            if (playerCoins >= cost) {
                playerCoins -= cost;
                updateCoinUI();
                if (type === 'skin') purchasedSkins.push(value);
                else if (type === 'effect') purchasedEffects.push(value);
                localStorage.setItem('ludoSkins', JSON.stringify(purchasedSkins));
                localStorage.setItem('ludoEffects', JSON.stringify(purchasedEffects));
                alert(`Blerje e kryer! ${value} u shtua.`);
                if (modal) modal.style.display = 'none';
            } else {
                alert('Monedha të pamjaftueshme! Fitoni duke fituar lojëra.');
            }
        });
    });
});

// ================== KODI ORIGJINAL I LOJËS (FUNKSIONAL) ==================
// Nga këtu e poshtë është kopje e saktë e asaj që dhatë, me një ndryshim të vetëm:
// Brenda funksionit checkWin() është shtuar rreshti: addCoins(50);

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============== GAME CONSTANTS ==============
const COLORS = {
    RED: 0xE53935,
    GREEN: 0x43A047,
    YELLOW: 0xFDD835,
    BLUE: 0x1E88E5,
    WHITE: 0xFFFFFF,
    CREAM: 0xF5F5DC,
    BOARD_BROWN: 0x8B4513
};

const PLAYER_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
const PLAYER_COLORS = [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];

// Cell size for the board
const CELL = 1.2;
const BOARD_SIZE = 15; // 15x15 grid

// ============== AUDIO SYSTEM ==============
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(freq, type, duration) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playRoll() {
        this.init();
        for (let i = 0; i < 8; i++) {
            setTimeout(() => this.playTone(600 + Math.random() * 200, 'square', 0.05), i * 60);
        }
    }

    playMove() {
        this.init();
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
    }

    playCapture() {
        this.init();
        this.playTone(200, 'sawtooth', 0.2);
        this.playTone(100, 'square', 0.3);
    }

    playWin() {
        this.init();
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.3), i * 150);
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const audio = new AudioEngine();

// ============== THREE.JS SETUP ==============
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
// Adjust camera for mobile - zoom out 25% on smaller screens
const isMobile = window.innerWidth < 768;
const cameraDistance = isMobile ? 32 : 25;
camera.position.set(0, cameraDistance, cameraDistance);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.3;
controls.minDistance = 15;
controls.maxDistance = 50;

// Lighting - Bright and vibrant
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(15, 30, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

// Fill light from opposite side for even illumination
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-15, 20, -15);
scene.add(fillLight);

// ============== 3D DICE ==============
function createDiceFaceTexture(value) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // White background with rounded corners
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);

    // Draw dots
    ctx.fillStyle = '#333333';
    const dotPositions = {
        1: [[64, 64]],
        2: [[32, 32], [96, 96]],
        3: [[32, 32], [64, 64], [96, 96]],
        4: [[32, 32], [96, 32], [32, 96], [96, 96]],
        5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
        6: [[32, 32], [96, 32], [32, 64], [96, 64], [32, 96], [96, 96]]
    };

    const dots = dotPositions[value] || [];
    dots.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
}

// Create 3D dice meshes
const dice3D = [];
function create3DDice() {
    const diceGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);

    for (let i = 0; i < 2; i++) {
        // Create materials for each face (1-6)
        const materials = [
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1) }), // right
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6) }), // left
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2) }), // top
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5) }), // bottom
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3) }), // front
            new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4) })  // back
        ];

        const dice = new THREE.Mesh(diceGeo, materials);
        dice.position.set(i === 0 ? -2 : 2, 8, 0);
        dice.castShadow = true;
        dice.visible = false; // Hidden until roll
        scene.add(dice);
        dice3D.push(dice);
    }
}
create3DDice();

// Animate 3D dice roll
function animate3DDiceRoll(value1, value2) {
    const isSingleMode = STATE.diceMode === 'single';

    dice3D.forEach((dice, i) => {
        if (isSingleMode && i === 1) {
            dice.visible = false;
            return;
        }
        dice.visible = true;
        dice.position.y = 8;

        // Random rotation during roll
        gsap.to(dice.rotation, {
            x: Math.random() * Math.PI * 4,
            y: Math.random() * Math.PI * 4,
            z: Math.random() * Math.PI * 4,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
                // Set final rotation to show correct face
                const value = i === 0 ? value1 : value2;
                setDiceFinalRotation(dice, value);
            }
        });

        // Hop animation
        gsap.to(dice.position, {
            y: 10,
            duration: 0.2,
            yoyo: true,
            repeat: 2,
            ease: 'power2.out'
        });
    });

    // Hide after animation
    setTimeout(() => {
        dice3D.forEach(d => d.visible = false);
    }, 1500);
}

function setDiceFinalRotation(dice, value) {
    // Map value to rotation (simplified - top face shows value)
    const rotations = {
        1: { x: Math.PI / 2, y: 0, z: 0 },
        2: { x: 0, y: 0, z: 0 },
        3: { x: 0, y: Math.PI / 2, z: 0 },
        4: { x: 0, y: -Math.PI / 2, z: 0 },
        5: { x: Math.PI, y: 0, z: 0 },
        6: { x: -Math.PI / 2, y: 0, z: 0 }
    };
    const rot = rotations[value] || { x: 0, y: 0, z: 0 };
    gsap.to(dice.rotation, { ...rot, duration: 0.2 });
}

// ============== BOARD CONSTRUCTION ==============
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const piecesGroup = new THREE.Group();
scene.add(piecesGroup);

// Materials
const materials = {
    cream: new THREE.MeshStandardMaterial({ color: COLORS.CREAM, roughness: 0.8 }),
    white: new THREE.MeshStandardMaterial({ color: COLORS.WHITE, roughness: 0.5 }),
    brown: new THREE.MeshStandardMaterial({ color: COLORS.BOARD_BROWN, roughness: 0.7 }),
    red: new THREE.MeshStandardMaterial({ color: COLORS.RED, roughness: 0.4 }),
    green: new THREE.MeshStandardMaterial({ color: COLORS.GREEN, roughness: 0.4 }),
    yellow: new THREE.MeshStandardMaterial({ color: COLORS.YELLOW, roughness: 0.4 }),
    blue: new THREE.MeshStandardMaterial({ color: COLORS.BLUE, roughness: 0.4 }),
};

function getWorldPos(col, row) {
    return {
        x: (col - 7) * CELL,
        z: (row - 7) * CELL
    };
}

// Create the base board
function createBoard() {
    // Main board base
    const baseGeo = new THREE.BoxGeometry(BOARD_SIZE * CELL + 2, 0.5, BOARD_SIZE * CELL + 2);
    const base = new THREE.Mesh(baseGeo, materials.cream);
    base.position.y = -0.25;
    base.receiveShadow = true;
    boardGroup.add(base);

    // Border frame
    const borderGeo = new THREE.BoxGeometry(BOARD_SIZE * CELL + 3, 0.6, BOARD_SIZE * CELL + 3);
    const border = new THREE.Mesh(borderGeo, materials.brown);
    border.position.y = -0.35;
    boardGroup.add(border);

    // Create home bases (4 corners)
    createHomeBase(0, 0, COLORS.RED, 'RED');      // Top-left
    createHomeBase(9, 0, COLORS.GREEN, 'GREEN');  // Top-right
    createHomeBase(9, 9, COLORS.YELLOW, 'YELLOW'); // Bottom-right
    createHomeBase(0, 9, COLORS.BLUE, 'BLUE');    // Bottom-left

    // Create path cells
    createPathCells();

    // Create center home triangles
    createCenterHome();
}

function createHomeBase(startCol, startRow, color, name) {
    const baseSize = 6 * CELL;
    const centerX = (startCol + 3 - 7.5) * CELL;
    const centerZ = (startRow + 3 - 7.5) * CELL;

    // Colored base plate
    const plate = new THREE.Mesh(
        new THREE.BoxGeometry(baseSize - 0.2, 0.15, baseSize - 0.2),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 })
    );
    plate.position.set(centerX, 0.08, centerZ);
    plate.receiveShadow = true;
    boardGroup.add(plate);

    // Inner cream circle/square for pieces
    const innerSize = 4 * CELL;
    const inner = new THREE.Mesh(
        new THREE.BoxGeometry(innerSize, 0.1, innerSize),
        materials.cream
    );
    inner.position.set(centerX, 0.16, centerZ);
    boardGroup.add(inner);

    // 4 piece spawn positions
    const offset = CELL * 1.2;
    const positions = [
        { x: centerX - offset, z: centerZ - offset },
        { x: centerX + offset, z: centerZ - offset },
        { x: centerX - offset, z: centerZ + offset },
        { x: centerX + offset, z: centerZ + offset }
    ];

    // Create circular markers for each spawn
    positions.forEach(pos => {
        const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32),
            new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 })
        );
        marker.position.set(pos.x, 0.2, pos.z);
        boardGroup.add(marker);
    });

    return positions;
}

// Path coordinates - the main track
const PATH_COORDS = [
    // Red start column going right
    { c: 1, r: 6 }, { c: 2, r: 6 }, { c: 3, r: 6 }, { c: 4, r: 6 }, { c: 5, r: 6 },
    // Going up
    { c: 6, r: 5 }, { c: 6, r: 4 }, { c: 6, r: 3 }, { c: 6, r: 2 }, { c: 6, r: 1 }, { c: 6, r: 0 },
    // Top turn
    { c: 7, r: 0 }, { c: 8, r: 0 },
    // Going down
    { c: 8, r: 1 }, { c: 8, r: 2 }, { c: 8, r: 3 }, { c: 8, r: 4 }, { c: 8, r: 5 },
    // Green start row going right
    { c: 9, r: 6 }, { c: 10, r: 6 }, { c: 11, r: 6 }, { c: 12, r: 6 }, { c: 13, r: 6 }, { c: 14, r: 6 },
    // Right turn
    { c: 14, r: 7 }, { c: 14, r: 8 },
    // Going left
    { c: 13, r: 8 }, { c: 12, r: 8 }, { c: 11, r: 8 }, { c: 10, r: 8 }, { c: 9, r: 8 },
    // Going down
    { c: 8, r: 9 }, { c: 8, r: 10 }, { c: 8, r: 11 }, { c: 8, r: 12 }, { c: 8, r: 13 }, { c: 8, r: 14 },
    // Bottom turn
    { c: 7, r: 14 }, { c: 6, r: 14 },
    // Going up
    { c: 6, r: 13 }, { c: 6, r: 12 }, { c: 6, r: 11 }, { c: 6, r: 10 }, { c: 6, r: 9 },
    // Blue start row going left
    { c: 5, r: 8 }, { c: 4, r: 8 }, { c: 3, r: 8 }, { c: 2, r: 8 }, { c: 1, r: 8 }, { c: 0, r: 8 },
    // Left turn
    { c: 0, r: 7 }
];

// Safe squares (star positions) - indices in PATH_COORDS
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47]; // Start + 8 positions

// Home columns (victory path)
const HOME_COLUMNS = {
    RED: [{ c: 1, r: 7 }, { c: 2, r: 7 }, { c: 3, r: 7 }, { c: 4, r: 7 }, { c: 5, r: 7 }, { c: 6, r: 7 }],
    GREEN: [{ c: 7, r: 1 }, { c: 7, r: 2 }, { c: 7, r: 3 }, { c: 7, r: 4 }, { c: 7, r: 5 }, { c: 7, r: 6 }],
    YELLOW: [{ c: 13, r: 7 }, { c: 12, r: 7 }, { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }, { c: 8, r: 7 }],
    BLUE: [{ c: 7, r: 13 }, { c: 7, r: 12 }, { c: 7, r: 11 }, { c: 7, r: 10 }, { c: 7, r: 9 }, { c: 7, r: 8 }]
};

// Start positions on main path
const START_POSITIONS = {
    RED: 0,
    GREEN: 13,
    YELLOW: 26,
    BLUE: 39
};

function createPathCells() {
    PATH_COORDS.forEach((coord, index) => {
        const pos = getWorldPos(coord.c, coord.r);

        // Determine cell color
        let cellMat = materials.white;
        let isSafe = SAFE_SQUARES.includes(index);

        // Check if it's a starting square (colored)
        if (index === START_POSITIONS.RED) cellMat = materials.red;
        else if (index === START_POSITIONS.GREEN) cellMat = materials.green;
        else if (index === START_POSITIONS.YELLOW) cellMat = materials.yellow;
        else if (index === START_POSITIONS.BLUE) cellMat = materials.blue;

        const cell = new THREE.Mesh(
            new THREE.BoxGeometry(CELL * 0.9, 0.1, CELL * 0.9),
            cellMat
        );
        cell.position.set(pos.x, 0.05, pos.z);
        cell.receiveShadow = true;
        cell.userData = { pathIndex: index, isSafe: isSafe };
        boardGroup.add(cell);

        // Add star symbol on safe squares
        if (isSafe) {
            addStarSymbol(pos.x, pos.z);
        }
    });

    // Create home columns
    Object.entries(HOME_COLUMNS).forEach(([color, coords]) => {
        const mat = materials[color.toLowerCase()];
        coords.forEach((coord, i) => {
            const pos = getWorldPos(coord.c, coord.r);
            const cell = new THREE.Mesh(
                new THREE.BoxGeometry(CELL * 0.9, 0.1, CELL * 0.9),
                mat
            );
            cell.position.set(pos.x, 0.05, pos.z);
            cell.receiveShadow = true;
            cell.userData = { homeColumn: color, homeIndex: i };
            boardGroup.add(cell);
        });
    });
}

function addStarSymbol(x, z) {
    // Simple star using cone pointing up
    const star = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.15, 5),
        new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.5 })
    );
    star.position.set(x, 0.15, z);
    star.rotation.y = Math.PI / 10;
    boardGroup.add(star);
}

function createCenterHome() {
    // 4 triangles pointing to center - each points toward its home column
    // RED: home column on LEFT (row 7, cols 1-6) → triangle points LEFT (π)
    // GREEN: home column on TOP (col 7, rows 1-6) → triangle points UP (π/2)
    // YELLOW: home column on RIGHT (row 7, cols 8-13) → triangle points RIGHT (0)
    // BLUE: home column on BOTTOM (col 7, rows 8-13) → triangle points DOWN (3π/2)
    const triangleColors = [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];
    const rotations = [Math.PI, Math.PI / 2, 0, Math.PI * 1.5];

    triangleColors.forEach((color, i) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(CELL * 2.5, CELL * 1.2);
        shape.lineTo(CELL * 2.5, -CELL * 1.2);
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            side: THREE.DoubleSide
        });
        const triangle = new THREE.Mesh(geometry, mat);
        triangle.rotation.x = -Math.PI / 2;
        triangle.rotation.z = rotations[i];
        triangle.position.y = 0.08;
        boardGroup.add(triangle);
    });

    // Center diamond
    const diamond = new THREE.Mesh(
        new THREE.BoxGeometry(CELL, 0.2, CELL),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.3 })
    );
    diamond.rotation.y = Math.PI / 4;
    diamond.position.y = 0.1;
    boardGroup.add(diamond);
}

// ============== PIECE MANAGEMENT ==============
class Piece {
    constructor(color, colorName, id, homePos) {
        this.color = color;
        this.colorName = colorName;
        this.id = id;
        this.homePos = { ...homePos, y: 0.5 };
        this.pathIndex = -1; // -1 = at home base
        this.homeColumnIndex = -1; // -1 = not in home column, 0-5 = position in home column
        this.finished = false;

        this.mesh = this.createMesh();
        this.mesh.position.set(homePos.x, 0.5, homePos.z);
        this.mesh.userData = { isPiece: true, owner: this };
        piecesGroup.add(this.mesh);
    }

    createMesh() {
        // Traditional pawn shape: cone base + sphere top
        const group = new THREE.Group();

        // Base cone
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.35, 0.8, 16),
            new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3 })
        );
        cone.position.y = 0.4;
        cone.castShadow = true;
        group.add(cone);

        // Top sphere
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 16),
            new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3 })
        );
        sphere.position.y = 0.9;
        sphere.castShadow = true;
        group.add(sphere);

        return group;
    }

    moveTo(targetPos, onComplete) {
        audio.playMove();

        gsap.to(this.mesh.position, {
            x: targetPos.x,
            z: targetPos.z,
            duration: 0.4,
            ease: "power2.out",
            onComplete: onComplete
        });

        // Jump animation
        gsap.to(this.mesh.position, {
            y: 1.5,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.out"
        });
    }

    returnHome() {
        audio.playCapture();
        this.pathIndex = -1;
        this.homeColumnIndex = -1;
        this.finished = false; // Reset finished flag
        this.mesh.visible = true; // Ensure mesh is visible

        gsap.to(this.mesh.position, {
            x: this.homePos.x,
            y: 0.5,
            z: this.homePos.z,
            duration: 0.5,
            ease: "power2.inOut"
        });
    }

    highlight(active) {
        if (active) {
            gsap.to(this.mesh.position, {
                y: 0.8,
                duration: 0.3,
                yoyo: true,
                repeat: -1,
                ease: "power1.inOut"
            });
        } else {
            gsap.killTweensOf(this.mesh.position);
            this.mesh.position.y = 0.5;
        }
    }
}

// ============== GAME STATE ==============
let selectedMode = null; // 'single', '2p', '4p'

const STATE = {
    gameMode: null, // 'single', '2p', '4p'
    difficulty: 'normal', // 'easy', 'normal', 'hard', 'advance'
    diceMode: 'double', // 'single' or 'double'
    playerNames: [], // e.g., ['Alice', 'Bob'] or ['Alice', 'AI']
    controlMapping: {}, // { playerIndex: [colorIndex1, colorIndex2] }
    aiPlayers: [], // Array of player indices that are AI
    players: [], // Array of player data (one per color)
    currentPlayerIndex: 0, // Index in playerNames (whose turn)
    diceValues: [null, null], // Two dice values
    diceUsed: [false, false], // Track which dice have been used
    selectedDice: null, // Currently selected die (0 or 1)
    phase: 'ROLL', // ROLL, SELECT_DICE, MOVE, WAITING, AI_TURN
    consecutiveDoubleSixes: 0,
    gameStarted: false,
    capturedThisTurn: false, // Track if capture happened for bonus roll
    aiIsPlaying: false // Track if AI is currently in a turn sequence
};

// Initialize players and pieces
function initPlayers() {
    // Calculate home positions to match circular markers
    // Based on createHomeBase: centerX/Z = (startCol + 3 - 7.5) * CELL
    // With offset = CELL * 1.2 for marker positions
    const markerOffset = CELL * 1.2;

    // RED: startCol=0, startRow=0 -> center = (-4.5 * 1.2, -4.5 * 1.2) = (-5.4, -5.4)
    const redCenter = { x: (0 + 3 - 7.5) * CELL, z: (0 + 3 - 7.5) * CELL };
    // GREEN: startCol=9, startRow=0 -> center = (4.5 * 1.2, -4.5 * 1.2) = (5.4, -5.4)
    const greenCenter = { x: (9 + 3 - 7.5) * CELL, z: (0 + 3 - 7.5) * CELL };
    // YELLOW: startCol=9, startRow=9 -> center = (5.4, 5.4)
    const yellowCenter = { x: (9 + 3 - 7.5) * CELL, z: (9 + 3 - 7.5) * CELL };
    // BLUE: startCol=0, startRow=9 -> center = (-5.4, 5.4)
    const blueCenter = { x: (0 + 3 - 7.5) * CELL, z: (9 + 3 - 7.5) * CELL };

    const homePositions = [
        // RED home positions (top-left) - aligned to markers
        [
            { x: redCenter.x - markerOffset, z: redCenter.z - markerOffset },
            { x: redCenter.x + markerOffset, z: redCenter.z - markerOffset },
            { x: redCenter.x - markerOffset, z: redCenter.z + markerOffset },
            { x: redCenter.x + markerOffset, z: redCenter.z + markerOffset }
        ],
        // GREEN home positions (top-right)
        [
            { x: greenCenter.x - markerOffset, z: greenCenter.z - markerOffset },
            { x: greenCenter.x + markerOffset, z: greenCenter.z - markerOffset },
            { x: greenCenter.x - markerOffset, z: greenCenter.z + markerOffset },
            { x: greenCenter.x + markerOffset, z: greenCenter.z + markerOffset }
        ],
        // YELLOW home positions (bottom-right)
        [
            { x: yellowCenter.x - markerOffset, z: yellowCenter.z - markerOffset },
            { x: yellowCenter.x + markerOffset, z: yellowCenter.z - markerOffset },
            { x: yellowCenter.x - markerOffset, z: yellowCenter.z + markerOffset },
            { x: yellowCenter.x + markerOffset, z: yellowCenter.z + markerOffset }
        ],
        // BLUE home positions (bottom-left)
        [
            { x: blueCenter.x - markerOffset, z: blueCenter.z - markerOffset },
            { x: blueCenter.x + markerOffset, z: blueCenter.z - markerOffset },
            { x: blueCenter.x - markerOffset, z: blueCenter.z + markerOffset },
            { x: blueCenter.x + markerOffset, z: blueCenter.z + markerOffset }
        ]
    ];

    PLAYER_NAMES.forEach((name, playerIdx) => {
        const player = {
            name: name,
            color: PLAYER_COLORS[playerIdx],
            pieces: [],
            finishedCount: 0
        };

        for (let i = 0; i < 4; i++) {
            const piece = new Piece(
                PLAYER_COLORS[playerIdx],
                name,
                i,
                homePositions[playerIdx][i]
            );
            player.pieces.push(piece);
        }

        STATE.players.push(player);
    });
}

// ============== MODE SELECTION & SETUP ==============
window.selectMode = function (mode) {
    selectedMode = mode;
    showNameScreen(mode);
};

function showNameScreen(mode) {
    const container = document.getElementById('name-inputs-container');
    container.innerHTML = '';

    let numInputs = 0;
    let labels = [];

    if (mode === 'single') {
        numInputs = 1;
        labels = ['Emri juaj'];
    } else if (mode === '2p') {
        numInputs = 2;
        labels = ['Lojtari 1', 'Lojtari 2'];
    } else if (mode === '4p') {
        numInputs = 4;
        labels = ['Lojtari 1', 'Lojtari 2', 'Lojtari 3', 'Lojtari 4'];
    }

    for (let i = 0; i < numInputs; i++) {
        const group = document.createElement('div');
        group.className = 'name-input-group';

        const label = document.createElement('label');
        label.className = 'name-input-label';
        label.textContent = labels[i];

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'name-input';
        input.id = `name-input-${i}`;
        input.placeholder = labels[i];
        input.maxLength = 15;

        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    }

    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('name-screen').style.display = 'flex';
}

window.backToMenu = function () {
    document.getElementById('name-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    selectedMode = null;
};

window.startGameWithNames = function () {
    const names = [];
    const inputs = document.querySelectorAll('.name-input');

    inputs.forEach((input, i) => {
        let name = input.value.trim();
        if (!name) name = input.placeholder; // Use default
        names.push(name);
    });

    STATE.playerNames = names;
    STATE.gameMode = selectedMode;

    // Setup control mapping and AI
    if (selectedMode === 'single') {
        // User controls Red+Yellow (0,2), AI controls Green+Blue (1,3)
        STATE.controlMapping = {
            0: [0, 2], // Player 0 controls RED and YELLOW
            1: [1, 3]  // AI controls GREEN and BLUE
        };
        STATE.playerNames[1] = 'AI';
        STATE.aiPlayers = [1];
    } else if (selectedMode === '2p') {
        // Player 1 controls Red+Yellow, Player 2 controls Green+Blue
        STATE.controlMapping = {
            0: [0, 2],
            1: [1, 3]
        };
        STATE.aiPlayers = [];
    } else if (selectedMode === '4p') {
        // Each player controls one color
        STATE.controlMapping = {
            0: [0], // RED
            1: [1], // GREEN
            2: [2], // YELLOW
            3: [3]  // BLUE
        };
        STATE.aiPlayers = [];
    }

    startGame();
};

// ============== GAME START ==============
window.startGame = function () {
    document.getElementById('name-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-ui').classList.add('show');

    if (!STATE.gameStarted) {
        initPlayers();
        createBoard();
        STATE.gameStarted = true;
    }

    // Show/hide second dice based on mode
    const dice2 = document.getElementById('dice-2');
    if (STATE.diceMode === 'single') {
        dice2.style.display = 'none';
    } else {
        dice2.style.display = 'flex';
    }

    // Clear any existing dice highlight
    document.getElementById('dice-1').classList.remove('selectable', 'used');
    document.getElementById('dice-2').classList.remove('selectable', 'used');

    updateUI();

    // Check if first turn is AI
    if (STATE.aiPlayers.includes(STATE.currentPlayerIndex)) {
        setTimeout(() => aiTakeTurn(), 1000);
    }
};

// ============== SAVE/LOAD ==============
function checkForSavedGame() {
    const saved = localStorage.getItem('ludo_save');
    if (saved) {
        document.getElementById('resume-btn').style.display = 'block';
    }
}

window.resumeGame = function () {
    const saved = localStorage.getItem('ludo_save');
    if (saved) {
        const data = JSON.parse(saved);
        restoreGameState(data);

        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('game-ui').classList.add('show');

        // Set proper phase and trigger AI if needed
        STATE.phase = 'ROLL';
        STATE.aiIsPlaying = false; // Reset AI playing flag on resume
        updateUI();

        // Clear any existing dice highlight
        document.getElementById('dice-1').classList.remove('selectable', 'used');
        document.getElementById('dice-2').classList.remove('selectable', 'used');

        // If it's AI's turn, let AI play
        if (STATE.aiPlayers.includes(STATE.currentPlayerIndex)) {
            setTimeout(() => {
                STATE.aiIsPlaying = true;
                aiTakeTurn();
            }, 1000);
        }
    }
};

window.saveAndQuit = function () {
    saveGame();
    location.reload();
};

function saveGame() {
    const saveData = {
        version: '2.1', // Updated to include diceMode
        timestamp: Date.now(),
        gameMode: STATE.gameMode,
        difficulty: STATE.difficulty,
        diceMode: STATE.diceMode, // Save dice mode
        playerNames: STATE.playerNames,
        controlMapping: STATE.controlMapping,
        aiPlayers: STATE.aiPlayers,
        currentPlayerIndex: STATE.currentPlayerIndex,
        diceValues: STATE.diceValues,
        diceUsed: STATE.diceUsed,
        consecutiveDoubleSixes: STATE.consecutiveDoubleSixes,
        capturedThisTurn: STATE.capturedThisTurn, // Save capture flag
        pieces: [],
        finishedCounts: STATE.players.map(p => p.finishedCount)
    };

    // Save all pieces
    STATE.players.forEach((player, colorIdx) => {
        player.pieces.forEach((piece, pieceId) => {
            saveData.pieces.push({
                colorIndex: colorIdx,
                pieceId: pieceId,
                pathIndex: piece.pathIndex,
                homeColumnIndex: piece.homeColumnIndex,
                finished: piece.finished
            });
        });
    });

    localStorage.setItem('ludo_save', JSON.stringify(saveData));
}

function restoreGameState(data) {
    STATE.gameMode = data.gameMode;
    STATE.difficulty = data.difficulty || 'normal';
    STATE.diceMode = data.diceMode || 'double'; // Restore dice mode
    STATE.playerNames = data.playerNames;
    STATE.controlMapping = data.controlMapping;
    STATE.aiPlayers = data.aiPlayers;
    STATE.currentPlayerIndex = data.currentPlayerIndex;
    STATE.aiIsPlaying = false; // Ensure AI playing flag is reset

    // Handle both old and new save formats
    if (data.version === '2.0' || data.version === '2.1') {
        STATE.diceValues = [null, null]; // Always reset dice on resume
        STATE.diceUsed = [false, false];
        STATE.consecutiveDoubleSixes = data.consecutiveDoubleSixes || 0;
        STATE.capturedThisTurn = false; // Reset capture flag on resume
    } else {
        // Legacy format - convert
        STATE.diceValues = [null, null];
        STATE.diceUsed = [false, false];
        STATE.consecutiveDoubleSixes = 0;
        STATE.capturedThisTurn = false;
    }

    // Show/hide second dice based on restored mode
    const dice2 = document.getElementById('dice-2');
    if (STATE.diceMode === 'single') {
        dice2.style.display = 'none';
    } else {
        dice2.style.display = 'flex';
    }

    selectedMode = data.gameMode;

    if (!STATE.gameStarted) {
        initPlayers();
        createBoard();
        STATE.gameStarted = true;
    }

    // Restore piece positions
    data.pieces.forEach(pieceData => {
        const piece = STATE.players[pieceData.colorIndex].pieces[pieceData.pieceId];
        piece.pathIndex = pieceData.pathIndex;
        piece.homeColumnIndex = pieceData.homeColumnIndex;
        piece.finished = pieceData.finished;

        // Move pieces to correct positions
        if (piece.finished) {
            piece.mesh.visible = false; // Hide finished pieces
        } else if (piece.homeColumnIndex >= 0) {
            const homeCoords = HOME_COLUMNS[PLAYER_NAMES[pieceData.colorIndex]];
            const coord = homeCoords[piece.homeColumnIndex];
            const pos = getWorldPos(coord.c, coord.r);
            piece.mesh.position.set(pos.x, 0.5, pos.z);
        } else if (piece.pathIndex >= 0) {
            const coord = PATH_COORDS[piece.pathIndex];
            const pos = getWorldPos(coord.c, coord.r);
            piece.mesh.position.set(pos.x, 0.5, pos.z);
        }
    });

    STATE.players.forEach((player, idx) => {
        player.finishedCount = data.finishedCounts[idx];
    });

    updateUI();
}

// ============== ZOOM CONTROLS ==============
window.zoomIn = function () {
    const zoomFactor = 0.85;
    camera.position.x *= zoomFactor;
    camera.position.y *= zoomFactor;
    camera.position.z *= zoomFactor;
    camera.updateProjectionMatrix();
};

window.zoomOut = function () {
    const zoomFactor = 1.15;
    camera.position.x *= zoomFactor;
    camera.position.y *= zoomFactor;
    camera.position.z *= zoomFactor;
    camera.updateProjectionMatrix();
};

// ============== AI OPPONENT ==============
async function aiTakeTurn() {
    STATE.aiIsPlaying = true; // Mark AI as actively playing
    STATE.phase = 'AI_TURN';
    document.getElementById('turn-status').textContent = '🤖 AI po mendon...';
    document.getElementById('roll-btn').disabled = true;

    // Thinking delay (feels natural)
    await delay(800 + Math.random() * 400);

    // Reset dice state
    STATE.diceUsed = [false, false];
    STATE.selectedDice = null;
    STATE.capturedThisTurn = false; // Reset capture flag for new turn

    // Auto-roll dice
    audio.playRoll();
    await animateDiceRoll();

    const isSingleMode = STATE.diceMode === 'single';
    const value1 = Math.floor(Math.random() * 6) + 1;
    const value2 = isSingleMode ? null : Math.floor(Math.random() * 6) + 1;
    STATE.diceValues = [value1, value2];

    document.getElementById('dice-1').textContent = value1;

    if (isSingleMode) {
        document.getElementById('dice-2').textContent = '-';
        document.getElementById('dice-2').classList.add('used');
        STATE.diceUsed[1] = true;
        logMessage(`AI hodhi ${value1}`);

        // Single 6 gives bonus
        if (value1 === 6) {
            logMessage("AI mori 6! Rradhë shtesë.");
        }
    } else {
        document.getElementById('dice-2').textContent = value2;
        logMessage(`AI hodhi ${value1} dhe ${value2}`);

        // Check for double 6s
        if (value1 === 6 && value2 === 6) {
            STATE.consecutiveDoubleSixes++;
            if (STATE.consecutiveDoubleSixes >= 3) {
                logMessage("Tre herë 6-6! Rradha e AI humbet.");
                STATE.consecutiveDoubleSixes = 0;
                await delay(1000);
                endTurn();
                return;
            }
            logMessage("AI mori 6-6! Rradhë shtesë.");
        } else {
            STATE.consecutiveDoubleSixes = 0;
        }
    }

    await delay(500);

    // AI uses dice one at a time
    await aiUseDice();
}

async function aiUseDice() {
    // Try to use each die
    for (let diceIdx = 0; diceIdx < 2; diceIdx++) {
        if (STATE.diceUsed[diceIdx]) continue;

        const diceVal = STATE.diceValues[diceIdx];
        const validPieces = getValidMovesForDice(diceVal);

        if (validPieces.length > 0) {
            STATE.selectedDice = diceIdx;
            const bestPiece = aiSelectMove(validPieces, diceVal);

            if (bestPiece) {
                STATE.phase = 'MOVE';
                await delay(300);

                // Mark die as used before moving
                STATE.diceUsed[diceIdx] = true;
                document.getElementById(`dice-${diceIdx + 1}`).classList.add('used');

                // Move the piece - afterMove will be called in the callback
                tryMovePiece(bestPiece);

                // Wait for move animation
                await delay(800);
            }
        } else {
            // No valid moves for this die
            STATE.diceUsed[diceIdx] = true;
            document.getElementById(`dice-${diceIdx + 1}`).classList.add('used');
        }
    }

    // After using both dice, check for bonus or end turn
    const validRemaining = getValidMovesForAnyDice();
    if (validRemaining.length === 0) {
        await delay(500);
        endTurn();
    }
}

function aiSelectMove(validPieces, diceVal) {
    let bestPiece = null;
    let bestScore = -1;

    validPieces.forEach(piece => {
        let score = 0;
        const colorIdx = PLAYER_NAMES.indexOf(piece.colorName);

        // Priority 1: Capture opponent (VERY HIGH)
        if (canCapture(piece, diceVal, colorIdx)) {
            score += 100;
        }

        // Priority 2: Enter home column (HIGH)
        if (willEnterHome(piece, diceVal, colorIdx)) {
            score += 80;
        }

        // Priority 3: Leave home base on 6 (MEDIUM-HIGH)
        if (piece.pathIndex === -1 && diceVal === 6) {
            score += 60;
        }

        // Priority 4: Advance piece closest to goal (MEDIUM)
        const progress = getPieceProgress(piece, colorIdx);
        score += progress / 2; // Normalize

        // Priority 5: Move to safe square (LOW)
        if (willLandOnSafe(piece, diceVal, colorIdx)) {
            score += 10;
        }

        // Tie-breaker: Random factor
        score += Math.random() * 5;

        if (score > bestScore) {
            bestScore = score;
            bestPiece = piece;
        }
    });

    return bestPiece;
}

function canCapture(piece, diceVal, colorIdx) {
    const playerName = PLAYER_NAMES[colorIdx];
    const playerStart = START_POSITIONS[playerName];
    const myPlayerIdx = getPlayerForColor(colorIdx);

    if (piece.pathIndex === -1) {
        // Entering board - check start square
        return getAllPiecesAt(playerStart).some(p => {
            const targetColorIdx = PLAYER_NAMES.indexOf(p.colorName);
            return getPlayerForColor(targetColorIdx) !== myPlayerIdx;
        });
    } else if (piece.pathIndex >= 0) {
        const relativePos = (piece.pathIndex - playerStart + 52) % 52;
        const newRelativePos = relativePos + diceVal;

        if (newRelativePos < 51) {
            const newIndex = (piece.pathIndex + diceVal) % 52;
            if (SAFE_SQUARES.includes(newIndex)) return false;

            const piecesAtTarget = getAllPiecesAt(newIndex);
            return piecesAtTarget.some(p => {
                const targetColorIdx = PLAYER_NAMES.indexOf(p.colorName);
                return getPlayerForColor(targetColorIdx) !== myPlayerIdx;
            });
        }
    }
    return false;
}

function willEnterHome(piece, diceVal, colorIdx) {
    if (piece.pathIndex < 0) return false;

    const playerName = PLAYER_NAMES[colorIdx];
    const playerStart = START_POSITIONS[playerName];
    const relativePos = (piece.pathIndex - playerStart + 52) % 52;
    const newRelativePos = relativePos + diceVal;

    return newRelativePos >= 51 && newRelativePos <= 57;
}

function getPieceProgress(piece, colorIdx) {
    if (piece.finished) return 57;
    if (piece.homeColumnIndex >= 0) return 51 + piece.homeColumnIndex;
    if (piece.pathIndex >= 0) {
        const playerName = PLAYER_NAMES[colorIdx];
        const playerStart = START_POSITIONS[playerName];
        return (piece.pathIndex - playerStart + 52) % 52;
    }
    return 0; // At home
}

function willLandOnSafe(piece, diceVal, colorIdx) {
    if (piece.pathIndex < 0) {
        const playerName = PLAYER_NAMES[colorIdx];
        return SAFE_SQUARES.includes(START_POSITIONS[playerName]);
    } else if (piece.pathIndex >= 0) {
        const newIndex = (piece.pathIndex + diceVal) % 52;
        return SAFE_SQUARES.includes(newIndex);
    }
    return false;
}

function getAllPiecesAt(pathIndex) {
    let found = [];
    STATE.players.forEach(player => {
        player.pieces.forEach(piece => {
            if (piece.pathIndex === pathIndex && !piece.finished) {
                found.push(piece);
            }
        });
    });
    return found;
}

async function animateDiceRoll() {
    return new Promise(resolve => {
        let rolls = 0;
        const dice1 = document.getElementById('dice-1');
        const dice2 = document.getElementById('dice-2');
        dice1.classList.add('rolling');
        dice2.classList.add('rolling');

        const interval = setInterval(() => {
            dice1.textContent = Math.floor(Math.random() * 6) + 1;
            dice2.textContent = Math.floor(Math.random() * 6) + 1;
            rolls++;
            if (rolls > 8) {
                clearInterval(interval);
                dice1.classList.remove('rolling');
                dice2.classList.remove('rolling');
                resolve();
            }
        }, 60);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.showHelp = function () {
    document.getElementById('help-modal').classList.add('show');
};

window.hideHelp = function () {
    document.getElementById('help-modal').classList.remove('show');
};

window.rollDice = function () {
    if (STATE.phase !== 'ROLL') return;

    audio.playRoll();
    STATE.phase = 'WAITING';
    document.getElementById('roll-btn').disabled = true;

    // Reset dice state
    STATE.diceUsed = [false, false];
    STATE.selectedDice = null;
    STATE.capturedThisTurn = false; // Reset capture flag for new turn

    // Animate both dice with shake effect
    let rolls = 0;
    const dice1 = document.getElementById('dice-1');
    const dice2 = document.getElementById('dice-2');
    dice1.classList.add('rolling');
    dice2.classList.add('rolling');
    dice1.classList.remove('used', 'selectable');
    dice2.classList.remove('used', 'selectable');

    const interval = setInterval(() => {
        dice1.textContent = Math.floor(Math.random() * 6) + 1;
        dice2.textContent = Math.floor(Math.random() * 6) + 1;
        rolls++;
        if (rolls > 12) {
            clearInterval(interval);
            dice1.classList.remove('rolling');
            dice2.classList.remove('rolling');
            finalizeDice();
        }
    }, 60);
};

function finalizeDice() {
    const value1 = Math.floor(Math.random() * 6) + 1;
    const isSingleMode = STATE.diceMode === 'single';
    const value2 = isSingleMode ? null : Math.floor(Math.random() * 6) + 1;
    STATE.diceValues = [value1, value2];

    document.getElementById('dice-1').textContent = value1;

    if (isSingleMode) {
        document.getElementById('dice-2').textContent = '-';
        document.getElementById('dice-2').classList.add('used');
        STATE.diceUsed[1] = true; // Mark second dice as already used
        logMessage(`Hodhe ${value1}`);
    } else {
        document.getElementById('dice-2').textContent = value2;
        logMessage(`Hodhe ${value1} dhe ${value2}`);
    }

    // Trigger 3D dice animation
    animate3DDiceRoll(value1, value2);

    // Check for double 6s (only in double mode)
    if (!isSingleMode && value1 === 6 && value2 === 6) {
        STATE.consecutiveDoubleSixes++;
        if (STATE.consecutiveDoubleSixes >= 3) {
            logMessage("Tre herë 6-6! Rradha humbet.");
            STATE.consecutiveDoubleSixes = 0;
            nextTurn();
            return;
        }
        logMessage("6-6! Rradhë shtesë pas kësaj.");
    } else if (isSingleMode && value1 === 6) {
        // Single dice: rolling 6 gives bonus
        logMessage("Hodhe 6! Rradhë shtesë.");
    } else {
        STATE.consecutiveDoubleSixes = 0;
    }

    // Check for valid moves with either dice
    const validPieces = getValidMovesForAnyDice();

    if (validPieces.length === 0) {
        logMessage("Nuk ka lëvizje të vlefshme.");
        setTimeout(nextTurn, 1000);
    } else {
        STATE.phase = 'SELECT_DICE';
        highlightSelectableDice();
        document.getElementById('turn-status').textContent = 'Kliko një zar, pastaj një figurë';
    }
}

function highlightSelectableDice() {
    const dice1 = document.getElementById('dice-1');
    const dice2 = document.getElementById('dice-2');

    // Check if each die can make valid moves
    const canUseDice1 = !STATE.diceUsed[0] && getValidMovesForDice(STATE.diceValues[0]).length > 0;
    const canUseDice2 = !STATE.diceUsed[1] && getValidMovesForDice(STATE.diceValues[1]).length > 0;

    dice1.classList.toggle('selectable', canUseDice1);
    dice2.classList.toggle('selectable', canUseDice2);
    dice1.classList.toggle('used', STATE.diceUsed[0]);
    dice2.classList.toggle('used', STATE.diceUsed[1]);

    // Auto-select if only one die is usable
    if (canUseDice1 && !canUseDice2) {
        selectDice(0);
    } else if (canUseDice2 && !canUseDice1) {
        selectDice(1);
    }
}

window.selectDice = function (diceIndex) {
    if (STATE.phase !== 'SELECT_DICE' && STATE.phase !== 'MOVE') return;
    if (STATE.diceUsed[diceIndex]) return;

    const diceValue = STATE.diceValues[diceIndex];
    if (getValidMovesForDice(diceValue).length === 0) return;

    STATE.selectedDice = diceIndex;
    STATE.phase = 'MOVE';

    // Update dice visual
    document.getElementById('dice-1').classList.toggle('selectable', diceIndex === 0);
    document.getElementById('dice-2').classList.toggle('selectable', diceIndex === 1);

    // Highlight valid pieces for selected dice
    const validPieces = getValidMovesForDice(diceValue);
    STATE.players.forEach(p => p.pieces.forEach(piece => piece.highlight(false)));
    validPieces.forEach(p => p.highlight(true));

    document.getElementById('turn-status').textContent = `Duke përdorur zarin ${diceIndex + 1} (${diceValue}) - Zgjidh figurën`;
};

function getValidMovesForAnyDice() {
    const moves1 = STATE.diceUsed[0] ? [] : getValidMovesForDice(STATE.diceValues[0]);
    const moves2 = STATE.diceUsed[1] ? [] : getValidMovesForDice(STATE.diceValues[1]);
    return [...new Set([...moves1, ...moves2])];
}

function getValidMovesForDice(diceVal) {
    if (!diceVal) return [];
    const controlledColors = STATE.controlMapping[STATE.currentPlayerIndex];
    if (!controlledColors) return [];
    let validPieces = [];

    // Check pieces from ALL colors this player controls
    controlledColors.forEach(colorIdx => {
        const player = STATE.players[colorIdx];
        const playerName = PLAYER_NAMES[colorIdx];
        const playerStart = START_POSITIONS[playerName];

        player.pieces.forEach(piece => {
            if (piece.finished) return;

            let isValid = false;

            // At home base - needs 6 to come out
            if (piece.pathIndex === -1) {
                isValid = diceVal === 6;
            }
            // In home column - check if can move without overshooting
            else if (piece.homeColumnIndex >= 0) {
                isValid = (piece.homeColumnIndex + diceVal) <= 5;
            }
            // On main path
            else {
                const relativePos = (piece.pathIndex - playerStart + 52) % 52;
                const newRelativePos = relativePos + diceVal;

                if (newRelativePos >= 51) {
                    const homeColumnStep = newRelativePos - 51;
                    isValid = homeColumnStep <= 6;
                } else {
                    isValid = true;
                }
            }

            if (isValid) {
                validPieces.push(piece);
            }
        });
    });

    return validPieces;
}

function afterMove() {
    // During AI turn, just save and return - AI manages its own flow
    if (STATE.aiIsPlaying) {
        if (STATE.gameStarted) saveGame();
        return;
    }

    // Mark the selected die as used
    if (STATE.selectedDice !== null) {
        STATE.diceUsed[STATE.selectedDice] = true;
        document.getElementById(`dice-${STATE.selectedDice + 1}`).classList.add('used');
    }
    STATE.selectedDice = null;

    // Auto-save after move
    if (STATE.gameStarted) {
        saveGame();
    }

    // Check if there are more moves with remaining dice
    const remainingMoves = getValidMovesForAnyDice();

    if (remainingMoves.length > 0) {
        // Still have moves with other die
        STATE.phase = 'SELECT_DICE';
        highlightSelectableDice();
        document.getElementById('turn-status').textContent = 'Përdor zarin tjetër - kliko për të zgjedhur';
    } else {
        // No more moves, check for bonus roll or end turn
        endTurn();
    }
}

function endTurn() {
    // Clear highlights
    STATE.players.forEach(p => p.pieces.forEach(piece => piece.highlight(false)));

    // Check for bonus roll conditions
    const isSingleMode = STATE.diceMode === 'single';
    const singleSixRolled = isSingleMode && STATE.diceValues[0] === 6;
    const doubleRolled = !isSingleMode && STATE.diceValues[0] === 6 && STATE.diceValues[1] === 6;
    const captured = STATE.capturedThisTurn;
    const shouldContinue = (doubleRolled && STATE.consecutiveDoubleSixes < 3) || singleSixRolled || captured;

    // Reset capture flag
    STATE.capturedThisTurn = false;

    if (shouldContinue) {
        // Bonus roll!
        if (captured) {
            logMessage("Rradhë shtesë për kapje!");
        } else {
            logMessage("6-6! Hidh përsëri!");
        }
        // AI continues playing - trigger new turn without changing player
        if (STATE.aiPlayers.includes(STATE.currentPlayerIndex)) {
            // Reset dice state for AI bonus roll
            STATE.diceValues = [null, null];
            STATE.diceUsed = [false, false];
            setTimeout(() => aiTakeTurn(), 1000);
            return; // Exit early - AI handles its own flow
        }
    } else {
        // Move to next player
        STATE.consecutiveDoubleSixes = 0;
        advanceToNextPlayer();
    }

    // Reset dice state
    STATE.diceValues = [null, null];
    STATE.diceUsed = [false, false];
    STATE.phase = 'ROLL';
    document.getElementById('roll-btn').disabled = false;
    document.getElementById('dice-1').textContent = '?';
    document.getElementById('dice-2').textContent = '?';
    document.getElementById('dice-1').classList.remove('used', 'selectable');
    document.getElementById('dice-2').classList.remove('used', 'selectable');
    updateUI();

    // Check if next turn is AI - but only trigger if not already in an AI turn sequence
    if (STATE.aiPlayers.includes(STATE.currentPlayerIndex) && !STATE.aiIsPlaying) {
        STATE.aiIsPlaying = true;
        setTimeout(() => aiTakeTurn(), 1000);
    }
}

// Keep nextTurn as alias for compatibility
function nextTurn() {
    endTurn();
}

function advanceToNextPlayer() {
    const mode = STATE.gameMode;

    if (mode === 'single' || mode === '2p') {
        // Simply switch between player 0 and player 1
        STATE.currentPlayerIndex = STATE.currentPlayerIndex === 0 ? 1 : 0;
    } else if (mode === '4p') {
        // Cycle through all 4 players
        STATE.currentPlayerIndex = (STATE.currentPlayerIndex + 1) % 4;
    }
    // Reset AI playing flag when turn changes
    STATE.aiIsPlaying = false;
}

// Helper: Get which player controls a given color
function getPlayerForColor(colorIdx) {
    for (const [playerIdx, colors] of Object.entries(STATE.controlMapping)) {
        if (colors.includes(colorIdx)) return parseInt(playerIdx);
    }
    return -1;
}

// Click/Touch handling
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleInteraction(clientX, clientY) {
    if (STATE.phase !== 'MOVE') return;

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(piecesGroup.children, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        while (target.parent && !target.userData.owner) {
            target = target.parent;
        }

        if (target.userData && target.userData.owner) {
            const piece = target.userData.owner;
            // Check if piece belongs to any color the current player controls
            const controlledColors = STATE.controlMapping[STATE.currentPlayerIndex];
            const pieceColorIndex = PLAYER_NAMES.indexOf(piece.colorName);

            if (controlledColors.includes(pieceColorIndex)) {
                tryMovePiece(piece);
            }
        }
    }
}

// Mouse click
renderer.domElement.addEventListener('click', (event) => {
    handleInteraction(event.clientX, event.clientY);
});

// Touch support for mobile
renderer.domElement.addEventListener('touchend', (event) => {
    event.preventDefault();
    if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        handleInteraction(touch.clientX, touch.clientY);
    }
}, { passive: false });

// Prevent touch scrolling on canvas
renderer.domElement.addEventListener('touchmove', (event) => {
    event.preventDefault();
}, { passive: false });

function tryMovePiece(piece) {
    // Get the selected dice value
    const diceVal = STATE.selectedDice !== null ? STATE.diceValues[STATE.selectedDice] : null;
    if (!diceVal) return;

    const pieceColorIdx = PLAYER_NAMES.indexOf(piece.colorName);
    const playerName = piece.colorName;
    const playerStart = START_POSITIONS[playerName];

    // Clear highlights for ALL pieces this player controls
    const controlledColors = STATE.controlMapping[STATE.currentPlayerIndex];
    controlledColors.forEach(colorIdx => {
        STATE.players[colorIdx].pieces.forEach(p => p.highlight(false));
    });

    if (piece.pathIndex === -1 && diceVal === 6) {
        // Move out of home base onto starting square
        piece.pathIndex = playerStart;

        const coord = PATH_COORDS[playerStart];
        const pos = getWorldPos(coord.c, coord.r);

        // Check for capture at start
        checkCapture(piece, playerStart);

        piece.moveTo(pos, () => {
            logMessage(`${piece.colorName} doli në fushë!`);
            afterMove();
        });

    } else if (piece.pathIndex >= 0 && piece.homeColumnIndex === -1) {
        // Moving on main path
        // Calculate relative position for this player
        const relativePos = (piece.pathIndex - playerStart + 52) % 52;
        const newRelativePos = relativePos + diceVal;

        if (newRelativePos >= 51) {
            // Should enter home column
            const homeColumnStep = newRelativePos - 51;

            if (homeColumnStep <= 6) {
                // Valid home column move
                piece.homeColumnIndex = homeColumnStep - 1;
                piece.pathIndex = -2; // Mark as in home column

                const homeCoords = HOME_COLUMNS[playerName];
                if (piece.homeColumnIndex < homeCoords.length) {
                    const coord = homeCoords[piece.homeColumnIndex];
                    const pos = getWorldPos(coord.c, coord.r);

                    piece.moveTo(pos, () => {
                        logMessage(`${piece.colorName} hyri në shtëpi!`);

                        // Check if reached center (finished)
                        if (piece.homeColumnIndex >= 5) {
                            piece.finished = true;
                            STATE.players[pieceColorIdx].finishedCount++;
                            logMessage(`${piece.colorName} e futi figurën! (${STATE.players[pieceColorIdx].finishedCount}/4)`);

                            if (checkWin()) return;
                        }

                        afterMove();
                    });
                }
            } else {
                // Overshoot - can't move, let player choose another piece
                logMessage("Duhet numri i saktë për të hyrë në shtëpi!");
                const diceVal = STATE.diceValues[STATE.selectedDice];
                const validPieces = getValidMovesForDice(diceVal);
                if (validPieces.length > 0) {
                    validPieces.forEach(p => p.highlight(true));
                } else {
                    // No other valid pieces - mark die as used and end move
                    afterMove();
                }
            }
        } else {
            // Normal move on main path
            const newIndex = (piece.pathIndex + diceVal) % 52;
            piece.pathIndex = newIndex;

            const coord = PATH_COORDS[newIndex];
            const pos = getWorldPos(coord.c, coord.r);

            // Check for capture
            checkCapture(piece, newIndex);

            piece.moveTo(pos, () => {
                afterMove();
            });
        }

    } else if (piece.homeColumnIndex >= 0) {
        // Moving within home column
        const newHomeIdx = piece.homeColumnIndex + diceVal;

        if (newHomeIdx <= 5) {
            piece.homeColumnIndex = newHomeIdx;

            const homeCoords = HOME_COLUMNS[playerName];
            const coord = homeCoords[piece.homeColumnIndex];
            const pos = getWorldPos(coord.c, coord.r);

            piece.moveTo(pos, () => {
                // Check if reached center
                if (piece.homeColumnIndex >= 5) {
                    piece.finished = true;
                    STATE.players[pieceColorIdx].finishedCount++;
                    logMessage(`${piece.colorName} e futi figurën! (${STATE.players[pieceColorIdx].finishedCount}/4)`);

                    if (checkWin()) return;
                }

                afterMove();
            });
        } else {
            // Overshoot home - can't move, let player choose another piece
            logMessage("Duhet numri i saktë!");
            const diceVal = STATE.diceValues[STATE.selectedDice];
            const validPieces = getValidMovesForDice(diceVal);
            if (validPieces.length > 0) {
                validPieces.forEach(p => p.highlight(true));
            } else {
                // No other valid pieces - mark die as used and end move
                afterMove();
            }
        }
    }
}

function checkCapture(movingPiece, pathIndex) {
    // Check if safe square
    if (SAFE_SQUARES.includes(pathIndex)) return;

    const movingPieceColorIdx = PLAYER_NAMES.indexOf(movingPiece.colorName);
    const movingPlayerIdx = getPlayerForColor(movingPieceColorIdx);
    let captured = false;

    // Check if another piece is there - stop after first capture
    for (let colorIdx = 0; colorIdx < STATE.players.length && !captured; colorIdx++) {
        // Skip same team (colors controlled by same player)
        const targetPlayerIdx = getPlayerForColor(colorIdx);
        if (targetPlayerIdx === movingPlayerIdx) continue;

        const player = STATE.players[colorIdx];
        for (let i = 0; i < player.pieces.length && !captured; i++) {
            const piece = player.pieces[i];
            if (piece.pathIndex === pathIndex && !piece.finished) {
                // Captured piece returns home
                piece.returnHome();

                // Capturing piece is REMOVED from game (counts as finished)
                movingPiece.finished = true;
                movingPiece.mesh.visible = false;
                STATE.players[movingPieceColorIdx].finishedCount++;

                STATE.capturedThisTurn = true;
                captured = true;
                logMessage(`${movingPiece.colorName} kapi ${piece.colorName}! Të dyja hiqen. Rradhë shtesë!`);
            }
        }
    }
}

function checkWin() {
    const controlledColors = STATE.controlMapping[STATE.currentPlayerIndex];

    // Count total finished pieces across all controlled colors
    let totalFinished = 0;
    let totalRequired = 0;

    controlledColors.forEach(colorIdx => {
        totalFinished += STATE.players[colorIdx].finishedCount;
        totalRequired += 4;
    });

    if (totalFinished >= totalRequired) {
        const playerName = STATE.playerNames[STATE.currentPlayerIndex];
        const firstColor = STATE.players[controlledColors[0]];

        document.getElementById('winner-name').textContent = `${playerName} FITOI!`;
        document.getElementById('winner-name').style.color = `#${firstColor.color.toString(16)}`;
        document.getElementById('win-screen').classList.add('show');
        audio.playWin();
        spawnConfetti();

        // Shtesa e monedhave kur fiton lojtari
        addCoins(50);   // <----- KJO ËSHTË RRETHI I SHTUAR PËR MONEDHA

        // Clear saved game on win
        localStorage.removeItem('ludo_save');
        return true;
    }
    return false;
}

window.restartGame = function () {
    location.reload();
};

window.toggleSound = function () {
    const enabled = audio.toggle();
    document.getElementById('sound-toggle').textContent = enabled ? '🔊' : '🔇';
};

window.takeScreenshot = function () {
    // Render one frame and capture
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = `ludo-screenshot-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    logMessage('📷 Screenshot u ruajt!');
};

window.goHome = function () {
    if (confirm('Kthehu te menyja kryesore? Loja do të ruhet.')) {
        saveGame();
        location.href = 'index.html';
    }
};

window.toggleControls = function () {
    const buttons = document.getElementById('controls-buttons');
    const toggle = document.getElementById('controls-toggle');
    buttons.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
};

window.shareGame = function () {
    const shareData = {
        title: 'Ludo Alb King 3D',
        text: 'Luaj Ludo klasik 3D - lojë zbavitëse për të gjithë!',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => { });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            logMessage('📋 Linku u kopjua!');
        }).catch(() => {
            logMessage('Ndarja nuk mbështetet');
        });
    }
};

// Confetti effect for victory
function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#E53935', '#43A047', '#FDD835', '#1E88E5', '#9C27B0', '#FF9800'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(confetti);
    }

    // Clean up after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// AI Difficulty setting
let aiDifficulty = 'normal';

window.setDifficulty = function (level) {
    aiDifficulty = level;
    document.querySelectorAll('#difficulty-selector .difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
};

window.setDiceMode = function (mode) {
    STATE.diceMode = mode;
    document.querySelectorAll('#dice-mode-selector .difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
};

// Hide loading screen after game loads
setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
}, 1500);

// ============== UI UPDATES ==============
function updateUI() {
    const playerName = STATE.playerNames[STATE.currentPlayerIndex] || 'Lojtari';
    const controlledColors = STATE.controlMapping[STATE.currentPlayerIndex] || [0];

    // Get color names and first color for dot
    const colorNames = controlledColors.map(idx => PLAYER_NAMES[idx]);
    const firstColor = STATE.players[controlledColors[0]];

    // Display player name + colors they control
    let displayText = playerName;

    // In 2-player modes, show which colors they control
    if (STATE.gameMode === 'single' || STATE.gameMode === '2p') {
        displayText += ` (${colorNames.join(' + ')})`;
    }

    document.getElementById('player-name').textContent = displayText;
    document.getElementById('player-dot').style.background = firstColor ? `#${firstColor.color.toString(16)}` : '#E53935';

    const statusText = STATE.phase === 'AI_TURN' ? '🤖 AI po mendon...' :
        STATE.phase === 'ROLL' ? 'Hidh zarin...' : 'Zgjidh një figurë...';
    document.getElementById('turn-status').textContent = statusText;

    // Update piece counts
    STATE.players.forEach((p, i) => {
        const finished = p.pieces.filter(piece => piece.finished).length;
        const el = document.getElementById(`${PLAYER_NAMES[i].toLowerCase()}-count`);
        if (el) el.textContent = `${finished}/4`;
    });
}

function logMessage(msg) {
    const log = document.getElementById('message-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    log.insertBefore(entry, log.firstChild);

    // Keep only last 5 messages
    while (log.children.length > 5) {
        log.removeChild(log.lastChild);
    }
}

// ============== ANIMATION LOOP ==============
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ============== RESIZE HANDLER ==============
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Check for saved game on load
checkForSavedGame();

// Start rendering
animate();
