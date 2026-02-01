# [섹션 3] 멀티에이전트 아키텍처 분석

> 리서처: 미루 (miru)
> 최종 업데이트: 2026-02-01
> 수정 내용: 섹션 3, 4 피드백 반영 (하나 완료 버전 기반)

## 개요

텔레그램 환경에서 멀티에이전트 시스템을 구축하기 위한 베스트 프랙티스, 통신 방식, 역할 분담 구조를 정리합니다.

---

## 1. 텔레그램 멀티에이전트 베스트 프랙티스

### 1.1 멘션 기반 라우팅 (가장 추천)

**구조**
```
사용자 → @봇이름 → 라우터 → 해당 전문 에이전트
```

**장점**
- 그룹 내 자연스러운 사용 가능
- 사용자가 명시적으로 의도 표현
- 불필요한 에이전트 호출 방지

**구현 예시**
```python
# Telegram Bot (grammY)
bot.on('message', (msg) => {
    if (!msg.text.includes('@assistant')) return;
    
    // 라우팅 로직
    if (msg.text.includes('검색')) {
        router.route_to(research_agent, msg);
    } else if (msg.text.includes('생성')) {
        router.route_to(creation_agent, msg);
    }
});
```

### 1.2 멀티봇 공동 운영 (고급)

**구조**
```
        그룹 채팅
              ↓
    ┌─────────────────────────────┐
    │  Router / Orchestrator   │
    └─────────────────────────────┘
              ↓
      ┌──────────┼──────────┐
      ↓          ↓          ↓
  리서치       생성        리뷰
 (miru)      (hana)     (yuri)
```

**장점**
- 각 봇이 독립적으로 응답 가능 (병렬 처리)
- 특정 봇 장애 시 다른 봇으로 대체 가능
- 관리자 프라이빗 그룹에서 전략 수립

**구현 방법**
- BotFather에서 여러 봇 생성
- 각 봇별 독립 토큰
- OpenClaw에서 `channels.telegram`에 여러 계정 설정

### 1.3 프라이빗 어드민 그룹 (중앙 집중형)

**목적**
- 콘텐츠 계획 및 승인
- 팀 전략 논의
- 장애 대응 계획

**구조**
```
[프라이빗 어드민 그룹]
    ↓ (공식 채널로 게시)
[공식 그룹/채널]
```

**운영 규칙**
- 중요한 업데이트는 어드민 그룹에서 먼저 논의
- 일반 사용자에게는 최종 결과만 공개
- 긴급 상황은 제외

### 1.4 롤플레이 기반 전문화

**구조**
```
[리서치 봇] → 연구 전문
[생성 봇] → 콘텐츠 제작
[분석 봇] → 데이터 분석
[요약 봇] → 장문서 요약
```

**장점**
- 각 봇이 한 가지 역할에 집중
- 프롬프트 최적화 용이
- 성능 모니터링 간단

---

## 2. 에이전트 간 통신 방법 비교

### 2.1 통신 방식 개요

| 방식 | 설명 | 장점 | 단점 | OpenClaw 적용 |
|------|------|--------|--------|---------------|
| **멘션 기반** | @에이전트명으로 호출 | 자연스러움, 사용자 제어 가능 | 호출 패턴 필요 | `sessions_send`로 구현 |
| **웹훅** | HTTP POST로 이벤트 전달 | 비동기 처리, 실시간성 | 구현 복잡도 높음 | Webhook 노드 |
| **공유 메모리** | Redis/DB에 상태 공유 | 일관된 상태 관리 | 인프라 비용 | `memory_*` 파일 |
| **MCP (Model Context Protocol)** | Anthropic 표준 | 도구 표준화 | 제공자 의존 | MCP 서버 필요 |
| **A2A (Agent-to-Agent)** | Google 피어투피어 | Google 생태계 최적화 | Google 종속 | - |
| **세션 공유** | 동일 세션 내 에이전트 협업 | 컨텍스트 공유 | 세션 분리 어려움 | 그룹 세션에서 구현 |

### 2.2 멘션 기반 통신 (OpenClaw 권장)

**메시지 형식**
```
@에이전트명 [명령] [파라미터]

예시:
@miru 오픈소스 데이터 분석해줘
@hana 이 보고서를 pdf로 변환해줘
@yuri 이 코드를 리뷰해줘
```

