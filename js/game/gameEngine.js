import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS, PLAYER_NAMES, PLAYER_COLORS, CELL, BOARD_SIZE, PATH_COORDS, SAFE_SQUARES, HOME_COLUMNS, START_POSITIONS } from '../config/constants.js';
import { spawnConfetti } from '../animations/particles.js';
import { addXP, addCoins, showNotification } from '../players/playerData.js';

// ============== AUDIO ENGINE ==============
class AudioEngine {
    constructor() { this.ctx = null; this.enabled = true; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
    playTone(freq, type, dur) { if (!this.enabled || !this.ctx) return; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(0.3, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur); osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + dur); }
    playRoll() { this.init(); for (let i=0;i<8;i++) setTimeout(()=>this.playTone(600+Math.random()*200,'square',0.05), i*60); }
    playMove() { this.init(); this.playTone(400,'sine',0.1); setTimeout(()=>this.playTone(600,'sine',0.1),100); }
    playCapture() { this.init(); this.playTone(200,'sawtooth',0.2); this.playTone(100,'square',0.3); }
    playWin() { this.init(); [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.playTone(f,'triangle',0.3),i*150)); }
    toggle() { this.enabled = !this.enabled; return this.enabled; }
}
window.audio = new AudioEngine();

// ============== THREE.JS SETUP ==============
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071a3b);
scene.fog = new THREE.FogExp2(0x071a3b, 0.008);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
const isMobile = window.innerWidth < 768;
camera.position.set(0, isMobile ? 32 : 25, isMobile ? 32 : 25);
camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05; controls.maxPolarAngle = Math.PI/2.3; controls.minDistance=15; controls.maxDistance=50;

// Ndriçimi
const ambientLight = new THREE.AmbientLight(0xffffff,1.0); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff,1.2); dirLight.position.set(15,30,15); dirLight.castShadow=true; scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xffffff,0.5); fillLight.position.set(-15,20,-15); scene.add(fillLight);

// ============== 3D DICE ==============
function createDiceFaceTexture(val){
    const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,128,128);
    ctx.fillStyle='#333333';
    const dots={1:[[64,64]],2:[[32,32],[96,96]],3:[[32,32],[64,64],[96,96]],4:[[32,32],[96,32],[32,96],[96,96]],5:[[32,32],[96,32],[64,64],[32,96],[96,96]],6:[[32,32],[96,32],[32,64],[96,64],[32,96],[96,96]]};
    (dots[val]||[]).forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2); ctx.fill(); });
    return new THREE.CanvasTexture(canvas);
}
const dice3D=[];
function create3DDice(){
    const diceGeo = new THREE.BoxGeometry(1.5,1.5,1.5);
    for(let i=0;i<2;i++){
        const materials = [1,6,2,5,3,4].map(v=>new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(v) }));
        const dice = new THREE.Mesh(diceGeo, materials);
        dice.position.set(i===0?-2:2,8,0); dice.castShadow=true; dice.visible=false;
        scene.add(dice); dice3D.push(dice);
    }
}
create3DDice();
function animate3DDiceRoll(v1,v2){
    const single = STATE.diceMode==='single';
    dice3D.forEach((dice,i)=>{
        if(single && i===1){ dice.visible=false; return; }
        dice.visible=true; dice.position.y=8;
        gsap.to(dice.rotation,{ x:Math.random()*Math.PI*4, y:Math.random()*Math.PI*4, z:Math.random()*Math.PI*4, duration:0.8, ease:'power2.out', onComplete:()=>setDiceFinalRotation(dice,i===0?v1:v2) });
        gsap.to(dice.position,{ y:10, duration:0.2, yoyo:true, repeat:2, ease:'power2.out' });
    });
    setTimeout(()=>dice3D.forEach(d=>d.visible=false),1500);
}
function setDiceFinalRotation(dice,val){
    const rot = {1:{x:Math.PI/2,y:0,z:0},2:{x:0,y:0,z:0},3:{x:0,y:Math.PI/2,z:0},4:{x:0,y:-Math.PI/2,z:0},5:{x:Math.PI,y:0,z:0},6:{x:-Math.PI/2,y:0,z:0}}[val]||{x:0,y:0,z:0};
    gsap.to(dice.rotation, rot, 0.2);
}

// ============== BOARD CONSTRUCTION ==============
const boardGroup = new THREE.Group(); scene.add(boardGroup);
const piecesGroup = new THREE.Group(); scene.add(piecesGroup);
const materials = {
    cream: new THREE.MeshStandardMaterial({ color: COLORS.CREAM, roughness:0.8 }),
    white: new THREE.MeshStandardMaterial({ color: COLORS.WHITE, roughness:0.5 }),
    brown: new THREE.MeshStandardMaterial({ color: COLORS.BOARD_BROWN, roughness:0.7 }),
    red: new THREE.MeshStandardMaterial({ color: COLORS.RED, roughness:0.4 }),
    green: new THREE.MeshStandardMaterial({ color: COLORS.GREEN, roughness:0.4 }),
    yellow: new THREE.MeshStandardMaterial({ color: COLORS.YELLOW, roughness:0.4 }),
    blue: new THREE.MeshStandardMaterial({ color: COLORS.BLUE, roughness:0.4 }),
};
function getWorldPos(col,row){ return { x: (col-7)*CELL, z: (row-7)*CELL }; }

