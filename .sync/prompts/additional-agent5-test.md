# Agent 5 (테스트) - 추가 작업 지시서

기존 지시서에 아래 2건을 추가로 수행할 것.

---

### 추가 1: 스킬 단위 테스트 러너 + CI/CD 파이프라인
- **출처**: `연구자료/개선사항/openclaw-master-guide/06-스킬빌더.md`
- **작업**:
  - 스킬 전용 테스트 러너가 있는지 확인 (`src/agents/skills*.test.ts` 범위)
  - 스킬의 SKILL.md 파싱 → 메타데이터 검증 테스트 존재 여부
  - 스킬 설치/로드/실행 통합 테스트 존재 여부
  - CI/CD에 스킬 검증 단계가 포함되어 있는지 (`.github/workflows/` 확인)
  - 없으면: 스킬 검증 테스트 템플릿 작성
- **산출물**: 스킬 테스트 커버리지 리포트 + 테스트 코드 (가능한 범위)

### 추가 2: Prompt injection 테스트 스위트
- **출처**: `연구자료/개선사항/openclaw-master-guide/section4_diagnostic_framework.md`
- **작업**:
  - `src/gateway/chat-sanitize.test.ts` - 기존 sanitize 테스트 범위 확인
  - `src/agents/pi-embedded-*.test.ts` - PI 방어 테스트 범위 확인
  - 공격 벡터별 테스트 존재 여부:
    - 시스템 프롬프트 탈취 시도
    - 역할 주입 (role injection)
    - 인코딩 우회 (base64, unicode)
    - 간접 인젝션 (이미지/파일 내 프롬프트)
  - 누락된 공격 벡터에 대한 테스트 추가
- **산출물**: PI 테스트 커버리지 리포트 + 테스트 코드 (가능한 범위)

---

**기록**: 위 2건 모두 `.sync/agents/agent-5-test.md`에 작업 로그 기록할 것.
