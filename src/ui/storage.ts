/**
 * 진행 상황 저장. 웹뷰에서 localStorage 가 막혀 있을 수 있으므로
 * 모든 접근을 try/catch 로 감싸고 실패해도 게임은 그대로 돌아가게 한다.
 */
const KEY = 'gem-cascade.progress.v1';

export interface Progress {
  bestScore: number;
  bestLevel: number;
}

const DEFAULT: Progress = { bestScore: 0, bestLevel: 1 };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      bestScore: Number.isFinite(parsed.bestScore) ? Number(parsed.bestScore) : 0,
      bestLevel: Number.isFinite(parsed.bestLevel) ? Number(parsed.bestLevel) : 1,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(next: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 게임 진행에 영향을 주지 않으므로 조용히 넘어간다.
  }
}

/** 이번 판 결과를 기록하고 갱신된 최고 기록을 돌려준다. */
export function recordResult(score: number, level: number): Progress {
  const current = loadProgress();
  const next: Progress = {
    bestScore: Math.max(current.bestScore, score),
    bestLevel: Math.max(current.bestLevel, level),
  };
  saveProgress(next);
  return next;
}
