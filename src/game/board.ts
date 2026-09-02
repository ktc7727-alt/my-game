import { Rng } from './rng';
import {
  COLOR_GEM_TYPE,
  CASCADE_MULTIPLIER_STEP,
  SCORE_PER_GEM,
  SPECIAL_CREATE_BONUS,
} from './constants';
import type { CascadeStep, Cell, GemType, Pos, SpecialKind, SwapResult } from './types';

/** 가로/세로 연속된 같은 색 묶음 */
interface Run {
  cells: Pos[];
  horizontal: boolean;
  type: GemType;
}

/** 겹치는 Run 들을 합친 하나의 매치 덩어리 (L자, T자 포함) */
interface MatchGroup {
  type: GemType;
  cells: Pos[];
  maxHoriz: number;
  maxVert: number;
  /** 가로 run 과 세로 run 이 만나는 지점들 (특수 젬 생성 위치 후보) */
  intersections: Pos[];
}

export interface BoardOptions {
  rows: number;
  cols: number;
  typeCount: number;
  seed?: number;
}

export class Board {
  readonly rows: number;
  readonly cols: number;
  readonly typeCount: number;

  /** grid[row][col], 위에서 아래로 / 왼쪽에서 오른쪽으로 */
  grid: (Cell | null)[][];

  private rng: Rng;
  private nextId = 1;

  constructor(opts: BoardOptions) {
    this.rows = opts.rows;
    this.cols = opts.cols;
    this.typeCount = opts.typeCount;
    this.rng = new Rng(opts.seed);
    this.grid = [];
    this.fillInitial();
  }

  // ────────────────────────────── 기본 접근자 ──────────────────────────────

  at(p: Pos): Cell | null {
    if (!this.inBounds(p)) return null;
    return this.grid[p.r][p.c];
  }

  inBounds(p: Pos): boolean {
    return p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols;
  }

  private key(p: Pos): number {
    return p.r * this.cols + p.c;
  }

  private fromKey(k: number): Pos {
    return { r: Math.floor(k / this.cols), c: k % this.cols };
  }

  private makeCell(type: GemType, special: SpecialKind = 'none'): Cell {
    return { id: this.nextId++, type, special };
  }

  // ────────────────────────────── 초기 배치 ──────────────────────────────

