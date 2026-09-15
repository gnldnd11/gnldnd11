## hwiwoong

AI 서비스를 설계부터 배포까지 혼자 만듭니다. 프론트엔드와 백엔드를 함께 다룹니다.
공공 SI 시스템 구축·운영(2022)에서 RAG·LLM 서비스 자체 개발(2025)을 거쳐, 지금은 0에서 1을 만드는 개인 제품에 집중하고 있습니다.

[0to1 블로그](https://0to1.saegim.studio) · [gnldnd125850@gmail.com](mailto:gnldnd125850@gmail.com)

<br />

### Shipped

<table>
  <tr>
    <td width="330" valign="top">
      <a href="https://marketplace.visualstudio.com/items?itemName=saegim.claude-usage-crab"><img src="https://raw.githubusercontent.com/gnldnd11/claude-usage-monitor/main/media/hero.png" width="310" alt="Claude Usage Crab 패널" /></a>
    </td>
    <td valign="top">
      <b>Claude Usage Crab</b> &nbsp; VS Code 확장<br />
      <sub><a href="https://marketplace.visualstudio.com/items?itemName=saegim.claude-usage-crab">Marketplace</a> · <a href="https://github.com/gnldnd11/claude-usage-monitor">Source</a> · <img src="https://img.shields.io/visual-studio-marketplace/i/saegim.claude-usage-crab?style=flat-square&label=installs&color=6e7681" alt="installs" align="absmiddle" /></sub>
      <br /><br />
      Claude Code 의 세션·주간 한도, 컨텍스트 사용량, 오늘 쓴 토큰을 상태바와 패널에서 실시간으로 보여 줍니다.
      백그라운드 서브에이전트는 픽셀 캐릭터로 방에 들어와 일하고, 끝나면 토큰과 소요 시간이 남습니다.
      훅 없이 로컬 트랜스크립트만 읽는 읽기 전용 확장입니다.
    </td>
  </tr>
  <tr>
    <td width="330" valign="top">
      <a href="https://marketplace.visualstudio.com/items?itemName=saegim.harbormaster"><img src="https://raw.githubusercontent.com/gnldnd11/harbormaster/main/media/panel.png" width="310" alt="Harbormaster 패널" /></a>
    </td>
    <td valign="top">
      <b>Harbormaster</b> &nbsp; VS Code 확장<br />
      <sub><a href="https://marketplace.visualstudio.com/items?itemName=saegim.harbormaster">Marketplace</a> · <a href="https://github.com/gnldnd11/harbormaster">Source</a></sub>
      <br /><br />
      떠 있는 로컬 서버를 포트 번호가 아니라 프로젝트 이름으로 보여 줍니다.
      코딩 에이전트가 켜 놓고 간 dev 서버를 찾아 한 번에 끄고, 열려 있는 워크스페이스가 선언한 포트 중 아무도 안 띄운 것도 함께 보여 줍니다.
    </td>
  </tr>
</table>

<br />

### Engines

**[saegim-ai-backend](https://github.com/gnldnd11/saegim-ai-backend)** &nbsp; 프레임워크 없이 밑바닥부터 만든 AI 에이전트 엔진
같은 에이전트 인터페이스를 native, LangGraph, ReAct 세 런타임으로 구현하고 토글 하나로 바꿉니다. 함수콜링 12툴, 큐 기반 SSE 스트리밍, 임베딩 RAG, 지식그래프 GraphRAG, MCP 호스트를 직접 구현했습니다.

**[saegim-eval](https://github.com/gnldnd11/saegim-eval)** &nbsp; 정답지 없이 LLM 출력을 채점하는 평가 엔진
Claude 출력은 GPT 가, GPT 출력은 Claude 가 채점해 자기 선호 편향을 피하고, 일부러 심은 환각을 심판이 잡는지로 심판 자체를 검증합니다. Wilson 신뢰구간으로 작은 표본의 불확실성을 숨기지 않고, CI 에서 회귀가 나면 빌드를 깹니다.

<br />

### Now

- 새김AI: 개인 데이터 위에서 도는 AI 비서. 위 엔진 두 개가 여기서 나왔습니다.
- noon: Apple Watch 앱. App Store 출시를 준비하고 있습니다.
- 파고 있는 것: MCP, Claude Code 로 개발 자동화, LLM 평가의 신뢰성.

<br />

<sub>Python · TypeScript · Java &nbsp;|&nbsp; Next.js · React · FastAPI · Spring Boot &nbsp;|&nbsp; LangGraph · RAG · MCP &nbsp;|&nbsp; Firebase · Docker · Vercel</sub>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake-dark.svg" />
  <img src="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake.svg" alt="contribution snake" />
</picture>
