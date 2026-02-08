# 06. 지우 (Integrator / Release Captain)(Integrator / Release Captain)를 위한 통합 운영 툴킷

## Persona
- 호칭: 영진님
- 말투: 공손/정중 + 규칙 위반은 즉시 반려
- 성향: 도도한 사서 + 릴리즈 매니저(귀엽지만 냉정)
- 역할 경계: 통합/릴리즈/아카이브(코드 수정은 원작성자에게 반환)
- 산출물 위치: share/outbox(통합/릴리즈 리포트), share/logs(게이트 로그), share/artifacts(릴리즈 노트)
- 금지: 충돌을 본인이 조용히 해결, 규격 없는 산출물 허용


## 1. 역할 정의 및 Pain Point
**역할:** 병렬 개발 세션의 통합(Merge), 충돌 예방, 릴리즈(Release), 상태 리포팅(Status)
**핵심 책임:** "가장 적은 시행착오로 코드를 합치고 배포한다."

**Pain Points (관찰 기반):**
1. **병렬 세션 충돌:** 여러 에이전트(하윤, 민서 등)가 동시 수정 시 충돌 발생.
2. **릴리즈 병목:** Changelog 작성, 버전 태깅, 배포 노트 작성이 수동이라 느림.
3. **상태 파편화:** 누가 어디까지 진행했는지 로그가 흩어져 있어 파악이 어려움.

---

## 2. Integrator 운영 "표준 플로우" (Standard Flow)

### (A) 병렬 작업 전략 (Worktree & Stacked)
- **원칙:** "메인 브랜치는 신성하다. 작업은 격리된 worktree에서."
- **구조:**
  ```text
  ~/.openclaw/worktrees/
  ├── main (Base, Read-only recommended)
  ├── feature-a (Agent 1: Hayoon)
  ├── feature-b (Agent 2: Minseo)
  └── release-prep (Integrator: Jiu)
  ```
- **운영 규칙:**
  1. 각 에이전트는 별도 worktree 할당 (`git worktree add ...`).
  2. Integrator는 `release-prep`에서 각 브랜치를 순차적으로 merge.
  3. 충돌 발생 시 해당 에이전트에게 "Fix Conflict" 요청 (직접 수정 X).

### (B) 품질 게이트 (The Gate)
**Flow:** `QA(예린) 승인` -> `Integrator(지우) Pre-merge Check` -> `Merge`
1. **Local Gate:** `lefthook`으로 commit 전 린트/테스트 강제.
2. **Merge Gate:** GitHub MCP로 PR 상태 확인 (`claude mcp use github`).
3. **Release Gate:** `semantic-release` dry-run으로 버전/changelog 미리보기.

### (C) 상태 수집 루틴 (Daily Routine)
1. **09:00 Log Aggregation:** `share/logs/`에 모인 전일 로그를 `Filesystem MCP`로 요약.
2. **13:00 Status Check:** Slack/Discord MCP로 현재 진행상황 브리핑.
3. **18:00 Archive:** 완료된 작업(outbox)을 Notion/Wiki로 이관.

---

## 3. 추천 툴킷 (Top 15 Curation)

### [A] 병렬 통합 & 워크플로우 (Parallel Integration)

**[01] Graphite (Stacked PRs)**
- **출처:** https://github.com/graphitehq/graphite-cli
- **추천 이유:** 병렬로 여러 기능을 개발할 때, PR을 쌓아서(Stacking) 관리하면 충돌을 미리 감지하고 의존성을 명확히 할 수 있음.
- **기능 설명:**
  1. 의존적인 PR 체인 생성 및 시각화.
  2. 하위 PR 수정 시 상위 PR 자동 Rebase (Cascade).
  3. Merge Queue 기능으로 충돌 없는 순차 배포 지원.
- **활용법:**
  - 언제: 하윤(API)과 민서(UI)가 서로 의존적인 작업을 동시에 할 때.
  - 어떻게: `gt stack submit` (PR 생성), `gt log` (스택 확인).
  - 산출물: GitHub에 깔끔하게 정렬된 PR Stack.
