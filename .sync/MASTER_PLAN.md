# OpenClaw 개선 프로젝트 - Master Plan

## 브랜치: improve/master-guide
## 시작일: 2026-02-01

## Phase 현황
- [x] Phase 0: 환경 설정
- [ ] Phase 1: 병렬 실행 (1차 작업)
- [ ] Phase 2: 팀장 리뷰
- [ ] Phase 3: 2차 작업 (피드백 반영)
- [ ] Phase 4: 최종 통합

## Agent 배정
| Agent | 역할 | 기본 작업 | 추가 작업 | 총 | 상태 |
|-------|------|----------|----------|-----|------|
| Agent 1 | 문서 아키텍트 | 4건 | 0건 | 4건 | 대기 |
| Agent 2 | 보안 엔지니어 | 5건 | 3건 | 8건 | 대기 |
| Agent 3 | 성능/비용 엔지니어 | 5건 | 5건 | 10건 | 대기 |
| Agent 4 | 기능 개발자 | 6건 | 4건+방법론8 | 10건+ | 대기 |
| Agent 5 | QA/테스트 | 5건 | 2건 | 7건 | 대기 |

## 우선순위
1. 보안 (Agent 2)
2. 문서 (Agent 1)
3. 기능 (Agent 4)
4. 성능 (Agent 3)
5. 테스트 (Agent 5)

## 팀장 작업 로그
- [Phase 0] .sync/ 디렉토리 구조 생성
- [Phase 0] improve/master-guide 브랜치 생성
- [Phase 0] MASTER_PLAN.md, STATUS.md, BACKLOG.md 생성
- [Phase 0] agent-1~5 상태 파일 생성 (.sync/agents/)
- [Phase 0] 기본 지시서 5개 작성 (.sync/prompts/agent-*.md)
- [Phase 0] 가이드 문서 21개 전수 분석 (Explore agent 사용)
- [Phase 0] agent-skill-builder-pro.skill 압축 해제 + 분석 (v9.0, 방법론 8가지)
- [Phase 0] 누락 항목 12건 발견 (Agent 2: 3건, Agent 3: 3건, Agent 4: 4건, Agent 5: 2건)
- [Phase 0] 미루 제안 팩트체크 항목 Agent 4에 통합 (라운드 구조, Redis, 점수화, 요약 공개)
- [Phase 0] 07-team-attraction-analysis.md Agent 4 참조에 추가
- [Phase 0] 추가 지시서 6개 작성 (공통 1 + Agent별 4)
- [Phase 0] BACKLOG.md 초기화

## 생성한 파일 목록
| 파일 | 유형 |
|------|------|
| .sync/MASTER_PLAN.md | 동기화 |
| .sync/STATUS.md | 동기화 |
| .sync/BACKLOG.md | 동기화 |
| .sync/agents/agent-1-docs.md | 상태 |
| .sync/agents/agent-2-security.md | 상태 |
| .sync/agents/agent-3-perf.md | 상태 |
| .sync/agents/agent-4-feature.md | 상태 |
| .sync/agents/agent-5-test.md | 상태 |
| .sync/prompts/agent-1-docs.md | 기본 지시서 |
| .sync/prompts/agent-2-security.md | 기본 지시서 |
| .sync/prompts/agent-3-perf.md | 기본 지시서 |
| .sync/prompts/agent-4-feature.md | 기본 지시서 |
| .sync/prompts/agent-5-test.md | 기본 지시서 |
| .sync/prompts/additional-instructions.md | 추가 지시서 (공통) |
| .sync/prompts/additional-agent2-security.md | 추가 지시서 |
| .sync/prompts/additional-agent3-perf.md | 추가 지시서 |
| .sync/prompts/additional-agent4-feature.md | 추가 지시서 |
| .sync/prompts/additional-agent5-test.md | 추가 지시서 |
