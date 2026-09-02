import Phaser from 'phaser';
import { GEM_COLORS, GEM_SHAPES, type GemShape } from '../game/constants';
import type { SpecialKind } from '../game/types';

/** 생성되는 젬 텍스처 한 변의 픽셀 크기. 스프라이트 스케일 계산에 쓴다. */
export const TEXTURE_SIZE = 96;

/** 젬 텍스처 키. 색깔 폭탄은 색이 없으므로 타입을 무시한다. */
export function gemTextureKey(type: number, special: SpecialKind): string {
  if (special === 'color') return 'gem-color';
  return `gem-${type}-${special}`;
}

function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function shapePoints(shape: GemShape, size: number): Phaser.Types.Math.Vector2Like[] {
  const c = size / 2;
  const r = size * 0.27;
  const pts: Phaser.Types.Math.Vector2Like[] = [];

  switch (shape) {
    case 'square':
      return [
        { x: c - r, y: c - r },
        { x: c + r, y: c - r },
        { x: c + r, y: c + r },
        { x: c - r, y: c + r },
      ];
    case 'diamond':
      return [
        { x: c, y: c - r * 1.15 },
        { x: c + r * 1.15, y: c },
        { x: c, y: c + r * 1.15 },
        { x: c - r * 1.15, y: c },
      ];
    case 'triangle':
      return [
        { x: c, y: c - r * 1.1 },
        { x: c + r * 1.05, y: c + r * 0.8 },
        { x: c - r * 1.05, y: c + r * 0.8 },
      ];
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push({ x: c + Math.cos(a) * r * 1.1, y: c + Math.sin(a) * r * 1.1 });
      }
      return pts;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r * 1.2 : r * 0.5;
        pts.push({ x: c + Math.cos(a) * rad, y: c + Math.sin(a) * rad });
      }
      return pts;
    case 'circle':
    default:
      for (let i = 0; i < 24; i++) {
        const a = (Math.PI / 12) * i;
        pts.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
      }
      return pts;
  }
}

function drawSpecialMark(g: Phaser.GameObjects.Graphics, special: SpecialKind, size: number): void {
  const c = size / 2;
  g.fillStyle(0xffffff, 0.92);

  switch (special) {
    case 'lineH':
      // 좌우로 뻗는 두 줄 → 가로 한 줄이 날아간다는 표시
      g.fillRect(size * 0.06, c - size * 0.05, size * 0.88, size * 0.035);
      g.fillRect(size * 0.06, c + size * 0.015, size * 0.88, size * 0.035);
      break;
    case 'lineV':
      g.fillRect(c - size * 0.05, size * 0.06, size * 0.035, size * 0.88);
      g.fillRect(c + size * 0.015, size * 0.06, size * 0.035, size * 0.88);
      break;
    case 'bomb':
      // 중앙 고리 + 사방 스파이크
      g.lineStyle(size * 0.055, 0xffffff, 0.92);
      g.strokeCircle(c, c, size * 0.2);
      g.fillStyle(0xffffff, 0.92);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + Math.PI / 4;
        g.fillCircle(c + Math.cos(a) * size * 0.33, c + Math.sin(a) * size * 0.33, size * 0.055);
      }
      break;
    default:
      break;
  }
}

/**
 * 모든 젬/UI 텍스처를 코드로 그려서 등록한다.
 * 외부 이미지 파일이 없으므로 로딩 실패나 에셋 누락 자체가 발생하지 않는다.
 */
export function createTextures(scene: Phaser.Scene, size = TEXTURE_SIZE): void {
  const specials: SpecialKind[] = ['none', 'lineH', 'lineV', 'bomb'];

  for (let type = 0; type < GEM_COLORS.length; type++) {
    for (const special of specials) {
      const key = gemTextureKey(type, special);
      if (scene.textures.exists(key)) continue;

      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      const base = GEM_COLORS[type];

      // 본체: 둥근 사각 + 위쪽 하이라이트로 입체감
      g.fillStyle(shade(base, -0.35), 1);
      g.fillRoundedRect(size * 0.07, size * 0.09, size * 0.86, size * 0.86, size * 0.22);
      g.fillStyle(base, 1);
      g.fillRoundedRect(size * 0.07, size * 0.07, size * 0.86, size * 0.82, size * 0.22);
      g.fillStyle(shade(base, 0.28), 1);
      g.fillRoundedRect(size * 0.14, size * 0.13, size * 0.72, size * 0.34, size * 0.16);

      // 색약 사용자를 위해 색마다 다른 모양을 겹쳐 찍는다.
      g.fillStyle(0xffffff, 0.85);
      g.fillPoints(shapePoints(GEM_SHAPES[type % GEM_SHAPES.length], size), true, true);

      drawSpecialMark(g, special, size);

      g.generateTexture(key, size, size);
      g.destroy();
    }
  }

  // 색 폭탄: 여섯 색을 부채꼴로 채운 원
  if (!scene.textures.exists('gem-color')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = size / 2;
    g.fillStyle(0x14182e, 1);
    g.fillCircle(c, c, size * 0.44);
    for (let i = 0; i < GEM_COLORS.length; i++) {
      const start = (Math.PI * 2 * i) / GEM_COLORS.length - Math.PI / 2;
      const end = (Math.PI * 2 * (i + 1)) / GEM_COLORS.length - Math.PI / 2;
      g.fillStyle(GEM_COLORS[i], 1);
      g.slice(c, c, size * 0.4, start, end, false);
      g.fillPath();
    }
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c, c, size * 0.14);
    g.generateTexture('gem-color', size, size);
    g.destroy();
  }

  // 선택된 칸을 감싸는 테두리
  if (!scene.textures.exists('cell-selector')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(size * 0.07, 0xffffff, 0.95);
    g.strokeRoundedRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.22);
    g.generateTexture('cell-selector', size, size);
    g.destroy();
  }

  // 파티클용 작은 조각
  if (!scene.textures.exists('spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }
}