  /**
   * 시작 시점에 이미 매치된 상태가 없도록 보드를 채운다.
   * 채우면서 직전 두 칸과 같은 색이 되는 후보를 제외하는 방식이라 재시도가 필요 없다.
   */
  private fillInitial(): void {
    this.grid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => null as Cell | null),
    );

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const banned = new Set<GemType>();
        // 왼쪽으로 같은 색이 2개 연속이면 그 색은 금지
        if (c >= 2 && this.grid[r][c - 1]?.type === this.grid[r][c - 2]?.type) {
          banned.add(this.grid[r][c - 1]!.type);
        }
        // 위쪽으로 같은 색이 2개 연속이면 그 색은 금지
        if (r >= 2 && this.grid[r - 1][c]?.type === this.grid[r - 2][c]?.type) {
          banned.add(this.grid[r - 1][c]!.type);
        }
        const choices: GemType[] = [];
        for (let t = 0; t < this.typeCount; t++) if (!banned.has(t)) choices.push(t);
        this.grid[r][c] = this.makeCell(choices[this.rng.int(choices.length)]);
      }
    }

    // 둘 수 있는 수가 하나도 없는 보드가 나오면 다시 섞는다.
    if (!this.hasValidMove()) this.shuffle();
  }

  // ────────────────────────────── 매치 탐색 ──────────────────────────────

  private collectRuns(): Run[] {
    const runs: Run[] = [];

    // 가로 방향
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const type = this.grid[r][c]?.type;
        if (type === undefined || type === COLOR_GEM_TYPE) {
          c++;
          continue;
        }
        let end = c;
        while (end + 1 < this.cols && this.grid[r][end + 1]?.type === type) end++;
        const len = end - c + 1;
        if (len >= 3) {
          const cells: Pos[] = [];
          for (let x = c; x <= end; x++) cells.push({ r, c: x });
          runs.push({ cells, horizontal: true, type });
        }
        c = end + 1;
      }
    }

    // 세로 방향
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const type = this.grid[r][c]?.type;
        if (type === undefined || type === COLOR_GEM_TYPE) {
          r++;
          continue;
        }
        let end = r;
        while (end + 1 < this.rows && this.grid[end + 1][c]?.type === type) end++;
        const len = end - r + 1;
        if (len >= 3) {
          const cells: Pos[] = [];
          for (let y = r; y <= end; y++) cells.push({ r: y, c });
          runs.push({ cells, horizontal: false, type });
        }
        r = end + 1;
      }
    }

    return runs;
  }

  /** 셀을 공유하는 run 들을 하나의 그룹으로 합친다 (L자/T자 매치 판정용) */
  private findMatchGroups(): MatchGroup[] {
    const runs = this.collectRuns();
    if (runs.length === 0) return [];

    // union-find 로 run 들을 묶는다
    const parent = runs.map((_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    const owner = new Map<number, number>(); // cellKey -> run index
    runs.forEach((run, i) => {
      for (const p of run.cells) {
        const k = this.key(p);
        const prev = owner.get(k);
        if (prev === undefined) owner.set(k, i);
        else union(prev, i);
      }
    });

    const buckets = new Map<number, Run[]>();
    runs.forEach((run, i) => {
      const root = find(i);
      const list = buckets.get(root);
      if (list) list.push(run);
      else buckets.set(root, [run]);
    });

    const groups: MatchGroup[] = [];
    for (const list of buckets.values()) {
      const cellKeys = new Set<number>();
      let maxHoriz = 0;
      let maxVert = 0;
      const horizKeys = new Set<number>();
      const vertKeys = new Set<number>();

      for (const run of list) {
        for (const p of run.cells) {
          const k = this.key(p);
          cellKeys.add(k);
          if (run.horizontal) horizKeys.add(k);
          else vertKeys.add(k);
        }
        if (run.horizontal) maxHoriz = Math.max(maxHoriz, run.cells.length);
        else maxVert = Math.max(maxVert, run.cells.length);
      }

      const intersections: Pos[] = [];
      for (const k of horizKeys) if (vertKeys.has(k)) intersections.push(this.fromKey(k));

      groups.push({
        type: list[0].type,
        cells: [...cellKeys].map((k) => this.fromKey(k)),
        maxHoriz,
        maxVert,
        intersections,
      });
    }

    return groups;
  }

  /** 이 그룹이 어떤 특수 젬을 만들어내는지 */
  private specialFor(group: MatchGroup): SpecialKind {
    if (group.maxHoriz >= 5 || group.maxVert >= 5) return 'color';
    if (group.maxHoriz >= 3 && group.maxVert >= 3) return 'bomb';
    if (group.maxHoriz >= 4) return 'lineH';
    if (group.maxVert >= 4) return 'lineV';
    return 'none';
  }

  /** 특수 젬이 놓일 자리. 방금 플레이어가 움직인 칸을 최우선으로 삼는다. */
  private specialSpawnPos(group: MatchGroup, hints: Pos[]): Pos {
    const inGroup = (p: Pos) => group.cells.some((g) => g.r === p.r && g.c === p.c);
    for (const h of hints) if (inGroup(h)) return h;
    if (group.intersections.length > 0) return group.intersections[0];
    return group.cells[Math.floor(group.cells.length / 2)];
  }

  // ────────────────────────────── 특수 젬 확산 ──────────────────────────────

  /** 보드에 가장 많이 남아 있는 색. 연쇄로 터진 색 폭탄의 대상이 된다. */
  private mostCommonType(): GemType {
    const counts = new Map<GemType, number>();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell || cell.type === COLOR_GEM_TYPE) continue;
        counts.set(cell.type, (counts.get(cell.type) ?? 0) + 1);
      }
    }
    let best: GemType = 0;
    let bestCount = -1;
    for (const [type, n] of counts) {
      if (n > bestCount) {
        best = type;
        bestCount = n;
      }
    }
    return best;
  }

  /**
   * 제거 대상 집합을 받아, 그 안에 포함된 특수 젬의 효과를 연쇄적으로 펼친다.
   * 이미 처리한 칸은 다시 넣지 않으므로 반드시 종료된다.
   */
  private expandSpecials(seed: Iterable<number>): Set<number> {
    const result = new Set<number>();
    const queue: number[] = [...seed];

    while (queue.length > 0) {
      const k = queue.pop()!;
      if (result.has(k)) continue;
      result.add(k);

      const p = this.fromKey(k);
      const cell = this.grid[p.r][p.c];
      if (!cell || cell.special === 'none') continue;

      const push = (q: Pos) => {
        if (!this.inBounds(q)) return;
        if (!this.grid[q.r][q.c]) return;
        const nk = this.key(q);
        if (!result.has(nk)) queue.push(nk);
      };

      switch (cell.special) {
        case 'lineH':
          for (let c = 0; c < this.cols; c++) push({ r: p.r, c });
          break;
        case 'lineV':
          for (let r = 0; r < this.rows; r++) push({ r, c: p.c });
          break;
        case 'bomb':
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) push({ r: p.r + dr, c: p.c + dc });
          break;
        case 'color': {
          // 연쇄로 터진 색 폭탄은 보드에서 가장 흔한 색을 쓸어담는다.
          const target = this.mostCommonType();
          for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
              if (this.grid[r][c]?.type === target) push({ r, c });
          break;
        }
      }
    }

    return result;
  }

  // ────────────────────────────── 중력 / 리필 ──────────────────────────────

  private applyGravity(step: CascadeStep): void {
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        if (write !== r) {
          this.grid[write][c] = cell;
          this.grid[r][c] = null;
          step.falls.push({ id: cell.id, from: { r, c }, to: { r: write, c } });
        }
        write--;
      }
      // 남은 윗칸을 새 젬으로 채운다. 화면 밖(-1, -2 ...)에서 떨어지는 것처럼 보이게 한다.
      let spawnRow = -1;
      for (let r = write; r >= 0; r--) {
        const cell = this.makeCell(this.rng.int(this.typeCount));
        this.grid[r][c] = cell;
        step.spawned.push({ pos: { r, c }, cell, spawnRow });
        spawnRow--;
      }
    }
  }

  // ────────────────────────────── 연쇄 처리 ──────────────────────────────

  /**
   * 매치가 없어질 때까지 제거 → 중력 → 리필을 반복하고, 각 단계를 기록해 돌려준다.
   * @param hints 특수 젬을 만들 자리 우선순위 (보통 방금 스왑한 두 칸)
   * @param preSeed 매치와 무관하게 먼저 터뜨릴 칸들 (색 폭탄 스왑용)
   */
  private runCascades(hints: Pos[], preSeed?: Set<number>): CascadeStep[] {
    const steps: CascadeStep[] = [];
    let index = 0;
    let pending = preSeed;

    for (;;) {
      const step: CascadeStep = { index, cleared: [], created: [], falls: [], spawned: [], score: 0 };

      let baseKeys: Set<number>;
      const createdAt = new Map<number, { special: SpecialKind; type: GemType }>();

      if (pending && pending.size > 0) {
        baseKeys = pending;
        pending = undefined;
      } else {
        const groups = this.findMatchGroups();
        if (groups.length === 0) break;

        baseKeys = new Set<number>();
        for (const group of groups) {
          for (const p of group.cells) baseKeys.add(this.key(p));
          const special = this.specialFor(group);
          if (special !== 'none') {
            const pos = this.specialSpawnPos(group, hints);
            createdAt.set(this.key(pos), {
              special,
              type: special === 'color' ? COLOR_GEM_TYPE : group.type,
            });
            step.score += SPECIAL_CREATE_BONUS[special] ?? 0;
          }
        }
      }

      // 특수 젬 효과를 펼친 뒤, 새로 만들어질 특수 젬 자리는 제거 대상에서 뺀다.
      const allKeys = this.expandSpecials(baseKeys);
      for (const k of createdAt.keys()) allKeys.delete(k);

      const multiplier = 1 + index * CASCADE_MULTIPLIER_STEP;

      for (const k of allKeys) {
        const p = this.fromKey(k);
        const cell = this.grid[p.r][p.c];
        if (!cell) continue;
        step.cleared.push({ pos: p, cell });
        this.grid[p.r][p.c] = null;
      }
      step.score += Math.round(step.cleared.length * SCORE_PER_GEM * multiplier);

      for (const [k, spec] of createdAt) {
        const p = this.fromKey(k);
        const replacedId = this.grid[p.r][p.c]?.id ?? null;
        const cell = this.makeCell(spec.type, spec.special);
        this.grid[p.r][p.c] = cell;
        step.created.push({ pos: p, cell, replacedId });
      }

      // 아무것도 지워지지 않았다면 무한 루프이므로 중단한다.
      if (step.cleared.length === 0 && step.created.length === 0) break;

      this.applyGravity(step);
      steps.push(step);
      index++;
      // 첫 단계 이후에는 플레이어가 움직인 칸이라는 개념이 없다.
      hints = [];
    }

    return steps;
  }

  // ────────────────────────────── 플레이어 조작 ──────────────────────────────

  static areAdjacent(a: Pos, b: Pos): boolean {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  private swapCells(a: Pos, b: Pos): void {
    const tmp = this.grid[a.r][a.c];
    this.grid[a.r][a.c] = this.grid[b.r][b.c];
    this.grid[b.r][b.c] = tmp;
  }

  /**
   * 두 칸을 맞바꾼다. 매치가 생기지 않으면 원상복구하고 valid:false 를 돌려준다.
   */
  swap(a: Pos, b: Pos): SwapResult {
    const empty: SwapResult = { valid: false, cascades: [], totalScore: 0 };
    if (!this.inBounds(a) || !this.inBounds(b)) return empty;
    if (!Board.areAdjacent(a, b)) return empty;

    const ca = this.grid[a.r][a.c];
    const cb = this.grid[b.r][b.c];
    if (!ca || !cb) return empty;

    // 색 폭탄은 매치 없이도 발동한다.
    if (ca.special === 'color' || cb.special === 'color') {
      this.swapCells(a, b);
      const seed = new Set<number>([this.key(a), this.key(b)]);

      if (ca.special === 'color' && cb.special === 'color') {
        // 둘 다 색 폭탄이면 보드 전체를 쓸어버린다.
        for (let r = 0; r < this.rows; r++)
          for (let c = 0; c < this.cols; c++) seed.add(this.key({ r, c }));
      } else {
        const target = ca.special === 'color' ? cb.type : ca.type;
        for (let r = 0; r < this.rows; r++)
          for (let c = 0; c < this.cols; c++)
            if (this.grid[r][c]?.type === target) seed.add(this.key({ r, c }));
      }

      // 색 폭탄이 무엇을 지울지는 위에서 이미 정했다.
      // 표시를 남겨두면 expandSpecials 가 '가장 흔한 색'으로 한 번 더 퍼뜨려
      // 지목하지 않은 색까지 쓸어버리므로, 여기서 특수 표시를 거둔다.
      for (const cell of [this.grid[a.r][a.c], this.grid[b.r][b.c]]) {
        if (cell?.special === 'color') cell.special = 'none';
      }

      const cascades = this.runCascades([], seed);
      return { valid: true, cascades, totalScore: sumScore(cascades) };
    }

    this.swapCells(a, b);
    if (this.findMatchGroups().length === 0) {
      this.swapCells(a, b); // 되돌리기
      return empty;
    }

    const cascades = this.runCascades([a, b]);
    return { valid: true, cascades, totalScore: sumScore(cascades) };
  }

  /** 지금 둘 수 있는 수가 하나라도 있는지 */
  hasValidMove(): boolean {
    return this.findHint() !== null;
  }

  /**
   * 힌트용으로 유효한 스왑을 하나 찾는다. 보드를 실제로 바꾸지 않는다.
   * (오른쪽/아래쪽만 검사하면 모든 인접 쌍을 한 번씩 보게 된다)
   */
  findHint(): [Pos, Pos] | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell?.special === 'color') {
          // 색 폭탄은 아무 인접 젬과 바꿔도 발동한다.
          const partner = c + 1 < this.cols ? { r, c: c + 1 } : r + 1 < this.rows ? { r: r + 1, c } : null;
          if (partner) return [{ r, c }, partner];
        }
        for (const b of [
          { r, c: c + 1 },
          { r: r + 1, c },
        ]) {
          if (!this.inBounds(b)) continue;
          if (this.grid[b.r][b.c]?.special === 'color') return [{ r, c }, b];
          this.swapCells({ r, c }, b);
          const found = this.collectRuns().length > 0;
          this.swapCells({ r, c }, b);
          if (found) return [{ r, c }, b];
        }
      }
    }
    return null;
  }

  /**
   * 둘 수 있는 수가 없을 때 보드를 다시 섞는다.
   * 매치가 없으면서 최소 한 수는 존재하는 배치가 나올 때까지 반복한다.
   */
  shuffle(): void {
    const cells: Cell[] = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) if (this.grid[r][c]) cells.push(this.grid[r][c]!);

    for (let attempt = 0; attempt < 200; attempt++) {
      this.rng.shuffle(cells);
      let i = 0;
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) this.grid[r][c] = cells[i++] ?? null;

      if (this.collectRuns().length === 0 && this.findHint() !== null) return;
    }

    // 극히 드문 경우: 섞어도 조건을 못 맞추면 처음부터 다시 만든다.
    this.fillInitial();
  }

  /** 디버깅/테스트용 문자열 덤프 */
  toString(): string {
    return this.grid
      .map((row) =>
        row
          .map((cell) => {
            if (!cell) return '.';
            if (cell.special === 'color') return '*';
            return String(cell.type);
          })
          .join(''),
      )
      .join('\n');
  }
}

function sumScore(cascades: CascadeStep[]): number {
  return cascades.reduce((total, step) => total + step.score, 0);
}