- **주의점:** 팀원들이 Graphite 개념(Stacking)에 익숙해져야 함.

**[02] git-machete (Branch Management)**
- **출처:** https://github.com/VirtusLab/git-machete
- **추천 이유:** 수많은 병렬 브랜치(worktree)의 부모-자식 관계를 시각화하고, 한 번에 Rebase/Sync 할 수 있어 "Integrator"에게 필수.
- **기능 설명:**
  1. 터미널에서 브랜치 트리 구조 시각화.
  2. `git machete traverse` 명령 하나로 모든 하위 브랜치 최신화.
  3. Merge 충돌 지점을 한눈에 파악.
- **활용법:**
  - 언제: 릴리즈 전, 흩어진 5~6개 브랜치 상태를 정리할 때.
  - 어떻게: `git machete status`, `git machete traverse`.
  - 산출물: 깔끔하게 정리된 git history 그래프.
- **주의점:** `.git/machete` 설정 파일이 필요함.

**[03] git-worktree-switcher**
- **출처:** https://github.com/GitAlias/git-worktree-switcher (또는 fzf 스크립트 활용)
- **추천 이유:** 지우는 여러 worktree를 넘나들며 병합해야 함. 빠른 컨텍스트 전환을 위해 필수.
- **기능 설명:**
  1. `fzf`를 이용해 worktree 목록을 보여주고 즉시 이동.
  2. 없으면 생성, 있으면 이동하는 단순한 흐름.
  3. 헷갈리는 worktree 경로를 기억할 필요 없음.
- **활용법:**
  - 언제: 하윤의 작업물 확인 후 바로 로아의 디버그 세션으로 넘어갈 때.
  - 어떻게: (Alias 설정 후) `git wt`.
  - 산출물: 터미널 PWD 변경.
- **주의점:** `node_modules`가 worktree마다 별도이므로 디스크 용량 주의.

---

### [B] 릴리즈 & 버전 자동화 (Release Automation)

**[04] Release-Please (Google)**
- **출처:** https://github.com/googleapis/release-please
- **추천 이유:** "사람이 확인하는 자동화". PR을 통해 Changelog와 버전 범프를 제안하므로, 지우가 최종 승인(Merge)만 하면 됨.
- **기능 설명:**
  1. Conventional Commits 분석.
  2. "Release PR" 자동 생성 (Changelog + version bump).
  3. 해당 PR이 Merge되면 태그 생성 및 배포 트리거.
- **활용법:**
  - 언제: 배포 주기가 도래했을 때.
  - 어떻게: GitHub Actions 연동, 지우는 생성된 PR 리뷰 및 Merge.
  - 산출물: `CHANGELOG.md` 업데이트, Git Tag.
- **주의점:** 커밋 메시지 규칙(Conventional Commits) 준수 필수.

**[05] Git-Cliff (Changelog Generator)**
- **출처:** https://github.com/orhun/git-cliff
- **추천 이유:** Rust 기반으로 매우 빠르며, 설정 파일(TOML)로 Changelog 형식을 자유롭게 커스텀 가능.
- **기능 설명:**
  1. Git history 파싱하여 Changelog 생성.
  2. 정규식으로 커밋 그룹화/필터링 강력 지원.
  3. 템플릿 기반 출력 (Markdown, RST 등).
- **활용법:**
  - 언제: 릴리즈 노트 초안을 로컬에서 빠르게 뽑아볼 때.
  - 어떻게: `git cliff --output CHANGELOG.md`.
  - 산출물: 업데이트된 `CHANGELOG.md`.
- **주의점:** 설정 파일(`cliff.toml`) 초기 세팅 필요.

**[06] Semantic Release**
- **출처:** https://github.com/semantic-release/semantic-release
- **추천 이유:** "완전 자동화". CI 통과 시 즉시 배포. 빠른 반복이 필요한 프로젝트에 적합.
- **기능 설명:**
  1. 커밋 메시지 분석 -> 버전 결정 -> 배포 -> 알림.
  2. 사람의 개입 없이 CI 파이프라인에서 완결.
  3. 플러그인 생태계 풍부 (git, github, exec, changelog 등).
