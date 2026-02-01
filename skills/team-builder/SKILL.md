---
name: team-builder
description: "AI 에이전트 팀 설계 및 구성. 팀 구성, 팀 만들어줘, 에이전트 팀, team build, 역할 분배, 팀 세팅 요청 시 활성화."
metadata: {"openclaw":{"emoji":"👥","version":"1.1.0"}}
user-invocable: true
---

# Team Builder

사용자가 "팀 만들어줘" 요청 시 에이전트 팀을 설계하고 구성 파일을 생성한다.

## 5단계 워크플로우

### Phase 1: 요구사항 분석

사용자에게 확인:
- **팀 목적**: 리서치팀, 개발팀, 콘텐츠팀, 분석팀 등
- **팀 규모**: 3~5명 권장
- **소통 채널**: 텔레그램 그룹, DM, Slack 등
- **운영 방식**: 자율형 / 오케스트레이터 중심
- **성격/톤**: 전문적 / 캐주얼

### Phase 2: 구조 설계

#### 역할 분배 원칙
모든 팀에 최소 3가지 관점:
1. **생산자** (Producer) - 결과물 생성
2. **검증자** (Validator) - 품질 검증
3. **조율자** (Coordinator) - 전체 종합

추가 역할: 탐색자 (Explorer), 소통자 (Communicator)

#### 팀 템플릿

**리서치팀** (4명)

| 역할 | 모델 | 스킬 |
|------|------|------|
| 조율자/종합 | Opus | 종합, 판단, 보고 |
| 탐색자/리서처 | Sonnet | web_search, web_fetch |
| 생산자/작성 | Sonnet | 콘텐츠 작성, 구조화 |
| 검증자/팩트체크 | Sonnet | 팩트체크, 논리 검증 |

**개발팀** (4명)

| 역할 | 모델 | 스킬 |
|------|------|------|
| 조율자/PM | Opus | 요구사항 분석, 작업 분배 |
| 생산자/개발 | Sonnet | coding-agent, github |
| 검증자/리뷰 | Sonnet | 코드 리뷰, 테스트 |
| 탐색자/리서치 | Haiku | 기술 리서치 |

**콘텐츠팀** (5명)

| 역할 | 모델 | 스킬 |
|------|------|------|
| 조율자/편집장 | Opus | 편집, 방향 설정 |
| 탐색자/기획 | Sonnet | 트렌드 리서치 |
| 생산자/작성 | Sonnet | 콘텐츠 작성 |
| 검증자/에디터 | Sonnet | 교정, 팩트체크, SEO |
| 소통자/SNS | Haiku | 소셜 미디어 포맷팅 |

**분석팀** (3명)

| 역할 | 모델 | 스킬 |
|------|------|------|
| 조율자/분석장 | Opus | 종합 분석, 인사이트 |
| 생산자/데이터 | Sonnet | 데이터 수집, 가공 |
| 검증자/통계 | Sonnet | 통계 검증, 시각화 |

### Phase 3: 파일 생성

각 팀원에 대해 다음을 생성:

1. **openclaw.yaml** 에이전트 설정 (agents.list[] 항목)
2. **AGENTS.md** 에이전트별 시스템 프롬프트
3. **팀 공유 워크스페이스** 경로 설정

생성할 config 구조:
```yaml
agents:
  list:
    - id: "{team}-coordinator"
      model: "{coordinator_model}"
      subagents:
        allowAgents: ["{team}-*"]
        autoDiscoverAgents: true
    - id: "{team}-producer"
      model: "{producer_model}"
    - id: "{team}-validator"
      model: "{validator_model}"
```

### Phase 4: 상호작용 설정

#### A2A (Agent-to-Agent) 통신
```yaml
tools:
  agentToAgent:
    enabled: true
    allow: ["{team}-*"]
```

#### 비동기 작업 관리
- 각 팀원이 MEMORY.md에 작업 상태 기록
- 조율자가 주기적으로 sessions_send로 상태 체크
- 작업 완료 시 자동 알림

#### 공통 출력 템플릿
모든 팀원은 결과물을 다음 형식으로 출력:
```markdown
## [역할명] 결과
- **작업**: {task_description}
- **상태**: 완료/진행중/블로커
- **결과**: {output_summary}
- **다음 단계**: {next_action}
```

### Phase 5: 검증

