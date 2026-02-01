# Agent 3: 성능/비용 엔지니어
## 임무
- 모델 자동 failover 로직 검증/개선
- 토큰 사용량 모니터링 유틸리티
- 스킬 adaptive loading (사용 패턴 기반)
- 히스토리 제한 설정 강화
- 벤치마크 스크립트 작성
- 멀티에이전트 heartbeat / agentInteraction 검증
- AI 프로바이더 벤치마크

## 현재 상태: 전체 완료 (13/13 Tasks)

## 작업 로그

### Wave 1 (완료)
- Task 1: circuit-breaker.ts, failover-error.ts retryAfter, model-fallback.ts backoff
- Task 2: session-cost-usage.ts aggregateByPeriod, diagnostic-events.ts cost events
- Task 6: task-complexity.ts + test, response-time-tracker.ts

### Wave 2 (완료)
- Task 3: skills/cache.ts + test
- Task 8: response-time-tracker.ts
- Task 9: budget-monitor.ts + test

### Wave 3 (완료)
- Task 4: message-importance.ts + test (8 tests), context-window-guard.ts resolveContextLimits, compaction.ts droppedByRole/droppedImportantMessages
- Task 7: streaming analysis report -> .sync/agents/task-7-streaming-report.md

### Wave 4 (완료)
- Task 5: bench-skill-loading.ts, bench-failover.ts, bench-memory.ts
- Task 10: backup-config.ts + test (5 tests) - daily cron backup + 30-day retention + hash verification

### Wave 5 (완료)
- Task 11: heartbeat config 검증 - 분석 완료, 현재 구현 적절
  - heartbeat 기본값: `every: "30m"`, per-agent override 지원
  - sweeper: 60초 간격, subagentRuns.size === 0이면 자동 정지 (리소스 낭비 없음)
  - activeHours 윈도우 기능으로 비활성 시간대 heartbeat 방지
  - 코드 수정 불필요: 기본값 합리적, 자원 관리 양호
- Task 12: agentInteraction 검증 - **코드에 미구현** (Master Guide 문서에만 존재)
  - `agentInteraction.timeout`, `shareDiscussion`, `simpleResponse` 모두 미구현
  - subagent는 `resolveAgentTimeoutMs()`로 타임아웃 관리
  - subagent 간 데이터 공유는 announce flow를 통해 처리
  - BACKLOG 추가: agentInteraction 설정 구현 필요
- Task 13: bench-providers.ts 완성 - simulate/live 모드 지원
  - `--simulate`: API key 없이 시뮬레이션 벤치마크
  - `--provider`: 특정 프로바이더만 테스트
  - `--output`: JSON 결과 저장
  - Markdown 표 출력: Provider, Model, Runs, Errors, Median/P95, TPS, Cost

## 산출물

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/agents/message-importance.ts` | 메시지 중요도 점수 (0-100) |
| `src/agents/message-importance.test.ts` | 8 tests |
| `src/cron/backup-config.ts` | 자동 config 백업 |
| `src/cron/backup-config.test.ts` | 5 tests |
| `scripts/bench-skill-loading.ts` | 스킬 로딩 벤치마크 |
| `scripts/bench-failover.ts` | failover 시나리오 벤치마크 |
| `scripts/bench-memory.ts` | 메모리 프로파일링 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `src/agents/context-window-guard.ts` | `resolveContextLimits()` 추가 |
| `src/agents/compaction.ts` | `droppedByRole`, `droppedImportantMessages` 추가 |
| `scripts/bench-providers.ts` | simulate/live 모드 + TTFT/TPS/에러율/비용 |

### 리포트
- `.sync/agents/task-7-streaming-report.md` - streaming/chunking 현황 분석

## 테스트 결과
- message-importance.test.ts: 8 pass
- compaction.test.ts: 7 pass (기존 회귀 없음)
- backup-config.test.ts: 5 pass
- bench-providers.ts --simulate: 정상 실행

## BACKLOG 추가 항목
- `agentInteraction` 설정 구현 (timeout, shareDiscussion, simpleResponse) - Master Guide에 기재되었으나 코드 미구현
