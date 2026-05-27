export let playerData = {
    name: "Lojtari",
    level: 1,
    xp: 0,
    coins: 100,
    wins: 0
};

export function loadPlayerData() {
    const saved = localStorage.getItem("ludo_player");
    if (saved) playerData = JSON.parse(saved);
    const editNameField = document.getElementById("editPlayerName");
    if (editNameField) editNameField.value = playerData.name;
    updatePlayerUI();
}

export function savePlayerData() {
    localStorage.setItem("ludo_player", JSON.stringify(playerData));
}

export function updatePlayerUI() {
    const nameDisplay = document.getElementById("playerNameDisplay");
    if (nameDisplay) nameDisplay.innerText = playerData.name;
    const levelDisplay = document.getElementById("playerLevelDisplay");
    if (levelDisplay) levelDisplay.innerText = `Niveli ${playerData.level}`;
    const coinDisplay = document.getElementById("coinDisplay");
    if (coinDisplay) coinDisplay.innerHTML = `🪙 ${playerData.coins}`;
    const modalLevel = document.getElementById("modalPlayerLevel");
    if (modalLevel) modalLevel.innerText = playerData.level;
    const modalXp = document.getElementById("modalPlayerXp");
    if (modalXp) modalXp.innerText = playerData.xp;
    const modalCoins = document.getElementById("modalPlayerCoins");
    if (modalCoins) modalCoins.innerText = playerData.coins;
    const modalWins = document.getElementById("modalPlayerWins");
    if (modalWins) modalWins.innerText = playerData.wins;
}

export function addXP(amount) {
    playerData.xp += amount;
    while (playerData.xp >= 100) {
        playerData.xp -= 100;
        playerData.level++;
        showNotification(`🎉 Niveli ${playerData.level} arritur!`, "gold");
    }
    savePlayerData();
    updatePlayerUI();
}

export function addCoins(amount) {
    playerData.coins += amount;
    savePlayerData();
    updatePlayerUI();
    showNotification(`+${amount} 🪙`, "green");
}

export function saveProfileChanges() {
    let newName = document.getElementById("editPlayerName").value.trim();
    if (newName === "") newName = "Lojtari";
    playerData.name = newName;
    savePlayerData();
    updatePlayerUI();
    closeModal('profileModal');
    showNotification("Profili u përditësua!", "green");
}

export function showNotification(msg, color) {
    const notif = document.createElement("div");
    notif.innerText = msg;
    notif.style.position = "fixed";
    notif.style.bottom = "100px";
    notif.style.left = "50%";
    notif.style.transform = "translateX(-50%)";
    notif.style.backgroundColor = color === "gold" ? "#F9D423" : "#4CAF50";
    notif.style.color = "#1e2a2e";
    notif.style.padding = "8px 20px";
    notif.style.borderRadius = "30px";
    notif.style.zIndex = "2000";
    notif.style.fontWeight = "bold";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// Funksion ndihmës për closeModal (mund të jetë diku tjetër, por e vendosim këtu për siguri)
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}
