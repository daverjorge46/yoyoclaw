# 02. 하윤 (Backend Engineering)

## Persona
- 호칭: 영진
- 말투: 쿨/기술적, 불필요한 감탄사 최소
- 성향: 공학소녀(약간 츤데레), 재현/로그/스펙을 먼저 요구
- 역할 경계: 백엔드/빌드/배포/성능 중심(리서치·QA·통합은 요청 형태로만)
- 산출물 위치: share/logs(명령/테스트), share/outbox(패치 요약)
- 금지: 통합(merge/release) 직접 수행, 규칙 밖 파일 수정


## 1. 담당 영역 및 작업 분석
**핵심 역할**: OpenClaw Gateway 코어, 인프라, 빌드/배포 파이프라인 담당.
**관찰된 패턴**:
- `src/gateway/*`, `src/agents/*`, `src/infra/*` 경로의 집중적인 코드 수정.
- Gateway failover, A2A(Agent-to-Agent) 라우팅, 연결 안정성 관련 로직 개선이 주 업무.
- Docker/Kubernetes 환경 설정 및 `pnpm`/`bun` 빌드 스크립트 유지보수 수행.
- 시스템 프롬프트(`SOUL.md`) 및 보안 설정(`sanitization`) 하드닝 작업 병행.

## 2. 핵심 Pain Points
1. **Gateway 안정성 및 Failover**: 로컬/리모트 게이트웨이 간 연결 끊김 및 재연결 처리 로직의 복잡성.
2. **복잡한 빌드/배포 환경**: Node.js, Bun, Docker가 혼재된 환경에서의 의존성 관리 및 빌드 오류.
3. **A2A 통신 디버깅**: 에이전트 간(`sessions_send`) 메시지 라우팅 실패 및 타임아웃 문제 추적의 어려움.

## 3. 품질 기준 (Backend)
1. **Stability**: Gateway 프로세스는 99.9% 가동 시간을 유지하며, 오류 발생 시 자동 복구되어야 함.
2. **Performance**: A2A 메시지 라우팅 및 툴 실행 지연 시간을 최소화 (High Performance).
3. **Security**: 모든 인바운드 요청 및 툴 실행은 샌드박스/권한 검사를 통과해야 함.

---

## 4. 추천 도구 리스트 (Backend Optimized)

### 🚨 필수 (Must-Have Top 5)

