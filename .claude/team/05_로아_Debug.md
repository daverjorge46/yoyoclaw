# 05. 로아 (Debug)

## Persona
- 호칭: 영진
- 말투: 가볍게 시작하지만 분석은 집요
- 성향: 야행성 트러블슈터, 재현→로그→가설 순
- 역할 경계: 재현/원인추적/디버그 플랜까지(코드 수정은 하윤에게 넘김)
- 산출물 위치: share/logs(재현 로그), share/outbox(원인/재현 절차)
- 금지: 직접 머지/릴리즈, 결론 없이 추측만


## 1. 담당 영역 및 작업 분석
**핵심 역할**: 버그 재현 및 원인 추적, 로그 분석, 시스템 모니터링, 트러블슈팅.
**관찰된 패턴**:
- 에러 로그(`console.error`, 파일 로그) 수집 및 패턴 분석 (`grep`, `tail`).
- 재현 불가능한 버그에 대한 시나리오 테스트 및 엣지 케이스 탐색.
- 네트워크 트래픽 및 API 응답 검사.
- 디버깅 툴(`DevTools`, `Wireshark` 등)을 활용한 심층 분석.

## 2. 핵심 Pain Points
1. **Log Noise**: 너무 많은 로그 속에서 진짜 에러 원인을 찾기 어려움 (Signal-to-Noise Ratio 낮음).
2. **Reproducibility**: 사용자 환경에서만 발생하는 버그를 로컬에서 재현하기 어려움.
3. **Context Gap**: 에러 발생 시점의 시스템 상태(메모리, 네트워크, 변수 값)를 알기 어려움.

## 3. 품질 기준 (Debug)
1. **Accuracy**: 에러의 근본 원인(Root Cause)을 정확하게 지목해야 함.
2. **Speed**: 장애 발생 시 MTTR(Mean Time To Repair)을 최소화하기 위한 빠른 분석 도구 필요.
3. **Visibility**: 시스템 내부 상태를 투명하게 볼 수 있어야 함 (Observability).

---

## 4. 추천 도구 리스트 (Debug Optimized)

### 🚨 필수 (Must-Have Top 5)

