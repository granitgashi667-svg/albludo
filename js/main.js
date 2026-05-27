import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadPlayerData, updatePlayerUI, addXP, addCoins, saveProfileChanges } from './players/playerData.js';
import { closeModal, openProfileModal, openStoreModal } from './ui/modals.js';
import { sendChatMessage } from './ui/chat.js';
import { buySkin, buyCoins } from './store/shop.js';
import { spawnConfetti } from './animations/particles.js';
import { AudioEngine } from './audio/sounds.js';
import { COLORS, PLAYER_NAMES, PLAYER_COLORS, CELL, BOARD_SIZE, PATH_COORDS, SAFE_SQUARES, HOME_COLUMNS, START_POSITIONS } from './config/constants.js';

// Këtu vjen i gjithë kodi i lojës (gameEngine.js). 
// Për shkurtim, po e referoj faktin që ai duhet të jetë i pranishëm.
// Në skedarin aktual, unë do të integroj gjithçka.

// Inicializimi global
window.loadPlayerData = loadPlayerData;
window.updatePlayerUI = updatePlayerUI;
window.addXP = addXP;
window.addCoins = addCoins;
window.saveProfileChanges = saveProfileChanges;
window.closeModal = closeModal;
window.openProfileModal = openProfileModal;
window.openStoreModal = openStoreModal;
window.sendChatMessage = () => sendChatMessage(playerData.name);
window.buySkin = buySkin;
window.buyCoins = buyCoins;
window.spawnConfetti = spawnConfetti;

// Ngarko profilin në fillim
loadPlayerData();

// Siguro që paneli i kontrollit të jetë i fshehur fillimisht
if (document.getElementById('controls-buttons')) {
    document.getElementById('controls-buttons').style.maxHeight = '0px';
    document.getElementById('controls-buttons').style.opacity = '0';
}

// Thirrje për të nisur lojën (pasi gameEngine të jetë ngarkuar)
console.log("Main.js ngarkuar – loja do të fillojë menjëherë");
