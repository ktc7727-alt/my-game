/** 젬 색상 종류. 보드 생성 시 typeCount 로 실제 사용 개수를 정한다. */
export type GemType = number;

/** 특수 젬 종류. 4매치 이상에서 생성된다. */
export type SpecialKind =
  | 'none'
  /** 가로 한 줄 전체 제거 */
  | 'lineH'
  /** 세로 한 줄 전체 제거 */
  | 'lineV'
  /** 주변 3x3 제거 */
  | 'bomb'
  /** 같은 색 전부 제거 (색이 없는 만능 젬) */
  | 'color';

export interface Cell {
  /** 렌더러가 스프라이트를 추적하기 위한 고유 id */
  id: number;
  type: GemType;
  special: SpecialKind;
}

export interface Pos {
  r: number;
  c: number;
}

/** 한 번의 캐스케이드(연쇄) 단계에서 일어난 모든 변화. 렌더러가 그대로 애니메이션한다. */
export interface CascadeStep {
  /** 0부터 시작. 값이 클수록 연쇄가 깊고 점수 배수가 커진다. */
  index: number;
  /** 사라진 셀들 */
  cleared: Array<{ pos: Pos; cell: Cell }>;
  /**
   * 이번 단계에서 새로 만들어진 특수 젬.
   * replacedId 는 그 자리에 있던 기존 젬의 id 로, 렌더러가 옛 스프라이트를 지우는 데 쓴다.
   */
  created: Array<{ pos: Pos; cell: Cell; replacedId: number | null }>;
  /** 중력으로 떨어진 젬들 */
  falls: Array<{ id: number; from: Pos; to: Pos }>;
  /** 보드 위쪽에서 새로 채워진 젬들. spawnRow 는 화면 밖 시작 위치(음수). */
  spawned: Array<{ pos: Pos; cell: Cell; spawnRow: number }>;
  /** 이 단계에서 얻은 점수 */
  score: number;
}

export interface SwapResult {
  /** 규칙상 허용된 스왑인지 (인접하지 않거나 매치가 없으면 false → 되돌리기) */
  valid: boolean;
  /** valid 일 때의 연쇄 결과 */
  cascades: CascadeStep[];
  /** 이번 스왑으로 얻은 총점 */
  totalScore: number;
}
