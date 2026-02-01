# 추가 지시사항 (모든 Agent 공통)

아래 내용을 기존 지시서에 추가로 적용할 것.

---

## 1. 작업 기록 규칙 (필수)

모든 작업은 `.sync/agents/agent-{N}-{역할}.md`에 아래 형식으로 기록:

```markdown
## 작업 로그
- [시작] 작업 시작
- [파일] src/gateway/auth.ts - 인증 우회 경로 발견, 조건문 추가
- [파일] src/commands/doctor-security.ts - 보안 점검 항목 3개 추가
- [발견] sessions_send 타임아웃 기본값이 문서와 다름 → BACKLOG 기록
- [완료] 작업 5개 중 4개 완료, 1개 블로커

## 변경 파일 목록
| 파일 | 변경 유형 | 사유 |
|------|----------|------|
| src/gateway/auth.ts | 수정 | 인증 우회 경로 차단 |
| src/commands/doctor-security.ts | 수정 | 보안 점검 항목 추가 |
| scripts/security-check.sh | 신규 | 보안 진단 스크립트 |

## 현재 상태: 리뷰대기
```

**규칙:**
- 파일 수정할 때마다 즉시 로그에 기록
- 발견한 추가 개선사항은 `[발견]` 태그로 기록 + `.sync/BACKLOG.md`에도 추가
- 작업 끝나면 상태를 `리뷰대기`로 변경
- 변경 파일 목록은 빠짐없이 작성

---

## 2. 누락된 작업 항목 (Agent별 추가)

### Agent 2 (보안) 추가 작업:
- Cisco Skill Scanner 통합 검토 - 스킬 설치 전 코드 검증 워크플로우 (`section4_diagnostic_framework.md` 참조)
- DNS pinning 구현 여부 확인 + mDNS 노출 최소화 (`10-latest-updates-trends.md` 참조)
- Per-agent sandbox 설정 + agent role별 tool restriction 확인 (`01-완전정복.md` 참조)

### Agent 3 (성능) 추가 작업:
- task complexity 자동 감지 → 모델 라우팅 (simple→Haiku, complex→Opus) 로직 확인 (`02-활용팁.md` 참조)
- Draft streaming + chunking mode 최적화 상태 확인 (`section4_diagnostic_framework.md` 참조)
- 응답 시간 KPI 모니터링 체계 확인 (목표: simple <10s, complex <60s) (`section4_diagnostic_framework.md` 참조)
- 비용 추적 대시보드 / budget 임계값 알림 기능 확인

### Agent 4 (기능) 추가 작업:
- A2A Protocol 지원 현황 확인 (외부 에이전트 상호운용, Agent Card) (`section3_multi_agent_architecture.md` 참조)
- `openclaw skill create <name>` CLI 스캐폴딩 명령 존재 여부 확인 (`05-skill-builder.md` 참조)
- `openclaw config validate` 설정 검증 도구 존재 여부 확인 (`01-완전정복.md` 참조)
- Multi-account per channel + Forum topic-based session 격리 (`10-latest-updates-trends.md` 참조)

#### Agent 4 - 스킬 빌더 개량 시 반영할 핵심 방법론 (agent-skill-builder-pro.skill 기반)

베이스 스킬(v9.0)의 아래 방법론을 OpenClaw에 맞게 개량할 것:

**1) TDD-First 스킬 개발 사이클:**
```
RED   → 스킬 없이 서브에이전트 실행, 실패 행동 + 합리화 표현 기록
GREEN → 관찰된 실패만 해결하는 최소 스킬 작성, 동일 시나리오로 재검증
REFACTOR → 새 합리화 발견 시 명시적 차단 추가, bulletproof까지 반복
```
- 베이스의 `scripts/tdd_skill_tester.py`를 OpenClaw의 vitest 기반으로 변환 검토
- `references/tdd_for_skills.md` 참조

