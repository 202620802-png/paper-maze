# 📜 종이 미로: 잉크 얼룩의 추격 (Paper Maze: Ink Blot Chase)

> **"낡은 연습장 종이 위에 갇힌 탐험가! 3개의 골든 스타 도장(★)을 찍고, 배회하는 잉크 얼룩(먹물) 몬스터들을 피해서 출구로 탈출하세요!"**

HTML5 Canvas와 Vanilla JavaScript, Web Audio API로 구현된 브라우저 전용 미로 탈출 웹게임 프로젝트입니다.

---

## 🎮 게임 특징 및 기능

1. **감성적인 종이 텍스처 & 가시성 (Fog of War) 시스템**:
   - 연습장 노트를 연상시키는 격자 디자인과 세련된 다크 모드/라이트 모드 지원.
   - 이동 경로 탐험에 따라 조금씩 밝아지는 가시거리(Fog of War) 시스템.

2. **도장 수집 & 출구 개방**:
   - 미로 내 랜덤 배치되는 3개의 골든 스타 도장(★)을 모두 모아야 출구가 개방됩니다.

3. **잉크 얼룩 몬스터 (Ink Blot Enemies)**:
   - 플레이어를 감지하고 추격하는 먹물 얼룩 몬스터.
   - 부딪힐 경우 지도 시야가 얼룩져 리셋되고 **15초의 벌칙 시간**이 추가됩니다.

4. **길 엿보기 (Peek System)**:
   - `Spacebar` 키를 눌러 최단 경로를 1.6초간 엿볼 수 있습니다. (벌점 +15초)

5. **최종 8단계 (Final Emergency Mode)**:
   - 비상 경보 레드 파형 테마, 박동하는 심장 소리 효과음, 극도로 제한된 시야반지름(1)과 빠르고 끈질긴 잉크 얼룩의 추격전!

6. **웹 오디오 엔진 (Web Audio API)**:
   - 외부 음악 파일 없이 Web Audio API 오실레이터로 이동 소리, 도장 획득음, 타격음, 경보음, 심장 소리 등을 실시간 합성.

7. **완벽한 크로스 플랫폼 지원**:
   - PC 키보드 (`방향키`, `WASD`, `Spacebar`), 마우스 드래그, 모바일 온스크린 D-Pad 터치 조작 완벽 지원.

---

## 📂 파일 구조

```
ㄱㅇㅈ/
├── index.html       # 게임 메인 HTML 구조 (시작 화면, 게임판, 결과 모달)
├── css/
│   └── style.css    # 게임 디자인 테마, 애니메이션, 비상 경보 모드 스타일
├── js/
│   ├── audio.js     # Web Audio API 기반 사운드 엔진
│   ├── maze.js      # DFS+Braid 미로 생성 및 BFS 길찾기/시야 알고리즘
│   └── game.js      # 메인 게임 컨트롤러, 이벤트 및 로컬 스토리지 관리
└── README.md        # 프로젝트 설명 및 배포 가이드
```

---

## 💻 로컬에서 실행하는 방법

1. **프로젝트 폴더 실행**:
   - `index.html` 파일을 크롬, 엣지, 웨일 등 웹 브라우저로 직접 더블 클릭하여 실행합니다.

2. **로컬 개발 서버 이용 (선택사항)**:
   - VS Code extension `Live Server`를 사용하거나 terminal에서 아래 명령어 실행:
     ```bash
     npx double-click-launch or npx serve .
     ```

---

## 🚀 GitHub Pages 배포 방법

이 프로젝트는 별도의 빌드 과정(Webpack, Vite 등)이 필요 없는 순수 HTML/CSS/JS로 구성되어 GitHub Pages에 즉시 배포 가능합니다.

1. **GitHub 저장소(Repository) 생성**:
   - GitHub(https://github.com) 로그인 후 `New Repository` 클릭.
   - 저장소 이름 입력 (예: `paper-maze-game`).

2. **코드 푸시 (Push)**:
   ```bash
   git init
   git add .
   git commit -m "Feat: Initial commit for Paper Maze Web Game"
   git branch -M main
   git remote add origin https://github.com/사용자계정/paper-maze-game.git
   git push -u origin main
   ```

3. **GitHub Pages 활성화**:
   - 생성한 GitHub 저장소의 `Settings` 탭 클릭.
   - 좌측 메뉴에서 `Pages` 클릭.
   - **Build and deployment** 섹션의 `Source`를 **Deploy from a branch**로 선택.
   - `Branch`를 `main` / `/ (root)` 로 설정 후 **Save** 클릭.
   - 약 1~2분 후 제공되는 URL (`https://사용자계정.github.io/paper-maze-game/`)로 접속하여 바로 게임을 플레이할 수 있습니다!
