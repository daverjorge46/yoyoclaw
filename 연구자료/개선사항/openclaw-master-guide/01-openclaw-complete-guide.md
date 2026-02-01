# 섹션 1: 오픈크롤봇(OpenClaw) 완전정복

## 개요
OpenClaw(구 Clawdbot, Moltbot)은 로컬에서 실행되는 오픈소스 AI 개인 비서이다. TypeScript CLI 기반이며, WhatsApp/Telegram/Discord/Slack/Signal/iMessage 등 다양한 메시징 플랫폼과 연동된다.

---

## 아키텍처 핵심

### 게이트웨이 구조
```
WhatsApp / Telegram / Discord / iMessage (+plugins)
        │
        ▼
┌───────────────────────────┐
│       Gateway             │  ws://127.0.0.1:18789
│   (single source)         │
│                           │  http://<gateway-host>:18793
│   /__openclaw__/canvas/   │
└───────────┬───────────────┘
            │
    ├─ Pi agent (RPC)
    ├─ CLI (openclaw …)
    ├─ Chat UI (SwiftUI)
    ├─ macOS app (OpenClaw.app)
    ├─ iOS node (WS + pairing)
    └─ Android node (WS + pairing)
```

### 핵심 메커니즘
- **레인 기반 큐 시스템**: 비동기 대신 직렬 처리로 안정적
- **메모리**: JSONL 세션 히스토리 + 마크다운 파일 (에이전트가 직접 작성)
- **검색**: SQLite 벡터(의미) + FTS5 키워드(정확) 이중 검색
- **보안**: Docker 샌드박스 + 명령어 allowlist + 위험 패턴 자동 차단
- **브라우저**: 스크린샷 대신 접근성 트리 시맨틱 스냅샷 (토큰 효율적)

---

## Top 100 활용 팁

### 🔧 설정 & 온보딩 (1~15)
1. `openclaw onboard --install-daemon`으로 원클릭 설정
2. OAuth 인증 추천 (API 키보다 편리)
3. `openclaw doctor`로 보안 설정 진단
4. `openclaw security audit --deep`으로 심층 보안 감사
5. `openclaw status --all`로 전체 상태 디버그 리포트
6. 게이트웨이 토큰 설정 필수 (`gateway.auth.token`)
7. WSL2 환경에서는 Node 사용 필수 (Bun 비추)
8. `openclaw health`로 인증 설정 확인
9. 멀티 계정 설정: `channels.telegram.accounts`
10. 그룹 채팅 ID 확인: `@userinfobot` 또는 로그에서 확인
11. Privacy Mode 설정 확인 (텔레그램 그룹)
12. 봇을 그룹 관리자로 설정하면 모든 메시지 수신 가능
13. `dmPolicy: "pairing"`으로 DM 보안 강화
14. 포럼 토픽별 독립 세션 설정 가능
15. `openclaw configure --section web`으로 웹 검색 API 설정

### 🧠 프롬프트 엔지니어링 (16~35)
16. SOUL.md로 에이전트 페르소나 정의 (말투, 성격, 제약조건)
17. AGENTS.md로 멀티에이전트 역할 분담 정의
18. USER.md에 사용자 정보 기입 (이름, 타임존, 선호도)
19. HEARTBEAT.md로 주기적 작업 정의
20. BOOTSTRAP.md로 세션 시작 시 자동 실행 작업 설정
21. MEMORY.md에 장기 기억 저장 (에이전트가 직접 관리)
22. 시스템 프롬프트에 "결론 먼저, 근거는 그 다음" 패턴 사용
23. 출력 형식 명시 (마크다운, JSON, 비교표 등)
24. 역할 기반 프롬프트: "너는 X 전문가다" 보다 구체적 행동 지시
25. 부정문 대신 긍정문 사용 ("하지 마" → "이렇게 해")
26. 체인 오브 쏘트: 복잡한 작업에 단계별 사고 요청
27. Few-shot 예시 포함으로 출력 품질 향상
28. 토큰 절약: 불필요한 서론/결론 제거 지시
29. `--thinking high`로 추론 품질 향상 (비용 증가)
30. 컨텍스트 윈도우 관리: 오래된 대화 자동 정리
31. 멘션 패턴 설정: `mentionPatterns`으로 다양한 호출 방법 지원
32. 그룹별 시스템 프롬프트 커스텀 가능
33. 토픽별 스킬/프롬프트 독립 설정
34. 인라인 버튼으로 대화형 UI 구현
35. 커스텀 명령어 등록 (`customCommands`)