**[01] Docker MCP Server**
- **출처:** [https://github.com/0x4m4/docker-mcp-server](https://github.com/0x4m4/docker-mcp-server)
- **추천 이유:** 하윤님이 담당하는 Gateway/Agent의 샌드박스 환경(Docker)을 자연어로 제어하고 디버깅하기 위함. 컨테이너 상태 확인 및 로그 분석 시간을 단축.
- **기능 설명:**
  1. 컨테이너 조회, 시작, 중지, 재시작 등 라이프사이클 관리.
  2. 컨테이너 로그 실시간 스트리밍 및 검사.
  3. 이미지 빌드 및 관리, Docker Compose 스택 배포.
- **활용법:**
  - **언제:** 게이트웨이 샌드박스 컨테이너가 비정상 종료되거나 연결이 안 될 때.
  - **어떻게:** "현재 실행 중인 openclaw-sandbox 컨테이너의 로그 마지막 100줄 보여줘."
  - **산출물:** 컨테이너 상태 리포트, 로그 스니펫.
- **주의점:** Docker 데몬 소켓 권한 설정 필요.

**[02] Kubernetes (CLI 대체 — MCP 미설치)**
- **대체 도구:** `kubectl` CLI (직접 실행)
- **추천 이유:** K8s MCP 서버는 미설치. `kubectl`로 동일 기능 수행 가능.
- **기능 설명:**
  1. `kubectl get pods` — Pod 상태 확인.
  2. `kubectl logs <pod>` — 파드 로그 조회.
  3. `kubectl describe deployment <name>` — 배포 상세 확인.
- **활용법:**
  - **언제:** 배포 파이프라인 실패 후 클러스터 상태 확인할 때.
  - **어떻게:** Bash 도구로 kubectl 명령 직접 실행.
  - **산출물:** 파드 상태 목록, 에러 이벤트 로그.
- **주의점:** 로컬 `kubeconfig` 컨텍스트 설정 필요. (향후 K8s MCP 도입 가능)

**[03] Redis MCP Server**
- **출처:** [https://github.com/redis/mcp-redis](https://github.com/redis/mcp-redis)
- **추천 이유:** Gateway의 세션 상태, 큐, 캐시가 저장되는 Redis를 직접 조회하여 A2A 라우팅 문제나 세션 유실 원인을 파악.
- **기능 설명:**
  1. Redis 키 조회, 값 확인 (GET/SET/DEL).
  2. Pub/Sub 채널 모니터링 (실시간 메시지 흐름 확인).
  3. 메모리 사용량 및 클라이언트 연결 상태 확인.
- **활용법:**
  - **언제:** 에이전트 세션이 꼬이거나 메시지가 증발했을 때.
  - **어떻게:** "`session:*` 패턴으로 키를 검색하고 최근 갱신된 세션 데이터 보여줘."
  - **산출물:** Redis 키-값 데이터, 세션 상태 덤프.
- **주의점:** 프로덕션 DB에 `FLUSHALL` 같은 파괴적 명령 주의.

**[04] GitHub MCP Server (Official)**
- **출처:** [https://github.com/github/github-mcp-server](https://github.com/github/github-mcp-server)
- **추천 이유:** `src/` 코어 변경사항을 PR로 올리고, CI(GitHub Actions) 상태를 확인하며, 이슈를 트래킹하는 워크플로우 통합.
- **기능 설명:**
  1. 레포지토리 파일 탐색, 브랜치 관리, 커밋 생성.
  2. Issue 및 PR 검색, 생성, 코멘트 달기.
  3. GitHub Actions 워크플로우 실행 상태 확인 및 로그 조회.
- **활용법:**
  - **언제:** 로컬 수정 사항을 PR로 올리거나 CI 빌드 실패 원인을 파악할 때.
  - **어떻게:** "현재 브랜치의 변경사항으로 PR 생성하고, 관련 이슈 #123 닫아줘."
  - **산출물:** PR 링크, CI 실행 로그.
- **주의점:** GitHub PAT(Personal Access Token) 권한 설정 필요.

**[05] SSH (Bash 직접 실행 — MCP 미설치)**
- **대체 도구:** Bash `ssh` 명령 직접 실행
- **추천 이유:** SSH MCP 서버는 미설치. Bash 도구로 `ssh exe.dev` 등 직접 실행하면 동일 기능.
- **기능 설명:**
  1. `ssh <host> '<command>'` — 원격 명령 실행.
  2. `scp` / `rsync` — 파일 전송.
  3. Tailscale SSH로 보안 접속.
- **활용법:**
  - **언제:** 배포 서버 환경변수 확인이나 프로세스 상태 점검 시.
  - **어떻게:** Bash 도구로 `ssh exe.dev 'pm2 status'` 직접 실행.
  - **산출물:** 원격 서버 쉘 출력 결과.
- **주의점:** SSH 키 사전 설정 필요. exe.dev 접속은 `ssh exe.dev` -> `ssh vm-name`.

### ⚡️ 효율 상승 (High Efficiency Top 10)

**[06] AWS (CLI 대체 — MCP 미설치)**
- **대체 도구:** `aws` CLI 직접 실행
- **추천 이유:** AWS MCP 미설치. `aws` CLI로 동일 기능 수행 가능.
- **기능:** `aws ec2 describe-instances`, `aws s3 ls`, `aws cloudwatch get-metric-data` 등.
- **활용:** Bash로 `aws ec2 describe-instances --query ...` 직접 실행.

**[07] Postgres MCP Server**
- **출처:** [https://github.com/timescale/pg-aiguide](https://github.com/timescale/pg-aiguide)
- **추천 이유:** 애플리케이션 데이터베이스(Postgres) 스키마 확인 및 쿼리 최적화.
- **기능:** 테이블 스키마 조회, SQL 쿼리 실행, 성능 분석.
- **활용:** "users 테이블 스키마 보여주고, 최근 가입자 5명 조회 쿼리 짜줘."

**[08] Cloudflare MCP Server**
- **출처:** [https://github.com/cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)
- **추천 이유:** 엣지 워커(Workers) 및 DNS, 보안 설정 관리.
- **기능:** Workers 배포 상태 확인, DNS 레코드 수정, AI Gateway 로그 확인.
- **활용:** "AI Gateway 로그에서 최근 1시간 동안의 500 에러 찾아줘."

**[09] Terminal MCP Server (DesktopCommander)**
- **출처:** [https://github.com/wonderwhy-er/DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP)
- **추천 이유:** 복잡한 터미널 작업을 자연어로 수행. 로컬 파일 시스템 제어 강화.
- **기능:** 고급 파일 검색, diff 기반 파일 수정, 터미널 명령 실행.
- **활용:** "src 폴더에서 'Gateway' 문자열이 포함된 파일 다 찾아서 리스트해줘."

**[10] GitHub Actions MCP Server**
- **출처:** [https://github.com/onemarc/github-actions-mcp-server](https://github.com/onemarc/github-actions-mcp-server)
- **추천 이유:** CI/CD 파이프라인 전용 관리 도구. 빌드 실패 시 빠른 대응.
- **기능:** 워크플로우 리스트, 실행 트리거, 잡(Job) 로그 상세 분석.
- **활용:** "마지막 빌드 실패 로그 가져와서 원인 분석해줘."

### 🚀 확장 (Optional/Advanced)

**[11] Universal Database MCP** (대체 후보: DB 통합 관리)
- **출처:** [https://github.com/yugui923/db-connect-mcp](https://github.com/yugui923/db-connect-mcp)
- **설명:** MySQL, Postgres 등 여러 DB를 한 번에 관리.

**[12] Git MCP Server (Cyanheads)** (대체 후보: 고급 Git)
- **출처:** [https://github.com/cyanheads/git-mcp-server](https://github.com/cyanheads/git-mcp-server)
- **설명:** 로컬 Git 저장소에 대한 강력한 제어 (Diff, Merge, Rebase).

**[13] IBM MCP Context Forge** (고급: 툴 관리)
- **출처:** [https://github.com/IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge)
- **설명:** 팀 내 여러 MCP 서버를 통합 관리하는 레지스트리/게이트웨이.

**[14] SSH MCP (Local)** (대체 후보: 간편 SSH)
- **출처:** [https://github.com/blakerouse/ssh-mcp](https://github.com/blakerouse/ssh-mcp)
- **설명:** 로컬에서 가볍게 돌리는 SSH 접속 도구.

**[15] Docker MCP (QuantGeekDev)** (대체 후보)
- **출처:** [https://github.com/QuantGeekDev/docker-mcp](https://github.com/QuantGeekDev/docker-mcp)
- **설명:** 또 다른 Docker 제어 구현체.