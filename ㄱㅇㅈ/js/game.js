/* ==========================================
   종이 미로: 잉크 얼룩의 추격 - Main Game Controller
   ========================================== */

class GameApp {
  constructor() {
    this.audio = window.soundEngine;
    this.LAST_LEVEL = 8;

    // DOM Elements
    this.el = {
      startScreen: document.getElementById('start-screen'),
      gameScreen: document.getElementById('game-screen'),
      winOverlay: document.getElementById('win-overlay'),
      cv: document.getElementById('c'),
      levelSelect: document.getElementById('levelSelect'),
      maxLevel: document.getElementById('maxLevel'),
      moves: document.getElementById('moves'),
      time: document.getElementById('time'),
      best: document.getElementById('best'),
      bestWrap: document.getElementById('bestWrap'),
      stamps: document.getElementById('stamps'),
      note: document.getElementById('note'),
      winText: document.getElementById('winText'),
      btnStart: document.getElementById('btnStart'),
      btnNext: document.getElementById('btnNext'),
      btnAgain: document.getElementById('btnAgain'),
      btnHint: document.getElementById('btnHint'),
      btnMute: document.getElementById('btnMute'),
      btnHome: document.getElementById('btnHome'),
      btnTheme: document.getElementById('btnTheme'),
      levelButtons: document.querySelectorAll('.level-btn')
    };

    this.ctx = this.el.cv.getContext('2d');

    // Game States
    this.selectedStartLevel = 1;
    this.level = 1;
    this.size = 11;
    this.maze = null;
    this.pos = [0, 0];
    this.path = [[0, 0]];
    this.seen = new Set();
    this.visible = new Set();
    this.stamps = [];
    this.got = 0;
    this.blots = [];
    this.moves = 0;
    this.startedAt = 0;
    this.penalty = 0;
    this.elapsed = 0;
    this.ticking = null;
    this.done = false;
    this.cleared = false;
    this.peeksLeft = 1;
    this.peeksUsed = 0;
    this.hits = 0;
    this.trailLen = 22;
    this.hintPath = null;
    this.hintUntil = 0;
    this.raf = null;
    this.pad = 14;
    this.cell = 30;

    this.initLevelOptions();
    this.bindEvents();
    this.showScreen('start');
  }

