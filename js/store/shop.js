import { playerData, savePlayerData, updatePlayerUI, showNotification } from '../players/playerData.js';

export function buySkin(skin) {
    if (skin === "red" && playerData.coins >= 50) {
        playerData.coins -= 50;
        savePlayerData();
        updatePlayerUI();
        showNotification("Skin i kuq blerë!", "gold");
        // Ndrysho ngjyrën e pjesëve nëse loja ka filluar
        if (window.STATE && window.STATE.players) {
            window.STATE.players.forEach(p => {
                p.pieces.forEach(piece => {
                    piece.mesh.children[0].material.color.setHex(0xFF4444);
                    piece.mesh.children[1].material.color.setHex(0xFF4444);
                });
            });
        }
    } else if (skin === "gold" && playerData.coins >= 100) {
        playerData.coins -= 100;
        savePlayerData();
        updatePlayerUI();
        showNotification("Skin i artë blerë!", "gold");
        if (window.boardGroup) {
            window.boardGroup.children.forEach(child => {
                if (child.material) child.material.color.setHex(0xFFD700);
            });
        }
    } else {
        showNotification("Monedha të pamjaftueshme!", "red");
    }
}

export function buyCoins(amount) {
    if (playerData.coins >= 50) {
        playerData.coins -= 50;
        playerData.coins += amount;
        savePlayerData();
        updatePlayerUI();
        showNotification(`Blevë ${amount} 🪙!`, "green");
    } else {
        showNotification("Nuk ke mjaft monedha për të blerë!", "red");
    }
}
