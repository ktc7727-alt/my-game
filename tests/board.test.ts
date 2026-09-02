import { describe, expect, it } from 'vitest';
import { Board } from '../src/game/board';
import type { Cell, GemType, Pos, SpecialKind } from '../src/game/types';
import { COLOR_GEM_TYPE } from '../src/game/constants';

/** 문자열 그림으로 보드를 만든다. 숫자=색, '*'=색 폭탄 */
function makeBoard(rowsText: string[], typeCount = 6): Board {
  const board = new Board({ rows: rowsText.length, cols: rowsText[0].length, typeCount, seed: 1 });
  let id = 10_000;
  board.grid = rowsText.map((line) =>
    [...line].map((ch): Cell => {
      if (ch === '*') return { id: id++, type: COLOR_GEM_TYPE, special: 'color' };
      return { id: id++, type: Number(ch) as GemType, special: 'none' };
    }),
  );
  return board;
}

/** 특정 칸을 특수 젬으로 바꾼다 */
function setCell(board: Board, p: Pos, type: GemType, special: SpecialKind): void {
  board.grid[p.r][p.c] = { id: 90_000 + p.r * 100 + p.c, type, special };
}

/** 보드 어디에도 3연속이 남아 있지 않은지 확인 */
function hasNoMatches(board: Board): boolean {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const t = board.grid[r][c]?.type;
      if (t === undefined || t === COLOR_GEM_TYPE) continue;
      if (c + 2 < board.cols && board.grid[r][c + 1]?.type === t && board.grid[r][c + 2]?.type === t)
        return false;
      if (r + 2 < board.rows && board.grid[r + 1][c]?.type === t && board.grid[r + 2][c]?.type === t)
        return false;
    }
  }
  return true;
}

/** 빈 칸이 남아 있지 않은지 확인 */
function isFull(board: Board): boolean {
  return board.grid.every((row) => row.every((cell) => cell !== null));
}

describe('보드 생성', () => {
  it('시작 보드에는 매치가 없고 빈 칸도 없다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const board = new Board({ rows: 8, cols: 8, typeCount: 6, seed });
      expect(hasNoMatches(board), `seed ${seed}`).toBe(true);
      expect(isFull(board), `seed ${seed}`).toBe(true);
    }
  });

  it('시작 보드에는 항상 둘 수 있는 수가 하나 이상 있다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const board = new Board({ rows: 8, cols: 8, typeCount: 6, seed });
      expect(board.hasValidMove(), `seed ${seed}`).toBe(true);
    }
  });

  it('같은 시드는 같은 보드를 만든다', () => {
    const a = new Board({ rows: 8, cols: 8, typeCount: 6, seed: 4242 });
    const b = new Board({ rows: 8, cols: 8, typeCount: 6, seed: 4242 });
    expect(a.toString()).toBe(b.toString());
  });
});

describe('스왑 규칙', () => {
  it('떨어져 있는 두 칸은 바꿀 수 없다', () => {
    const board = makeBoard([
      '012345',
      '123450',
      '234501',
      '345012',
      '450123',
      '501234',
    ]);
    const before = board.toString();
    const result = board.swap({ r: 0, c: 0 }, { r: 3, c: 3 });
    expect(result.valid).toBe(false);
    expect(board.toString()).toBe(before);
  });

  it('매치가 생기지 않는 스왑은 되돌려진다', () => {
    const board = makeBoard([
      '012345',
      '123450',
      '234501',
      '345012',
      '450123',
      '501234',
    ]);
    const before = board.toString();
    const result = board.swap({ r: 0, c: 0 }, { r: 0, c: 1 });
    expect(result.valid).toBe(false);
    expect(result.totalScore).toBe(0);
    expect(board.toString()).toBe(before);
  });

  it('3매치가 생기면 스왑이 성사되고 점수가 오른다', () => {
    // (5,0) 의 1 을 오른쪽과 바꾸면 0열에 1이 세로로 3개 모인다.
    const board = makeBoard([
      '234501',
      '345012',
      '450123',
      '145234',
      '123450',
      '210345',
    ]);
    const result = board.swap({ r: 5, c: 0 }, { r: 5, c: 1 });
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.cascades.length).toBeGreaterThan(0);
    expect(result.cascades[0].cleared.length).toBeGreaterThanOrEqual(3);
  });
});

