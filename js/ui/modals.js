export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

export function openProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal) modal.style.display = "flex";
}

export function openStoreModal() {
    const storeDiv = document.getElementById("storeItems");
    if (storeDiv) {
        storeDiv.innerHTML = `
            <div class="store-item"><span>Skin i Kuq</span><button onclick="window.buySkin('red')">50 🪙</button></div>
            <div class="store-item"><span>Skin i Artë</span><button onclick="window.buySkin('gold')">100 🪙</button></div>
            <div class="store-item"><span>100 Monedha</span><button onclick="window.buyCoins(100)">50 🪙</button></div>
        `;
    }
    const modal = document.getElementById("storeModal");
    if (modal) modal.style.display = "flex";
}
