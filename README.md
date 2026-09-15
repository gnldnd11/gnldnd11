## 김휘웅

**Set the direction. The rest runs itself.**

혼자서 20개 넘는 프로젝트를 병렬로 굴립니다. 방향은 사람이 정하고, 나머지는 Claude Code 위에 만든 하네스가 돌립니다.
공공 SI(2022)에서 LLM·RAG 서비스 자체 개발(2025)을 거쳐, 2026년부터는 개인 제품을 만듭니다.
만드는 과정과 죽인 것까지 [0to1](https://0to1.saegim.studio) 에 남깁니다. 잘된 것만 전시하지 않습니다.

[0to1.saegim.studio](https://0to1.saegim.studio) · [지금 돌고 있는 자동화](https://0to1.saegim.studio/lab/) · [gnldnd125850@gmail.com](mailto:gnldnd125850@gmail.com)

<br />

### 매일 사람 없이 도는 것

| 시각 | 자동화 | 하는 일 |
|:--|:--|:--|
| 09:00 | 동향 브리핑 | Hacker News, arXiv, Stack Overflow, Reddit 를 모아 브리핑 카드를 만든다. LLM 은 웹에 못 나가고 raw 데이터만 받는다. 출처를 지어내지 못하게 하기 위해서다. |
| 10:00 | 새김 RAG eval | 프로덕션 설정으로 평가를 돌려 시계열로 쌓는다. 회귀가 나면 게이트가 빌드를 깬다. |
| 23:00 | 개발일지 | 그날의 커밋, 파일 수정 시각, 이슈 원장을 읽어 일지를 쓴다. 글감이 있으면 블로그 한 편을 써서 사전 검토 없이 발행한다. 없으면 아무것도 쓰지 않는다. |
| 23:00 | 문서 신선도 | 위키가 코드에서 얼마나 멀어졌는지 커밋 수로 점수화한다. `100 × 20 / (20 + drift)`. 70 이상 FRESH, 40 미만 ROTTEN. |
| 23:00 | 원장 드리프트 감지, 사실원장 최신화 | 파일·줄 번호·커밋 해시로 근거를 댈 수 있는 사실만 고친다. 통째로 다시 쓰지 않는다. 밀린 만큼이 아니라 정해진 만큼만 갚는다. |
| 23:00 | 스토어 지표 수집 | App Store 와 마켓플레이스 수치를 스냅샷으로 남긴다. |

성공만 기록하는 자동화는 거짓말을 합니다. 사흘 동안 동향 수집이 한도 초과로 죽어 있는데 현황판은 "ok" 였던 적이 있습니다.
그 뒤로 종료 코드, 산출물, 실패 종류를 같이 남기고, 되살릴 값이 있는 실패만 재시도합니다. 지키지 않는 규칙은 지웁니다.

<br />

### 하네스

Skills 5개가 모든 대화에 규칙을 자동 주입하고, 역할별 에이전트 7개(구현, 리뷰, 검증, 커밋, 사서, 블로거, 디자이너)가 별도 컨텍스트에서 병렬로 일합니다.
커맨드 8개와 야간 크론 3개가 수집, 기록, 지식, 운영을 잇습니다. 무인 실행은 읽기성 명령만 허용하고 임의 셸은 0개입니다.
세션을 넘는 기억은 파일로 저장소에 커밋합니다. 방법론도 버전을 관리합니다.

자세한 것은 [AI 하네스](https://0to1.saegim.studio/projects/ai-harness/) 문서에 있습니다.

<br />

### 내놓은 것

| | | |
|:--|:--|:--|
| [noon](https://0to1.saegim.studio/projects/noon/) | watchOS · App Store 2026.07 | 손목 위에 사는 눈. 수치 대신 시선·깜빡임·글리치로만 말한다. 텍스처 없이 매 프레임 벡터로 그리고, 감정은 9개 상태의 FSM 이다. |
| [Claude Usage Crab](https://marketplace.visualstudio.com/items?itemName=saegim.claude-usage-crab) | VS Code · Marketplace <img src="https://img.shields.io/visual-studio-marketplace/i/saegim.claude-usage-crab?style=flat-square&label=installs&color=6e7681" alt="installs" align="absmiddle" /> | 백그라운드 서브에이전트가 블랙박스라서 만들었다. Claude Code 가 협조하지 않으니 디스크와 네트워크에 흐르는 것만 읽는다. |
| [Harbormaster](https://marketplace.visualstudio.com/items?itemName=saegim.harbormaster) | VS Code · Marketplace | 에이전트가 켜 놓고 간 dev 서버를 프로젝트 이름으로 보여 주고 끈다. |
| [배터리 셀 검사 HMI](https://0to1.saegim.studio/projects/cms/) | 산업용 · 납품 | 레거시 MFC 를 PySide6 로 다시 썼다. PLC 와 계측기, 256채널 순회, 11-state FSM. 실장비 없이 Mock 엔진으로 개발했다. |
| [생성형 AI 행정비서](https://0to1.saegim.studio/projects/iop-as/) | 공공 SI · 프로덕션 | 실시간 LLM 스트리밍과 느린 RPA 를 하나의 대화로 묶었다. 프론트와 스트리밍 백엔드를 주도했다. |

<br />

### 실험, 공모전, 소품

[새김 Eval](https://github.com/gnldnd11/saegim-eval) 정답지 없이 LLM 출력을 채점한다. 교차 채점으로 자기 선호를 피하고, 심어 둔 환각을 심판이 잡는지로 심판을 검증한다. 매일 10시에 돌아간다.
[그어봄](https://0to1.saegim.studio/projects/geoubom/) 단톡방의 공정한 중간 지점을 찾는 MCP. 카카오 AGENTIC PLAYER 10 출품, 탈락.
[전투력 측정기](https://0to1.saegim.studio/projects/power-scanner/) 얼굴 68점 랜드마크로 전투력을 낸다. 온디바이스. 앱인토스 바이브코딩 챌린지.
[한국어 LLM 벤치마크](https://0to1.saegim.studio/projects/ur-bmt/) GPT, HyperCLOVA X, Gemini 를 4개 축으로 같은 조건에서 비교. 사내 도구.
[noon-desktop](https://0to1.saegim.studio/projects/noon-desktop/) noon 의 눈에 Claude 와 로컬 음성 인식을 붙인 macOS 프로토타입.
[txtfy](https://0to1.saegim.studio/projects/txtfy/) · [transparentfy](https://0to1.saegim.studio/projects/transparentfy/) · [나라런](https://0to1.saegim.studio/projects/nararun/) 빌드 없는 단일 HTML 소품과 생일 선물 게임.

<br />

### 접은 것

[새김AI](https://github.com/gnldnd11/saegim-ai-backend) 2025.10 ~ 2026.04. 개인 데이터 AI OS 를 지향하다 24개 앱을 한 UI 에 뭉쳤고, 프론트 139,653줄 중 42% 가 진입로 없는 죽은 코드였습니다. "모든 걸 넣어서 아무것도 아니게 된" 종료작. 프레임워크 없이 함수콜링, 스트리밍, RAG, 에이전트 루프를 직접 짠 엔진만 떼어 공개했습니다. 실패한 제품이지만 성공한 학교였습니다.

<br />

<sub>Python · TypeScript · Swift · Java &nbsp;|&nbsp; Next.js · React · FastAPI · Spring Boot · SwiftUI · PySide6 &nbsp;|&nbsp; Claude · LangGraph · RAG · MCP &nbsp;|&nbsp; Firebase · Vercel · Docker · launchd</sub>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake-dark.svg" />
  <img src="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake.svg" alt="contribution snake" />
</picture>