describe('연쇄와 보드 무결성', () => {
  it('연쇄가 끝나면 빈 칸 없이 매치도 남지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const board = new Board({ rows: 8, cols: 8, typeCount: 6, seed });
      // 유효한 수를 30번 두면서 매번 보드 상태를 확인한다.
      for (let move = 0; move < 30; move++) {
        const hint = board.findHint();
        if (!hint) {
          board.shuffle();
          continue;
        }
        const result = board.swap(hint[0], hint[1]);
        expect(result.valid, `seed ${seed} move ${move}`).toBe(true);
        expect(isFull(board), `seed ${seed} move ${move}`).toBe(true);
        expect(hasNoMatches(board), `seed ${seed} move ${move}`).toBe(true);
      }
    }
  });

  it('연쇄가 깊어질수록 같은 개수라도 점수가 더 크다', () => {
    // 캐스케이드 배수는 index 에 비례해 커진다.
    const board = makeBoard([
      '234501',
      '345012',
      '450123',
      '145234',
      '123450',
      '210345',
    ]);
    const result = board.swap({ r: 5, c: 0 }, { r: 5, c: 1 });
    const steps = result.cascades;
    if (steps.length >= 2) {
      const perGem0 = steps[0].score / steps[0].cleared.length;
      const perGem1 = steps[1].score / steps[1].cleared.length;
      expect(perGem1).toBeGreaterThan(perGem0);
    }
    expect(result.totalScore).toBe(steps.reduce((s, x) => s + x.score, 0));
  });
});

describe('특수 젬 생성', () => {
  it('가로 4매치는 가로 라인 젬을 만든다', () => {
    // (2,2)=1 을 아래로 내리면 3행이 1,1,1,1 가로 4매치가 된다.
    const board = makeBoard([
      '234501',
      '345012',
      '401234',
      '115123',
      '234501',
      '345012',
    ]);
    const result = board.swap({ r: 2, c: 2 }, { r: 3, c: 2 });
    expect(result.valid).toBe(true);
    const created = result.cascades[0].created;
    expect(created.length).toBe(1);
    expect(created[0].cell.special).toBe('lineH');
    expect(created[0].pos).toEqual({ r: 3, c: 2 });
  });

  it('세로 4매치는 세로 라인 젬을 만든다', () => {
    // (2,1)=1 을 왼쪽으로 옮기면 0열이 1,1,1,1 세로 4매치가 된다.
    const board = makeBoard([
      '123450',
      '145012',
      '512345',
      '134501',
      '245012',
      '312345',
    ]);
    const result = board.swap({ r: 2, c: 0 }, { r: 2, c: 1 });
    expect(result.valid).toBe(true);
    const created = result.cascades[0].created;
    expect(created.length).toBe(1);
    expect(created[0].cell.special).toBe('lineV');
    expect(created[0].pos).toEqual({ r: 2, c: 0 });
  });

  it('5매치는 색 폭탄을 만든다', () => {
    // 0열에 1이 4개 있고, (2,1)=1 을 넣으면 세로 5매치가 된다.
    const board = makeBoard([
      '123450',
      '145012',
      '512345',
      '134501',
      '123045',
      '312345',
    ]);
    const result = board.swap({ r: 2, c: 0 }, { r: 2, c: 1 });
    expect(result.valid).toBe(true);
    const created = result.cascades[0].created;
    expect(created.length).toBe(1);
    expect(created[0].cell.special).toBe('color');
    expect(created[0].cell.type).toBe(COLOR_GEM_TYPE);
  });

  it('라인 젬이 매치에 휘말리면 그 줄 전체가 사라진다', () => {
    const board = makeBoard([
      '234501',
      '345012',
      '450123',
      '211203',
      '345012',
      '234501',
    ]);
    // (3,2) 는 색이 1 인 가로 라인 젬이다.
    setCell(board, { r: 3, c: 2 }, 1, 'lineH');

    // (2,3)=1 을 내려 3행에 1 세 개(라인 젬 포함)를 만든다.
    const result = board.swap({ r: 2, c: 3 }, { r: 3, c: 3 });
    expect(result.valid).toBe(true);

    const firstStep = result.cascades[0];
    const clearedInRow3 = firstStep.cleared.filter((x) => x.pos.r === 3);
    // 3매치 3칸이 아니라 3행 6칸 전부가 사라져야 한다.
    expect(clearedInRow3.length).toBe(board.cols);
    expect(isFull(board)).toBe(true);
  });

  it('폭탄 젬은 주변 3x3 을 함께 지운다', () => {
    const board = makeBoard([
      '234501',
      '345012',
      '450123',
      '211203',
      '345012',
      '234501',
    ]);
    setCell(board, { r: 3, c: 2 }, 1, 'bomb');

    const result = board.swap({ r: 2, c: 3 }, { r: 3, c: 3 });
    expect(result.valid).toBe(true);

    const clearedKeys = new Set(result.cascades[0].cleared.map((x) => `${x.pos.r},${x.pos.c}`));
    // 폭탄 중심 (3,2) 의 3x3 이웃이 모두 제거 대상에 들어가야 한다.
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        expect(clearedKeys.has(`${3 + dr},${2 + dc}`), `(${3 + dr},${2 + dc})`).toBe(true);
      }
    }
  });
});

