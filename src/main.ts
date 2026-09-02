import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { GAME_HEIGHT, GAME_WIDTH } from './ui/layout';
import { setupNativeIntegration } from './platform/native';

function showFatalError(message: string): void {
  const box = document.getElementById('boot-error');
  if (!box) return;
  box.style.display = 'block';
  box.textContent = `게임을 시작할 수 없습니다.\n\n${message}`;
}

try {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b1021',
    scale: {
      // 기기 화면 비율이 제각각이므로 비율을 유지한 채 맞추고 가운데 정렬한다.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // 물리 엔진은 쓰지 않는다. 매치-3 은 전부 격자 좌표로 계산한다.
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: {
      activePointers: 2,
    },
    scene: [BootScene, MenuScene, GameScene, ResultScene],
  });

  setupNativeIntegration(game);

  // 브라우저 탭이 가려질 때도 렌더 루프를 멈춘다.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.loop.sleep();
    else game.loop.wake();
  });
} catch (error) {
  showFatalError(error instanceof Error ? error.message : String(error));
}
