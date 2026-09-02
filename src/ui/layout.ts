import { COLS, ROWS } from '../game/constants';

/**
 * 디자인 기준 해상도(세로). Scale.FIT 으로 기기 화면에 맞춰 늘어난다.
 * 9:18.5 는 요즘 폰 대부분과 가까워, 가로 폭을 꽉 채우면서 위아래 여백이 거의 남지 않는다.
 */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1480;

/** 보드가 차지하는 영역 */
export const BOARD_MARGIN_X = 34;
export const BOARD_TOP = 430;
export const BOARD_WIDTH = GAME_WIDTH - BOARD_MARGIN_X * 2;
export const CELL = BOARD_WIDTH / COLS;
export const BOARD_HEIGHT = CELL * ROWS;
export const BOARD_LEFT = BOARD_MARGIN_X;
export const BOARD_BOTTOM = BOARD_TOP + BOARD_HEIGHT;

/** 젬 스프라이트 한 변의 길이 (칸보다 살짝 작게 두어 격자가 보이게 한다) */
export const GEM_SIZE = CELL * 0.92;

export function cellCenterX(col: number): number {
  return BOARD_LEFT + col * CELL + CELL / 2;
}

export function cellCenterY(row: number): number {
  return BOARD_TOP + row * CELL + CELL / 2;
}

/** 화면 좌표 → 보드 좌표. 보드 밖이면 null */
export function pointToCell(x: number, y: number): { r: number; c: number } | null {
  const c = Math.floor((x - BOARD_LEFT) / CELL);
  const r = Math.floor((y - BOARD_TOP) / CELL);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { r, c };
}

export const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const PALETTE = {
  bgTop: 0x141a36,
  bgBottom: 0x0b1021,
  panel: 0x1c2450,
  panelLight: 0x27306a,
  accent: 0x4dd4ff,
  accentWarm: 0xffd166,
  danger: 0xff4d6d,
  text: '#f2f5ff',
  textDim: '#9aa5cf',
};
