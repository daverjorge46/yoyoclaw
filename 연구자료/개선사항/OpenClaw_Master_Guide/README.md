# 오픈크롤봇 마스터 가이드 v1.1

> 최종 업데이트: 2026-02-01
> 리서치 팀: 세나 (sena), 미루 (miru), 하나 (hana), 유리 (yuri)
> 변경사항: 오픈크롤봇 설정 확인 + 웹 검색 반영

## 개요

오픈크롤봇(몰트봇)을 마스터하기 위한 완전 가이드입니다. 파워유저 활용법, 멀티에이전트 아키텍처, 세팅 진단, AI 비서 구축, 스킬 개발, 팀 빌더, 트러블슈팅까지 다룹니다.

## 목표

- 오픈크롤봇의 모든 기능을 완전히 이해
- 실전에서 바로 적용 가능한 팁과 테크닉 습득
- 멀티에이전트 시스템 구축 및 최적화
- 자가 팀 구성 및 커스텀 스킬 개발 능력 향상

---

## 문서 구조

```
OpenClaw_Master_Guide/
├── 01_poweruser_tips.md               # 파워유저 활용법
├── 02_multi_agent_architecture.md    # 멀티에이전트 아키텍처
├── 03_diagnostic_framework.md        # 세팅 진단 프레임워크
├── 04_assistant_guide.md            # 텔레그램 AI 비서 구축 가이드
├── 05_skill_builder_design.md     # 스킬빌더 스킬 설계
├── 06_team_builder_skill_v1_1_update.md  # 팀 빌더 스킬 v1.1 (업데이트)
├── 07_troubleshooting_guide.md      # 트러블슈팅 가이드
├── 99_fact_check_notes.md          # 팩트체크 검증 결과
└── README.md                        # 이 파일
```

---

## 파일별 요약

| 파일 | 설명 | 핵심 내용 |
|------|--------|----------|
| **01_poweruser_tips.md** | 파워유저 활용법 | 모델 라우팅, 캐싱, 비용 최적화, Top 30 팁, Before/After |
| **02_multi_agent_architecture.md** | 멀티에이전트 아키텍처 | 통신 방법 비교, 오케스트레이터 패턴, 역할 분담, 실제 사례 |
| **03_diagnostic_framework.md** | 세팅 진단 프레임워크 | 25개 체크리스트, 성능 벤치마크, 개선 로드맵 |
| **04_assistant_guide.md** | 텔레그램 AI 비서 구축 | 5가지 옵션 비교, 난이도별 구현 가이드, Todoist 연동 |
| **05_skill_builder_design.md** | 스킬빌더 스킬 설계 | TDD 방식, 버전 관리, 다른 시스템 스킬 구조 분석 |
| **06_team_builder_skill_v1_1_update.md** | 팀 빌더 스킬 v1.1 | 오픈크롤봇 설정 반영, 시스템 프롬프트 개선, 상호작용 흐름 명시화 |
| **07_troubleshooting_guide.md** | 트러블슈팅 가이드 | 자주 있는 이슈, 해결 방법, 디버깅 방법, FAQ |
| **99_fact_check_notes.md** | 팩트체크 검증 결과 | 오픈크롤봇 기능 확인, 외부 시스템 검증, 출처 요약 |

---

## 빠른 시작 가이드

### 초급자 (처음 시작하는 분)

1. **01_poweruser_tips.md**부터 시작
   - 온보딩 위저드 실행
   - 기본 모델 라우팅
   - 캐싱 설정

2. **03_diagnostic_framework.md**로 세팅 확인
   - 체크리스트 25개 항목 점검
   - 점수 매기기
   - 개선 로드맵 작성

### 중급자 (기본 사용 경험 있는 분)

1. **02_multi_agent_architecture.md**로 아키텍처 이해
   - 통신 방법 비교
   - 오케스트레이터 패턴 학습
   - 역할 분담 구조 파악

2. **04_assistant_guide.md**로 AI 비서 구축
   - 옵션 선택 (단독, n8n+오픈크롤봇, Make+오픈크롤봇)
   - 난이도별 구현 가이드 따르기
   - Todoist 연동

### 고급자 (추가 기능 필요한 분)

1. **05_skill_builder_design.md**로 스킬 개발
   - TDD 방식 이해
   - 스킬 구조 설계
   - 버전 관리 및 릴리즈

