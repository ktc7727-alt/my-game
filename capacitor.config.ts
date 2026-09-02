import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // 스토어 출시 전 반드시 본인 소유 도메인 기반 ID로 바꿀 것.
  appId: 'com.example.gemcascade',
  appName: 'Gem Cascade',
  webDir: 'dist',
  android: {
    // 게임 캔버스가 시스템 UI에 가려지지 않도록 배경을 어둡게 맞춘다.
    backgroundColor: '#0b1021',
  },
  ios: {
    backgroundColor: '#0b1021',
    contentInset: 'never',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
