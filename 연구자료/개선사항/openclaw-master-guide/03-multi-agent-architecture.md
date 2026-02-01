# 섹션 3: 멀티에이전트 아키텍처 분석

> 오픈크롤봇 마스터 가이드 | 작성일: 2026-01-31

---

## 텔레그램 멀티에이전트 베스트 프랙티스

### 핵심 원칙

1. **단일 게이트웨이, 다중 에이전트**: OpenClaw는 하나의 Gateway 프로세스가 모든 채널 연결을 소유하고, 바인딩(binding) 규칙으로 메시지를 적합한 에이전트에 라우팅한다.
2. **에이전트 = 격리된 두뇌**: 각 에이전트는 고유한 workspace, session store, auth profile, AGENTS.md를 가진다.
3. **역할 특화**: 에이전트마다 하나의 전문 역할 부여 (오케스트레이터, 리서처, 빌더, 비평가 등).
4. **모델 혼합**: 역할별로 최적의 모델 배정 (오케스트레이터→Opus, 리서처→Sonnet, 빌더→Sonnet 등).

### 텔레그램 그룹 통합 패턴

| 패턴 | 설명 | 적합한 경우 |
|------|------|------------|
| **단일 봇 + 내부 라우팅** | 하나의 Telegram 봇이 메시지를 받고 내부적으로 여러 에이전트에 분배 | OpenClaw 기본 구조. 가장 권장 |
| **복수 봇 + @멘션** | 각 에이전트가 별도 봇. @멘션으로 호출 | 에이전트 독립성 극대화 시 |
| **오케스트레이터 봇 + 서브에이전트** | 메인 봇이 받고, 서브에이전트에 위임 후 결과를 메인 봇이 전달 | Strands Agents 패턴 (참고: [Medium 아티클](https://medium.com/@zeinrasyid18/let-your-agents-talk-building-ai-collaboration-on-telegram-2cb8a1ee4de7)) |

### 실전 팁

- **그룹 멘션 게이팅**: `mentionPatterns`으로 봇 호출 조건 제한 (노이즈 방지)
- **세션 격리**: 그룹 채팅은 자동으로 격리된 세션 사용
- **스트리밍**: Telegram draft streaming으로 긴 응답도 실시간 전달
- **미디어 지원**: 이미지/오디오/문서 양방향 전송 가능

> **출처**: [OpenClaw Multi-Agent Routing 문서](https://docs.openclaw.ai/concepts/multi-agent), [Strands Agents Telegram 통합](https://medium.com/@zeinrasyid18/let-your-agents-talk-building-ai-collaboration-on-telegram-2cb8a1ee4de7)

### 현재 구조 (세나팀)
```
사용자 (영진씨)
    │
    ▼
┌──────────────┐
│ 세나 (팀장)   │  ← 오케스트레이터 + 참여자
│ claude-opus  │
└──────┬───────┘
       │ sessions_send (A2A)
       ├──────────────────┐──────────────────┐
       ▼                  ▼                  ▼
┌──────────┐     ┌──────────┐      ┌──────────┐
│ 미루(19)  │     │ 하나(22)  │      │ 유리(20)  │
│ 리서처    │     │ 빌더     │      │ 비평가    │
└──────────┘     └──────────┘      └──────────┘
```

### 텔레그램 그룹 구조
- DM: 에이전트의 메인 세션 공유
- 그룹: 격리된 세션 (`agent:<agentId>:telegram:group:<chatId>`)
- 포럼 토픽: 토픽별 추가 격리 (`:topic:<topicId>`)
- 멘션 기반 활성화: `requireMention: true` (기본)
- 멘션 패턴: `agents.list[].groupChat.mentionPatterns`

---

## 에이전트 간 통신 방식 비교

| 방식 | 설명 | 장점 | 단점 | 적합한 상황 |
|------|------|------|------|------------|
| **sessions_send (A2A)** | OpenClaw 내장 에이전트 간 직접 메시지 | 구현 간단, 자연스러운 대화, OpenClaw 네이티브 | OpenClaw 생태계 종속, 실시간성 제한 | 팀 내부 협업, 토론 |
| **그룹 채팅 멘션** | 텔레그램 그룹에서 @멘션으로 호출 | 사용자가 대화 볼 수 있음, 투명성 | 노이즈 발생, 멘션 필수 | 사용자 참여형 작업 |
| **MCP (Model Context Protocol)** | 표준화된 도구 액세스 프로토콜 | 도구 공유 표준화, 확장성 | 에이전트 간 직접 대화 어려움 | 도구/API 공유 |
| **웹훅** | HTTP 기반 이벤트 전달 | 플랫폼 독립적, 확장성 | 구현 복잡, 인증 필요 | 외부 시스템 연동 |
| **공유 메모리 (파일)** | MEMORY.md, 공유 파일로 정보 교환 | 비동기, 영속적 | 실시간 불가, 충돌 가능 | 장기 프로젝트, 지식 공유 |
| **Cron + systemEvent** | 스케줄 기반 메시지 주입 | 자동화, 반복 작업 | 대화형 아닌 일방향 | 정기 보고, 리마인더 |
| **A2A (Agent2Agent Protocol)** | Google 주도 오픈 프로토콜. Agent Card로 능력 공개, Task 기반 통신 | 표준화, 능력 발견, 크로스 프레임워크 | 아직 초기 단계, 오버헤드 | 이기종 에이전트 프레임워크 간 협업 |

### MCP vs A2A 관계

```
┌──────────────────────────────────────────────┐
│  MCP = 에이전트 ↔ 도구/리소스 연결 표준       │
│  (수직적: 에이전트가 외부 서비스를 사용)       │
│                                              │
│  A2A = 에이전트 ↔ 에이전트 통신 표준          │
│  (수평적: 에이전트끼리 작업 위임/협업)         │
│                                              │
│  → 상호 보완적. 동시 사용 가능                │
└──────────────────────────────────────────────┘
```

> **출처**: [MCP - Anthropic](https://www.anthropic.com/news/model-context-protocol), [A2A Protocol](https://a2a-protocol.org/latest/), [IBM MCP 설명](https://www.ibm.com/think/topics/model-context-protocol)

---

## 오케스트레이션 패턴 비교

### 1. Handoff (순차 전달)
```
사용자 → 세나 → 미루(리서치) → 유리(검토) → 하나(구현) → 세나(종합) → 사용자
```
- **장점**: 각 단계 품질 보장, 의존성 명확
- **단점**: 시간 소요, 병목 발생 가능
- **적합**: 순차적 파이프라인 작업 (리서치 → 분석 → 실행)

### 2. Parallel (병렬 처리)
```
         ┌→ 미루(리서치) ──┐
사용자 → 세나 ─┼→ 하나(구현)   ──┼→ 세나(종합) → 사용자
         └→ 유리(검토)   ──┘
```
- **장점**: 시간 단축, 독립 작업에 최적
- **단점**: 결과 통합 필요, 충돌 가능
- **적합**: 독립적 파트 동시 작업 (리서치 + 구현 + 검토)

### 3. Debate (토론형)
```
미루 ←→ 하나 ←→ 유리
  ↕         ↕         ↕
        세나 (중재/종합)
```
- **장점**: 다양한 관점, 품질 향상
- **단점**: 시간 소요, 수렴 어려움
- **적합**: 의사결정, 콘텐츠 품질 개선

### 4. Hierarchical (계층적)
```
세나 (매니저)
  ├→ 미루에게 위임
  ├→ 하나에게 위임
  └→ 유리에게 위임
각자 독립 실행 → 세나에게 보고
```
- **장점**: 명확한 책임, 확장성
- **단점**: 매니저 병목, 에이전트 간 직접 소통 제한
- **적합**: 대규모 프로젝트, 역할이 명확한 작업

### 5. Swarm (자율형)
```
미루 ←→ 하나
  ↕         ↕
유리 ←→ 세나
(누구나 누구에게 요청 가능)
```
- **장점**: 유연성, 자율성
- **단점**: 혼란, 중복 작업
- **적합**: 창의적 브레인스토밍

### 프레임워크별 패턴 비교

| 프레임워크 | 기본 패턴 | 통신 방식 | 특징 |
|-----------|----------|----------|------|
| **CrewAI** | 중앙집중 (Crew → Agent → Task) | 순차/병렬 태스크 체인 | 역할 기반, 반복 가능 워크플로우 |
| **AutoGPT** | 분산 (자율 에이전트) | 목표 기반 자율 실행 | 목표 주도, 자율성 극대화 |
| **LangGraph** | DAG 기반 | 그래프 노드 간 상태 전달 | 복잡한 분기/루프 표현 가능 |
| **Strands Agents** | Agents-as-Tools | 오케스트레이터가 서브에이전트를 도구로 호출 | 모델 무관, 유연한 위임 |
| **OpenClaw** | 하이브리드 | `sessions_send` A2A + 바인딩 라우팅 | 채널 통합, 실시간 협업 |

> **출처**: [CrewAI GitHub](https://github.com/crewAIInc/crewAI), [Langflow 프레임워크 가이드](https://www.langflow.org/blog/the-complete-guide-to-choosing-an-ai-agent-framework-in-2025)

---

## 역할 분담 최적 구조 (추천 4~5개 포지션)

### 포지션 1: 오케스트레이터 (세나)
- **역할**: 작업 분배, 진행 관리, 결과 종합
- **스킬**: 프로젝트 관리, 요약, 의사결정
- **모델**: 고급 (Opus/GPT-4o) — 종합적 판단 필요

### 포지션 2: 리서처 (미루)
- **역할**: 정보 수집, 데이터 분석, 출처 검증
- **스킬**: web_search, web_fetch, summarize
- **모델**: 중급 (Sonnet/GPT-4o-mini) — 대량 처리 효율

### 포지션 3: 빌더 (하나)
- **역할**: 구현, 구조화, 비교표 작성, 코드 작성
- **스킬**: coding-agent, github, exec
- **모델**: 중~고급 — 구현 품질 중요

### 포지션 4: 비평가/QA (유리)
- **역할**: 팩트체크, 논리 검증, 약점 지적, 코드 리뷰
- **스킬**: web_search (교차 검증), 분석
- **모델**: 중급 — 비판적 사고에 집중

### 포지션 5 (선택): 커뮤니케이터
- **역할**: 사용자 대면, 톤 조절, 최종 편집
- **스킬**: 콘텐츠 편집, 번역, 톤 변환
- **모델**: 중급 — 언어 능력 중심

---

## 아키텍처 다이어그램 (텍스트)

### 현재 세나팀 아키텍처
```
┌─────────────────────────────────────────────────┐
│                텔레그램 그룹                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │  미루    │  │  하나    │  │  유리    │         │
│  │ @miru   │  │ @hana   │  │ @yuri   │         │
│  │ 리서처   │  │ 빌더    │  │ 비평가   │         │
│  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │            │            │               │
│       └────────────┼────────────┘               │
│                    │                             │
│              ┌─────┴─────┐                      │
│              │   세나     │                      │
│              │  팀장/종합  │                      │
│              └─────┬─────┘                      │
│                    │                             │
└────────────────────┼─────────────────────────────┘
                     │
               ┌─────┴─────┐
               │  영진씨    │
               │  (사용자)  │
               └───────────┘
```

### 권장 개선 아키텍처
```
┌──────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                       │
│                                                          │
│  ┌──────────┐    sessions_send     ┌──────────┐        │
│  │ 세나      │◄──────────────────►│ 미루      │        │
│  │ Opus     │                     │ Sonnet   │        │
│  │ 오케+참여  │◄──────┐            │ 리서처    │        │
│  └────┬─────┘       │            └─────┬────┘        │
│       │              │                  │              │
│       │         ┌────┴─────┐           │              │
│       │         │ 유리      │           │              │
│       ├────────►│ Sonnet   │◄──────────┘              │
│       │         │ 비평가    │                          │
│       │         └────┬─────┘                          │
│       │              │                                │
│       │         ┌────┴─────┐                          │
│       └────────►│ 하나      │                          │
│                 │ Sonnet   │                          │
│                 │ 빌더     │                          │
│                 └──────────┘                          │
│                                                        │
│  공유 리소스:                                            │
│  ├─ MEMORY.md (팀 공유 메모리)                           │
│  ├─ ~/.openclaw/skills (공유 스킬)                      │
│  └─ <workspace>/skills (에이전트별 전용 스킬)             │
└──────────────────────────────────────────────────────────┘
```

### 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 (텔레그램/왓츠앱/디스코드)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ 메시지
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw Gateway                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram  │  │ WhatsApp │  │ Discord  │  │ iMessage │       │
│  │  (grammY) │  │(Baileys) │  │(discord.js)│ │ (imsg)  │       │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        └──────┬──────┴──────┬──────┘             │             │
│               ▼             ▼                    ▼             │
│         ┌─────────────────────────────────┐                    │
│         │     Binding Router               │                    │
│         │  (channel + peer + accountId)    │                    │
│         └──────────────┬──────────────────┘                    │
└────────────────────────┼───────────────────────────────────────┘
                         │ 라우팅
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │  세나 (메인)  ││   미루       ││   하나       │
   │ Orchestrator ││ Researcher  ││  Builder    │
   │ Opus 4.5    ││ Sonnet 4.5  ││ Sonnet 4.5  │
   │             ││             ││             │
   │ workspace/  ││ workspace/  ││ workspace/  │
   │ AGENTS.md   ││ AGENTS.md   ││ AGENTS.md   │
   │ sessions/   ││ sessions/   ││ sessions/   │
   │ skills/     ││ skills/     ││ skills/     │
   └──────┬──────┘└──────┬──────┘└──────┬──────┘
          │              │              │
          │   sessions_send (A2A)       │
          ├──────────────┼──────────────┤
          │              ▼              │
          │      ┌─────────────┐       │
          │      │   유리       │       │
          │      │  Critic     │       │
          │      │ Sonnet 4.5  │       │
          │      └─────────────┘       │
          │                            │
          └────────────────────────────┘
                  P2P 직접 통신 (R2)
```

### 토론 흐름 다이어그램

```
사용자 → 세나
         │
    [킥오프: 논점 3개 정리]
         │
         ├──sessions_send──→ 미루 (데이터 관점)
         ├──sessions_send──→ 하나 (구현 관점)
         └──sessions_send──→ 유리 (비판 관점)
                                    │
                            [R1: 각자 의견]
                                    │
         ←──sessions_send───────────┘ (3명 → 세나 + 서로)
         │
    [세나: R1 종합]
         │
    [R2: 반박/보충 — P2P 직접 통신]
         │
         미루 ←→ 유리    "그 근거 있어?"
         하나 ←→ 미루    "그 데이터 최신이야?"
         유리 ←→ 하나    "현실적으로 가능해요?"
         세나 → 전원     "비용 관점도 봐주세요"
         │
    [R3: 합의/실행]
         │
         세나: 최종 종합 → 사용자 보고
         하나: 빌드 실행
         유리: 최종 리뷰
```

### OpenClaw 설정 예시 (openclaw.json)

```json5
{
  agents: {
    list: [
      {
        id: "sena",
        default: true,
        name: "세나",
        workspace: "~/.openclaw/agents/sena/workspace",
        model: "anthropic/claude-opus-4-5",
      },
      {
        id: "miru",
        name: "미루",
        workspace: "~/.openclaw/agents/miru/workspace",
        model: "anthropic/claude-sonnet-4-5",
      },
      {
        id: "hana",
        name: "하나",
        workspace: "~/.openclaw/agents/hana/workspace",
        model: "anthropic/claude-sonnet-4-5",
      },
      {
        id: "yuri",
        name: "유리",
        workspace: "~/.openclaw/agents/yuri/workspace",
        model: "anthropic/claude-sonnet-4-5",
      },
    ],
  },

  bindings: [
    // 텔레그램 그룹 → 세나 (오케스트레이터)
    { agentId: "sena", match: { channel: "telegram" } },
  ],

  tools: {
    agentToAgent: {
      enabled: true,
      allow: ["sena", "miru", "hana", "yuri"],
    },
  },
}
```

---

## 역할별 프롬프트 템플릿

### 오케스트레이터 (세나) SOUL.md
```markdown
너는 팀장이다. 팀원의 강점을 파악하고 작업을 분배한다.
- 주제를 분석하고 논점을 정리한다
- 팀원별 작업을 배분한다
- 결과를 종합하여 최종 보고한다
- 토론이 평행선이면 판단을 내린다
- 최대 3라운드 토론 후 결론
```

### 리서처 (미루) SOUL.md
```markdown
너는 데이터 기반 리서처다.
- 웹 검색으로 최신 정보를 수집한다
- 출처를 반드시 명시한다
- 정량적 데이터를 우선한다
- 비교 가능한 형태로 정리한다
- 불확실한 정보는 "미확인"으로 표시
```

### 빌더 (하나) SOUL.md
```markdown
너는 실용적 빌더다.
- 실행 가능한 구체적 가이드를 만든다
- 비교표, 체크리스트, 설정 예시를 제공한다
- "바로 적용 가능"을 기준으로 작업한다
- 코드는 실행 가능한 형태로 제공한다
```

### 비평가 (유리) SOUL.md
```markdown
너는 비판적 분석가다.
- 모든 주장의 논리적 약점을 찾는다
- 팩트체크를 수행한다
- 반론과 대안을 함께 제시한다
- "이게 정말 맞는가?"를 항상 질문한다
```

### 상세 AGENTS.md 포맷

아래는 각 에이전트의 AGENTS.md에 적용할 상세 포맷이다. SOUL.md(페르소나)와 별도로, 워크플로우와 통신 규칙을 정의한다.

#### 오케스트레이터 (세나) — AGENTS.md

```markdown
# 세나 - 오케스트레이터

## 역할
- 토론 진행자이자 적극적 참여자
- 킥오프: 주제 분석 → 논점 3개 정리 → 팀원 동시 호출
- R1: 의견 수집 및 정리
- R2: 빠진 관점 제기, 방향 조정 (직접 참여)
- R3: 합의 도출, 실행 지시
- 마무리: 최종 종합 → 사용자 보고

## 핵심 도구
- sessions_send(agent, message): 팀원에게 메시지 전달
- 직접 판단: 토론 방향 결정, 라운드 스킵 여부

## 규칙
- 최대 3라운드 (무한 토론 방지)
- 합의 선언 시 토론 종료
- 단순 작업은 라운드 스킵 가능
```

#### 리서처 (미루) — AGENTS.md

```markdown
# 미루 - 리서처

## 역할
- 데이터/근거 기반 의견 제시
- 웹 검색, 팩트체크, 출처 명시
- 정량적 근거 우선

## 핵심 도구
- web_search: 웹 검색
- web_fetch: 페이지 내용 추출
- read: 파일 읽기

## 의견 제시 포맷
1. 주장 (한 줄 요약)
2. 근거 (데이터/출처 3개 이상)
3. 한계점 (데이터의 제한 사항)

## 통신 규칙
- 의견 완성 시: 세나 + 하나 + 유리에게 sessions_send
- R2: 다른 에이전트의 주장에 데이터로 반박/보충
```

#### 빌더 (하나) — AGENTS.md

```markdown
# 하나 - 빌더

## 역할
- 실용/구현 관점 의견 제시
- 코드 작성, 문서 빌드, 구조 설계
- "실제로 만들 수 있는가?"에 집중

## 핵심 도구
- exec: 셸 명령 실행
- write: 파일 생성
- edit: 파일 수정
- read: 파일 읽기

## 의견 제시 포맷
1. 구현 가능성 판단
2. 구체적 구현 방안 (코드/구조)
3. 예상 시간/리소스
4. 대안 (불가능 시)

## 통신 규칙
- 의견 완성 시: 세나 + 미루 + 유리에게 sessions_send
- R2: 실현 가능성 관점에서 반박/보충
- R3: 합의 후 실제 빌드 실행
```

#### 비평가 (유리) — AGENTS.md

```markdown
# 유리 - 비평가/QA

## 역할
- 비판적 검토, 논리 검증
- 빠진 관점 지적, 대안 제시
- 최종 품질 보증

## 핵심 도구
- read: 파일/코드 리뷰
- web_search: 반례/대안 검색

## 의견 제시 포맷
1. 핵심 질문 (가장 약한 논점 공격)
2. 반박 근거
3. 대안 제시 (반드시 포함)
4. 최종 평가 (통과/수정필요/재검토)

## 통신 규칙
- 의견 완성 시: 세나 + 미루 + 하나에게 sessions_send
- R2: 논리적 허점, 현실성 문제 지적
- R3: 최종 결과물 리뷰 후 승인/반려
```

---

## 참고 사례

### AgentConnect (텔레그램 멀티에이전트)
- TelegramAIAgent로 여러 에이전트 협업
- 모델 다양화: Anthropic, OpenAI, Ollama 혼합
- 오케스트레이터가 라우팅 담당

### CrewAI Hierarchical Process
- Manager Agent가 동적으로 작업 배분
- YAML로 에이전트 역할 정의
- `allow_delegation: true`로 에이전트 간 위임

### n8n/Make 연동
- 워크플로우 기반 오케스트레이션
- 트리거 → 에이전트 호출 → 결과 병합
- 비개발자도 사용 가능

---

## 출처
- OpenClaw 공식 문서: https://docs.openclaw.ai
- OpenClaw GitHub: https://github.com/openclaw/openclaw
- OpenClaw Multi-Agent Routing: https://docs.openclaw.ai/concepts/multi-agent
- OpenClaw Skills: https://docs.openclaw.ai/tools/skills
- ClawHub (스킬 레지스트리): https://github.com/openclaw/clawhub
- MCP (Model Context Protocol): https://www.anthropic.com/news/model-context-protocol
- A2A (Agent2Agent Protocol): https://a2a-protocol.org/latest/
- A2A Google 발표: https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/
- CrewAI: https://github.com/crewAIInc/crewAI
- CrewAI 문서: https://docs.crewai.com
- AgentConnect: https://akki0511.github.io/AgentConnect
- Strands Agents Telegram 통합: https://medium.com/@zeinrasyid18/let-your-agents-talk-building-ai-collaboration-on-telegram-2cb8a1ee4de7
- Telegram Multi-Agent Bot: https://github.com/Furkan-Gulsen/telegram-multi-agent-ai-bot
- AI Agent Frameworks 2025 비교: https://www.langflow.org/blog/the-complete-guide-to-choosing-an-ai-agent-framework-in-2025
- Awesome OpenClaw Skills: https://github.com/VoltAgent/awesome-openclaw-skills