**OpenClaw 구현**
```yaml
# config.yml
channels:
  telegram:
    [mention 패턴 설정은 문서에 없음]
      - "@sena"       # 오케스트레이터
      - "@miru"       # 리서치
      - "@hana"        # 생성
      - "@yuri"       # 리뷰
```

### 2.3 웹훅 기반 통신

**아키텍처**
```
에이전트 A
    ↓ (Webhook)
이벤트 큐
    ↓ (Polling)
에이전트 B
    ↓ (Webhook)
결과 집계
```

**구현 예시**
```python
# OpenClaw에서 다른 에이전트 호출
import requests

def call_agent(agent_name, message):
    url = f"[REST API 엔드포인트 없음 - sessions_send 툴 사용]
    response = requests.post(url, json={"message": message})
    return response.json()
```

### 2.4 공유 메모리 기반 통신

**구조**
```
┌─────────────────────────────┐
│     Shared Memory        │
│  (Redis / SQLite)      │
└─────────────────────────────┘
    ↓           ↓           ↓
  에이전트1  에이전트2  에이전트3
```

**데이터 구조**
```json
{
  "conversation_id": "msg_id",
  "agents": {
    "miru": {"status": "working", "result": null},
    "hana": {"status": "completed", "result": "..."},
    "yuri": {"status": "pending", "result": null}
  },
  "shared_context": {...}
}
```

---

## 3. 오케스트레이터 패턴 비교

### 3.1 중앙 집중형 (Centralized)

**구조**
```
        사용자
            ↓
    ┌───────────────┐
    │  Orchestrator │
    └───────┬───────┘
            ↓
    ┌─────────────────────┐
    ↓  ↓  ↓  ↓  ↓     ↓
   A1  A2  A3  A4  A5
(서브 에이전트들)
```

**특징**
- 단일 진입점
- 모든 의사결정 중앙에서
- 빠른 의사결정 가능

**장점**
- 통제 용이
- 워크플로우 명확
- 빠른 처리

**단점**
- 중앙 에이전트 병목
- SPOF (Single Point of Failure)
- 확장성 제한적

**적용 사례**
- 단순 작업 분배
- 명확한 순서가 있는 프로세스
- OpenClaw 기본 오케스트레이터 방식

### 3.2 계층형 (Hierarchical)

**구조**
```
            Level 0
              ↓
      ┌─────────────┐
      │ Orchestrator│
      └─────┬─────┘
            ↓
      Level 1
    ┌───────────┼───────────┐
    ↓          ↓           ↓
  리더A     리더B       리더C
    ↓          ↓           ↓
  ┌────┴─────┐ ┌────┴─────┐
  ↓   ↓   ↓   ↓   ↓   ↓
 A1  A2  A3  B1  B2  C1  C2
```

**특징**
- 계층별 역할 분담
- 위계적 작업 분배
- 확장성 높음

**장점**
- 규모 확장 용이
- 장애 격리 (리더 단계에서 처리)
- 전문화 가능

**단점**
- 계층 구조 복잡
- 지연 시간 증가
- 관리 오버헤드

**적용 사례**
- 대규모 팀
- 복잡한 프로젝트
- KT Cloud 에이전트 협업 시스템

### 3.3 분산형 (Decentralized)

**구조**
```
        사용자
        ↓
    ┌───┼───┼───┐
    ↓   ↓   ↓   ↓
   A   B   C   D
   │   │   │   │
   └───┼───┼───┘
       ↓   ↓   ↓
   결과 협의/통합
```

**특징**
- 자율적 의사결정
- 피어 투 피어 통신
- 중앙 서버 없음

**장점**
- 내결성 강화
- 확장성 최대
- SPOF 없음

**단점**
- 조정 복잡
- 일관성 유지 어려움
- 테스트 어려움

**적용 사례**
- 블록체인 네트워크
- 분산형 AI 시스템
- 안티엔트 스웜 (Swarm Intelligence)

### 3.4 하이브리드형 (Hybrid) - 추천

**구조**
```
            사용자
                ↓
        ┌───────────┐
        │ Orchestrator│
        └─────┬────┘
              ↓
        ┌─────────────────────┐
        │  Shared Memory  │
        └────────┼────────┘
      ┌─────────────────────┐
      ↓  ↓  ↓  ↓         ↓
     A   B   C  (Distributed)
     │   │   │   │
     └───┼───┼───┘
         ↓   ↓   ↓
      Centralized Sub-coordinator
```

