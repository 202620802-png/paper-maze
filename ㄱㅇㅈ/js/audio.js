/* ==========================================
   종이 미로: 잉크 얼룩의 추격 - Sound Engine
   ========================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.heartTimer = null;
    this.heartGap = 1100;
    this.loadMuteState();
  }

  loadMuteState() {
    try {
      this.muted = localStorage.getItem('maze:muted') === '1';
    } catch (e) {
      this.muted = false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('maze:muted', this.muted ? '1' : '0');
    } catch (e) {}
    if (!this.muted) {
      this.beep(660, 0.08, 'triangle', 0.06);
    }
    return this.muted;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  beep(freq, dur, type = 'sine', vol = 0.06) {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);

      o.connect(g);
      g.connect(this.ctx.destination);

      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {
      // 무음 처리 (브라우저 자동재생 차단 대비)
    }
  }

  playStep(moveCount) {
    const pitch = 300 + (moveCount % 5) * 18;
    this.beep(pitch, 0.045, 'triangle', 0.035);
  }

  playBump() {
    this.beep(120, 0.07, 'square', 0.045);
  }

  playStamp() {
    this.beep(880, 0.12, 'triangle', 0.07);
    setTimeout(() => this.beep(1320, 0.14, 'triangle', 0.06), 90);
  }

  playHit() {
    this.beep(90, 0.35, 'sawtooth', 0.09);
    setTimeout(() => this.beep(70, 0.4, 'sawtooth', 0.07), 120);
  }

  playNearBlot(distance) {
    if (distance < 99) {
      const freq = 140 - distance * 15;
      const vol = 0.055 - distance * 0.012;
      this.beep(freq, 0.14, 'sine', Math.max(0.01, vol));
    }
  }

  playPeek() {
    this.beep(440, 0.25, 'sine', 0.05);
  }

  playStageClear() {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.16, 'triangle', 0.06), i * 100);
    });
  }

  playGameClear() {
    const freqs = [523, 659, 784, 1047, 1319];
    freqs.forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.18, 'triangle', 0.07), i * 110);
    });
  }

  /* 8단계 전용 심장 박동 효과 */
  heartbeat() {
    this.beep(58, 0.14, 'sine', 0.09);
    setTimeout(() => this.beep(50, 0.16, 'sine', 0.07), 140);
  }

  startHeartbeat(gap = 1100) {
    this.heartGap = gap;
    this.stopHeartbeat();
    this.heartTimer = setInterval(() => {
      this.heartbeat();
    }, this.heartGap);
  }

  updateHeartbeatGap(gap) {
    if (Math.abs(this.heartGap - gap) > 40) {
      this.startHeartbeat(gap);
    }
  }

  stopHeartbeat() {
    if (this.heartTimer) {
      clearInterval(this.heartTimer);
      this.heartTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
