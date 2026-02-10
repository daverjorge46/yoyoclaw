# Agent 2 (보안) - 추가 작업 지시서

기존 지시서에 아래 3건을 추가로 수행할 것.

---

### 추가 1: Cisco Skill Scanner 통합 검토
- **출처**: `연구자료/개선사항/openclaw-master-guide/section4_diagnostic_framework.md`
- **작업**:
  - 스킬 설치 전 코드 검증 워크플로우가 존재하는지 확인
  - `src/agents/skills-install.ts` - 스킬 설치 시 보안 검증 단계가 있는지
  - trusted skill allowlist 메커니즘 존재 여부 확인
  - 없으면: `openclaw doctor` 또는 스킬 설치 흐름에 보안 경고 추가 방안 설계
- **산출물**: 스킬 보안 검증 현황 리포트 + 개선 코드 (가능한 범위)

### 추가 2: DNS pinning / mDNS 노출 최소화 / Twilio webhook 서명 검증
- **출처**: `연구자료/개선사항/openclaw-master-guide/10-latest-updates-trends.md`
- **작업**:
  - `src/infra/bonjour.ts`, `src/infra/bonjour-discovery.ts` - mDNS 노출 범위 확인
  - DNS rebinding 공격 방어 코드 존재 여부 확인 (`src/infra/fetch.ts`, `src/gateway/http-common.ts`)
  - Twilio webhook 관련 코드 검색 → 서명 검증(X-Twilio-Signature) 구현 여부
  - 각 항목 현황을 로그에 기록 (있음/없음/부분적)
- **산출물**: 네트워크 보안 현황 리포트

### 추가 3: Per-agent sandbox 설정 + agent role별 tool restriction
- **출처**: `연구자료/개선사항/openclaw-master-guide/01-완전정복.md`
- **작업**:
  - `src/agents/sandbox.ts`, `src/agents/sandbox-agent-config.*.test.ts` - 에이전트별 sandbox 설정 확인
  - `src/agents/tool-policy.ts` - tool restriction 정책 확인
  - agent role에 따라 사용 가능한 tool이 제한되는지 확인
  - 제한이 없으면: tool-policy에 role-based restriction 추가 방안 제안
- **산출물**: sandbox/tool 정책 현황 리포트 + 개선 코드 (가능한 범위)

---

**기록**: 위 3건 모두 `.sync/agents/agent-2-security.md`에 작업 로그 기록할 것.
