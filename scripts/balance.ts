/**
 * 점수 밸런스 측정 스크립트.
 *   npm run balance
 * 무작위로 유효한 수만 두는 플레이를 여러 판 돌려 25수 총점 분포를 출력한다.
 * 목표 점수(targetScoreForLevel)를 조정할 때 근거로 쓴다.
 */
import { Board } from '../src/game/board';
import { COLS, GEM_TYPES, MOVES_PER_LEVEL, ROWS } from '../src/game/constants';

/** 무작위로 유효한 수를 골라 한 판을 끝까지 두고 총점을 잰다. */
function playOneGame(seed: number): { total: number; best: number } {
  const board = new Board({ rows: ROWS, cols: COLS, typeCount: GEM_TYPES, seed });
  let total = 0;
  let best = 0;

  for (let move = 0; move < MOVES_PER_LEVEL; move++) {
    // 가능한 모든 수를 모아 그중 하나를 무작위로 고른다(평균적인 플레이어에 가깝게).
    const moves: [{ r: number; c: number }, { r: number; c: number }][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const b of [{ r, c: c + 1 }, { r: r + 1, c }]) {
          if (!board.inBounds(b)) continue;
          const snapshot = board.grid.map((row) => row.slice());
          const result = board.swap({ r, c }, b);
          board.grid = snapshot;
          if (result.valid) moves.push([{ r, c }, b]);
        }
      }
    }
    if (moves.length === 0) { board.shuffle(); continue; }
    const pick = moves[Math.floor(Math.random() * moves.length)];
    const result = board.swap(pick[0], pick[1]);
    total += result.totalScore;
    best = Math.max(best, result.totalScore);
  }
  return { total, best };
}

const runs = 200;
const totals: number[] = [];
const bests: number[] = [];
for (let i = 1; i <= runs; i++) {
  const r = playOneGame(i);
  totals.push(r.total);
  bests.push(r.best);
}
totals.sort((a, b) => a - b);
bests.sort((a, b) => a - b);
const pct = (arr: number[], p: number) => arr[Math.floor(arr.length * p)];

console.log(`${MOVES_PER_LEVEL}수 총점  중앙값 ${pct(totals, 0.5)}  하위25% ${pct(totals, 0.25)}  상위25% ${pct(totals, 0.75)}  최대 ${totals[totals.length-1]}`);
console.log(`한 수 최고점 중앙값 ${pct(bests, 0.5)}  상위10% ${pct(bests, 0.9)}  최대 ${bests[bests.length-1]}`);
