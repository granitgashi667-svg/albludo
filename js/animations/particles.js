export function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#E53935', '#43A047', '#FDD835', '#1E88E5', '#9C27B0', '#FF9800'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(confetti);
    }
    setTimeout(() => { container.innerHTML = ''; }, 5000);
}
