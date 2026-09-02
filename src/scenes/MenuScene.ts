import Phaser from 'phaser';
import { createButton, drawBackground } from '../ui/button';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../ui/layout';
import { loadProgress } from '../ui/storage';
import { GEM_COLORS } from '../game/constants';
import { gemTextureKey } from '../ui/textures';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    drawBackground(this, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2;

    // 타이틀 위에서 천천히 떠다니는 젬 장식
    for (let i = 0; i < GEM_COLORS.length; i++) {
      const gem = this.add
        .image(90 + i * 108, 250, gemTextureKey(i, 'none'))
        .setDisplaySize(76, 76)
        .setAlpha(0.9);
      this.tweens.add({
        targets: gem,
        y: 250 + (i % 2 === 0 ? -14 : 14),
        duration: 1400 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add
      .text(cx, 470, 'GEM\nCASCADE', {
        fontFamily: FONT_FAMILY,
        fontSize: '96px',
        fontStyle: 'bold',
        color: PALETTE.text,
        align: 'center',
        lineSpacing: -8,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 640, '같은 색 세 개를 맞춰 터뜨리세요', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);

    const progress = loadProgress();
    const bestBox = this.add.graphics();
    bestBox.fillStyle(PALETTE.panel, 0.85);
    bestBox.fillRoundedRect(cx - 250, 720, 500, 130, 28);

    this.add
      .text(cx, 758, '최고 기록', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 810, `${progress.bestScore.toLocaleString()}점 · 레벨 ${progress.bestLevel}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '38px',
        fontStyle: 'bold',
        color: PALETTE.text,
      })
      .setOrigin(0.5);

    createButton(this, cx, 985, '게임 시작', () => this.scene.start('Game', { level: 1, score: 0 }));

    this.add
      .text(
        cx,
        1180,
        [
          '· 젬을 옆 칸으로 밀어 3개 이상 맞추세요',
          '· 4개 → 라인 젬, L자 → 폭탄, 5개 → 색 폭탄',
          '· 정해진 이동 횟수 안에 목표 점수를 넘기면 클리어',
        ].join('\n'),
        {
          fontFamily: FONT_FAMILY,
          fontSize: '26px',
          color: PALETTE.textDim,
          align: 'center',
          lineSpacing: 14,
        },
      )
      .setOrigin(0.5);
  }
}