**2) 소크라틱 인터뷰 (요구사항 구체화):**
```
Q1. "지금은 이걸 어떻게 하고 있어요?"        → 현재 상태
Q2. "가장 짜증나는/시간 드는 부분이 뭐예요?"  → 문제점
Q3. "완벽히 작동하면 어떤 상태?"              → 이상 상태
Q4. "이런 경우는? 저런 경우는?"              → 엣지케이스
Q5. "정리하면 이건데, 맞아요?"               → 확인
```
- 스킵 조건: 구체적 스펙 제공 시, 레퍼런스 있을 시, "바로 만들어" 요청 시
- `references/socratic_interview.md` 참조

**3) CSO (Claude Search Optimization) - 스킬 트리거 최적화:**
```yaml
# BAD - 추상적
description: "PDF 파일 처리"

# GOOD - 증상 기반 트리거
description: "PDF 텍스트 추출, 양식 채우기, 문서 병합. 'PDF 안 열려요', '텍스트 복사 안 됨' 언급 시 사용"
```
- OpenClaw의 `src/agents/skills.ts`가 description을 어떻게 매칭하는지 확인 후, CSO 원칙 적용
- `references/cso_guide.md` 참조

**4) 합리화 방지 (Rationalization Prevention):**
모든 규율 스킬에 아래 섹션 필수 포함:
```markdown
## 합리화 표
| 변명 | 현실 |
|------|------|
| "[에이전트가 사용한 정확한 표현]" | [왜 잘못인지] |

## Red Flags - 즉시 중단
- [위반 징후 1]
→ 모든 Red Flag: 작업 폐기, 처음부터 다시
```
- `references/pressure_testing.md` 참조

**5) Progressive Disclosure (토큰 관리):**
| Level | 로딩 시점 | 토큰 예산 | 콘텐츠 |
|-------|----------|----------|--------|
| L1: Metadata | 항상 | ~100 | name, description만 |
| L2: Instructions | 트리거 시 | <5k | SKILL.md 본문 |
| L3: Resources | 필요 시 | 무제한 | references/ 파일 |
- 한국어 환경: 400줄 이하, 출력 토큰 35% 버퍼 확보
- OpenClaw의 스킬 로딩이 이 단계를 지원하는지 `src/agents/skills.ts` 확인

**6) 스킬 저장소 관리 (skill-list/load/release/save):**
- 현재 베이스는 `~/Desktop/💻 개발/claude-skill-repo/` 경로 사용
- OpenClaw용으로 `skills/` 디렉토리 + ClawHub 연동으로 변경
- `_meta.json`, `skills-manifest.json` 구조를 OpenClaw의 기존 스킬 메타데이터와 호환

**7) MCP 통합:**
- stdio (로컬/IDE) vs Streamable HTTP (클라우드) 자동 감지
- 한국 서비스 (Naver Works, KakaoWork, JANDI, Dooray!) 커스텀 래퍼 필요 여부 확인
- `references/mcp_integration.md` 참조

**8) Multi-Model Validation:**
```
Haiku → 기본 동작 확인
Sonnet → 중간 복잡도
Opus → 엣지케이스 + 합리화 저항
```
- 3개 모델 모두 통과해야 배포 허용

### Agent 5 (테스트) 추가 작업:
- 스킬 단위 테스트 러너 존재 여부 확인 + CI/CD 파이프라인 (`06-스킬빌더.md` 참조)
- Prompt injection 테스트 스위트 존재 여부 확인 (`section4_diagnostic_framework.md` 참조)

---

## 3. BACKLOG 기록 규칙

작업 중 범위 밖 개선사항 발견 시 `.sync/BACKLOG.md`에 추가:

```markdown
## BACKLOG

| 발견자 | 항목 | 우선순위 | 출처 |
|--------|------|---------|------|
| Agent 2 | config 자동 백업 cron 미구현 | 중 | 03-settings-diagnostic.md |
| Agent 4 | ClawHub marketplace API 미완성 | 하 | 10-latest-updates-trends.md |
```
