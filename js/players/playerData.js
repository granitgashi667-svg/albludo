let playerData = {
    name: "Lojtari",
    level: 1,
    xp: 0,
    coins: 100,
    wins: 0
};

export function loadPlayerData() {
    const saved = localStorage.getItem("ludo_player");
    if (saved) playerData = JSON.parse(saved);
    document.getElementById("editPlayerName").value = playerData.name;
    updatePlayerUI();
}

export function savePlayerData() {
    localStorage.setItem("ludo_player", JSON.stringify(playerData));
}

export function updatePlayerUI() {
    document.getElementById("playerNameDisplay").innerText = playerData.name;
    document.getElementById("playerLevelDisplay").innerText = `Niveli ${playerData.level}`;
    document.getElementById("coinDisplay").innerHTML = `🪙 ${playerData.coins}`;
    document.getElementById("modalPlayerLevel").innerText = playerData.level;
    document.getElementById("modalPlayerXp").innerText = playerData.xp;
    document.getElementById("modalPlayerCoins").innerText = playerData.coins;
    document.getElementById("modalPlayerWins").innerText = playerData.wins;
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