describe('색 폭탄', () => {
  it('색 폭탄을 옆 젬과 바꾸면 그 색이 전부 사라진다', () => {
    const board = makeBoard([
      '234501',
      '345012',
      '450123',
      '345012',
      '*34501',
      '234501',
    ]);
    const targetType = board.at({ r: 4, c: 1 })!.type;
    const countBefore = countType(board, targetType);
    expect(countBefore).toBeGreaterThan(0);

    const result = board.swap({ r: 4, c: 0 }, { r: 4, c: 1 });
    expect(result.valid).toBe(true);
    expect(result.cascades[0].cleared.length).toBeGreaterThanOrEqual(countBefore);
    expect(isFull(board)).toBe(true);
  });

  it('색 폭탄은 지목한 색만 지우고 다른 색은 건드리지 않는다', () => {
    // 지목할 색(2)은 보드에 2개뿐이고, 가장 흔한 색은 0 이다.
    // 색 폭탄 효과가 이중으로 퍼지면 0 까지 쓸려나가므로 그 차이로 버그를 잡는다.
    const board = makeBoard([
      '010101',
      '101010',
      '010101',
      '101010',
      '*21010',
      '010102',
    ]);
    const targetType = board.at({ r: 4, c: 1 })!.type;
    expect(targetType).toBe(2);

    const result = board.swap({ r: 4, c: 0 }, { r: 4, c: 1 });
    expect(result.valid).toBe(true);

    // 첫 단계에서 사라진 것은 지목한 색과 색 폭탄 자신뿐이어야 한다.
    for (const entry of result.cascades[0].cleared) {
      expect(
        entry.cell.type === targetType || entry.cell.type === COLOR_GEM_TYPE,
        `(${entry.pos.r},${entry.pos.c}) 의 색 ${entry.cell.type}`,
      ).toBe(true);
    }
  });

  it('색 폭탄이 있으면 힌트가 항상 존재한다', () => {
    const board = makeBoard([
      '010101',
      '101010',
      '010101',
      '101010',
      '01*101',
      '101010',
    ]);
    expect(board.findHint()).not.toBeNull();
    expect(board.hasValidMove()).toBe(true);
  });
});

describe('셔플', () => {
  it('셔플 후에는 매치가 없고 둘 수 있는 수가 있다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const board = new Board({ rows: 8, cols: 8, typeCount: 6, seed });
      board.shuffle();
      expect(hasNoMatches(board), `seed ${seed}`).toBe(true);
      expect(board.hasValidMove(), `seed ${seed}`).toBe(true);
      expect(isFull(board), `seed ${seed}`).toBe(true);
    }
  });

  it('셔플은 젬 개수를 바꾸지 않는다', () => {
    const board = new Board({ rows: 8, cols: 8, typeCount: 6, seed: 7 });
    const before = countAll(board);
    board.shuffle();
    expect(countAll(board)).toBe(before);
  });
});

function countType(board: Board, type: GemType): number {
  let n = 0;
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++) if (board.grid[r][c]?.type === type) n++;
  return n;
}

function countAll(board: Board): number {
  let n = 0;
  for (let r = 0; r < board.rows; r++)
    for (let c = 0; c < board.cols; c++) if (board.grid[r][c]) n++;
  return n;
}