2. **06_team_builder_skill_v1_1_update.md**로 팀 구성
   - 팀 구성 원칙 적용
   - 역할별 성격 설정
   - 상호작용 흐름 정의

3. **07_troubleshooting_guide.md**로 문제 해결
   - 자주 있는 이슈 해결
   - 디버깅 방법 습득
   - FAQ 참조

---

## 검증 완료 항목

### 오픈크롤봇 기능 (공식 문서 확인)

| 항목 | 상태 | 참고 |
|------|------|--------|
| `openclaw onboard` | ✅ 존재함 | docs/cli/onboard.md |
| `~/.openclaw/skills` | ✅ 존재함 | docs/tools/skills.md |
| SKILL.md 형식 | ✅ 존재함 (AgentSkills 호환) | docs/tools/skills.md |
| config.yml `skills.entries.*` | ✅ 존재함 | docs/tools/skills.md |
| `timeoutSec` 설정 | ✅ 존재함 | 기본값 1800초 |
| `cleanupMs` 설정 | ✅ 존재함 | 기본값 1800000ms |
| 그룹 `/help`, `/commands` | ✅ 존재함 | 텔레그램 지원 |
| 하트비트 설정 | ✅ 존재함 | agents.list[].heartbeat |
| 멘션 라우팅 | ✅ 존재함 | `@에이전트명` |

### 외부 시스템 (웹 검색 확인)

| 항목 | 상태 | 근거 |
|------|------|--------|
| KT Cloud 에이전트 협업 시스템 | ✅ 존재함 | KT Cloud 기술 블로그 2025.08 |
| MCP (Model Context Protocol) | ✅ Anthropic 표준 | 공식 발표 2024.11, Wikipedia 등록 |
| A2A (Agent2Agent) | ✅ Google 오픈 프로토콜 | 공식 발표 2025.04, Linux Foundation |

### 삭제된 항목 (문서에서 없음)

| 항목 | 설명 |
|------|--------|
| config.yml `cache.ttl`, `cache.enableSemantic` | 오픈크롤봇 문서에 없음 |
| config.yml `budget.*`, `streaming.*` | 오픈크롤봇 문서에 없음 |
| `http://localhost:18789/api/sessions/...` | REST API 없음 (sessions_send 사용) |
| `mentionPatterns` | config 문서에 없음 |
| 스킬의 `prompt_mode`, `dependencies`, `constraints` | 문서에 없음 |

### 추정치 처리 완료

| 항목 | 조치 |
|------|------|
| "토큰 사용량 30-50% 감소" | "토큰 사용량 감소 (추정치)"으로 수정 |
| "출력이 입력보다 4배 비쌈" | 삭제 |
| "캐싱으로 응답 시간 80% 감소" | "캐싱으로 응답 속도 개선 (추정치)"로 수정 |
| "배칭으로 30-50% 절감" | "배칭으로 비용 절감 (추정치)"로 수정 |

---

## 팀 빌더 스킬 사용법

### 입력 예시

```
"연구 프로젝트 팀 구성해줘. 요구사항: 리서치, 빌드, 리뷰 역할 필요."
```

### 출력 예시

JSON 형식으로 팀 구성 정보 출력:

```json
{
  "team_name": "프로젝트 리서치 팀",
  "team_size": 4,
  "communication_pattern": "hybrid",
  "agents": [...],
  "decision_method": "consensus",
  "interaction_flow": ["R1: 초기 의견", "R2: 반박/보충", "R3: 합의"]
}
```

---

## 팀 매력도 분석 (요약)

### 팀 매력 5가지 차원

| 차원 | 정의 | 측정 지표 | 현재 우리 팀 | 목표 |
|------|------|----------|-------------|------|
| **실시간 협업** | 에이전트 간 직접 대화, 즉각 반박/보충 | 토론 소요 시간, 참여율 | 3/10 | 5/10 |
| **투명한 합의** | 의견 차이가 명확히 드러나고 합의 과정 추적 가능 | 합의 로그 완전성, 반박 수 | 2/10 | 5/10 |
| **건설적 갈등** | 근거 기반 반박, 찬동 아님 | 반박 품질, 개선 결과물 수 | 6/10 | 5/10 |
| **개성 차별화** | 각 에이전트가 고유 성격/말투로 응답 | 성격 일관성, 사용자 식별률 | 8/10 | 5/10 |
| **상호 보완** | 약점 보완, 결합 시 성과 향상 | 결합 시 성과 향상률 | 5/10 | 5/10 |