  initLevelOptions() {
    this.el.levelSelect.innerHTML = '';
    for (let i = 1; i <= this.LAST_LEVEL; i++) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = i;
      this.el.levelSelect.appendChild(o);
    }
  }

  showScreen(screenName) {
    if (screenName === 'start') {
      this.audio.stopHeartbeat();
      document.body.classList.remove('final-mode');
      this.el.startScreen.classList.add('active');
      this.el.gameScreen.classList.remove('active');
    } else if (screenName === 'game') {
      this.el.startScreen.classList.remove('active');
      this.el.gameScreen.classList.add('active');
    }
  }

  css(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  cx(c) {
    return this.pad + c * this.cell + this.cell / 2;
  }

  cy(r) {
    return this.pad + r * this.cell + this.cell / 2;
  }

  layout() {
    if (!this.maze) return;
    const avail = Math.min(this.el.cv.parentElement.clientWidth, 560);
    this.cell = Math.max(10, Math.floor((avail - 28) / this.size));
    const px = this.size * this.cell + this.pad * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.el.cv.width = px * dpr;
    this.el.cv.height = px * dpr;
    this.el.cv.style.width = px + 'px';
    this.el.cv.style.height = px + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  drawStar(x, y, rad) {
    this.ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? rad * 0.45 : rad;
      this.ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    this.ctx.closePath();
  }

  drawBlob(x, y, rad, seed) {
    this.ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = rad * (0.72 + 0.38 * Math.abs(Math.sin(a * 2.7 + seed)));
      this.ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    this.ctx.closePath();
  }

  draw() {
    if (!this.maze) return;
    const n = this.size;
    const ink = this.css('--ink');
    const trail = this.css('--trail');
    const goal = this.css('--goal');
    const gold = this.css('--stamp');
    const dark = this.css('--blot');
    const open = this.got === this.stamps.length;

    this.ctx.clearRect(0, 0, this.el.cv.width, this.el.cv.height);
    this.ctx.lineJoin = this.ctx.lineCap = 'round';

    // 출구 도착 지점 가시성
    this.ctx.globalAlpha = this.seen.has(MazeLogic.key(n - 1, n - 1)) ? (open ? 0.2 : 0.1) : 0.05;
    this.ctx.fillStyle = goal;
    this.ctx.fillRect(this.pad + (n - 1) * this.cell, this.pad + (n - 1) * this.cell, this.cell, this.cell);

    // 힌트 가이드 라인 (스페이스바 엿보기)
    if (this.hintPath && Date.now() < this.hintUntil) {
      this.ctx.globalAlpha = 0.45;
      this.ctx.strokeStyle = goal;
      this.ctx.lineWidth = Math.max(2, this.cell * 0.14);
      this.ctx.setLineDash([this.cell * 0.28, this.cell * 0.32]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.cx(this.hintPath[0][1]), this.cy(this.hintPath[0][0]));
      for (let i = 1; i < this.hintPath.length; i++) {
        this.ctx.lineTo(this.cx(this.hintPath[i][1]), this.cy(this.hintPath[i][0]));
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 지나온 궤적 꼬리 (Trail)
    const tail = this.path.slice(-this.trailLen);
    this.ctx.strokeStyle = trail;
    this.ctx.lineWidth = Math.max(3, this.cell * 0.24);
    for (let i = 1; i < tail.length; i++) {
      this.ctx.globalAlpha = 0.10 + 0.42 * (i / tail.length);
      this.ctx.beginPath();
      this.ctx.moveTo(this.cx(tail[i - 1][1]), this.cy(tail[i - 1][0]));
      this.ctx.lineTo(this.cx(tail[i][1]), this.cy(tail[i][0]));
      this.ctx.stroke();
    }

    // 미로 벽 그리기 (시야 / Fog of War 적용)
    this.ctx.strokeStyle = ink;
    this.ctx.lineWidth = Math.max(2, this.cell * 0.13);
    for (const lit of [false, true]) {
      this.ctx.globalAlpha = lit ? 1 : (MazeLogic.isFinal(this.level) ? 0.4 : 0.28);
      this.ctx.beginPath();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const k = MazeLogic.key(r, c);
          if (!this.seen.has(k) || this.visible.has(k) !== lit) continue;
          const x = this.pad + c * this.cell;
          const y = this.pad + r * this.cell;
          if (this.maze[r][c].N) { this.ctx.moveTo(x, y); this.ctx.lineTo(x + this.cell, y); }
          if (this.maze[r][c].W) { this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + this.cell); }
          if (this.maze[r][c].S) { this.ctx.moveTo(x, y + this.cell); this.ctx.lineTo(x + this.cell, y + this.cell); }
          if (this.maze[r][c].E) { this.ctx.moveTo(x + this.cell, y); this.ctx.lineTo(x + this.cell, y + this.cell); }
        }
      }
      this.ctx.stroke();
    }

    // 도장 획득 아이템 (Stamps)
    this.ctx.fillStyle = gold;
    for (const s of this.stamps) {
      if (s.got) continue;
      const k = MazeLogic.key(s.r, s.c);
      if (!this.seen.has(k)) continue;
      this.ctx.globalAlpha = this.visible.has(k) ? 1 : 0.35;
      this.drawStar(this.cx(s.c), this.cy(s.r), Math.max(4, this.cell * 0.3));
      this.ctx.fill();
    }

    // 잉크 얼룩 몬스터 (Ink Blots)
    this.ctx.fillStyle = dark;
    for (let i = 0; i < this.blots.length; i++) {
      const b = this.blots[i];
      if (!this.visible.has(MazeLogic.key(b.r, b.c))) continue;
      this.ctx.globalAlpha = 0.85;
      this.drawBlob(this.cx(b.c), this.cy(b.r), Math.max(5, this.cell * 0.34), i * 2.1);
      this.ctx.fill();
      if (MazeLogic.isFinal(this.level)) {
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = goal;
        this.ctx.lineWidth = Math.max(1.5, this.cell * 0.06);
        this.ctx.stroke();
      }
    }

    // 출구 표시
    const gx = this.cx(n - 1);
    const gy = this.cy(n - 1);
    const gr = Math.max(3, this.cell * 0.19);
    this.ctx.globalAlpha = this.seen.has(MazeLogic.key(n - 1, n - 1)) ? 1 : 0.3;
    this.ctx.strokeStyle = goal;
    this.ctx.lineWidth = Math.max(2, this.cell * 0.11);
    if (!open) this.ctx.setLineDash([Math.max(2, this.cell * 0.12), Math.max(2, this.cell * 0.14)]);
    this.ctx.beginPath();
    this.ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    if (open) {
      this.ctx.fillStyle = goal;
      this.ctx.beginPath();
      this.ctx.arc(gx, gy, gr * 0.42, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 플레이어 아바타
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = trail;
    this.ctx.beginPath();
    this.ctx.arc(this.cx(this.pos[1]), this.cy(this.pos[0]), Math.max(4, this.cell * 0.27), 0, Math.PI * 2);
    this.ctx.fill();
  }

  fmt(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  bestKey() {
    return 'maze:best:' + this.size;
  }

  now() {
    return this.startedAt ? Date.now() - this.startedAt + this.penalty : 0;
  }

  showBest() {
    let v = null;
    try { v = localStorage.getItem(this.bestKey()); } catch (e) {}
    if (v) {
      this.el.best.textContent = this.fmt(Number(v));
      this.el.bestWrap.hidden = false;
    } else {
      this.el.bestWrap.hidden = true;
    }
  }

  showStamps() {
    this.el.stamps.textContent = '★'.repeat(this.got) + '☆'.repeat(this.stamps.length - this.got);
  }

  tick() {
    if (!this.done && this.startedAt) {
      this.el.time.textContent = this.fmt(this.now());
    }
  }

  say(text, cls) {
    this.el.note.textContent = text;
    this.el.note.classList.remove('warn', 'final');
    if (cls) this.el.note.classList.add(cls);
  }

  start(lv) {
    this.level = lv;
    this.size = MazeLogic.sizeFor(lv);
    this.maze = MazeLogic.generateMaze(this.size, lv);
    this.pos = [0, 0];
    this.path = [[0, 0]];
    this.seen = new Set();
    this.visible = new Set();
    this.stamps = MazeLogic.placeStamps(this.size);
    this.got = 0;
    this.blots = MazeLogic.placeBlots(this.size, MazeLogic.blotsFor(lv));
    this.trailLen = MazeLogic.trailFor(lv);
    this.moves = 0;
    this.penalty = 0;
    this.startedAt = 0;
    this.done = false;
    this.cleared = false;
    this.peeksLeft = MazeLogic.peeksFor(lv);
    this.peeksUsed = 0;
    this.hits = 0;
    this.hintPath = null;

    this.el.levelSelect.value = lv;
    this.el.moves.textContent = '0';
    this.el.time.textContent = '0:00';
    this.el.winOverlay.hidden = true;
    this.el.winOverlay.classList.remove('clear');
    this.el.btnHint.disabled = this.peeksLeft <= 0;

    document.body.classList.toggle('final-mode', MazeLogic.isFinal(lv));

    if (MazeLogic.isFinal(lv)) {
      this.say('마지막 8단계. 도장 3개, 얼룩 ' + this.blots.length + '마리, 엿보기 없음.', 'final');
      this.audio.startHeartbeat(1100);
    } else {
      this.audio.stopHeartbeat();
      this.say(this.blots.length
        ? '도장 3개를 모아야 출구가 열립니다. 잉크 얼룩 ' + this.blots.length + '개가 배회하고 있어요.'
        : '도장 3개를 모아야 출구가 열립니다.');
    }

    this.showStamps();
    this.showBest();
    this.look();

    clearInterval(this.ticking);
    this.ticking = setInterval(() => this.tick(), 250);

    this.showScreen('game');
    this.layout();
    this.el.cv.focus({ preventScroll: true });
  }

  look() {
    this.visible = MazeLogic.getReach(this.maze, this.pos, MazeLogic.radiusFor(this.level));
    this.visible.forEach(k => this.seen.add(k));
  }

  shake(cls) {
    this.el.cv.classList.remove('bump', 'hit');
    void this.el.cv.offsetWidth;
    this.el.cv.classList.add(cls);
  }

  moveBlots() {
    for (const b of this.blots) {
      const ns = MazeLogic.getNeighbors(this.maze, b.r, b.c);
      if (!ns.length) continue;
      let opts = ns.filter(([r, c]) => !(b.from && b.from[0] === r && b.from[1] === c));
      if (!opts.length) opts = ns;

      if (Math.random() < MazeLogic.blotChaseFor(this.level)) {
        opts.sort((a, z) => (Math.abs(a[0] - this.pos[0]) + Math.abs(a[1] - this.pos[1])) -
                            (Math.abs(z[0] - this.pos[0]) + Math.abs(z[1] - this.pos[1])));
        b.from = [b.r, b.c];
        b.r = opts[0][0];
        b.c = opts[0][1];
      } else {
        const p = opts[(Math.random() * opts.length) | 0];
        b.from = [b.r, b.c];
        b.r = p[0];
        b.c = p[1];
      }
    }
  }

  checkBlots() {
    for (const b of this.blots) {
      if (b.r === this.pos[0] && b.c === this.pos[1]) {
        this.hits++;
        this.penalty += 15000;
        this.seen = new Set(this.visible);
        this.path = [this.pos];
        this.say('얼룩에 닿았어요! 지도가 번지고 15초가 추가되었습니다.', 'warn');
        this.shake('hit');
        this.audio.playHit();

        const far = [...MazeLogic.getReach(this.maze, [b.r, b.c], 6)].map(k => MazeLogic.parseKey(k));
        const spot = far[(Math.random() * far.length) | 0];
        b.from = null;
        b.r = spot[0];
        b.c = spot[1];
        this.tick();
        return true;
      }
    }
    return false;
  }

  nearBlot() {
    const near = MazeLogic.getReach(this.maze, this.pos, 3);
    let closest = 99;
    for (const b of this.blots) {
      if (near.has(MazeLogic.key(b.r, b.c))) {
        const d = [...MazeLogic.getReach(this.maze, this.pos, 1)].includes(MazeLogic.key(b.r, b.c))
          ? 1
          : (MazeLogic.getReach(this.maze, this.pos, 2).has(MazeLogic.key(b.r, b.c)) ? 2 : 3);
        closest = Math.min(closest, d);
      }
    }
    this.audio.playNearBlot(closest);

    if (MazeLogic.isFinal(this.level)) {
      const target = closest < 99 ? Math.max(320, 320 + closest * 260) : 1100;
      this.audio.updateHeartbeatGap(target);
    }
  }

  move(d) {
    if (this.done || !this.maze) return;
    const [r, c] = this.pos;
    if (this.maze[r][c][d]) {
      this.audio.playBump();
      this.shake('bump');
      return;
    }

    this.pos = [r + DIRS[d][0], c + DIRS[d][1]];
    this.path.push(this.pos);
    this.moves++;
    this.el.moves.textContent = this.moves;

    if (!this.startedAt) this.startedAt = Date.now();
    this.audio.playStep(this.moves);
    this.look();

    // 도장 획득 체크
    for (const s of this.stamps) {
      if (!s.got && s.r === this.pos[0] && s.c === this.pos[1]) {
        s.got = true;
        this.got++;
        this.showStamps();
        MazeLogic.getReach(this.maze, [s.r, s.c], 3).forEach(k => this.seen.add(k));
        this.say(this.got === this.stamps.length
          ? '모든 도장을 찾았습니다! 출구가 열렸습니다.'
          : '도장 ' + this.got + '개 획득! ' + (this.stamps.length - this.got) + '개 남았어요.',
          MazeLogic.isFinal(this.level) ? 'final' : null);
        this.audio.playStamp();
      }
    }

    const step = MazeLogic.blotStepFor(this.level);
    let hit = this.checkBlots();
    if (!hit && this.moves % step === 0) {
      this.moveBlots();
      hit = this.checkBlots();
    }
    if (!hit) this.nearBlot();

    this.draw();

    // 출구 도달 및 단계 클리어 판정
    if (this.got === this.stamps.length && this.pos[0] === this.size - 1 && this.pos[1] === this.size - 1) {
      this.finish();
    }
  }

  finish() {
    this.done = true;
    clearInterval(this.ticking);
    this.audio.stopHeartbeat();

    this.elapsed = this.now();
    this.el.time.textContent = this.fmt(this.elapsed);
    this.el.btnHint.disabled = true;

    let prev = null;
    let record = false;
    try {
      prev = localStorage.getItem(this.bestKey());
      record = !prev || this.elapsed < Number(prev);
      if (record) localStorage.setItem(this.bestKey(), String(this.elapsed));
    } catch (e) {}
    this.showBest();

    const clean = !this.hits && !this.peeksUsed;

    if (MazeLogic.isFinal(this.level)) {
      this.cleared = true;
      this.el.winOverlay.classList.add('clear');
      this.el.winText.innerHTML = '축하합니다! 게임 전체 클리어!' +
        '<span class="score">' + '★'.repeat(this.got) + '☆'.repeat(this.stamps.length - this.got) + '</span>' +
        '<small>최종 8단계를 ' + this.moves + '번 움직여 ' + this.fmt(this.elapsed) + '만에 탈출 성공!' +
        (this.hits ? ' · 얼룩 ' + this.hits + '번 접촉' : ' · 잉크 얼룩 완벽 회피!') + '</small>';
      this.el.btnNext.textContent = '처음부터 다시';
      this.audio.playGameClear();
    } else {
      this.el.btnNext.textContent = '다음 단계';
      this.el.winText.innerHTML =
        (record ? '🎉 최고 기록 달성!' : (clean ? '✨ 완벽 탈출!' : '🚪 탈출 성공!')) +
        '<span class="score">' + '★'.repeat(this.got) + '☆'.repeat(this.stamps.length - this.got) + '</span>' +
        '<small>' + this.moves + '번 이동 · 소요시간 ' + this.fmt(this.elapsed) +
        (this.hits ? ' · 얼룩 ' + this.hits + '번' : '') +
        (this.peeksUsed ? ' · 엿보기 ' + this.peeksUsed + '번' : '') + '</small>';
      this.audio.playStageClear();
    }

    this.el.winOverlay.hidden = false;
    this.el.btnNext.focus();
  }

  peek() {
    if (this.done || !this.maze) return;
    if (this.peeksLeft <= 0) {
      this.say('이번 단계의 엿보기 횟수를 모두 사용했습니다.', 'warn');
      this.audio.beep(110, 0.12, 'square', 0.05);
      return;
    }
    if (!this.startedAt) this.startedAt = Date.now();

    this.peeksLeft--;
    this.peeksUsed++;
    this.penalty += 15000;

    const target = this.got === this.stamps.length
      ? [this.size - 1, this.size - 1]
      : (() => {
          const rest = this.stamps.filter(s => !s.got);
          let best = null;
          let bl = 1e9;
          for (const s of rest) {
            const p = MazeLogic.findShortestPath(this.maze, this.pos, [s.r, s.c]);
            if (p.length < bl) {
              bl = p.length;
              best = [s.r, s.c];
            }
          }
          return best;
        })();

    this.hintPath = MazeLogic.findShortestPath(this.maze, this.pos, target);
    this.hintUntil = Date.now() + 1600;
    this.say('가장 가까운 ' + (this.got === this.stamps.length ? '출구' : '도장') + '까지의 길을 엿봅니다 (+15초 벌칙).');
    this.el.btnHint.disabled = this.peeksLeft <= 0;

    this.audio.playPeek();
    this.tick();

    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.draw();
      if (Date.now() < this.hintUntil) {
        this.raf = requestAnimationFrame(loop);
      } else {
        this.hintPath = null;
        this.draw();
      }
    };
    loop();
  }

  bindEvents() {
    // 난이도 선택 버튼 (시작 화면)
    this.el.levelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.levelButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedStartLevel = Number(btn.dataset.level);
      });
    });

    // 게임 시작 버튼
    this.el.btnStart.addEventListener('click', () => {
      this.start(this.selectedStartLevel);
    });

    // 상단 드롭다운 난이도 변경
    this.el.levelSelect.addEventListener('change', () => {
      this.start(Number(this.el.levelSelect.value));
    });

    // 버튼 액션
    this.el.btnNext.addEventListener('click', () => {
      if (this.cleared) this.start(1);
      else this.start(this.level + 1);
    });

    this.el.btnAgain.addEventListener('click', () => this.start(this.level));
    this.el.btnHint.addEventListener('click', () => this.peek());
    this.el.btnHome.addEventListener('click', () => this.showScreen('start'));

    // 소리 켜기/끄기
    this.el.btnMute.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.el.btnMute.textContent = isMuted ? '🔇' : '🔊';
      this.el.btnMute.setAttribute('aria-label', isMuted ? '소리 켜기' : '소리 끄기');
    });

    // 키보드 조작 (방향키, WASD, 스페이스바 엿보기)
    const KEYS = {
      ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W',
      w: 'N', d: 'E', s: 'S', a: 'W',
      W: 'N', D: 'E', S: 'S', A: 'W'
    };

    window.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (this.el.startScreen.classList.contains('active')) return;

      if (e.key === ' ' && !this.done) {
        e.preventDefault();
        this.peek();
        return;
      }

      const d = KEYS[e.key];
      if (!d) return;
      e.preventDefault();
      this.move(d);
    }, { passive: false });

    // D-Pad 터치/마우스 조작
    document.querySelectorAll('.pad button').forEach(b => {
      b.addEventListener('click', () => this.move(b.dataset.dir));
    });

    // 캔버스 마우스/터치 드래그 조작
    let tx = 0, ty = 0;
    this.el.cv.addEventListener('pointerdown', e => {
      tx = e.clientX;
      ty = e.clientY;
    });

    this.el.cv.addEventListener('pointerup', e => {
      const dx = e.clientX - tx;
      const dy = e.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'));
    });

    window.addEventListener('resize', () => this.layout());
    if (document.fonts) {
      document.fonts.ready.then(() => this.layout());
    }
  }
}

// 애플리케이션 생성 및 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
});