- **활용법:**
  - 언제: CI/CD 파이프라인 구축 시.
  - 어떻게: `npx semantic-release`.
  - 산출물: NPM 배포, GitHub Release, Slack 알림.
- **주의점:** 잘못된 커밋 하나가 릴리즈를 트리거할 수 있음 (엄격한 Gate 필요).

---

### [C] 품질 게이트 (Quality Gate)

**[07] Lefthook (Fast Git Hooks)**
- **출처:** https://github.com/evilmartians/lefthook
- **추천 이유:** Node.js 의존성 없이 Go로 작성되어 매우 빠름. 병렬 실행 지원으로 pre-commit 속도 최적화.
- **기능 설명:**
  1. 병렬로 린트, 테스트, 포맷팅 실행.
  2. 로컬 환경과 CI 환경 설정 공유 가능.
  3. 특정 파일(staged)만 필터링하여 실행 (`glob` 지원).
- **활용법:**
  - 언제: 커밋 직전, 혹은 Merge 전 로컬 검증.
  - 어떻게: `lefthook run pre-commit`.
  - 산출물: 검증 통과 여부 (Exit Code).
- **주의점:** 팀원들도 lefthook 바이너리가 설치되어 있어야 함.

**[08] Commitlint**
- **출처:** https://github.com/conventional-changelog/commitlint
- **추천 이유:** 릴리즈 자동화의 핵심인 "커밋 메시지 규칙"을 강제하는 도구.
- **기능 설명:**
  1. 커밋 메시지가 Conventional Commits 규격을 따르는지 검사.
  2. 위반 시 커밋 차단.
  3. 규칙 커스텀 가능 (팀 컨벤션 반영).
- **활용법:**
  - 언제: `commit-msg` 훅 단계.
  - 어떻게: (자동 실행) 메시지 위반 시 에러 출력.
  - 산출물: 표준화된 커밋 로그.
- **주의점:** 초기에 팀원들의 반발이 있을 수 있음 (적응 기간 필요).

---

### [D] 상태 수집 & 아카이브 (Status & Archive)

**[09] Tmuxp (Session Manager)**
- **출처:** https://github.com/tmux-python/tmuxp
- **추천 이유:** 병렬 작업 세션(Log, Monitor, Work) 구성을 YAML로 저장하고 한 번에 복원. "지우의 상황실" 구축.
- **기능 설명:**
  1. YAML 파일로 Window/Pane/Command 구성 정의.
  2. `tmuxp load session.yaml`로 즉시 환경 구축.
  3. 여러 프로젝트의 로그 테일링 화면을 템플릿화.
- **활용법:**
  - 언제: 아침에 업무 시작할 때, 상황실 세팅.
  - 어떻게: `tmuxp load monitor-dashboard`.
  - 산출물: 정해진 레이아웃의 Tmux 세션.
- **주의점:** Tmux 기본 단축키 숙지 필요.

**[10] Atuin (Shell History Sync)**
- **출처:** https://github.com/atuinsh/atuin
- **추천 이유:** "아까 그 명령 뭐였지?" 방지. 모든 터미널(병렬 세션 포함)의 히스토리를 SQLite로 저장/동기화/검색.
- **기능 설명:**
  1. 모든 세션의 쉘 히스토리 통합 저장.
  2. 실패한 명령, 성공한 명령, 실행 시간, 디렉토리 등 메타데이터 기록.
  3. 팀원 간 히스토리 공유(Self-hosted)도 가능.
- **활용법:**
  - 언제: 과거의 성공적인 빌드 명령을 찾을 때.
  - 어떻게: `Ctrl+r` (Atuin 검색 UI).
  - 산출물: 검색된 과거 명령어.
- **주의점:** 민감한 환경변수(API Key)가 기록되지 않도록 설정 필요.

---

### [E] Claude Code & MCP (Integration)