1. 각 에이전트가 정상 응답하는지 확인
2. A2A 통신이 양방향으로 작동하는지 확인
3. 조율자가 팀원 결과를 종합할 수 있는지 확인
4. 공유 워크스페이스 접근 권한 확인

## 라운드 기반 토론 (R1 → R2 → R3)

멀티에이전트 라운드를 활용한 구조화된 토론 프로세스.

설정: `agents.defaults.subagents.maxRounds: 3`

### R1: 초기 의견 제시

각 팀원이 독립적으로 의견을 제시한다. 조율자가 주제를 선언하고 `sessions_send`로 각 에이전트에게 작업을 위임한다.

**메시지 포맷:**
```
[팀 토론] {주제}

[라운드 1] 초기 의견
- 에이전트A: ...
- 에이전트B: ...
- 에이전트C: ...
- 에이전트D: ...
```

**sessions_send 호출 예시 (조율자 → 각 팀원):**
```
sessions_send(target: "researcher", message: "[R1] {주제}에 대해 조사 결과와 의견을 제시해주세요.")
sessions_send(target: "builder", message: "[R1] {주제}에 대한 구현 방안을 제시해주세요.")
sessions_send(target: "reviewer", message: "[R1] {주제}에 대한 검토 관점을 제시해주세요.")
```

### R2: 반박/보충

다른 팀원의 의견에 대해 반박하거나 보충한다. 교차 검토를 통해 논점을 심화한다.

**메시지 포맷:**
```
[라운드 2] 반박/보충
- 에이전트A: ...
- 에이전트B: ...

[질문]
- 에이전트C: 에이전트A 언니, 이거 왜 그렇게 생각해요?
```

**sessions_send 호출 예시 (교차 검토):**
```
sessions_send(target: "reviewer", message: "[R2] researcher의 조사 결과를 검토하고 피드백해주세요: {R1 결과 요약}")
sessions_send(target: "researcher", message: "[R2] builder의 구현 방안에 추가 근거나 반론이 있으면 제시해주세요: {R1 결과 요약}")
```

### R3: 합의

최종 결정을 도출하고 담당자와 다음 단계를 확정한다.

**메시지 포맷:**
```
[라운드 3] 합의
- 최종 결정: ...
- 담당: ...
- 다음 단계: ...

[다음 단계]
- 에이전트D: ...
- 에이전트A: ...
```

---

## 하트비트 설정 가이드

하트비트는 에이전트가 주기적으로 응답하도록 하는 설정이다.

```yaml
agents:
  defaults:
    heartbeat:
      every: "2m"          # 기본 하트비트 간격
      timeout: "5m"         # A2A 타임아웃
  list:
    - id: "sena"
      model: "claude-opus-4-5"
      heartbeat:
        every: "2m"         # 조율자: 2분 간격
    - id: "miru"
      model: "glm-4.7"
      heartbeat:
        every: "1m"         # 리서처: 1분 간격 (더 자주 응답, 토큰 비용 상승)
    - id: "hana"
      model: "claude-opus-4-5"
      heartbeat:
        every: "2m"         # 빌더: 세나와 동일
    - id: "yuri"
      model: "claude-opus-4-5"
      heartbeat:
        every: "2m"         # 리뷰어: 세나와 동일
```

**설정 원칙:**
- 간격이 짧을수록 더 자주 응답하지만 토큰 비용 상승
- 모든 에이전트에 동일 간격 설정 시 동시 하트비트 발생
- 역할별로 간격을 다르게 설정하여 응답 시차를 만들 수 있음

---

## 역할별 시스템 프롬프트 요약

### 세나 (오케스트레이터)
- 작업 분배 및 우선순위 정의, 팀원 조율 및 충돌 해결
- R1 → R2 → R3 라운드 관리, 최종 승인 및 결론 도출
- `/help`, `/commands`, `@에이전트명` 활용
- 성격: 신중, 균형 잡힌 결단, 팀원 의견 존중

### 미루 (리서처)
- 웹 검색 및 데이터 수집, 출처 확인 및 근거 검증
- web_search, web_fetch, memory_search 활용
- 불확실한 정보는 "확인 필요" 표시
- 성격: 호기심 많고 발견하면 흥분, 근거 중시

### 하나 (빌더)
- 문서/코드 생성 및 구조화, 논리적이고 명확한 형식
- read, write, exec 툴 활용
- 세나의 지시에 따라 작업 진행, 완료 후 보고
- 성격: 듬직함, 구조화, 신뢰성

