import { loadPlayerData, updatePlayerUI, addXP, addCoins, saveProfileChanges, playerData } from './players/playerData.js';
import { closeModal, openProfileModal, openStoreModal } from './ui/modals.js';
import { sendChatMessage } from './ui/chat.js';
import { buySkin, buyCoins } from './store/shop.js';
import { spawnConfetti } from './animations/particles.js';
import { AudioEngine } from './audio/sounds.js';
// gameEngine.js do të ngarkohet veçmas (përmes script tag në HTML? Jo, gjithçka është module)
// Por gameEngine.js është shumë i madh dhe nuk mund të importohet këtu sepse përmban Three.js dhe logjikën.
// Në vend të kësaj, ne do të mbështetemi te fakti që gameEngine.js ekzekutohet si modul i veçantë.
// Por për të bashkuar gjithçka, më mirë të gjithë kodin e lojës ta vendosim në një skedar të vetëm që importon modulet e nevojshme.
// Duke qenë se gameEngine.js tashmë përmban gjithçka dhe e kemi përfshirë në HTML si script type="module" që tregon drejt `js/game/gameEngine.js`, nuk kemi nevojë ta importojmë këtu.
// Thjesht vendosim funksionet globale.

// Ekspozimi i funksioneve në window për t'u thirrur nga HTML
window.loadPlayerData = loadPlayerData;
window.updatePlayerUI = updatePlayerUI;
window.addXP = addXP;
window.addCoins = addCoins;
window.saveProfileChanges = saveProfileChanges;
window.closeModal = closeModal;
window.openProfileModal = openProfileModal;
window.openStoreModal = openStoreModal;
window.sendChatMessage = sendChatMessage;
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

console.log("Main.js ngarkuar – loja do të fillojë menjëherë nga gameEngine.js");
