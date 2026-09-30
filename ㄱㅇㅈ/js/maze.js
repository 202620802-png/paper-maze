/* ==========================================
   종이 미로: 잉크 얼룩의 추격 - Maze Generator & Algorithms
   ========================================== */

const DIRS = {
  N: [-1, 0, 'S'],
  E: [0, 1, 'W'],
  S: [1, 0, 'N'],
  W: [0, -1, 'E']
};

class MazeLogic {
  static key(r, c) {
    return r + ',' + c;
  }

  static parseKey(k) {
    return k.split(',').map(Number);
  }

  static isFinal(lv) {
    return lv >= 8;
  }

  static sizeFor(lv) {
    return this.isFinal(lv) ? 29 : Math.min(11 + (lv - 1) * 2, 29);
  }

  static radiusFor(lv) {
    return this.isFinal(lv) ? 1 : Math.max(2, 4 - Math.floor(lv / 3));
  }

  static blotsFor(lv) {
    return this.isFinal(lv) ? 4 : (lv < 2 ? 0 : Math.min(3, 1 + Math.floor((lv - 2) / 3)));
  }

  static peeksFor(lv) {
    return this.isFinal(lv) ? 0 : 2;
  }

  static trailFor(lv) {
    return this.isFinal(lv) ? 10 : 22;
  }

  static loopFactor(lv) {
    return this.isFinal(lv) ? 0.07 : 0.04;
  }

  static blotChaseFor(lv) {
    return this.isFinal(lv) ? 0.72 : 0.5;
  }

  static blotStepFor(lv) {
    return this.isFinal(lv) ? 1 : 2; // 8단계는 매 이동마다 얼룩 이동
  }

  /* DFS + Loop Insertion (Braid Maze) 알고리즘 */
  static generateMaze(n, lv) {
    const grid = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ N: 1, E: 1, S: 1, W: 1, v: false }))
    );

    const stack = [[0, 0]];
    grid[0][0].v = true;

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [];

      for (const d in DIRS) {
        const nr = r + DIRS[d][0];
        const nc = c + DIRS[d][1];
        if (nr >= 0 && nc >= 0 && nr < n && nc < n && !grid[nr][nc].v) {
          opts.push([d, nr, nc]);
        }
      }

      if (!opts.length) {
        stack.pop();
        continue;
      }

      const [d, nr, nc] = opts[(Math.random() * opts.length) | 0];
      grid[r][c][d] = 0;
      grid[nr][nc][DIRS[d][2]] = 0;
      grid[nr][nc].v = true;
      stack.push([nr, nc]);
    }

    // 통로 루프 추가 (다중 경로 형성)
    const loops = Math.floor(n * n * this.loopFactor(lv));
    for (let i = 0; i < loops; i++) {
      const r = (Math.random() * n) | 0;
      const c = (Math.random() * n) | 0;
      const ds = Object.keys(DIRS).filter(d => {
        const nr = r + DIRS[d][0];
        const nc = c + DIRS[d][1];
        return nr >= 0 && nc >= 0 && nr < n && nc < n && grid[r][c][d];
      });
      if (!ds.length) continue;
      const d = ds[(Math.random() * ds.length) | 0];
      grid[r][c][d] = 0;
      grid[r + DIRS[d][0]][c + DIRS[d][1]][DIRS[d][2]] = 0;
    }

    return grid;
  }

  static getNeighbors(maze, r, c) {
    const out = [];
    for (const d in DIRS) {
      if (!maze[r][c][d]) {
        out.push([r + DIRS[d][0], c + DIRS[d][1]]);
      }
    }
    return out;
  }

  /* BFS 시야 시야각 탐색 */
  static getReach(maze, from, depth) {
    const out = new Set([this.key(from[0], from[1])]);
    let frontier = [from];

    for (let s = 0; s < depth && frontier.length; s++) {
      const nxt = [];
      for (const [r, c] of frontier) {
        for (const [nr, nc] of this.getNeighbors(maze, r, c)) {
          const k = this.key(nr, nc);
          if (out.has(k)) continue;
          out.add(k);
          nxt.push([nr, nc]);
        }
      }
      frontier = nxt;
    }
    return out;
  }

  /* 최단 경로 탐색 (BFS) */
  static findShortestPath(maze, from, to) {
    const prev = new Map([[this.key(from[0], from[1]), null]]);
    const q = [from];

    while (q.length) {
      const [r, c] = q.shift();
      if (r === to[0] && c === to[1]) break;

      for (const [nr, nc] of this.getNeighbors(maze, r, c)) {
        const k = this.key(nr, nc);
        if (prev.has(k)) continue;
        prev.set(k, [r, c]);
        q.push([nr, nc]);
      }
    }

    const out = [];
    let cur = to;
    while (cur) {
      out.push(cur);
      cur = prev.get(this.key(cur[0], cur[1]));
    }
    return out.reverse();
  }

  static placeStamps(n) {
    const spots = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r + c > 3 && (n - 1 - r) + (n - 1 - c) > 3) {
          spots.push([r, c]);
        }
      }
    }
    const out = [];
    for (let i = 0; i < 3 && spots.length; i++) {
      const [r, c] = spots.splice((Math.random() * spots.length) | 0, 1)[0];
      out.push({ r, c, got: false });
    }
    return out;
  }

  static placeBlots(n, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      let r, c;
      do {
        r = (Math.random() * n) | 0;
        c = (Math.random() * n) | 0;
      } while (r + c < n);
      out.push({ r, c, from: null });
    }
    return out;
  }
}

window.MazeLogic = MazeLogic;