### 현재 평균: 4.8/10 → 개선 필요

### 개선 방안

#### 1. 실시간 협업 개선

**현재 문제**: sessions_send 타임아웃, 토론 과정 안 보임

**해결 방안**:
1. 타임아웃 시간 줄이기 (30분 → 5분)
2. 간단한 질문/확인은 그룹에 직접 응답
3. 토론 과정을 그룹에 공유 (R1 → R2 → R3 명시)

```yaml
# config.yml (오픈크롤봇에서 확인됨)
agents:
  defaults:
    agentInteraction:
      timeout: 5s           # A2A 타임아웃
    heartbeat:
      every: "2m"         # 하트비트 간격
      timeout: "5m"        # 하트비트 타임아웃
```

#### 2. 투명한 합의 구현

**R1 → R2 → R3 라운드 명시화**:

```
[팀 토론] 오픈크롤봇 가이드 구조

[라운드 1] 초기 의견
- 세나: 7개 섹션 + 부록 구조가 좋아.
- 미루: 섹션 순서가 중요해. 섹션 3을 먼저 해야 해.
- 하나: 섹션 4, 5는 완료됐어. 수정만 필요해.
- 유리: 검증 안 된 숫자가 많아. 팩트체크부터 해야 해.

[라운드 2] 반박/보충
- 세나: 유리가 맞아. 팩트체크 먼저 하자.
- 미루: 섹션 3이랑 6이 중요하니까 그거 먼저 해도 돼.
- 하나: 섹션 4, 5 수정은 간단해. 미루가 3, 6 하는 동안 내가 할게.

[질문]
- 유리: 세나 언니, 팩트체크 기준이 뭐야? 숫자만 확인할 건가?

[라운드 3] 합의
- 최종 결정: 팩트체크 → 섹션 3, 6 → 섹션 4, 5 수정
- 담당: 유리(팩트체크), 미루(섹션 3, 6), 하나(섹션 4, 5)

[다음 단계]
- 유리: 팩트체크 시작해. 10분 내에 보고할게.
- 미루: 섹션 3, 6 시작해. 30분 내에 초안 내놔.
- 하나: 섹션 4, 5 수정해. 10분 내에 끝낼게.
```

---

## 참고 자료

### 공식 문서
- 오픈크롤봇 문서: https://docs.openclaw.ai
- 오픈크롤봇 GitHub: https://github.com/openclaw/openclaw

### 오픈크롤봇 설정 확인 (웹 검색)

| 항목 | 상태 | 출처 |
|------|------|--------|
| `timeoutSec` 설정 | ✅ 존재함 | docs.openclaw.ai/gateway/configuration |
| `cleanupMs` 설정 | ✅ 존재함 | docs.openclaw.ai/gateway/configuration |
| 그룹 `/help`, `/commands` | ✅ 존재함 | GitHub releases v2026.1.29 |
| 하트비트 설정 | ✅ 존재함 | docs.openclaw.ai/gateway/configuration |
| 멘션 라우팅 | ✅ 존재함 | GitHub releases v2026.1.29 |

### 외부 시스템

| 항목 | 상태 | 근거 |
|------|------|--------|
| KT Cloud 에이전트 협업 시스템 | ✅ 존재함 | KT Cloud 기술 블로그 2025.08 |
| MCP (Model Context Protocol) | ✅ Anthropic 표준 | 공식 발표 2024.11, Wikipedia 등록 |
| A2A (Agent2Agent) | ✅ Google 오픈 프로토콜 | 공식 발표 2025.04, Linux Foundation |

### GitHub Issues (트러블슈팅)

| 이슈 | 설명 |
|------|--------|
| 텔레그램 메시지 수신 문제 | GitHub Issue #4942 |
| 인바운드 DM 도착 문제 | GitHub Issue #4515 |
| 빈 메시지 400 에러 | GitHub Issue #4409 |
| 모델 404 에러로 인한 중단 | GitHub Issue #4992 |

---

## 라이선스

이 문서는 오픈크롤봇 사용자 커뮤니티를 위해 작성되었습니다.
자유롭게 사용, 수정, 공유 가능합니다.

---

*문서 완료: 2026-02-01*
