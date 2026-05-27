import { playerData } from '../players/playerData.js';

export function sendChatMessage() {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    const msg = input.value;
    const chatDiv = document.getElementById("chatMessages");
    chatDiv.innerHTML += `<div><i class="fas fa-comment"></i> ${playerData.name}: ${msg}</div>`;
    input.value = "";
    chatDiv.scrollTop = chatDiv.scrollHeight;
}