### 💰 비용 최적화 (36~55)
36. **모델 라우팅**: 간단한 작업은 저렴한 모델, 복잡한 작업은 고급 모델
37. **출력 토큰 = 입력 4배 비용**: 간결한 출력 지시 필수
38. 캐싱 활용으로 30~50% 비용 절감
39. 배칭: 여러 요청을 묶어 처리
40. Gemini 무료 티어 활용 (기본 작업용)
41. OAuth 구독(Claude Max, Codex 등) 활용으로 API 과금 회피
42. `textChunkLimit` 조절로 불필요한 분할 방지
43. 히스토리 제한 설정: `historyLimit`으로 컨텍스트 비용 관리
44. DM 히스토리 제한: `dmHistoryLimit`
45. 스킬 토큰 영향 관리: 불필요한 스킬 비활성화
46. 스킬 토큰 공식: `195 + Σ(97 + name + description + location)` 문자
47. 샌드박스 모드로 안전하지만 리소스 사용 최적화
48. `maxConcurrent` 설정으로 동시 처리 제한
49. 미디어 제한: `mediaMaxMb` (기본 5MB)
50. 타임아웃 설정: `timeoutSeconds`로 무한 대기 방지
51. 세션 스냅샷: 스킬 목록은 세션 시작 시 고정 (재계산 비용 절약)
52. 비활성 스킬 `enabled: false`로 비활성화
53. `allowBundled`로 번들 스킬 허용 목록 관리
54. 웹 검색 API 호출 최소화 (캐시 활용)
55. Docker 샌드박스 대신 호스트 실행으로 오버헤드 절감 (보안 트레이드오프)

### ⚡ 성능 최적화 (56~75)
56. 컨텍스트 윈도우 최적화: 핵심 정보만 유지
57. 스킬 워처로 실시간 스킬 업데이트 (`watch: true`)
58. `watchDebounceMs` 조절로 불필요한 리프레시 방지
59. 청크 모드 설정: `chunkMode="newline"`로 자연스러운 분할
60. 드래프트 스트리밍: DM에서 부분 응답 실시간 표시
61. 그룹별 `requireMention` 설정으로 불필요한 처리 방지
62. 페어링 기반 DM 접근 제어로 스팸 방지
63. 로그 모니터링: `openclaw logs --follow`
64. 포럼 토픽 격리로 세션 오염 방지
65. 멀티에이전트 세팅에서 에이전트별 워크스페이스 분리
66. 공유 스킬: `~/.openclaw/skills` (전체 에이전트 공유)
67. 에이전트별 스킬: `<workspace>/skills` (에이전트 전용)
68. 추가 스킬 폴더: `skills.load.extraDirs`
69. 플러그인 스킬: `openclaw.plugin.json`에서 정의
70. 원격 macOS 노드 활용 (Linux 게이트웨이 + macOS 스킬)
71. `setupCommand`로 샌드박스 초기 설정 자동화
72. 환경변수 주입: 에이전트 런 스코프로 격리
73. 설정 쓰기 권한 관리: `configWrites`
74. 그룹 마이그레이션 자동 처리 (supergroup 업그레이드)
75. `openclaw dashboard`로 브라우저 기반 관리