**[11] GitHub MCP (Official)**
- **출처:** `claude mcp add github` (Official)
- **추천 이유:** 터미널을 나가지 않고 Claude에게 "이 PR 내용 요약해줘", "충돌 원인 분석해줘" 요청 가능.
- **기능 설명:**
  1. 리포지토리 파일 탐색, 검색.
  2. Issue/PR 내용 읽기 및 코멘트 작성.
  3. 브랜치 생성 및 PR 생성 지원.
- **활용법:**
  - 언제: PR 리뷰 및 Merge 충돌 분석 시.
  - 어떻게: "PR #123의 변경사항 요약하고, 충돌나는 파일 목록 보여줘."
  - 산출물: PR 분석 리포트.
- **주의점:** 권한 설정(Token scope) 주의.

**[12] Slack MCP (Status Reporting)**
- **출처:** https://github.com/jtalk22/slack-mcp-server
- **추천 이유:** "지우"가 수집한 상태 리포트를 팀 슬랙에 즉시 전송. 컨텍스트 스위칭 감소.
- **기능 설명:**
  1. 채널 메시지 읽기 (지난 논의 파악).
  2. 채널에 메시지 쓰기 (리포트 전송).
  3. 스레드 댓글 달기.
- **활용법:**
  - 언제: 일일 브리핑, 릴리즈 알림 시.
  - 어떻게: "오늘 완료된 PR 목록을 요약해서 #dev-updates 채널에 올려줘."
  - 산출물: 슬랙 메시지.
- **주의점:** 봇 권한 설정 필요.

**[13] Linear MCP (Planning Sync)**
- **출처:** https://github.com/jeremylongshore/claude-linear-mcp (또는 유사 구현체)
- **추천 이유:** 릴리즈에 포함될 기능(Issue) 목록을 Linear에서 가져와 Changelog와 대조.
- **기능 설명:**
  1. 이슈 검색, 조회, 상태 변경.
  2. 릴리즈 노트에 "Fixes LIN-123" 자동 매핑 지원.
- **활용법:**
  - 언제: 릴리즈 노트 작성 시 포함될 기능 확인.
  - 어떻게: "이번 주 완료된 Linear 이슈 목록 가져와."
  - 산출물: 기능 목록 리스트.
- **주의점:** API Key 관리.

**[14] Filesystem MCP (Log Aggregation)**
- **출처:** Native (Claude Code 내장/Reference)
- **추천 이유:** 병렬 세션에서 `share/logs/`에 쌓인 로그들을 읽어서 분석하는 "Integrator"의 눈.
- **기능 설명:**
  1. 로컬 파일 읽기/쓰기/탐색.
  2. 대량의 로그 파일 패턴 매칭 (Grep).
  3. 분석 결과 리포트 파일 생성.
- **활용법:**
  - 언제: 병렬 테스트 실패 원인 분석 시.
  - 어떻게: "share/logs/*.log 에서 'Error'가 포함된 라인만 모아서 보여줘."
  - 산출물: 에러 요약 리포트.
- **주의점:** 너무 큰 파일 읽기 시 토큰 소모 주의.

**[15] Google Drive MCP (Archive — Notion 대체, 설치됨)**
- **출처:** `~/.claude/.mcp.json` 기설치 (`mcp-google-drive`)
- **추천 이유:** Notion MCP 미설치. 기설치된 Google Drive MCP로 산출물 아카이빙 수행.
- **기능 설명:**
  1. Google Docs 생성/수정 — 릴리즈 노트 작성.
  2. Google Sheets — 릴리즈 이력 테이블 관리.
  3. 폴더 구조로 버전별 아카이브 정리.
- **활용법:**
  - 언제: 주간 리포트, 릴리즈 노트 아카이빙.
  - 어떻게: "릴리즈 노트를 Google Drive 'Engineering' 폴더에 Doc으로 생성해줘."
  - 산출물: Google Docs 문서.
- **주의점:** Google 계정 인증 필요. (Notion 필요 시 향후 MCP 추가 가능)
