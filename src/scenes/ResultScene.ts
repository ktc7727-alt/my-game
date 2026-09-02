import Phaser from 'phaser';
import { createButton, drawBackground } from '../ui/button';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../ui/layout';
import { recordResult } from '../ui/storage';

interface ResultData {
  cleared: boolean;
  level: number;
  score: number;
  bonus: number;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    drawBackground(this, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2;
    const { cleared, level, score, bonus } = this.result;

    // 클리어한 레벨까지 기록에 남긴다.
    const best = recordResult(score, cleared ? level + 1 : level);

    this.add
      .text(cx, 380, cleared ? `레벨 ${level} 클리어!` : '게임 오버', {
        fontFamily: FONT_FAMILY,
        fontSize: '72px',
        fontStyle: 'bold',
        color: cleared ? '#4ade80' : '#ff4d6d',
      })
      .setOrigin(0.5);

    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.panel, 0.9);
    panel.fillRoundedRect(cx - 280, 500, 560, 300, 32);

    this.add
      .text(cx, 550, '최종 점수', {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);

    const scoreLabel = this.add
      .text(cx, 612, '0', {
        fontFamily: FONT_FAMILY,
        fontSize: '78px',
        fontStyle: 'bold',
        color: PALETTE.text,
      })
      .setOrigin(0.5);

    // 점수를 0부터 굴려 올려 성취감을 준다.
    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        scoreLabel.setText(Math.round(tween.getValue() ?? 0).toLocaleString());
      },
    });

    if (bonus > 0) {
      this.add
        .text(cx, 688, `남은 이동 보너스 +${bonus.toLocaleString()}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: '#ffd166',
        })
        .setOrigin(0.5);
    }

    const isNewBest = score >= best.bestScore && score > 0;
    this.add
      .text(
        cx,
        744,
        isNewBest ? '신기록 달성!' : `최고 기록 ${best.bestScore.toLocaleString()}점`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: isNewBest ? '#4dd4ff' : PALETTE.textDim,
        },
      )
      .setOrigin(0.5);

    if (cleared) {
      // 클리어하면 점수를 이어받아 다음 레벨로 간다.
      createButton(this, cx, 940, `레벨 ${level + 1} 도전`, () =>
        this.scene.start('Game', { level: level + 1, score }),
      );
    } else {
      createButton(this, cx, 940, '다시 도전', () => this.scene.start('Game', { level: 1, score: 0 }));
    }

    createButton(this, cx, 1075, '메뉴로', () => this.scene.start('Menu'), {
      fill: PALETTE.panelLight,
      textColor: PALETTE.text,
    });

    this.add
      .text(cx, GAME_HEIGHT - 90, '기록은 이 기기에만 저장됩니다', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);
  }
}