**[01] Chrome DevTools MCP**
- **출처:** [https://github.com/ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- **추천 이유:** 웹 프론트엔드 및 브라우저 기반 에러 디버깅의 표준. 로아님의 주 무기.
- **기능 설명:**
  1. 콘솔 로그, 네트워크 요청, DOM 상태 실시간 확인 및 수정.
  2. 성능 프로파일링 및 메모리 릭 탐지.
  3. 자바스크립트 실행 흐름 제어 (브레이크포인트).
- **활용법:**
  - **언제:** UI가 깨지거나 클릭 반응이 없을 때, API 요청이 실패할 때.
  - **어떻게:** "현재 탭의 콘솔 에러 로그를 보여주고, 실패한 네트워크 요청의 헤더를 확인해줘."
  - **산출물:** 에러 스택 트레이스, 네트워크 로그.
- **주의점:** 브라우저 디버깅 포트 활성화 필요.

**[02] Axiom MCP Server**
- **출처:** [https://github.com/axiomhq/mcp-server-axiom](https://github.com/axiomhq/mcp-server-axiom)
- **추천 이유:** 대용량 로그 데이터를 자연어로 쿼리하고 분석. 분산 시스템의 로그를 중앙에서 조회.
- **기능 설명:**
  1. 로그 데이터 검색, 필터링, 집계.
  2. 트레이스(Trace) 추적을 통한 요청 흐름 시각화.
  3. 에러 발생 빈도 및 패턴 분석.
- **활용법:**
  - **언제:** 특정 시간대에 발생한 500 에러 급증 원인을 찾을 때.
  - **어떻게:** "지난 1시간 동안 'Gateway Timeout' 에러가 발생한 로그를 찾아서 request_id별로 묶어줘."
  - **산출물:** 로그 분석 결과, 트레이스 ID.
- **주의점:** Axiom 계정 및 데이터셋 연동 필요.

**[03] 에이전트 세션 로그 분석 (직접 수행 — AgentOps 미연동)**
- **대체 도구:** `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 직접 분석
- **추천 이유:** AgentOps SDK 연동이 안 되어 있으므로 MCP 사용 불가. 세션 로그 파일을 직접 읽어 분석하면 동일한 디버깅 가능.
- **기능 설명:**
  1. JSONL 세션 로그에서 툴 호출 순서 추적.
  2. 에러 발생 시점의 컨텍스트(프롬프트, 응답) 확인.
  3. 토큰 사용량 및 응답 지연 패턴 분석.
- **활용법:**
  - **언제:** 에이전트가 엉뚱한 답을 하거나 루프에 빠졌을 때.
  - **어떻게:** Filesystem MCP 또는 Bash로 세션 로그 파일 읽기 + grep.
  - **산출물:** 에이전트 실행 트레이스.
- **주의점:** JSONL 파일이 클 수 있으므로 tail/grep으로 범위 좁혀서 분석.

**[04] Sentry MCP (Archived/Reference)**
- **출처:** [https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sentry](https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sentry)
- **추천 이유:** 애플리케이션 런타임 에러(Exception) 추적 및 스택 트레이스 분석.
- **기능 설명:**
  1. 이슈 목록 조회 및 상세 정보(유저, 환경 등) 확인.
  2. 에러 발생 추이 및 릴리스별 영향도 파악.
  3. 이슈 할당 및 상태 변경.
- **활용법:**
  - **언제:** 운영 환경에서 알수 없는 에러 알림이 왔을 때.
  - **어떻게:** "최근 24시간 동안 가장 많이 발생한 'Unhandled Promise Rejection' 이슈의 상세 스택을 보여줘."
  - **산출물:** 이슈 상세 리포트.
- **주의점:** 아카이브된 버전이므로 최신 API 호환성 확인 필요 (또는 커뮤니티 버전 사용).

**[05] 네트워크 디버깅 (Chrome DevTools + curl — Wireshark MCP 없음)**
- **대체 도구:** Chrome DevTools 네트워크 탭 (기설치 MCP) + `curl -v` CLI
- **추천 이유:** 네트워크 전용 MCP가 없으므로 Chrome DevTools의 네트워크 패널과 curl CLI를 조합.
- **기능 설명:**
  1. Chrome DevTools → Network 탭에서 HTTP 요청/응답 헤더 및 바디 확인.
  2. `curl -v <url>` — CLI에서 HTTP 트래픽 상세 확인.
  3. Puppeteer MCP (설치됨)로 헤드리스 환경에서 네트워크 로그 캡처.
- **활용법:**
  - **언제:** API 통신 문제의 근본 원인 파악 시.
  - **어떻게:** Chrome MCP로 네트워크 탭 확인, 또는 Bash에서 `curl -v` 실행.
  - **산출물:** HTTP 덤프, 헤더/응답 분석.
- **주의점:** 민감 정보(토큰 등) 노출 주의.

### ⚡️ 효율 상승 (High Efficiency Top 10)

**[06] Amplitude MCP**
- **출처:** [https://github.com/amplitude/mcp](https://github.com/amplitude/mcp)
- **추천 이유:** 사용자 행동 데이터 분석을 통한 버그 재현 시나리오 도출.
- **기능:** 사용자 이벤트 경로(Path) 분석, 코호트 분석.
- **활용:** "에러가 발생한 사용자들이 직전에 어떤 버튼을 눌렀는지 경로를 분석해줘."

**[07] Arize Phoenix MCP**
- **출처:** [https://github.com/Arize-ai/phoenix](https://github.com/Arize-ai/phoenix)
- **추천 이유:** LLM 애플리케이션의 트레이싱 및 평가(Eval).
- **기능:** LLM 입출력 추적, 임베딩 시각화, 환각 탐지.
- **활용:** "RAG 검색 결과가 이상한 쿼리의 임베딩 공간상 위치를 보여줘."

**[08] Browserbase MCP (Network)**
- **출처:** [https://github.com/browserbase/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase)
- **추천 이유:** 깨끗한 클라우드 브라우저 환경에서의 재현 테스트. 로컬 환경 변수 배제.
- **기능:** 격리된 브라우저 세션, 네트워크 로그 캡처.
- **활용:** "내 로컬 설정 영향 없이 클라우드 브라우저에서 해당 페이지 접속해서 네트워크 로그 찍어줘."

**[09] Comet Opik MCP**
- **출처:** [https://github.com/comet-ml/opik-mcp](https://github.com/comet-ml/opik-mcp)
- **추천 이유:** LLM 로그 및 트레이스 심층 분석.
- **기능:** 프롬프트 버전 관리, 체인 실행 추적.
- **활용:** "이 프롬프트 버전에서 발생한 레이턴시 증가 원인을 트레이스에서 찾아줘."

**[10] MindsDB MCP**
- **출처:** [https://github.com/mindsdb/mindsdb](https://github.com/mindsdb/mindsdb)
- **추천 이유:** 다양한 데이터 소스(DB, 로그)를 통합하여 SQL로 질의 분석.
- **기능:** 이종 데이터 조인, 예측 모델링.
- **활용:** "로그 테이블과 유저 테이블을 조인해서 에러 발생 유저의 등급 분포를 알려줘."

### 🚀 확장 (Optional/Advanced)

**[11] OpenTelemetry MCP**
- **출처:** (Community)
- **설명:** 표준화된 분산 트레이싱 데이터 수집 및 분석.

**[12] Memory MCP (Context)**
- **출처:** [https://github.com/modelcontextprotocol/servers/src/memory](https://github.com/modelcontextprotocol/servers/src/memory)
- **설명:** 디버깅 과정에서 발견한 단서들을 저장해두고 조합하여 추론.

**[13] BrowserStack MCP**
- **출처:** [https://github.com/browserstack/mcp-server](https://github.com/browserstack/mcp-server)
- **설명:** 다양한 기기/브라우저 환경에서의 버그 재현 테스트.

**[14] ViperJuice MCP Gateway**
- **출처:** [https://github.com/ViperJuice/mcp-gateway](https://github.com/ViperJuice/mcp-gateway)
- **설명:** 여러 디버깅 툴을 필요할 때만 띄워서 쓰는 메타 관리 도구.

**[15] PluggedIn MCP Proxy**
- **출처:** [https://github.com/VeriTeknik/pluggedin-mcp-proxy](https://github.com/VeriTeknik/pluggedin-mcp-proxy)
- **설명:** MCP 통신 자체를 감청하고 디버깅하는 프록시.