### 🔌 스킬 & 확장 (76~100)
76. ClawHub (`clawhub.com`)에서 700+ 스킬 탐색
77. `clawhub install <slug>`로 원클릭 설치
78. `clawhub update --all`로 전체 업데이트
79. `clawhub sync --all`로 스킬 동기화
80. 스킬 우선순위: 워크스페이스 > 로컬 > 번들
81. SKILL.md 프론트매터로 스킬 메타데이터 정의
82. `metadata.openclaw.requires.bins`로 바이너리 의존성 게이팅
83. `metadata.openclaw.requires.env`로 환경변수 게이팅
84. `metadata.openclaw.os`로 OS별 필터링
85. `always: true`로 게이팅 스킵
86. 인스톨러 스펙: brew/node/go/uv/download 지원
87. `user-invocable: false`로 모델 전용 스킬 설정
88. `command-dispatch: tool`로 슬래시 커맨드 직접 도구 호출
89. 커스텀 스킬 작성: SKILL.md + 프론트매터 + 지시문
90. `{baseDir}` 변수로 스킬 폴더 경로 참조
91. `primaryEnv`로 API 키 자동 연결
92. coding-agent 스킬로 Claude Code/Codex 연동
93. summarize 스킬로 URL/팟캐스트/파일 요약
94. github 스킬로 PR/이슈 관리
95. weather 스킬로 날씨 조회
96. gog 스킬로 Google Workspace 연동
97. peekaboo 스킬로 macOS UI 자동화
98. nano-pdf 스킬로 PDF 편집
99. 서드파티 스킬은 신뢰할 수 있는 코드만 사용
100. 스킬 테스트: 샌드박스 환경에서 먼저 실행

---

## 프롬프트 템플릿

### 템플릿 1: 리서치 에이전트
```markdown
# SOUL.md
너는 전문 리서처다. 
- 최신 정보를 우선한다 (2025년 이후)
- 출처를 반드시 명시한다
- 결론 → 근거 → 출처 순서로 보고
- 비교표 형태로 정리
- 불확실한 정보는 "미확인"으로 표시
```

### 템플릿 2: 코딩 어시스턴트
```markdown
# SOUL.md
너는 시니어 개발자다.
- 코드 작성 시 주석 필수
- 에러 핸들링 포함
- 보안 베스트 프랙티스 적용
- 테스트 코드 함께 제공
- 실행 방법 설명 포함
```

### 템플릿 3: 프로젝트 매니저
```markdown
# SOUL.md
너는 PM이다.
- 작업을 구체적 단위로 분해
- 우선순위와 의존성 명시
- 진행 상황을 구조화된 형태로 보고
- 리스크와 블로커 사전 식별
- 타임라인 제시
```

### 템플릿 4: 콘텐츠 크리에이터
```markdown
# SOUL.md
너는 콘텐츠 전문가다.
- SEO 최적화된 제목/메타 작성
- 타겟 독자에 맞는 톤 유지
- 구조: 후킹 → 본문 → CTA
- 이미지/차트 삽입 위치 표시
- 1000~2000자 기본
```

### 템플릿 5: 데이터 분석가
```markdown
# SOUL.md
너는 데이터 분석가다.
- 정량적 데이터 우선
- 시각화 가능한 형태로 정리
- 인사이트와 액션 아이템 분리
- 가정과 한계 명시
- 반복 가능한 분석 프로세스 제시
```

---

## Before/After 사례

### 사례 1: 비용 절감
**Before**: 모든 대화에 Claude Opus 사용 → 월 $200+
**After**: 모델 라우팅 (간단한 답변은 Haiku, 복잡한 분석만 Opus) → 월 $50~80
**절감율**: 60~75%

### 사례 2: 그룹 채팅 노이즈
**Before**: 봇이 모든 그룹 메시지에 반응 → 불필요한 API 호출
**After**: `requireMention: true` + 멘션 패턴 설정 → 필요할 때만 반응
**절감율**: API 호출 80% 감소

### 사례 3: 컨텍스트 오버플로우
**Before**: 히스토리 제한 없음 → 긴 대화에서 토큰 폭발
**After**: `historyLimit: 50` + `dmHistoryLimit: 30` → 안정적 비용
**절감율**: 대화당 토큰 40% 감소

### 사례 4: 스킬 과부하
**Before**: 50+ 스킬 활성화 → 시스템 프롬프트 비대
**After**: 필요한 스킬만 활성화 + `allowBundled` 허용 목록 → 프롬프트 경량화
**절감율**: 시스템 프롬프트 토큰 30% 감소

### 사례 5: 보안 사고 방지
**Before**: 호스트에서 직접 실행 → 위험한 명령어 실행 가능
**After**: Docker 샌드박스 + allowlist → 안전한 실행 환경
**효과**: 잠재적 보안 사고 0건
