import Phaser from 'phaser';
import { FONT_FAMILY, PALETTE } from './layout';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  textColor?: string;
  fontSize?: number;
}

/**
 * 터치 피드백이 있는 둥근 버튼. 모바일에서 손가락으로 누르기 충분한 크기를 기본값으로 쓴다.
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const width = options.width ?? 380;
  const height = options.height ?? 96;
  const fill = options.fill ?? PALETTE.accent;

  const container = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.35);
  shadow.fillRoundedRect(-width / 2, -height / 2 + 8, width, height, height / 2.4);

  const body = scene.add.graphics();
  body.fillStyle(fill, 1);
  body.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2.4);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${options.fontSize ?? 34}px`,
      fontStyle: 'bold',
      color: options.textColor ?? '#0b1021',
    })
    .setOrigin(0.5);

  container.add([shadow, body, text]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  const press = () => scene.tweens.add({ targets: container, scale: 0.94, duration: 70 });
  const release = () => scene.tweens.add({ targets: container, scale: 1, duration: 90 });

  container.on('pointerdown', press);
  container.on('pointerout', release);
  container.on('pointerup', () => {
    release();
    onClick();
  });

  return container;
}

/** 화면 전체를 덮는 세로 그라디언트 배경 */
export function drawBackground(scene: Phaser.Scene, width: number, height: number): void {
  const g = scene.add.graphics();
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const top = Phaser.Display.Color.IntegerToColor(PALETTE.bgTop);
    const bottom = Phaser.Display.Color.IntegerToColor(PALETTE.bgBottom);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 100, t * 100);
    g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
    g.fillRect(0, (height / steps) * i, width, height / steps + 1);
  }
  g.setDepth(-100);
}