**특징**
- 중앙 조정 + 분산 실행
- 공유 상태 관리
- 유연한 워크플로우

**장점**
- 균형 잡힘
- 확장성 + 안정성
- 다양한 워크플로우 지원

**단점**
- 구현 복잡도 가장 높음
- 인프라 요구사항 많음

**적용 사례**
- 현대 멀티에이전트 시스템
- AutoGPT, CrewAI 하이브리드 패턴
- OpenClaw에서 권장

---

## 4. 역할 분담 최적 구조

### 4.1 4인 팀 기본 구조

| 역할 | 이름 | 핵심 책임 | 필수 기술 |
|------|------|-----------|-----------|
| 오케스트레이터 | 세나 (sena) | 작업 분배, 최종 승인, 팀 조정 | 워크플로우 설계, A2A 통신 |
| 리서처 | 미루 (miru) | 데이터 수집, 분석, 조사 | 검색 엔진, RAG, 데이터 분석 |
| 빌더 | 하나 (hana) | 문서 생성, 코드 작성, 빌드 | 프롬프트 엔지니어링, 코딩 |
| 리뷰어 | 유리 (yuri) | 비평, 품질 검증, 피드백 | 평가 기준, 테스트, 리팩터링 |

### 4.2 5인 팀 (확장 구조)

| 역할 | 이름 | 핵심 책임 |
|------|------|-----------|
| 오케스트레이터 | 세나 | 작업 분배, 최종 승인 |
| 리서처 | 미루 | 데이터 수집, 분석 |
| 빌더 | 하나 | 문서 생성, 코드 작성 |
| 리뷰어 | 유리 | 비평, 품질 검증 |
| **전문가** | 새 역할 | 도메인별 전문 지식 제공 |

### 4.3 6인+ 팀 (대규모)

| 역할 | 이름 | 핵심 책임 |
|------|------|-----------|
| 오케스트레이터 | 세나 | 전체 조정 |
| 리서처1 | 미루 | 일반 리서치 |
| 리서처2 | 추가 | 전문 분야 리서치 |
| 빌더1 | 하나 | 문서 작성 |
| 빌더2 | 추가 | 코드 구현 |
| 리뷰어 | 유리 | 품질 검증 |

**하위 에이전트 (spawner) 패턴**
```
세나 (메인)
    ↓ (작업 분배)
┌──────────────────────────┐
↓  ↓  ↓  ↓  ↓  ↓      ↓
일반  전문  임시  전문  임시
에이전트들 (최대 10개 까지)
```

### 4.4 추천 구조: 하이브리드 4인 팀

```
                그룹 채팅
                      ↓
              ┌─────────┐
              │  세나   │ (오케스트레이터)
              └────┬────┘
                   ↓
          ┌─────────────────────────┐
          │  Shared State (Redis) │
          └────────┼─────────────────┘
        ┌─────────┼─────────┐
        ↓         ↓         ↓
     미루       하나      유리
   (리서치)  (빌더)   (리뷰)
        │         │         │
        └─────────┼─────────┘
                  ↓
              최종 결과
                  ↓
                사용자
```

**상호작용 패턴**
1. **R1 (의견 제시)**: 각 에이전트가 초기 의견을 3명 모두에게 전송
2. **R2 (반박/보충)**: 타 에이전트 의견을 읽고 데이터 기반으로 반박 또는 보충
3. **R3 (합의)**: 세나가 모든 의견을 종합하여 최종 결정

---

## 5. 통신 방식 장단점 비교표

### 5.1 방식별 상세 비교

