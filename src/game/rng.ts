/**
 * 시드 기반 난수 생성기(mulberry32).
 * 테스트에서 보드를 재현 가능하게 만들기 위해 Math.random 대신 사용한다.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now()) {
    // 0 시드는 항상 0을 뱉으므로 방지
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** [0, 1) 실수 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, maxExclusive) 정수 */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** 배열을 제자리에서 섞는다(Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
