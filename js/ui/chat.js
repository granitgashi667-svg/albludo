export function sendChatMessage(playerName) {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    const msg = input.value;
    const chatDiv = document.getElementById("chatMessages");
    chatDiv.innerHTML += `<div><i class="fas fa-comment"></i> ${playerName}: ${msg}</div>`;
    input.value = "";
    chatDiv.scrollTop = chatDiv.scrollHeight;
}
