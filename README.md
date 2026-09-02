# Gem Cascade

Android / iOS 에서 돌아가는 매치-3 퍼즐 게임입니다.
Phaser 3 + TypeScript 로 만들고 Capacitor 로 네이티브 앱에 담습니다.

하나의 코드베이스로 브라우저·안드로이드·아이폰을 모두 커버합니다.

---

## 게임 규칙

- 젬을 인접한 칸으로 밀어 같은 색 **3개 이상**을 맞추면 터집니다.
- 터진 자리는 위에서 젬이 떨어져 채워지고, 연달아 터지면 **연쇄 배수**가 붙습니다.
  (1단계 x1 → 2단계 x1.5 → 3단계 x2 …)
- 특수 젬
  | 만드는 방법 | 젬 | 효과 |
  |---|---|---|
  | 가로 4매치 | 가로 라인 젬 | 그 **행 전체** 제거 |
  | 세로 4매치 | 세로 라인 젬 | 그 **열 전체** 제거 |
  | L자 / T자 매치 | 폭탄 | 주변 **3x3** 제거 |
  | 5매치 | 색 폭탄 | 아무 젬과 바꾸면 **그 색 전부** 제거 |
- 정해진 이동 횟수(25회) 안에 목표 점수를 넘기면 클리어, 남은 이동은 보너스 점수가 됩니다.
  목표는 레벨 1이 4,800점이고 레벨마다 1,500점씩 오릅니다.
  (200판 시뮬레이션 결과 25수 총점 중앙값이 약 8,600점이라, 레벨 4~5 부터 벽이 오도록 잡았습니다)
- 둘 수 있는 수가 사라지면 보드가 자동으로 섞입니다.

조작은 **드래그**와 **두 번 탭** 둘 다 지원합니다.

---

## 개발

```bash
npm install
npm run dev      # http://localhost:5173 - 브라우저에서 바로 플레이
npm test         # 게임 로직 유닛 테스트
npm run build    # 타입 검사 + dist/ 생성
```

`npm run dev` 는 `--host` 로 열려 있으므로, 같은 와이파이에 있는 **실제 휴대폰 브라우저**에서
`http://<PC의 IP>:5173` 으로 접속하면 앱으로 만들기 전에 터치 조작을 먼저 확인할 수 있습니다.

---

## 웹으로 배포하기 (GitHub Pages)

앱으로 만들기 전에, 폰에서 **링크 하나로** 바로 플레이할 수 있게 해 둡니다.

`.github/workflows/deploy.yml` 이 푸시할 때마다 자동으로 빌드해서 올립니다.

**최초 1회만** 저장소 설정을 손으로 바꿔줘야 합니다.
(워크플로가 대신 켜주는 방법은 GITHUB_TOKEN 권한 밖이라 불가능합니다)

1. GitHub 저장소 → **Settings** → 왼쪽 메뉴 **Pages**
2. **Build and deployment** 의 **Source** 를 **`GitHub Actions`** 로 변경
3. **Actions** 탭 → `Deploy to GitHub Pages` → **Re-run all jobs**

이후부터는 푸시할 때마다 자동으로 갱신됩니다.

배포 주소:

```
https://ktc7727-alt.github.io/my-game/
```

진행 상황은 저장소 **Actions** 탭에서 볼 수 있고, 배포는 보통 1~2분 걸립니다.

### 홈 화면에 앱처럼 추가하기

PWA 설정(`public/manifest.webmanifest`)이 들어 있어서, 위 주소를 폰에서 연 뒤

- **아이폰(사파리)**: 공유 버튼 → `홈 화면에 추가`
- **안드로이드(크롬)**: 우측 상단 ⋮ → `홈 화면에 추가`

하면 주소창 없이 전체 화면으로 실행됩니다. 아이콘도 따로 준비돼 있습니다.

> 스토어 앱과 다른 점: 오프라인 실행은 되지 않습니다(서비스 워커 미포함).
> 인터넷 연결 없이도 돌아가야 한다면 아래 네이티브 빌드로 가세요.

---

## 안드로이드 앱으로 만들기

