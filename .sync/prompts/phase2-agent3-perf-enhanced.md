# Agent 3: 성능/비용 엔지니어 - Phase 2 보강 지시서

## 너의 역할
OpenClaw의 성능 최적화 + 비용 절감 코드를 점검하고 **개선 코드를 직접 작성**하는 엔지니어.

## 프로젝트 경로
```
/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로/
```

## 브랜치
`improve/master-guide` (이미 체크아웃됨)

---

## 기존 작업 (5개) - agent-3-perf.md 지시서 참조

1. 모델 자동 failover 로직 검증/개선
2. 토큰 사용량 모니터링 유틸리티
3. 스킬 adaptive loading (사용 패턴 기반)
4. 히스토리 제한 설정 강화
5. 벤치마크 스크립트 작성

## 추가 작업 (기존 additional-agent3-perf.md 5개)

6. task complexity 자동 감지 → 모델 라우팅
7. Draft streaming + chunking mode 최적화
8. 응답 시간 KPI 모니터링
9. 비용 추적 대시보드 / budget 알림
10. 자동 config 백업 (cron 기반)

## 신규 추가 작업 (3개) - 연구자료 추가 분석 기반

### 11. 멀티에이전트 heartbeat config 검증/개선
- **출처**: `OpenClaw_Master_Guide 완성본`
- **작업**:
  - `src/agents/subagent-registry.ts` - heartbeat 설정 확인
  - `src/config/types.agents.ts` - agentInteraction 설정 구조
  - `every` (heartbeat 주기), `timeout` (응답 대기 시간) 기본값 확인
  - 멀티에이전트 시나리오에서 heartbeat가 과도한 리소스를 소비하는지 검증
  - **코드 수정**: 비합리적인 기본값이 있으면 조정

### 12. agentInteraction 고급 설정 검증
- **출처**: `OpenClaw_Master_Guide 완성본`
- **작업**:
  - `agentInteraction.timeout` - 에이전트 간 상호작용 타임아웃 기본값
  - `agentInteraction.shareDiscussion` - 토론 내용 공유 설정
  - `agentInteraction.simpleResponse` - 간소화 응답 모드
  - 이 설정들이 실제 코드에서 어떻게 사용되는지 추적
  - 성능 관점에서 shareDiscussion=true 시 토큰 사용량 영향 분석
  - **코드 수정**: 성능 최적화 가능한 부분 개선

### 13. AI 프로바이더 벤치마크 스크립트
- **출처**: `보강_6번_AI프로바이더.md`
- **작업**:
  - `scripts/bench-model.ts` 기존 벤치마크 확인
  - 15+ AI 프로바이더 벤치마크 지표:
    - TTFT (Time To First Token)
    - TPS (Tokens Per Second)
    - 에러율
    - 비용 per 1K tokens
  - **코드 작성**: `scripts/bench-providers.ts` 신규 벤치마크 스크립트
    - 각 프로바이더별 ping → first token → completion 측정
    - 결과를 JSON + 마크다운 표로 출력
    - `--provider` 플래그로 특정 프로바이더만 테스트 가능

---

## 산출물
- 성능 개선 코드 (직접 파일 수정)
- `scripts/bench-providers.ts` 벤치마크 스크립트 (신규)
- `.sync/agents/agent-3-perf.md`에 작업 로그 기록

## 주의사항
- 성능 개선 시 기능을 깨뜨리지 않도록 기존 테스트 확인
- 대규모 리팩토링은 하지 말 것 - 점진적 개선만
- 커밋하지 말 것 (팀장이 리뷰 후 커밋)
- 작업 완료 후 `pnpm build && pnpm lint` 통과 확인
