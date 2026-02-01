# 섹션 5: 텔레그램 AI 비서 구축 가이드

## 5가지 옵션 비교표

| 항목 | OpenClaw 단독 | n8n 연동 | Make 연동 | Todoist API 직접 | 커스텀 봇 개발 |
|------|-------------|---------|---------|----------------|-------------|
| **난이도** | ⭐⭐ 중 | ⭐⭐⭐ 중상 | ⭐⭐ 중 | ⭐⭐⭐⭐ 상 | ⭐⭐⭐⭐⭐ 최상 |
| **초기 비용** | $0 (셀프호스트) | $0~24/월 (n8n cloud) | $9~16/월 | $0 (API 무료) | $0~50/월 (서버) |
| **운영 비용** | AI API 비용만 | AI API + n8n | AI API + Make | AI API + 서버 | AI API + 서버 + 유지보수 |
| **기능 범위** | 대화, 스킬, 멀티에이전트 | 워크플로우 자동화 + AI | 비주얼 자동화 + AI | 투두 특화 | 무제한 |
| **확장성** | 스킬 추가로 확장 | 워크플로우 추가 | 시나리오 추가 | API 확장 | 무제한 |
| **유지보수** | 낮음 (자동 업데이트) | 중간 | 중간 | 높음 | 매우 높음 |
| **프로그래밍** | 불필요 | 최소 (노코드) | 불필요 (노코드) | Python/JS 필수 | 풀스택 필수 |
| **투두 관리** | MEMORY.md + 스킬 | Todoist/Notion 연동 | Todoist/Notion 연동 | Todoist 네이티브 | DB 직접 설계 |
| **일정 관리** | cron + gog 스킬 | Google Calendar 연동 | Calendar 연동 | 별도 구현 필요 | 별도 구현 필요 |
| **추천 대상** | 개인 AI 비서 | 자동화 파워유저 | 비개발자 | 개발자 | 풀스택 개발자 |

---

## 추천 아키텍처

### 초급: OpenClaw Only
```
텔레그램 ← → OpenClaw Gateway
                │
                ├─ 기본 대화 (AI 모델)
                ├─ 웹 검색 (web_search)
                ├─ 리마인더 (cron)
                ├─ 메모 (MEMORY.md)
                └─ 날씨/뉴스 (스킬)
```
**구현 시간**: 30분
**비용**: AI API만
**적합**: AI 대화 + 간단한 작업 관리

### 중급: OpenClaw + 외부 서비스 연동
```
텔레그램 ← → OpenClaw Gateway
                │
                ├─ 기본 기능 (초급과 동일)
                ├─ Google Calendar (gog 스킬)
                ├─ Gmail (gog 스킬)
                ├─ GitHub (github 스킬)
                ├─ Todoist (커스텀 스킬)
                └─ 멀티에이전트 (2~3명)
```
**구현 시간**: 2~4시간
**비용**: AI API + 외부 서비스 (대부분 무료 티어)
**적합**: 생산성 관리 + 개발 워크플로우

### 고급: OpenClaw + n8n/Make + 멀티에이전트
```
텔레그램 ← → OpenClaw Gateway
                │
                ├─ 멀티에이전트 팀 (4명)
                │   ├─ 오케스트레이터
                │   ├─ 리서처
                │   ├─ 빌더
                │   └─ 비평가
                │
                ├─ n8n 워크플로우 (웹훅)
                │   ├─ 이메일 자동 분류
                │   ├─ 일정 충돌 감지
                │   └─ 보고서 자동 생성
                │
                ├─ 외부 서비스 풀 연동
                └─ 커스텀 스킬 팩
```
**구현 시간**: 1~2일
**비용**: AI API + n8n ($24/월) + 외부 서비스
**적합**: 팀 운영 + 업무 자동화 + 프로젝트 관리

---

## Todoist 연동 구체적 방법

### 방법 1: OpenClaw 커스텀 스킬