필요한 것: **JDK 17**, **Android Studio**

```bash
npx cap add android      # 최초 1회. android/ 폴더가 생깁니다
npm run android          # 빌드 + 동기화 + Android Studio 실행
```

Android Studio 가 열리면 기기를 USB 로 연결하고 ▶(Run) 을 누르면 설치됩니다.

명령줄만으로 APK 를 뽑으려면:

```bash
npm run cap:sync
cd android && ./gradlew assembleDebug
# 결과물: android/app/build/outputs/apk/debug/app-debug.apk
```

Play 스토어에 올릴 **AAB** 는 서명 키가 필요합니다.

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias my-game
cd android && ./gradlew bundleRelease
```

> 키스토어 파일과 비밀번호는 잃어버리면 **같은 앱을 다시는 업데이트할 수 없습니다.** 반드시 따로 백업하세요.

---

## 아이폰 앱으로 만들기

필요한 것: **macOS**, **Xcode**, **CocoaPods** (`sudo gem install cocoapods`)

이 단계는 Apple 의 제약으로 **맥에서만** 가능합니다. 윈도우/리눅스에서는 우회 방법이 없습니다.

```bash
npx cap add ios          # 최초 1회
npm run ios              # 빌드 + 동기화 + Xcode 실행
```

Xcode 에서 할 일:

1. `App` 타겟 → **Signing & Capabilities** → 본인 Apple 계정으로 Team 선택
2. **Bundle Identifier** 를 본인 소유 도메인 기반으로 변경 (예: `com.내도메인.gemcascade`)
3. 아이폰을 연결하고 ▶ 실행

무료 계정으로도 본인 기기에 설치는 가능하지만 7일마다 다시 설치해야 합니다.
스토어 배포에는 **Apple Developer Program(연 $99)** 가입이 필요합니다.
(가격은 변동될 수 있으니 결제 전 developer.apple.com 에서 확인하세요.)

---

## 출시 전 체크리스트

- [ ] `capacitor.config.ts` 의 `appId` 를 `com.example.*` 에서 본인 것으로 변경
- [ ] 앱 아이콘 / 스플래시 생성 (`npm i -D @capacitor/assets` 후 `npx capacitor-assets generate`)
- [ ] Android `versionCode` / `versionName`, iOS `Version` / `Build` 번호 지정
- [ ] 실기기에서 세로 화면·노치·홈바 영역 확인
- [x] 안드로이드 뒤로가기 버튼 처리 (구현 완료 - `src/platform/native.ts`)
- [ ] 개인정보처리방침 URL 준비 (두 스토어 모두 필수)

---

## 코드 구조

```
.github/workflows/
  deploy.yml     푸시할 때마다 GitHub Pages 로 자동 배포
src/
  game/          렌더링과 무관한 순수 게임 로직 (유닛 테스트 대상)
    board.ts     매치 탐색, 특수 젬, 연쇄, 중력, 셔플
    rng.ts       시드 기반 난수 - 테스트 재현성을 위해
    types.ts     보드가 렌더러에게 넘겨주는 변화 기록(CascadeStep)
  scenes/        Phaser 화면 (Boot → Menu → Game → Result)
  ui/            텍스처 생성, 레이아웃 상수, 버튼, 저장소
  platform/      네이티브 전용 처리 (안드로이드 뒤로가기, 백그라운드 절전)
tests/           board.ts 유닛 테스트
```

게임 규칙은 Phaser 를 전혀 참조하지 않습니다. 보드가 "무슨 일이 일어났는지"를
`CascadeStep` 목록으로 돌려주면 `GameScene` 이 그것을 애니메이션으로 재생하는 구조라,
규칙을 고칠 때 화면 코드를 건드릴 일이 없습니다.

## 에셋

젬 그래픽은 이미지 파일이 아니라 `src/ui/textures.ts` 에서 코드로 그립니다.
저장소에 바이너리가 없고, 에셋 로딩 실패라는 상황 자체가 생기지 않습니다.
색으로만 구분하면 색약 사용자가 불리하므로 색마다 **모양도 다르게** 그렸습니다.
