import { defineConfig } from 'vite';

export default defineConfig({
  // Capacitor는 앱 번들 내부의 파일을 file:// 유사 스킴으로 로드하므로
  // 절대 경로(/assets/...)가 아니라 상대 경로로 빌드해야 한다.
  base: './',
  build: {
    outDir: 'dist',
    // 모바일 웹뷰 호환 범위. 너무 최신 문법은 구형 안드로이드 웹뷰에서 깨진다.
    target: 'es2019',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