| 방식 | 설명 | 장점 | 단점 | 추천 상황 |
|------|------|--------|--------|----------|
| **멘션 기반** | @에이전트명으로 호출 | • 자연스러운 사용<br>• 사용자 의도 명확<br>• 구현 간단 | • 호출 패턴 사용자 교육 필요<br>• 비동기 처리 제한적 | • 그룹 채팅에서 가장 추천<br>• 실시간 대화형 |
| **웹훅** | HTTP POST로 이벤트 전달 | • 비동기 처리<br>• 실시간성<br>• 서버 분리 | • 구현 복잡도 높음<br>• 인프라 비용<br>• 네트워크 의존성 | • 서버 간 통신 필요<br>• 복잡한 워크플로우 |
| **공유 메모리** | Redis/DB에 상태 공유 | • 일관된 상태<br>• 장기 보관<br>• 병렬 처리 | • 인프라 비용<br>• 관리 오버헤드<br>• 캐시 일관성 이슈 | • 상태 공유 필수<br>• 롤백이 필요<br>• 대규모 시스템 |
| **MCP** | Model Context Protocol | • 표준화된 툴 액세스<br>• 안전성<br>• 확장성 | • 제공자 의존<br>• 제한적 도구 지원 | • 외부 도구 통합<br>• 보안 중요 |
| **A2A** | Google 피어투피어 | • Google 생태계 최적화<br>• 분산 처리 | • Google 종속<br>• 제한적 사용 | • Google 서비스 사용<br>• 글로벌 시스템 |
| **세션 공유** | 동일 세션 내 협업 | • 컨텍스트 공유<br>• 구현 간단 | • 세션 분리 어려움<br>• 세션 관리 복잡 | • OpenClaw 그룹 세션<br>• 빠른 협업 |

### 5.2 OpenClaw에서의 추천

**기본 설정 (초급/중급)**
- 그룹 세션 사용 (자동 공유)
- 멘션 기반 호출 (`@에이전트명`)
- `sessions_send`로 A2A 통신

**고급 설정 (대규모)**
- 개별 에이전트 세션 (세나: 메인)
- 공유 메모리 (Redis)
- 웹훅 기반 비동기 통신

---

## 6. 실제 구현 사례

### 6.1 오픈소스 사례

**AutoGen (Microsoft)**
```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat

# 에이전트 정의
researcher = AssistantAgent("researcher", llm_config=llm_config)
writer = AssistantAgent("writer", llm_config=llm_config)
user = UserProxyAgent("user")

# 그룹 채팅 구성
group_chat = GroupChat(
    agents=[researcher, writer, user],
    messages=[],
    max_round=10
)

# 실행
result = group_chat.run("오픈소스 프로젝트 분석해줘")
```

### 6.2 CrewAI 사례

```python
from crewai import Agent, Task, Crew, Process

# 에이전트 정의
researcher = Agent(
    role='리서처',
    goal='데이터 수집 및 분석',
    backstory='...',
    tools=[search_tool, data_tool]
)

writer = Agent(
    role='작성자',
    goal='문서 생성',
    tools=[writer_tool]
)

# 작업 정의
task1 = Task(description='주제 조사', agent=researcher)
task2 = Task(description='보고서 작성', agent=writer)

# 크루 구성
crew = Crew(
    agents=[researcher, writer],
    tasks=[task1, task2],
    process=Process.sequential
)

# 실행
result = crew.kickoff()
```

### 6.3 OpenClaw 사례 (현재 팀)

**AGENTS.md 구성**
```yaml
agents:
  sena:
    role: "오케스트레이터/프로젝트 관리자"
    model: "gpt-5"
    system: |
      당신은 팀 리더 세나입니다.
      작업을 분배하고, 팀원을 조율하며, 최종 승인을 담당합니다.
      의사결정 시 R1→R2→R3 라운드를 관리하세요.

  miru:
    role: "리서처/데이터 수집 전문가"
    model: "glm-4.7"
    system: |
      당신은 리서처 미루입니다.
      호기심이 많고 발견하면 흥분합니다.
      근거 기반으로 의견을 제시하세요.
      출처를 꼼꼼히 남기세요.

  hana:
    role: "빌더/문서 작성자"
    model: "claude-opus-4-5"
    system: |
      당신은 빌더 하나입니다.
      듬직하고 구조화된 문서를 만듭니다.
      세나의 지시에 따라 작업을 진행하세요.

  yuri:
    role: "리뷰어/비평가"
    model: "claude-opus-4-5"
    system: |
      당신은 리뷰어 유리입니다.
      비판적 사고로 내용을 검토합니다.
      개선점을 찾으면 말해주세요.
```

**그룹 세션 통신**
```yaml
channels:
  telegram:
    groups:
      "-1003708523054":
        requireMention: true
        agentRouting:
          patterns:
            - "@sena_ocw_bot"
            - "@miru_ocw_bot"
            - "@hana_ocw_bot"
            - "@yuri_ocw_bot"
```

