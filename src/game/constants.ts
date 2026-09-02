/** 보드 크기 */
export const ROWS = 8;
export const COLS = 8;

/** 사용할 젬 색상 수. 늘리면 쉬워지고 줄이면 어려워진다. */
export const GEM_TYPES = 6;

/** 색 폭탄은 특정 색에 속하지 않으므로 매치 판정에서 제외되는 타입 값을 쓴다. */
export const COLOR_GEM_TYPE = -1;

/** 점수 규칙 */
export const SCORE_PER_GEM = 50;
/** 연쇄 1단계마다 붙는 배수 증가폭 (0단계 x1, 1단계 x1.5, 2단계 x2 ...) */
export const CASCADE_MULTIPLIER_STEP = 0.5;
/** 특수 젬을 만들었을 때 추가 점수 */
export const SPECIAL_CREATE_BONUS: Record<string, number> = {
  lineH: 200,
  lineV: 200,
  bomb: 400,
  color: 800,
};

/** 한 판의 기본 이동 횟수 */
export const MOVES_PER_LEVEL = 25;

/**
 * 레벨별 목표 점수.
 * 무작위로 유효한 수만 두는 200판 시뮬레이션에서 25수 총점 중앙값이 약 8,600점이었다.
 * 레벨 1을 그 절반 근처에 두어 첫 판은 대부분 넘기고, 레벨 4~5 부터 벽이 오도록 잡았다.
 */
export function targetScoreForLevel(level: number): number {
  return 4800 + (level - 1) * 1500;
}

/** 목표 달성 후 남은 이동 한 번당 주는 보너스 점수 */
export const MOVE_BONUS = 200;

/** 젬 색상 팔레트 (색약 사용자를 위해 모양도 함께 다르게 그린다) */
export const GEM_COLORS = [
  0xff4d6d, // 0 red
  0x4dd4ff, // 1 cyan
  0x9d7bff, // 2 purple
  0x4ade80, // 3 green
  0xffd166, // 4 yellow
  0xff9f45, // 5 orange
];

export const GEM_SHAPES = ['circle', 'square', 'diamond', 'triangle', 'hexagon', 'star'] as const;
export type GemShape = (typeof GEM_SHAPES)[number];
