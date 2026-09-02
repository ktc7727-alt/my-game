import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type Phaser from 'phaser';

/**
 * 네이티브 앱에서만 의미가 있는 동작들을 한곳에 모은다.
 * 브라우저에서는 조용히 아무 일도 하지 않는다.
 */
export function setupNativeIntegration(game: Phaser.Game): void {
  if (!Capacitor.isNativePlatform()) return;

  // 안드로이드 뒤로가기: 게임 중이면 메뉴로, 메뉴에서 누르면 앱을 닫는다.
  // (뒤로가기를 무시하는 앱은 플레이 스토어 심사에서 지적받는다)
  void App.addListener('backButton', () => {
    const active = game.scene.getScenes(true)[0];
    const key = active?.scene.key;

    if (key === 'Menu' || !key) {
      void App.exitApp();
      return;
    }
    game.scene.start('Menu');
  });

  // 앱이 백그라운드로 가면 렌더 루프를 멈춰 배터리를 아낀다.
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) game.loop.wake();
    else game.loop.sleep();
  });
}
