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
// ============== FUNKSIONET NDIHMËSE ==============
function getValidMovesForDice(diceVal){
    if(!diceVal) return [];
    const controlled = STATE.controlMapping[STATE.currentPlayerIndex];
    if(!controlled) return [];
    let valid = [];
    controlled.forEach(cIdx=>{
        const player = STATE.players[cIdx];
        const pName = PLAYER_NAMES[cIdx];
        const start = START_POSITIONS[pName];
        player.pieces.forEach(piece=>{
            if(piece.finished) return;
            if(piece.pathIndex===-1 && diceVal===6) valid.push(piece);
            else if(piece.homeColumnIndex>=0 && piece.homeColumnIndex+diceVal<=5) valid.push(piece);
            else if(piece.pathIndex>=0 && piece.homeColumnIndex===-1){
                const rel = (piece.pathIndex - start + 52)%52;
                const newRel = rel + diceVal;
                if(newRel>=51){
                    const step = newRel-51;
                    if(step<=6) valid.push(piece);
                } else valid.push(piece);
            }
        });
    });
    return valid;
}
function getValidMovesForAnyDice(){
    const m1 = STATE.diceUsed[0]?[]:getValidMovesForDice(STATE.diceValues[0]);
    const m2 = STATE.diceUsed[1]?[]:getValidMovesForDice(STATE.diceValues[1]);
    return [...new Set([...m1,...m2])];
}
function advanceToNextPlayer(){
    const mode = STATE.gameMode;
    if(mode==='single' || mode==='2p') STATE.currentPlayerIndex = STATE.currentPlayerIndex===0?1:0;
    else STATE.currentPlayerIndex = (STATE.currentPlayerIndex+1)%4;
    STATE.aiIsPlaying=false;
}
function getPlayerForColor(colorIdx){
    for(let [pIdx, colors] of Object.entries(STATE.controlMapping)) if(colors.includes(colorIdx)) return parseInt(pIdx);
    return -1;
}
function getAllPiecesAt(pathIndex){
    let found=[];
    STATE.players.forEach(p=>p.pieces.forEach(piece=>{ if(piece.pathIndex===pathIndex && !piece.finished) found.push(piece); }));
    return found;
}
function canCapture(piece, diceVal, colorIdx){
    const pName=PLAYER_NAMES[colorIdx];
    const start=START_POSITIONS[pName];
    const myPlayer=getPlayerForColor(colorIdx);
    if(piece.pathIndex===-1){
        return getAllPiecesAt(start).some(p=>getPlayerForColor(PLAYER_NAMES.indexOf(p.colorName))!==myPlayer);
    } else if(piece.pathIndex>=0){
        const rel=(piece.pathIndex-start+52)%52;
        const newRel=rel+diceVal;
        if(newRel<51){
            const newIdx=(piece.pathIndex+diceVal)%52;
            if(SAFE_SQUARES.includes(newIdx)) return false;
            return getAllPiecesAt(newIdx).some(p=>getPlayerForColor(PLAYER_NAMES.indexOf(p.colorName))!==myPlayer);
        }
    }
    return false;
}
function willEnterHome(piece, diceVal, colorIdx){
    if(piece.pathIndex<0) return false;
    const pName=PLAYER_NAMES[colorIdx];
    const start=START_POSITIONS[pName];
    const rel=(piece.pathIndex-start+52)%52;
    const newRel=rel+diceVal;
    return newRel>=51 && newRel<=57;
}
function getPieceProgress(piece, colorIdx){
    if(piece.finished) return 57;
    if(piece.homeColumnIndex>=0) return 51+piece.homeColumnIndex;
    if(piece.pathIndex>=0){
        const pName=PLAYER_NAMES[colorIdx];
        const start=START_POSITIONS[pName];
        return (piece.pathIndex-start+52)%52;
    }
    return 0;
}
function willLandOnSafe(piece, diceVal, colorIdx){
    if(piece.pathIndex<0){
        const pName=PLAYER_NAMES[colorIdx];
        return SAFE_SQUARES.includes(START_POSITIONS[pName]);
    } else if(piece.pathIndex>=0){
        const newIdx=(piece.pathIndex+diceVal)%52;
        return SAFE_SQUARES.includes(newIdx);
    }
    return false;
}
async function animateDiceRoll(){
    return new Promise(resolve=>{
        let rolls=0;
        const d1=document.getElementById('dice-1'), d2=document.getElementById('dice-2');
        d1.classList.add('rolling'); d2.classList.add('rolling');
        const iv=setInterval(()=>{
            d1.textContent=Math.floor(Math.random()*6)+1;
            d2.textContent=Math.floor(Math.random()*6)+1;
            rolls++;
            if(rolls>8){ clearInterval(iv); d1.classList.remove('rolling'); d2.classList.remove('rolling'); resolve(); }
        },60);
    });
}
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
function logMessage(msg){
    const logDiv=document.getElementById('message-log');
    const entry=document.createElement('div'); entry.className='log-entry'; entry.textContent=msg;
    logDiv.insertBefore(entry,logDiv.firstChild);
    while(logDiv.children.length>5) logDiv.removeChild(logDiv.lastChild);
}
function updateUI(){
    const pName=STATE.playerNames[STATE.currentPlayerIndex]||'Lojtar';
    const controlled=STATE.controlMapping[STATE.currentPlayerIndex]||[0];
    const firstColor=STATE.players[controlled[0]];
    document.getElementById('player-name').textContent=pName+(STATE.gameMode!=='4p'?` (${controlled.map(i=>PLAYER_NAMES[i]).join('+')})`:'');
    document.getElementById('player-dot').style.background=firstColor?`#${firstColor.color.toString(16)}`:'#E53935';
    const status=STATE.phase==='AI_TURN'?'🤖 AI po mendon...':(STATE.phase==='ROLL'?'Rrotulloni zarin...':'Zgjidhni pjesën...');
    document.getElementById('turn-status').textContent=status;
    STATE.players.forEach((p,i)=>{
        const fin=p.pieces.filter(pc=>pc.finished).length;
        const el=document.getElementById(`${PLAYER_NAMES[i].toLowerCase()}-count`);
        if(el) el.textContent=`${fin}/4`;
    });
}
function highlightSelectableDice(){
    const d1=document.getElementById('dice-1'), d2=document.getElementById('dice-2');
    const can1=!STATE.diceUsed[0] && getValidMovesForDice(STATE.diceValues[0]).length>0;
    const can2=!STATE.diceUsed[1] && getValidMovesForDice(STATE.diceValues[1]).length>0;
    d1.classList.toggle('selectable',can1); d2.classList.toggle('selectable',can2);
    d1.classList.toggle('used',STATE.diceUsed[0]); d2.classList.toggle('used',STATE.diceUsed[1]);
    if(can1 && !can2) selectDice(0);
    else if(can2 && !can1) selectDice(1);
}
function afterMove(){
    if(STATE.aiIsPlaying){ if(STATE.gameStarted) saveGame(); return; }
    if(STATE.selectedDice!==null){
        STATE.diceUsed[STATE.selectedDice]=true;
        document.getElementById(`dice-${STATE.selectedDice+1}`).classList.add('used');
    }
    STATE.selectedDice=null;
    if(STATE.gameStarted) saveGame();
    const remaining=getValidMovesForAnyDice();
    if(remaining.length>0){
        STATE.phase='SELECT_DICE';
        highlightSelectableDice();
        document.getElementById('turn-status').textContent='Përdorni zarin tjetër - klikoni';
    } else endTurn();
}
function endTurn(){
    STATE.players.forEach(p=>p.pieces.forEach(pc=>pc.highlight(false)));
    const isSingle=STATE.diceMode==='single';
    const singleSix=isSingle && STATE.diceValues[0]===6;
    const doubleSix=!isSingle && STATE.diceValues[0]===6 && STATE.diceValues[1]===6;
    const captured=STATE.capturedThisTurn;
    const shouldContinue=(doubleSix && STATE.consecutiveDoubleSixes<3)||singleSix||captured;
    STATE.capturedThisTurn=false;
    if(shouldContinue){
        logMessage(captured?"Rradhë bonus për kapje!":"6! Rradhë shtesë.");
        if(STATE.aiPlayers.includes(STATE.currentPlayerIndex)){
            STATE.diceValues=[null,null]; STATE.diceUsed=[false,false];
            setTimeout(()=>aiTakeTurn(),1000);
            return;
        }
    } else {
        STATE.consecutiveDoubleSixes=0;
        advanceToNextPlayer();
    }
    STATE.diceValues=[null,null]; STATE.diceUsed=[false,false]; STATE.phase='ROLL';
    document.getElementById('roll-btn').disabled=false;
    document.getElementById('dice-1').textContent='?'; document.getElementById('dice-2').textContent='?';
    document.getElementById('dice-1').classList.remove('used','selectable');
    document.getElementById('dice-2').classList.remove('used','selectable');
    updateUI();
    if(STATE.aiPlayers.includes(STATE.currentPlayerIndex) && !STATE.aiIsPlaying){
        STATE.aiIsPlaying=true; setTimeout(()=>aiTakeTurn(),1000);
    }
}
async function aiTakeTurn(){
    STATE.aiIsPlaying=true; STATE.phase='AI_TURN';
    document.getElementById('turn-status').textContent='🤖 AI po mendon...';
    document.getElementById('roll-btn').disabled=true;
    await delay(800+Math.random()*400);
    STATE.diceUsed=[false,false]; STATE.selectedDice=null; STATE.capturedThisTurn=false;
    window.audio.playRoll();
    await animateDiceRoll();
    const isSingle=STATE.diceMode==='single';
    const v1=Math.floor(Math.random()*6)+1;
    const v2=isSingle?null:Math.floor(Math.random()*6)+1;
    STATE.diceValues=[v1,v2];
    document.getElementById('dice-1').textContent=v1;
    if(isSingle){
        document.getElementById('dice-2').textContent='-'; document.getElementById('dice-2').classList.add('used'); STATE.diceUsed[1]=true;
        logMessage(`AI rrotulloi ${v1}`);
        if(v1===6) logMessage("AI mori 6! Rradhë bonus.");
    } else {
        document.getElementById('dice-2').textContent=v2;
        logMessage(`AI rrotulloi ${v1} dhe ${v2}`);
        if(v1===6 && v2===6){
            STATE.consecutiveDoubleSixes++;
            if(STATE.consecutiveDoubleSixes>=3){
                logMessage("Tre 6! AI humb rradhën."); STATE.consecutiveDoubleSixes=0; await delay(1000); endTurn(); return;
            }
            logMessage("AI mori dy 6! Rradhë bonus.");
        } else STATE.consecutiveDoubleSixes=0;
    }
    await delay(500);
    for(let die=0;die<2;die++){
        if(STATE.diceUsed[die]) continue;
        const val=STATE.diceValues[die];
        let moves=getValidMovesForDice(val);
        if(moves.length){
            STATE.selectedDice=die;
            let best=moves[0];
            for(let m of moves){
                let score=0;
                const cIdx=PLAYER_NAMES.indexOf(m.colorName);
                if(canCapture(m,val,cIdx)) score+=100;
                if(willEnterHome(m,val,cIdx)) score+=80;
                if(m.pathIndex===-1 && val===6) score+=60;
                const prog=getPieceProgress(m,cIdx);
                score+=prog/2;
                if(willLandOnSafe(m,val,cIdx)) score+=10;
                if(score> (best?getPieceProgress(best,cIdx):-1)) best=m;
            }
            STATE.phase='MOVE';
            STATE.diceUsed[die]=true;
            document.getElementById(`dice-${die+1}`).classList.add('used');
            tryMovePiece(best);
            await delay(800);
        } else {
            STATE.diceUsed[die]=true;
            document.getElementById(`dice-${die+1}`).classList.add('used');
        }
    }
    if(getValidMovesForAnyDice().length===0) await delay(500);
    endTurn();
}
function checkWin(){
    const controlled=STATE.controlMapping[STATE.currentPlayerIndex];
    let total=0;
    controlled.forEach(c=>total+=STATE.players[c].finishedCount);
    if(total>=4*controlled.length){
        const winner=STATE.playerNames[STATE.currentPlayerIndex];
        document.getElementById('winner-name').innerText=winner;
        document.getElementById('win-screen').style.display='flex';
        window.audio.playWin();
        spawnConfetti();
        if(winner !== 'AI' && STATE.currentPlayerIndex===0){
            addXP(50); addCoins(100);
            showNotification("Fituat! +50 XP, +100 🪙", "gold");
        }
        localStorage.removeItem('ludo_save');
        return true;
    }
    return false;
}
function tryMovePiece(piece){
    const diceVal = STATE.selectedDice!==null ? STATE.diceValues[STATE.selectedDice] : null;
    if(!diceVal) return;
    const pieceColorIdx = PLAYER_NAMES.indexOf(piece.colorName);
    const pName = piece.colorName;
    const start = START_POSITIONS[pName];
    const controlled = STATE.controlMapping[STATE.currentPlayerIndex];
    controlled.forEach(c=>STATE.players[c].pieces.forEach(p=>p.highlight(false)));
    if(piece.pathIndex===-1 && diceVal===6){
        piece.pathIndex = start;
        const coord = PATH_COORDS[start];
        const pos = getWorldPos(coord.c,coord.r);
        piece.moveTo(pos, ()=>{ logMessage(`${piece.colorName} hyri në fushë!`); afterMove(); });
    } else if(piece.pathIndex>=0 && piece.homeColumnIndex===-1){
        const rel = (piece.pathIndex - start + 52)%52;
        const newRel = rel + diceVal;
        if(newRel>=51){
            const step = newRel-51;
            if(step<=6){
                piece.homeColumnIndex = step-1;
                piece.pathIndex = -2;
                const coord = HOME_COLUMNS[pName][piece.homeColumnIndex];
                const pos = getWorldPos(coord.c,coord.r);
                piece.moveTo(pos, ()=>{
                    logMessage(`${piece.colorName} hyri në shtëpi!`);
                    if(piece.homeColumnIndex>=5){
                        piece.finished=true;
                        STATE.players[pieceColorIdx].finishedCount++;
                        logMessage(`${piece.colorName} pjesë në shtëpi! (${STATE.players[pieceColorIdx].finishedCount}/4)`);
                        if(checkWin()) return;
                    }
                    afterMove();
                });
            } else { logMessage("Duhet numri i saktë për të hyrë!"); afterMove(); }
        } else {
            const newIdx = (piece.pathIndex + diceVal)%52;
            piece.pathIndex = newIdx;
            const coord = PATH_COORDS[newIdx];
            const pos = getWorldPos(coord.c,coord.r);
            if(!SAFE_SQUARES.includes(newIdx)){
                for(let i=0;i<STATE.players.length;i++){
                    for(let p of STATE.players[i].pieces){
                        if(p.pathIndex===newIdx && !p.finished && p.colorName!==piece.colorName){
                            p.returnHome();
                            STATE.capturedThisTurn=true;
                            logMessage(`${piece.colorName} kapi ${p.colorName}!`);
                            break;
                        }
                    }
                }
            }
            piece.moveTo(pos, ()=>{ afterMove(); });
        }
    } else if(piece.homeColumnIndex>=0){
        const newHome = piece.homeColumnIndex + diceVal;
        if(newHome<=5){
            piece.homeColumnIndex = newHome;
            const coord = HOME_COLUMNS[pName][piece.homeColumnIndex];
            const pos = getWorldPos(coord.c,coord.r);
            piece.moveTo(pos, ()=>{
                if(piece.homeColumnIndex>=5){
                    piece.finished=true;
                    STATE.players[pieceColorIdx].finishedCount++;
                    if(checkWin()) return;
                }
                afterMove();
            });
        } else { logMessage("Duhet numri i saktë!"); afterMove(); }
    }
}
function saveGame(){
    const data = { gameMode:STATE.gameMode, difficulty:STATE.difficulty, diceMode:STATE.diceMode, playerNames:STATE.playerNames, controlMapping:STATE.controlMapping, aiPlayers:STATE.aiPlayers, currentPlayerIndex:STATE.currentPlayerIndex, pieces:[] };
    STATE.players.forEach((p,ci)=>p.pieces.forEach((pc,pi)=>data.pieces.push({colorIndex:ci,pieceId:pi,pathIndex:pc.pathIndex,homeColumnIndex:pc.homeColumnIndex,finished:pc.finished})));
    localStorage.setItem('ludo_save',JSON.stringify(data));
}
function restoreGameState(data){
    STATE.gameMode=data.gameMode; STATE.difficulty=data.difficulty||'normal'; STATE.diceMode=data.diceMode||'double';
    STATE.playerNames=data.playerNames; STATE.controlMapping=data.controlMapping; STATE.aiPlayers=data.aiPlayers;
    STATE.currentPlayerIndex=data.currentPlayerIndex; STATE.aiIsPlaying=false;
    STATE.diceValues=[null,null]; STATE.diceUsed=[false,false]; STATE.consecutiveDoubleSixes=0;
    selectedMode=data.gameMode;
    if(!STATE.gameStarted){ initPlayers(); createBoard(); STATE.gameStarted=true; }
    data.pieces.forEach(pd=>{
        const piece=STATE.players[pd.colorIndex].pieces[pd.pieceId];
        piece.pathIndex=pd.pathIndex; piece.homeColumnIndex=pd.homeColumnIndex; piece.finished=pd.finished;
        if(piece.finished) piece.mesh.visible=false;
        else if(piece.homeColumnIndex>=0){
            const coord=HOME_COLUMNS[PLAYER_NAMES[pd.colorIndex]][piece.homeColumnIndex];
            const pos=getWorldPos(coord.c,coord.r);
            piece.mesh.position.set(pos.x,0.5,pos.z);
        } else if(piece.pathIndex>=0){
            const coord=PATH_COORDS[piece.pathIndex];
            const pos=getWorldPos(coord.c,coord.r);
            piece.mesh.position.set(pos.x,0.5,pos.z);
        }
    });
    updateUI();
}
function startGame(){
    document.getElementById('name-screen').style.display='none';
    document.getElementById('menu-screen').style.display='none';
    document.getElementById('game-ui').classList.add('show');
    if(!STATE.gameStarted){ initPlayers(); createBoard(); STATE.gameStarted=true; }
    const dice2=document.getElementById('dice-2');
    if(STATE.diceMode==='single') dice2.style.display='none'; else dice2.style.display='flex';
    STATE.phase='ROLL'; STATE.diceValues=[null,null]; STATE.diceUsed=[false,false];
    document.getElementById('roll-btn').disabled=false;
    updateUI();
    if(STATE.aiPlayers.includes(STATE.currentPlayerIndex)) setTimeout(()=>aiTakeTurn(),1000);
}
function selectMode(mode){
    selectedMode=mode;
    const container=document.getElementById('name-inputs-container');
    container.innerHTML='';
    let num=mode==='single'?1:(mode==='2p'?2:4);
    for(let i=0;i<num;i++){
        const grp=document.createElement('div'); grp.className='name-input-group';
        const lab=document.createElement('label'); lab.className='name-input-label'; lab.innerText=mode==='single'?'Emri juaj':`Lojtari ${i+1}`;
        const inp=document.createElement('input'); inp.type='text'; inp.className='name-input'; inp.placeholder=`Lojtari ${i+1}`;
        grp.appendChild(lab); grp.appendChild(inp); container.appendChild(grp);
    }
    document.getElementById('difficulty-selector').style.display=mode==='single'?'flex':'none';
    document.getElementById('menu-screen').style.display='none';
    document.getElementById('name-screen').style.display='flex';
}
function startGameWithNames(){
    const inputs=document.querySelectorAll('.name-input');
    const names=[];
    inputs.forEach(inp=>{ let n=inp.value.trim(); if(!n) n=inp.placeholder; names.push(n); });
    STATE.playerNames=names; STATE.gameMode=selectedMode;
    if(selectedMode==='single'){
        STATE.controlMapping={0:[0,2],1:[1,3]}; STATE.playerNames[1]='AI'; STATE.aiPlayers=[1];
    } else if(selectedMode==='2p'){
        STATE.controlMapping={0:[0,2],1:[1,3]}; STATE.aiPlayers=[];
    } else {
        STATE.controlMapping={0:[0],1:[1],2:[2],3:[3]}; STATE.aiPlayers=[];
    }
    startGame();
}
function backToMenu(){ location.reload(); }
function goHome(){ if(confirm('Kthehu në menu? Lojën do ta ruajë.')){ saveGame(); location.reload(); } }
function saveAndQuit(){ saveGame(); location.reload(); }
function restartGame(){ location.reload(); }
function showHelp(){ document.getElementById('help-modal').style.display='flex'; }
function hideHelp(){ document.getElementById('help-modal').style.display='none'; }
function toggleControls(){
    const btns=document.getElementById('controls-buttons');
    const toggle=document.getElementById('controls-toggle');
    if(btns.style.maxHeight==='0px' || btns.style.maxHeight===''){ btns.style.maxHeight='500px'; btns.style.opacity='1'; toggle.style.transform='rotate(180deg)'; }
    else{ btns.style.maxHeight='0px'; btns.style.opacity='0'; toggle.style.transform='rotate(0deg)'; }
}
function takeScreenshot(){
    renderer.render(scene,camera);
    const dataUrl=renderer.domElement.toDataURL('image/png');
    const link=document.createElement('a'); link.download=`ludo-screenshot-${Date.now()}.png`; link.href=dataUrl; link.click();
    logMessage('Screenshot saved!');
}
function shareGame(){
    if(navigator.share) navigator.share({ title:'Ludo Alb King', text:'Luaj Ludo 3D!', url:window.location.href });
    else navigator.clipboard.writeText(window.location.href).then(()=>logMessage('Link copied!'));
}
function zoomIn(){ camera.position.multiplyScalar(0.9); camera.updateProjectionMatrix(); }
function zoomOut(){ camera.position.multiplyScalar(1.1); camera.updateProjectionMatrix(); }
function setDifficulty(level){ STATE.difficulty=level; }
function setDiceMode(mode){ STATE.diceMode=mode; }
function resumeGame(){
    const saved=localStorage.getItem('ludo_save');
    if(saved){ restoreGameState(JSON.parse(saved)); startGame(); }
}
function checkForSavedGame(){
    if(localStorage.getItem('ludo_save')) document.getElementById('resume-btn').style.display='block';
}
const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2();
function handleInteraction(clientX,clientY){
    if(STATE.phase!=='MOVE') return;
    mouse.x=(clientX/renderer.domElement.clientWidth)*2-1;
    mouse.y=-(clientY/renderer.domElement.clientHeight)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const intersects=raycaster.intersectObjects(piecesGroup.children,true);
    if(intersects.length){
        let obj=intersects[0].object;
        while(obj.parent && !obj.userData.owner) obj=obj.parent;
        if(obj.userData.owner){
            const piece=obj.userData.owner;
            const controlled=STATE.controlMapping[STATE.currentPlayerIndex];
            const pIdx=PLAYER_NAMES.indexOf(piece.colorName);
            if(controlled.includes(pIdx)) tryMovePiece(piece);
        }
    }
}
renderer.domElement.addEventListener('click',(e)=>handleInteraction(e.clientX,e.clientY));
renderer.domElement.addEventListener('touchend',(e)=>{
    e.preventDefault();
    if(e.changedTouches.length){ const t=e.changedTouches[0]; handleInteraction(t.clientX,t.clientY); }
},{passive:false});
renderer.domElement.addEventListener('touchmove',(e)=>e.preventDefault(),{passive:false});
function selectDice(idx){
    if(STATE.phase!=='SELECT_DICE' && STATE.phase!=='MOVE') return;
    if(STATE.diceUsed[idx]) return;
    if(getValidMovesForDice(STATE.diceValues[idx]).length===0) return;
    STATE.selectedDice=idx; STATE.phase='MOVE';
    document.getElementById('dice-1').classList.toggle('selectable',idx===0);
    document.getElementById('dice-2').classList.toggle('selectable',idx===1);
    const valid=getValidMovesForDice(STATE.diceValues[idx]);
    STATE.players.forEach(p=>p.pieces.forEach(pc=>pc.highlight(false)));
    valid.forEach(p=>p.highlight(true));
    document.getElementById('turn-status').textContent=`Zari ${idx+1} (${STATE.diceValues[idx]}) - Zgjidhni pjesën`;
}
function rollDice(){
    if(STATE.phase!=='ROLL') return;
    window.audio.playRoll();
    STATE.phase='WAITING';
    document.getElementById('roll-btn').disabled=true;
    STATE.diceUsed=[false,false]; STATE.selectedDice=null; STATE.capturedThisTurn=false;
    let rolls=0;
    const d1=document.getElementById('dice-1'), d2=document.getElementById('dice-2');
    d1.classList.add('rolling'); d2.classList.add('rolling');
    d1.classList.remove('used','selectable'); d2.classList.remove('used','selectable');
    const iv=setInterval(()=>{
        d1.textContent=Math.floor(Math.random()*6)+1;
        d2.textContent=Math.floor(Math.random()*6)+1;
        rolls++;
        if(rolls>12){
            clearInterval(iv);
            d1.classList.remove('rolling'); d2.classList.remove('rolling');
            const v1=parseInt(d1.textContent);
            const v2=STATE.diceMode==='single'?null:parseInt(d2.textContent);
            STATE.diceValues=[v1,v2];
            if(STATE.diceMode==='single'){ d2.textContent='-'; d2.classList.add('used'); STATE.diceUsed[1]=true; logMessage(`Rrotulluat ${v1}`); }
            else logMessage(`Rrotulluat ${v1} dhe ${v2}`);
            animate3DDiceRoll(v1,v2);
            if(STATE.diceMode!=='single' && v1===6 && v2===6){
                STATE.consecutiveDoubleSixes++;
                if(STATE.consecutiveDoubleSixes>=3){ logMessage("Tre 6! Humb rradhën."); STATE.consecutiveDoubleSixes=0; setTimeout(()=>endTurn(),1000); return; }
                logMessage("Dy 6! Rradhë bonus.");
            } else if(STATE.diceMode==='single' && v1===6) logMessage("6! Rradhë bonus.");
            else STATE.consecutiveDoubleSixes=0;
            const valid=getValidMovesForAnyDice();
            if(valid.length===0){ logMessage("Asnjë lëvizje."); setTimeout(()=>endTurn(),1000); }
            else { STATE.phase='SELECT_DICE'; highlightSelectableDice(); document.getElementById('turn-status').textContent='Klikoni mbi zarin, pastaj mbi pjesën'; }
        }
    },60);
}
function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); }
animate();
window.addEventListener('resize',()=>{
    camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});
checkForSavedGame();
setTimeout(()=>{ document.getElementById('loading-screen').style.opacity='0'; setTimeout(()=>document.getElementById('loading-screen').style.display='none',500); },1500);

// Eksportimi i funksioneve për përdorim global (nga HTML)
window.selectMode = selectMode;
window.startGameWithNames = startGameWithNames;
window.backToMenu = backToMenu;
window.goHome = goHome;
window.saveAndQuit = saveAndQuit;
window.restartGame = restartGame;
window.showHelp = showHelp;
window.hideHelp = hideHelp;
window.toggleControls = toggleControls;
window.takeScreenshot = takeScreenshot;
window.shareGame = shareGame;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.setDifficulty = setDifficulty;
window.setDiceMode = setDiceMode;
window.resumeGame = resumeGame;
window.selectDice = selectDice;
window.rollDice = rollDice;
window.boardGroup = boardGroup; // për skin
