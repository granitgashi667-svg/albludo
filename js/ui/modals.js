export function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

export function openProfileModal() {
    document.getElementById("profileModal").style.display = "flex";
}

export function openStoreModal() {
    const storeDiv = document.getElementById("storeItems");
    storeDiv.innerHTML = `
        <div class="store-item"><span>Skin i Kuq</span><button onclick="buySkin('red')">50 🪙</button></div>
        <div class="store-item"><span>Skin i Artë</span><button onclick="buySkin('gold')">100 🪙</button></div>
        <div class="store-item"><span>100 Monedha</span><button onclick="buyCoins(100)">50 🪙</button></div>
    `;
    document.getElementById("storeModal").style.display = "flex";
}