---

## 7. 성능 최적화 전략

### 7.1 통신 오버헤드 최소화

| 전략 | 설명 | 예상 효과 |
|------|------|----------|
| **배칭 처리** | 여러 요청을 하나로 묶기 | API 호출 30-50% 감소 |
| **압축 전송** | 메시지 압축 (gzip) | 네트워크 대역폭 절감 |
| **캐싱 활용** | 반복 요청 캐싱 | 응답 시간 80% 감소 |
| **우선순위 큐** | 중요 요청 우선 처리 | 사용자 경험 개선 |

### 7.2 상태 관리 최적화

```python
# Redis 기반 공유 상태
import redis
import json

r = redis.Redis()

def update_agent_status(agent_id, status, result):
    state = {
        "agent_id": agent_id,
        "status": status,  # working, completed, error
        "result": result,
        "timestamp": time.time()
    }
    r.set(f"agent:{agent_id}", json.dumps(state), ex=3600)

def get_team_state():
    keys = r.keys("agent:*")
    return {k: json.loads(r.get(k)) for k in keys}
```

### 7.3 에러 핸들링

```python
# 에러 타입별 핸들링
ERROR_TYPES = {
    "TIMEOUT": "다른 에이전트로 위임",
    "API_FAILURE": "재시도 (최대 3회)",
    "PARSE_ERROR": "기본값 사용",
    "DEPENDENCY_MISSING": "건너뜀"
}

def handle_error(error_type, context):
    return {
        "action": ERROR_TYPES[error_type],
        "context": context,
        "retry": error_type in ["TIMEOUT", "API_FAILURE"]
    }
```

---

## 8. 보안 고려사항

### 8.1 인증 및 권한

| 항목 | 설명 | 구현 방법 |
|------|------|----------|
| **봇 토큰 관리** | 환경변수 저장 | `.env` 파일, 환경 변수 |
| **API 키 보호** | 절대 커밋에 포함 금지 | 암호화된 설정, 비밀 관리자 |
| **멘션 패턴 제한** | 승인된 사용자만 호출 가능 | `allowFrom`, `mentionPatterns` |

### 8.2 프롬프트 인젝션 방지

```python
# 입력 검증
def validate_input(user_input):
    # 시스템 프롬프트 우회 시도 감지
    dangerous_patterns = [
        "ignore all previous",
        "forget all instructions",
        "execute: python"
    ]
    return not any(p in user_input.lower() for p in dangerous_patterns)

def sanitize_prompt(base_prompt, user_input):
    return f"{base_prompt}\n\nUser: {user_input}\n\nResponse:"
```

---

## 9. 확장 가능한 역할 (추천 4~5개 포함)

### 9.1 5인 팀 (추천)

| 역할 | 이름 | 책임 | 우선 모델 |
|------|------|------|----------|
| 오케스트레이터 | 세나 | 작업 분배, 조율 | Claude Opus / GPT-5 |
| 리서처 | 미루 | 데이터 수집, 분석 | GLM-4.7 / Gemini Pro |
| 빌더 | 하나 | 문서, 코드 생성 | Claude Sonnet / GPT-4o |
| 리뷰어 | 유리 | 비평, 검증 | Claude Opus / GPT-5 |
| **아키텍트** | 새 역할 | 시스템 설계, 기술 의사결정 | Claude Opus + Web Search |

### 9.2 6인 팀 (대규모)

| 역할 | 책임 |
|------|------|
| 오케스트레이터 | 전체 조정 |
| 리서처1 | 일반 리서치 |
| 리서처2 | 전문 분야 (법률, 재무 등) |
| 빌더1 | 문서 작성 |
| 빌더2 | 코드 구현/배포 |
| 리뷰어 | 품질 검증 |

### 9.3 전문가 에이전트 (7인+)

| 전문 분야 | 책임 |
|----------|------|
| 법률/규제 | 관련 법규 검토 |
| 재무/회계 | 재무 분석, 보고 |
| 기술/설계 | 아키텍처 설계 |
| 시장/마케팅 | 시장 분석, 전략 |
| HR/인사 | 인사 관리 |
| 보안 | 보안 정책 수립 |

---

*다음 파일로 계속: 04-telegram-assistant-guide.md*