function createBoard(){
    const baseGeo = new THREE.BoxGeometry(BOARD_SIZE*CELL+2,0.5,BOARD_SIZE*CELL+2);
    const base = new THREE.Mesh(baseGeo, materials.cream); base.position.y=-0.25; base.receiveShadow=true; boardGroup.add(base);
    const borderGeo = new THREE.BoxGeometry(BOARD_SIZE*CELL+3,0.6,BOARD_SIZE*CELL+3);
    const border = new THREE.Mesh(borderGeo, materials.brown); border.position.y=-0.35; boardGroup.add(border);
    const corners = [[0,0,COLORS.RED],[9,0,COLORS.GREEN],[9,9,COLORS.YELLOW],[0,9,COLORS.BLUE]];
    corners.forEach(([sc,sr,col])=>{
        const cx = (sc+3-7.5)*CELL; const cz = (sr+3-7.5)*CELL;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(6*CELL-0.2,0.15,6*CELL-0.2), new THREE.MeshStandardMaterial({ color:col, roughness:0.5 }));
        plate.position.set(cx,0.08,cz); boardGroup.add(plate);
    });
    PATH_COORDS.forEach((coord,idx)=>{
        const pos = getWorldPos(coord.c,coord.r);
        let mat = materials.white;
        if(idx===START_POSITIONS.RED) mat=materials.red;
        else if(idx===START_POSITIONS.GREEN) mat=materials.green;
        else if(idx===START_POSITIONS.YELLOW) mat=materials.yellow;
        else if(idx===START_POSITIONS.BLUE) mat=materials.blue;
        const cell = new THREE.Mesh(new THREE.BoxGeometry(CELL*0.9,0.1,CELL*0.9), mat);
        cell.position.set(pos.x,0.05,pos.z); cell.receiveShadow=true; boardGroup.add(cell);
        if(SAFE_SQUARES.includes(idx)){
            const star = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.15,5), new THREE.MeshStandardMaterial({ color:0xFFD700, metalness:0.5 }));
            star.position.set(pos.x,0.15,pos.z); boardGroup.add(star);
        }
    });
    Object.entries(HOME_COLUMNS).forEach(([color,coords])=>{
        const mat = materials[color.toLowerCase()];
        coords.forEach(coord=>{
            const pos = getWorldPos(coord.c,coord.r);
            const cell = new THREE.Mesh(new THREE.BoxGeometry(CELL*0.9,0.1,CELL*0.9), mat);
            cell.position.set(pos.x,0.05,pos.z); boardGroup.add(cell);
        });
    });
}
createBoard();

// ============== PIECES ==============
class Piece {
    constructor(color, colorName, id, homePos){
        this.color=color; this.colorName=colorName; this.id=id; this.homePos={...homePos, y:0.5};
        this.pathIndex=-1; this.homeColumnIndex=-1; this.finished=false;
        this.mesh = this.createMesh();
        this.mesh.position.set(homePos.x,0.5,homePos.z);
        this.mesh.userData = { owner: this };
        piecesGroup.add(this.mesh);
    }
    createMesh(){
        const group = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35,0.8,16), new THREE.MeshStandardMaterial({ color:this.color, roughness:0.3 }));
        cone.position.y=0.4; cone.castShadow=true; group.add(cone);
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.25,16,16), new THREE.MeshStandardMaterial({ color:this.color, roughness:0.3 }));
        sphere.position.y=0.9; sphere.castShadow=true; group.add(sphere);
        return group;
    }
    moveTo(targetPos, onComplete){
        window.audio.playMove();
        gsap.to(this.mesh.position, { x:targetPos.x, z:targetPos.z, duration:0.4, ease:"power2.out", onComplete });
        gsap.to(this.mesh.position, { y:1.5, duration:0.2, yoyo:true, repeat:1, ease:"power2.out" });
    }
    returnHome(){
        window.audio.playCapture();
        this.pathIndex=-1; this.homeColumnIndex=-1; this.finished=false; this.mesh.visible=true;
        gsap.to(this.mesh.position, { x:this.homePos.x, y:0.5, z:this.homePos.z, duration:0.5 });
    }
    highlight(active){
        if(active) gsap.to(this.mesh.position, { y:0.8, duration:0.3, yoyo:true, repeat:-1, ease:"power1.inOut" });
        else { gsap.killTweensOf(this.mesh.position); this.mesh.position.y=0.5; }
    }
}

// ============== GAME STATE ==============
let selectedMode = null;
const STATE = {
    gameMode:null, difficulty:'normal', diceMode:'double', playerNames:[], controlMapping:{}, aiPlayers:[],
    players:[], currentPlayerIndex:0, diceValues:[null,null], diceUsed:[false,false], selectedDice:null,
    phase:'ROLL', consecutiveDoubleSixes:0, gameStarted:false, capturedThisTurn:false, aiIsPlaying:false
};
window.STATE = STATE;

function initPlayers(){
    const markerOffset = CELL*1.2;
    const centers = [
        {x:(0+3-7.5)*CELL, z:(0+3-7.5)*CELL},
        {x:(9+3-7.5)*CELL, z:(0+3-7.5)*CELL},
        {x:(9+3-7.5)*CELL, z:(9+3-7.5)*CELL},
        {x:(0+3-7.5)*CELL, z:(9+3-7.5)*CELL}
    ];
    const homePositions = centers.map(c=>[
        {x:c.x-markerOffset, z:c.z-markerOffset},
        {x:c.x+markerOffset, z:c.z-markerOffset},
        {x:c.x-markerOffset, z:c.z+markerOffset},
        {x:c.x+markerOffset, z:c.z+markerOffset}
    ]);
    PLAYER_NAMES.forEach((name,idx)=>{
        const player = { name, color:PLAYER_COLORS[idx], pieces:[], finishedCount:0 };
        for(let i=0;i<4;i++) player.pieces.push(new Piece(PLAYER_COLORS[idx], name, i, homePositions[idx][i]));
        STATE.players.push(player);
    });
}