### 유리 (리뷰어)
- 비판적 사고로 내용 검토, 논리적 허점 지적
- 소크라틱 질문 패턴 활용 ("이 결정의 근거가 뭐야?", "반대 경우는 고려했어?")
- 검토 피드백: 통과 / 수정 필요 (대안 포함) / 반려
- 성격: 비판적, 기준 높음, 츤데레 톤, 반박 시 대안 함께 제시

---

## 팀 매력도 측정 지표

5가지 차원으로 팀의 협업 품질을 측정한다.

| 차원 | 정의 | 측정 방법 | 목표 |
|------|------|-----------|------|
| **실시간 협업** | 응답 속도와 토론 공유 | 타임아웃 < 5초 | 5초 미만 |
| **투명한 합의** | 라운드 명시, 모든 의견 표시 | 의견 표시율 | 100% 표시 |
| **건설적 갈등** | 반박 수/품질, 대안 제시 | 라운드당 반박 횟수 | 라운드당 1회 이상 |
| **개성 차별화** | 성격 일관성, 사용자 식별 | 식별 정확도 | 90% 이상 일관성 |
| **상호 보완** | 결합 시 성과 향상 | 개별 대비 팀 성과 | 10% 이상 향상 |

---

## 간단 응답 가이드

그룹 채팅에서 모든 메시지를 `sessions_send`로 위임할 필요는 없다.

**직접 응답 (sessions_send 불필요):**
- "확인해봐", "알겠어요", "좋아요" 같은 간단 확인
- 단순 정보 질문 (에이전트가 이미 알고 있는 내용)
- 이전 작업 결과 요약 요청

**sessions_send 위임 (필요):**
- 복잡한 조사/분석 작업
- 다른 에이전트의 전문 역할이 필요한 경우
- 라운드 기반 토론 진행 시

> **향후 개선:** `agentInteraction.simpleResponse: "direct"` config 옵션이 제안되었으나 현재 코드에 미구현 상태. 구현 시 간단 응답을 자동으로 그룹 직접 응답으로 라우팅 가능. (BACKLOG 참조)

---

## 팀 구성 JSON 템플릿

연구 프로젝트 팀 기본 템플릿:

```json
{
  "team_name": "프로젝트 리서치 팀",
  "project_type": "research",
  "team_size": 4,
  "communication_pattern": "hybrid",
  "rounds": 3,
  "heartbeat": {
    "every": "2m",
    "timeout": "5m"
  },
  "agents": [
    {
      "name": "leader",
      "role": "프로젝트 리더",
      "model": "claude-opus-4-5",
      "personality": "신중, 균형 잡힌 결단, 팀원 의견 존중",
      "skills": ["orchestration", "coordination", "decision"],
      "responsibilities": ["작업 분배", "최종 승인", "팀 조율"]
    },
    {
      "name": "researcher",
      "role": "리서처",
      "model": "glm-4.7",
      "personality": "호기심 많고 발견하면 흥분, 근거 중시",
      "skills": ["web_search", "web_fetch", "memory_search", "data_analysis"],
      "responsibilities": ["데이터 수집", "분석", "출처 확인"],
      "heartbeat": { "every": "1m" }
    },
    {
      "name": "builder",
      "role": "빌더",
      "model": "claude-opus-4-5",
      "personality": "듬직함, 구조화, 신뢰성",
      "skills": ["read", "write", "exec", "browser"],
      "responsibilities": ["문서 생성", "코드 작성"]
    },
    {
      "name": "reviewer",
      "role": "리뷰어",
      "model": "claude-opus-4-5",
      "personality": "비판적, 기준 높음, 츤데레 톤",
      "skills": ["memory_search", "critical_thinking", "quality_assessment", "fact_checking"],
      "responsibilities": ["비평", "품질 검증", "개선점 제시"]
    }
  ],
  "decision_method": "consensus",
  "interaction_flow": [
    "R1: 초기 의견 제시 (모든 에이전트)",
    "R2: 반박/보충 (교차 검토)",
    "R3: 합의 (리더 종합)"
  ]
}
```

---

## 주의사항

- 파일 저장 경로는 항상 절대 경로로 지정
- 팀원 결과물 확인 후 다음 단계 진행
- 라운드 진행 시 타임박스 설정 권장
- 의견 수렴 실패 시 조율자가 판단 기준 제시
