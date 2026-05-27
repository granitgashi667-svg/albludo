export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    playTone(freq, type, dur) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }
    playRoll() {
        this.init();
        for (let i = 0; i < 8; i++) setTimeout(() => this.playTone(600 + Math.random() * 200, 'square', 0.05), i * 60);
    }
    playMove() {
        this.init();
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
    }
    playCapture() {
        this.init();
        this.playTone(200, 'sawtooth', 0.2);
        this.playTone(100, 'square', 0.3);
    }
    playWin() {
        this.init();
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.3), i * 150));
    }
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