```markdown
# skills/todoist/SKILL.md
---
name: todoist
description: Todoist 작업 관리 (추가/조회/완료/삭제)
metadata: {"openclaw": {"requires": {"env": ["TODOIST_API_TOKEN"]}}}
---

## 사용법
Todoist REST API v2를 사용하여 작업을 관리한다.

### API 엔드포인트
- Base URL: https://api.todoist.com/rest/v2
- 인증: Bearer Token

### 작업 추가
`POST /tasks`
```json
{
  "content": "작업 내용",
  "due_string": "tomorrow at 10am",
  "priority": 4,
  "project_id": "프로젝트ID"
}
```

### 작업 조회
`GET /tasks?project_id=xxx`

### 작업 완료
`POST /tasks/{id}/close`

### 프로젝트 목록
`GET /projects`
```

### 방법 2: n8n 워크플로우

```
트리거 (텔레그램 메시지)
    → OpenClaw 처리 (의도 파악)
    → 분기
        → "추가" → Todoist Create Task
        → "조회" → Todoist Get Tasks → 포맷 → 응답
        → "완료" → Todoist Complete Task
        → "기타" → OpenClaw 일반 응답
```

### 방법 3: Make (Integromat) 시나리오

```
Telegram Watch → Router
    Route 1: 키워드 "할일" → Todoist Create
    Route 2: 키워드 "오늘" → Todoist Get → Filter → Telegram Reply
    Route 3: 기타 → OpenClaw Webhook → Telegram Reply
```

---

## 비용 비교 (월간 기준)

| 구성 | AI API | 플랫폼 | 외부 서비스 | 합계 |
|------|--------|--------|------------|------|
| OpenClaw Only | $10~80 | $0 | $0 | **$10~80** |
| OpenClaw + Gemini 무료 | $0~5 | $0 | $0 | **$0~5** |
| OpenClaw + n8n Cloud | $10~80 | $24 | $0 | **$34~104** |
| OpenClaw + Make | $10~80 | $9~16 | $0 | **$19~96** |
| 커스텀 봇 (VPS) | $10~80 | $5~20 | 각종 API | **$15~120+** |

---

## 단계별 구현 가이드

### Step 1: OpenClaw 기본 설정 (30분)
```bash
# 설치
curl -fsSL https://openclaw.bot/install.sh | bash

# 온보딩
openclaw onboard --install-daemon

# 텔레그램 연동
# 1. @BotFather에서 봇 생성
# 2. 토큰 설정
openclaw configure --section telegram
```

### Step 2: 기본 스킬 활성화 (15분)
```json
{
  "skills": {
    "entries": {
      "weather": { "enabled": true },
      "web-search": { "enabled": true },
      "summarize": { "enabled": true }
    }
  }
}
```

### Step 3: 페르소나 설정 (30분)
- SOUL.md 작성 (성격, 말투, 제약조건)
- USER.md 작성 (사용자 정보)
- HEARTBEAT.md 작성 (주기적 작업)

### Step 4: 리마인더/투두 설정 (30분)
```json
// cron 기반 리마인더 예시
{
  "schedule": { "kind": "cron", "expr": "0 9 * * *", "tz": "Asia/Seoul" },
  "payload": { "kind": "systemEvent", "text": "오전 9시 일일 브리핑 시간입니다." },
  "sessionTarget": "main"
}
```

### Step 5: 외부 서비스 연동 (선택, 1~2시간)
- Google Calendar/Gmail: gog 스킬 설치
- GitHub: github 스킬 설치
- Todoist: 커스텀 스킬 작성

### Step 6: 멀티에이전트 설정 (선택, 2~4시간)
- AGENTS.md에서 에이전트 역할 정의
- 텔레그램 그룹 생성 + 봇 추가
- 그룹 설정 (`requireMention`, `allowFrom`)
- 에이전트 간 sessions_send 테스트

---

## 출처
- OpenClaw 공식 문서: https://docs.openclaw.ai
- Todoist API: https://developer.todoist.com/rest/v2
- n8n: https://n8n.io
- Make: https://www.make.com
