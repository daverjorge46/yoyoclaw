# Agent 4 (기능) - 추가 작업 지시서

기존 지시서에 아래 4건 + 스킬 빌더 방법론을 추가로 수행할 것.

---

### 추가 1: A2A Protocol 지원 현황 확인
- **출처**: `연구자료/개선사항/openclaw-master-guide/section3_multi_agent_architecture.md`
- **작업**:
  - 외부 에이전트(다른 프레임워크)와의 상호운용 코드가 있는지 확인
  - Agent Card 발행/수신 메커니즘 유무
  - `src/agents/` 내 A2A 또는 interop 관련 코드 검색
  - 없으면: 현재 아키텍처에서 A2A 프로토콜 도입 가능성 평가
- **산출물**: A2A 현황 리포트

### 추가 2: `openclaw skill create <name>` CLI 스캐폴딩
- **출처**: `연구자료/개선사항/openclaw-master-guide/05-skill-builder.md`
- **작업**:
  - `src/commands/` 내 skill 관련 CLI 명령 검색
  - 스킬 생성 스캐폴딩 명령이 있는지 확인
  - 없으면: SKILL.md 템플릿 + 디렉토리 구조 자동 생성 스크립트 설계
- **산출물**: CLI 현황 + 스캐폴딩 구현 (가능한 범위)

### 추가 3: `openclaw config validate` 설정 검증
- **출처**: `연구자료/개선사항/openclaw-master-guide/01-완전정복.md`
- **작업**:
  - 현재 config 검증이 어디서 이루어지는지 확인 (`src/config/`, `src/cli/`)
  - 독립된 `config validate` 서브커맨드 유무
  - `openclaw doctor`와의 중복 여부 확인
- **산출물**: 설정 검증 현황 리포트

### 추가 4: Multi-account per channel + Forum topic-based session 격리
- **출처**: `연구자료/개선사항/openclaw-master-guide/10-latest-updates-trends.md`
- **작업**:
  - `src/channels/` - 채널당 복수 계정 지원 여부
  - `src/telegram/` - 텔레그램 포럼 토픽별 세션 격리 코드 확인
  - `src/sessions/session-key-utils.ts` - 세션 키에 토픽 ID 포함 여부
- **산출물**: 멀티계정/세션격리 현황 리포트

---

### 스킬 빌더 개량 시 반영할 핵심 방법론 (agent-skill-builder-pro.skill v9.0)

베이스 스킬 압축 해제: `cd /tmp && unzip "연구자료/개선사항/agent-skill-builder-pro.skill"`

아래 8가지 방법론을 OpenClaw에 맞게 개량:

**1) TDD-First 스킬 개발:**
```
RED   → 스킬 없이 서브에이전트 실행, 실패 + 합리화 기록
GREEN → 실패만 해결하는 최소 스킬 작성, 재검증
REFACTOR → 새 합리화 발견 시 차단 추가, bulletproof까지 반복
```
- `scripts/tdd_skill_tester.py` → vitest 기반으로 변환 검토
- `references/tdd_for_skills.md` 참조

**2) 소크라틱 인터뷰:**
```
Q1. "지금은 이걸 어떻게 하고 있어요?"        → 현재 상태
Q2. "가장 짜증나는 부분이 뭐예요?"           → 문제점
Q3. "완벽히 작동하면 어떤 상태?"              → 이상 상태
Q4. "이런 경우는? 저런 경우는?"              → 엣지케이스
Q5. "정리하면 이건데, 맞아요?"               → 확인
```
- 스킵: 구체적 스펙 있을 때, "바로 만들어" 요청 시
- `references/socratic_interview.md` 참조

**3) CSO (Claude Search Optimization):**
```yaml
# BAD
description: "PDF 파일 처리"
# GOOD
description: "PDF 텍스트 추출, 양식 채우기. 'PDF 안 열려요', '텍스트 복사 안 됨' 시 사용"
```
- `src/agents/skills.ts`의 description 매칭 로직 확인 후 CSO 원칙 적용
- `references/cso_guide.md` 참조

**4) 합리화 방지:**
모든 규율 스킬에 필수:
```markdown
## 합리화 표
| 변명 | 현실 |
|------|------|
| "[정확한 표현]" | [왜 잘못인지] |

## Red Flags - 즉시 중단
- [위반 징후]
→ Red Flag 발생 시: 작업 폐기, 처음부터
```
- `references/pressure_testing.md` 참조

**5) Progressive Disclosure (토큰 관리):**
| Level | 시점 | 예산 | 콘텐츠 |
|-------|------|------|--------|
| L1 Metadata | 항상 | ~100 | name, description |
| L2 Instructions | 트리거 시 | <5k | SKILL.md 본문 |
| L3 Resources | 필요 시 | 무제한 | references/ |
- 한국어: 400줄 이하, 출력 토큰 35% 버퍼
- `src/agents/skills.ts`에서 단계별 로딩 지원 여부 확인

**6) 스킬 저장소 (list/load/release/save):**
- 베이스: `~/Desktop/💻 개발/claude-skill-repo/` → OpenClaw: `skills/` + ClawHub
- `_meta.json`, `skills-manifest.json` → OpenClaw 메타데이터 호환

**7) MCP 통합:**
- stdio (로컬) vs Streamable HTTP (클라우드) 자동 감지
- 한국 서비스 (Naver Works, KakaoWork, JANDI, Dooray!) 래퍼 필요 여부
- `references/mcp_integration.md` 참조

**8) Multi-Model Validation:**
- Haiku → 기본 동작, Sonnet → 중간 복잡도, Opus → 엣지케이스
- 3개 모델 모두 통과해야 배포

---

**기록**: 위 전체를 `.sync/agents/agent-4-feature.md`에 작업 로그 기록할 것.
