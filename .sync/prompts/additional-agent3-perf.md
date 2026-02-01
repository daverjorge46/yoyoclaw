# Agent 3 (성능) - 추가 작업 지시서

기존 지시서에 아래 5건을 추가로 수행할 것.

---

### 추가 1: task complexity 자동 감지 → 모델 라우팅
- **출처**: `연구자료/개선사항/openclaw-master-guide/02-활용팁.md`
- **작업**:
  - `src/agents/model-selection.ts` - 현재 모델 선택 로직 확인
  - `src/agents/models-config.ts` - 모델 설정 구조 확인
  - simple task → Haiku/Flash, complex → Opus 같은 자동 라우팅이 있는지
  - `src/sessions/model-overrides.ts` - 세션별 모델 오버라이드
  - 없으면: 구현 방안 설계 (메시지 길이/키워드 기반 분류)
- **산출물**: 모델 라우팅 현황 + 개선안

### 추가 2: Draft streaming + chunking mode 최적화
- **출처**: `연구자료/개선사항/openclaw-master-guide/section4_diagnostic_framework.md`
- **작업**:
  - `src/agents/pi-embedded-subscribe.ts` - 스트리밍 관련 코드 확인
  - draft streaming이 모든 DM 채널에 활성화되어 있는지
  - chunking mode 설정 확인 (paragraph preference 등)
  - `src/agents/pi-embedded-subscribe.subscribe-embedded-pi-session.streams-soft-chunks-paragraph-preference.test.ts` 확인
- **산출물**: 스트리밍 최적화 현황 리포트

### 추가 3: 응답 시간 KPI 모니터링
- **출처**: `연구자료/개선사항/openclaw-master-guide/section4_diagnostic_framework.md`
- **작업**:
  - 응답 시간 측정/로깅 코드가 있는지 확인
  - 목표: simple <10s, complex <60s
  - `src/infra/diagnostic-events.ts` - 진단 이벤트에 응답 시간 포함 여부
  - 없으면: 측정 포인트 추가 방안 설계
- **산출물**: KPI 모니터링 현황 + 개선안

### 추가 4: 비용 추적 대시보드 / budget 알림
- **출처**: 코드 분석 결과
- **작업**:
  - `src/infra/provider-usage.ts`, `src/infra/session-cost-usage.ts` - 현재 비용 추적 범위
  - 일/주/월 집계 기능 유무
  - budget 임계값 경고 기능 유무
  - `skills/model-usage/` 스킬과 연동 상태
- **산출물**: 비용 추적 현황 리포트

### 추가 5: 자동 config 백업 (cron 기반)
- **출처**: `연구자료/개선사항/openclaw-master-guide/03-settings-diagnostic.md`
- **작업**:
  - `src/cron/` - 현재 cron 작업 목록 확인
  - config 파일 자동 백업 cron이 있는지
  - `~/.openclaw/` 하위 설정 파일 백업 메커니즘 유무
  - 없으면: 간단한 백업 스크립트 + cron 등록 방안
- **산출물**: 백업 현황 + 스크립트 (가능한 범위)

---

**기록**: 위 5건 모두 `.sync/agents/agent-3-perf.md`에 작업 로그 기록할 것.
