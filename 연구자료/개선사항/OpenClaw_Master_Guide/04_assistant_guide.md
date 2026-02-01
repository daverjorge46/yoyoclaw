# [섹션 5] 텔레그램 AI 비서 구축 가이드

> 리서처: 미루 (miru)
> 최종 업데이트: 2026-02-01
> 수정 내용: 섹션 3, 4 피드백 반영 (하나 완료 버전 기반)

## 개요

텔레그램에서 개인 AI 비서 봇을 구축하는 5가지 옵션을 비교하고, 난이도별 구현 가이드를 제공합니다. 실용적인 관점에서 구체적인 구현 방법을 포함합니다.

---

## 1. 옵션 비교표 (5x7 매트릭스)

| 옵션 | 난이도 | 비용(월) | 기능범위 | 확장성 | 유지보수 | Todoist 연동 | 추천 대상 |
|------|--------|-----------|----------|--------|----------|---------------|-----------|
| **OpenClaw 단독** | ⭐ | $5-15 | 광범위 | 높음 | 낮음 | 필요 시 API | 초급/중급 |
| **n8n + OpenClaw** | ⭐⭐ | $5-20 | 중간~높음 | 높음 | 중간 | 네이티브 | 중급 |
| **Make + OpenClaw** | ⭐⭐ | $15-30 | 중간~높음 | 높음 | 낮음 | 네이티브 | 중~고급 |
| **SendToTodoist** (공식) | ⭐ | 무료 | 한정적 | 낮음 | 중간 | 완벽 | 초급 |
| **Todoist API 직접** | ⭐⭐ | $5-10 | 한정적 | 낮음 | 낮음 | 완벽 | 중급 |
| **커스텀 봇 개발** | ⭐⭐⭐⭐ | $20-50+ | 무제한 | 최고 | 낮음 | 구현 필요 | 고급 |

### 난이도 설명

| 레벨 | 설명 | 전제 지식 |
|------|------|----------|
| ⭐ | 설정만 필요, 클릭으로 실행 가능 | 기본적인 텔레그램 사용 |
| ⭐⭐ | 기본 설정 + 몇 가지 커스텀 | n8n 워크플로우 이해 필요 |
| ⭐⭐⭐ | 워크플로우 이해 + 코딩 필요 | Python/Node.js 기본 지식 |
| ⭐⭐⭐⭐ | 전문 개발 필요 + 인프라 구축 | 서버, 데이터베이스, 배포 경험 |

---

## 2. 옵션별 상세 분석

### 2.1 옵션 1: OpenClaw 단독 사용

**특징**
- 별도의 워크플로우 도구 없이 OpenClaw만 사용
- 에이전트가 직접 외부 API 호출 가능
- A2A 통신으로 멀티에이전트 협업 네이티브 지원

**장점**
- 구성이 가장 간단
- 모든 기능이 하나의 시스템에 통합
- 단일 플랫폼에서 관리
- 팀 협업을 위한 sessions_send 네이티브

**단점**
- 복잡한 워크플로우 구현 어려움
- 외부 서비스 통합 시 수동 코딩 필요
- 워크플로우 시각화 불가

**아키텍처**
```
사용자
    ↓
Telegram
    ↓
OpenClaw Gateway
    ↓
┌───────────────────────────┐
│  Multi-Agent System    │
│  (sena/miru/hana/yuri) │
└───────────────────────────┘
    ↓
(필요 시) Todoist API 직접 호출
```

**Todoist 연동 구현**
```yaml
# config.yml
channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}

# 스킬에 todoist API 연동
skills:
  - name: todoist
    type: http
    base_url: https://api.todoist.com
    auth:
      type: bearer
      token: ${TODOIST_API_KEY}
```

```python
# skill-todoist.py
import requests

def add_task(content, due=None, project=None):
    """Todoist에 작업 추가"""
    url = "https://api.todoist.com/rest/v2/tasks"
    headers = {
        "Authorization": f"Bearer {TODOIST_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {"content": content}
    if due:
        data["due_string"] = due
    if project:
        data["project_id"] = project
    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

### 2.2 옵션 2: n8n + OpenClaw

**특징**
- n8n으로 시각적 워크플로우 구성
- OpenClaw가 AI 부분 담당
- 다양한 서비스 네이티브 통합

**장점**
- 시각적 워크플로우 빌더 (노드 기반)
- 1000+ 네이티브 통합
- 무료 플랜 사용 가능 (셀프 호스팅)
- 디버깅이 용이
- 복잡한 로직 구현 가능

**단점**
- n8n 설치/호스팅 필요
- 두 시스템 간 연동 복잡도 (Webhook 설정)
- 외부 서비스 의존성

**아키텍처**
```
사용자
    ↓
Telegram
    ↓
n8n (Webhook 수신)
    ↓
┌─────────────────────────┐
│  Telegram Trigger    │
│       ↓           │
│  OpenClaw Node      │
│       ↓           │
│  Switch Node       │
│    ↓  ↓  ↓      │
│ Todoist Email Other │
└─────────────────────────┘
```

**n8n 워크플로우 예시**
```
1. Telegram Trigger (메시지 수신)
   ↓
2. OpenClaw Node (AI 분석)
   ↓
3. Function Node (의도 분류: task/memo/calendar)
   ↓
4. Todoist Node (작업 생성)
```

### 2.3 옵션 3: Make (Integromat) + OpenClaw

**특징**
- Make의 시나리오 빌더 사용
- 강력한 통합 라이브러리 (1000+ 앱)
- 복잡한 시나리오 구현 가능

**장점**
- 직관적인 UI
- 강력한 통합 기능
- 다양한 트리거/액션
- 에러 핸들링 내장

**단점**
- 비용이 비쌈 (과금 기반, 월 $10~)
- 복잡한 시나리오에서 제약 있음
- 학습 곡선이 높음

**Make 시나리오 예시**
```
1. Telegram Watch Updates
   ↓
2. OpenClaw → HTTP POST (AI 분석 요청)
   ↓
3. Switch (Intent 분류)
   ↓
4. [할 일정]
      ↓
   Todoist → Create Task
   ↓
   [메모]
      ↓
   Notion → Create Page
   ↓
   [캘린더]
      ↓
   Google Calendar → Create Event
```

### 2.4 옵션 4: SendToTodoist (공식 통합)

**특징**
- Todoist 공식 텔레그램 봇
- 텔레그램에서 메시지 전달만으로 작업 생성
- 설정 1회로 완료

**장점**
- **설정이 가장 쉬움**
- 별도의 호스팅/개발 불필요
- 공식적으로 지원 → 안정적
- Todoist 기능 100% 활용

**단점**
- AI 분석 불가능 (단순 메시지 전달)
- 자동 분류/우선순위 지원 제한적
- 커스텀 기능 없음

**사용 방법**
```
1. Telegram에서 @SendToTodoist 친구 추가
2. 그룹 초대 (선택 사항)
3. 메시지 보내: "내일 회의 자료 정리"
4. 자동으로 Todoist Inbox에 생성
5. 프로젝트 설정 (원하면 "@project 이름" 붙이기)
```

### 2.5 옵션 5: Todoist API 직접 연결

**특징**
- Todoist REST API만 사용
- 별도의 AI 봇 없음
- 완전한 커스터마이징 가능

**장점**
- 가장 저렴 (API 비용만)
- Todoist 기능 100% 활용
- 완전한 제어 가능

**단점**
- AI 기능 없음
- 별도의 봇/서비스 필요
- 확장성 제한적

**구현 방법**
```python
# Python으로 커스텀 봇 구성
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler

import requests

TODOIST_API_KEY = "your_token"

def add_to_todoist(text, project_id=None):
    """Todoist에 작업 추가"""
    url = "https://api.todoist.com/rest/v2/tasks"
    headers = {"Authorization": f"Bearer {TODOIST_API_KEY}"}
    data = {"content": text}
    if project_id:
        data["project_id"] = project_id
    requests.post(url, headers=headers, json=data)

# 핸들러 정의
updater = Updater(token="YOUR_BOT_TOKEN")

updater.dispatcher.add_handler(
    CommandHandler("add", lambda u, a: add_to_todoist(a.args[0]))
)
)

updater.dispatcher.add_handler(
    MessageHandler(Filters.text & ~Filters.command, lambda u, m: add_to_todoist(m.text))
)

updater.start_polling()
```

### 2.6 옵션 6: 커스텀 봇 개발 (고급)

**특징**
- Python/Node.js로 직접 봇 개발
- OpenAI API 또는 Claude API 사용
- 완전한 자유도

**장점**
- 완전한 커스터마이징
- 모든 기능 구현 가능
- 독자적인 아키텍처
- 최적화 자유로움

**단점**
- 개발 시간이 오래 걸림
- 유지보수 부담이 큼
- 인프라 구축 필요 (서버, DB 등)

**기술 스택**
```
┌─────────────────────────────────┐
│  Python / Node.js Bot     │
│         ↓                │
│  ┌─────────────────────┐  │
│  │  Business Logic    │  │
│  └────────┬────────────┘  │
│         ↓                │
│  ┌─────────────────────┐  │
│  │ AI Logic (LLM)     │  │
│  └────────┬────────────┘  │
│         ↓                │
│  ┌─────────────────────┐  │
│  │ External APIs       │  │
│  │ Todoist | Calendar │  │
│  └─────────────────────┘  │
└─────────────────────────────────┘
```

---

## 3. 추천 아키텍처

### 3.1 초급: OpenClaw 단독

**설명**
- 가장 빠르게 시작 가능
- 기본 AI 비서 기능 충분
- 낮은 유지보수

**아키텍처**
```
사용자 → Telegram → OpenClaw → (필요 시) Todoist API
```

**멀티에이전트 활용 (그룹 채팅)**
```
        Telegram 그룹 채팅
              ↓
        세나 (코디네이터)
              ↓
      ┌─────────────┼───────────┐
      ↓            ↓           ↓
    미루          하나          유리
  (리서치)     (빌더)      (리뷰)
      ↓            ↓           ↓
      └─────────────┼───────────┘
                    ↓
                사용자
```

**추천 이유**
- 복잡도 낮음
- 단일 시스템
- 팀 협업 네이티브
- 비용 절감 (토큰 최적화 내장)

### 3.2 중급: n8n + OpenClaw

**설명**
- 복잡한 워크플로우 가능
- 여러 서비스 통합
- 시각적 관리

**아키텍처**
```
사용자
    ↓
Telegram
    ↓
n8n (Webhook)
    ↓
┌─────────────────────────────────┐
│  Telegram Trigger             │
│       ↓                     │
│  OpenClaw (AI 분석)         │
│       ↓                     │
│  ┌────────────────────────┐   │
│  │ Switch Node          │   │
│  ↓  ↓  ↓              │   │
│ Todoist Email Calendar   │   │
└─────────────────────────────────┘
```

**추천 이유**
- 워크플로우 시각화
- 여러 서비스 통합
- 확장성 높음
- 중급 사용자에 적합

### 3.3 고급: 마이크로서비스 아키텍처

**설명**
- 각 서비스 독립 운영
- 최대 확장성
- 장애 격리

**아키텍처**
```
Telegram
    ↓
API Gateway (Kong/AWS API Gateway)
    ↓
┌────────────────────────────────────┐
│   Orchestration (n8n/Make)      │
└────────────────────────────────────┘
    ↓           ↓           ↓
OpenClaw    Todoist    Custom Bot
(AI)      (Tasks)     (Special)
```

**추천 이유**
- 기업급 확장성
- 서비스 독립
- 장애 격리
- CI/CD 통합 용이

---

## 4. 단계별 구현 가이드

### 4.1 초급 구현 (OpenClaw 단독) - 1일

#### Step 1: OpenClaw 설치
```bash
# 글로벌 설치
npm install -g openclaw@latest

# 또는 소스에서
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

#### Step 2: 온보딩
```bash
# 위저드 실행
openclaw onboard

# 자동으로:
# - Gateway 설정
# - 채널 연동
# - 에이전트 생성
# - 스킬 설치
```

#### Step 3: Telegram 봇 설정
```bash
# 1. BotFather에서 봇 생성
# https://t.me/BotFather
# /newbot 명령으로 생성

# 2. API 토큰 저장
export TELEGRAM_BOT_TOKEN="your_bot_token"

# 3. OpenClaw 채널 연동
openclaw channels login
# QR 코드 스캔
```

#### Step 4: 기본 비서 설정
```yaml
# ~/.openclaw/openclaw.yml
agents:
  main:
    model: gpt-4o
    system: |
      당신은 나의 개인 비서입니다.
      일정 관리, 정보 검색, 작업 분배 등 도와주세요.

channels:
  telegram:
    token: ${TELEGRAM_BOT_TOKEN}
    groups:
      "*":
        requireMention: true
        agentRouting:
          patterns:
            - "@assistant"

skills:
  - name: todoist
    type: http
    base_url: https://api.todoist.com
```

### 4.2 중급 구현 (n8n + OpenClaw) - 1주

#### Step 1: n8n 설치
```bash
# Docker로 설치
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 또는 npm
npm install -g n8n
n8n start
```

#### Step 2: 워크플로우 구성

**노드 구성**
1. **Telegram Trigger**: 메시지 수신
2. **OpenClaw Node**: HTTP Request로 AI 분석 요청
3. **Function Node**: 의도 분류 (task/memo/calendar/reminder)
4. **Todoist Node**: 작업 생성
5. **Email Node**: 이메일 전송 (선택)

**n8n에서 OpenClaw API 호출**
```json
{
  "method": "POST",
  "url": "http://localhost:18789/api/message",
  "authentication": {
    "type": "genericCredentialType",
    "genericAuthType": {
      "name": "openclaw_token"
    }
  },
  "jsonParameters": {
    "message": "={{ $json.message }}",
    "agent": "main"
  }
}
```

#### Step 3: OpenClaw API 통합
```yaml
# OpenClaw config에 Webhook 설정
channels:
  telegram:
    webhooks:
      - url: "https://your-n8n-instance.com/webhook/telegram"
        secret: "your_secret_key"
```

### 4.3 고급 구현 (커스텀 봇) - 1개월+

#### Step 1: 아키텍처 설계
```
┌──────────────────────────────┐
│   Nginx / Load Balancer │
└───────────┬──────────────┘
            ↓
    ┌──────────────────────────┐
    │  Application Server     │
    └───────────┬──────────────┘
                ↓
        ┌──────────────────────────────┐
        │  Bot Service (Python/Node) │
        └───────────┬──────────────────┘
                    ↓
        ┌─────────────────────┐
        │  PostgreSQL       │
        └─────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  External APIs      │
        │ Todoist | Calendar │
        └──────────────────────┘
```

#### Step 2: 데이터베이스 설계
```sql
-- 테이블 구조
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    state TEXT DEFAULT 'active'
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    project_id INTEGER,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    telegram_project_id INTEGER  -- Todoist project ID
);
```

#### Step 3: 봇 개발
```python
# bot.py
from telegram.ext import Updater, MessageHandler
import requests
import logging

# 로깅 설정
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

class TodoBot:
    def __init__(self, bot_token, todoist_token):
        self.bot_token = bot_token
        self.todoist_token = todoist_token
        self.updater = Updater(token=bot_token)

    def add_todoist_task(self, content, project_id=None):
        """Todoist에 작업 추가"""
        url = "https://api.todoist.com/rest/v2/tasks"
        headers = {
            "Authorization": f"Bearer {self.todoist_token}",
            "Content-Type": "application/json"
        }
        data = {"content": content}
        if project_id:
            data["project_id"] = project_id

        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logging.error(f"Todoist API Error: {e}")
            return None

    def setup_handlers(self):
        """핸들러 설정"""
        # 명령어: /add
        from telegram.ext import CommandHandler
        self.updater.dispatcher.add_handler(
            CommandHandler("add", self.cmd_add)
        )

        # 일반 메시지
        from telegram.ext import Filters
        self.updater.dispatcher.add_handler(
            MessageHandler(
                Filters.text & ~Filters.command,
                self.msg_handler
            )
        )

    def cmd_add(self, update, context):
        """할 일 추가 명령"""
        content = ' '.join(context.args)
        if not content:
            update.message.reply_text("무엇을 추가할까요?")
            return

        result = self.add_todoist_task(content)
        if result:
            update.message.reply_text(f"✅ 추가됨: {content}")
        else:
            update.message.reply_text("❌ 추가 실패")

    def msg_handler(self, update, context):
        """일반 메시지 핸들러"""
        text = update.message.text
        result = self.add_todoist_task(text)
        if result:
            update.message.reply_text("✅ Todoist에 추가했어요")
        else:
            update.message.reply_text("추가하지 못했어요. 다시 시도해주세요.")

    def start(self):
        """봇 시작"""
        self.setup_handlers()
        self.updater.start_polling()

# 실행
if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()

    bot = TodoBot(
        bot_token=os.getenv('TELEGRAM_BOT_TOKEN'),
        todoist_token=os.getenv('TODOIST_API_KEY')
    )
    bot.start()
```

#### Step 4: 배포
```bash
# systemd 서비스 설정
sudo tee /etc/systemd/system/todo-bot.service > /dev/null <<EOF
[Unit]
Description=Telegram Todo Bot
After=network.target

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/todo-bot
ExecStart=/usr/bin/python3 /opt/todo-bot/bot.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable todo-bot.service
sudo systemctl start todo-bot.service
```

---

## 5. Todoist 연동 구체적 방법

### 5.1 Todoist REST API 사용

**기본 URL**
```
https://api.todoist.com/rest/v2
```

**주요 엔드포인트**

| 기능 | 메서드 | 엔드포인트 | 설명 |
|------|--------|-----------|------|
| 작업 생성 | POST | /tasks | 새 작업 추가 |
| 작업 목록 | GET | /tasks | 사용자 모든 작업 |
| 작업 완료 | POST | /tasks/{id}/close | 작업 완료 |
| 프로젝트 | GET/POST | /projects | 프로젝트 관리 |
| 라벨 | GET/POST | /labels | 라벨 관리 |

**인증**
```python
headers = {
    "Authorization": f"Bearer {TODOIST_API_KEY}",
    "Content-Type": "application/json"
}
```

### 5.2 프로젝트 관리

```python
# 프로젝트 생성 및 관리
def manage_projects(todoist_token):
    url = "https://api.todoist.com/rest/v2/projects"
    headers = {"Authorization": f"Bearer {todoist_token}"}

    # 프로젝트 목록 조회
    response = requests.get(url, headers=headers)
    projects = response.json()

    # 새 프로젝트 생성
    new_project = {"name": "Telegram"}
    response = requests.post(url, headers=headers, json=new_project)

    return projects
```

### 5.3 자연어어 명령 파싱

```python
import re

def parse_natural_language(text):
    """자연어 명령 파싱"""

    # 날짜 추출 (예: "내일", "다음 주", "오후 3시")
    date_patterns = {
        "내일": lambda: tomorrow,
        "다음 주": lambda: next_week,
        "오후 (\d+)시": lambda m: int(m.group(1))
    }

    due_date = None
    for pattern, handler in date_patterns.items():
        match = re.search(pattern, text)
        if match:
            due_date = handler()
            text = re.sub(pattern, '', text)
            break

    # 우선순위 추출 (예: "중요", "!긴급", "일반")
    priority = None
    if "중요" in text or "긴급" in text:
        priority = 4
    elif "급한" in text:
        priority = 3

    return {
        "content": text,
        "due_date": due_date,
        "priority": priority
    }
```

---

## 6. 비용 비교 (월별 추정)

### 6.1 각 옵션 비용

| 옵션 | OpenClaw 비용 | n8n/Make 비용 | Todoist API | 총 추정 | 사용자 유형 |
|------|---------------|---------------|------------|---------|-----------|
| **OpenClaw 단독** | $5-15 | $0 | $0 | $5-15/월 | 초급/중급 |
| **n8n + OpenClaw** | $5-15 | $0 (무료 플랜) | $0 | $5-15/월 | 중급 |
| **Make + OpenClaw** | $5-15 | $10-20 | $0 | $15-35/월 | 중~고급 |
| **SendToTodoist** | $0 (AI 안씀) | $0 | $0 | $0/월 | 초급 |
| **Todoist API 직접** | $5-10 | $0 | $0 | $5-10/월 | 중급 |
| **커스텀 봇 개발** | $5-10 | $0 | $0 | $20-50/월+서버 | 고급 |

**참고**
- OpenClaw 비용: API 호출 + 토큰 사용량 기반
- n8n: 무료 플랜 사용 가능 (셀프 호스팅)
- Make: 무료 플랜 5,000 operations/월 (과금 플랜 필요)
- 서버 비용: DigitalOcean $5/월, AWS Lightsail $3.5/월

---

## 7. 추천 결정 매트릭스

### 7.1 요구사항 기반 추천

| 요구사항 | 추천 옵션 | 이유 |
|----------|-----------|------|
| 기본 비서만 필요 | **OpenClaw 단독** | 가장 간단, 빠름 |
| 워크플로우 시각화 | **n8n + OpenClaw** | 복잡한 로직 가능 |
| 여러 서비스 통합 | **Make + OpenClaw** | 강력한 통합 기능 |
| 가장 저렴 | **SendToTodoist** | 무료, 설정 간단 |
| Todoist 완벽 통합 | **Todoist API 직접** | 100% 기능 사용 |
| 완전한 커스터마이징 | **커스텀 봇 개발** | 모든 것 가능 |

### 7.2 사용자 레벨별 추천

| 레벨 | 추천 옵션 | 전제 지식 |
|------|-----------|----------|
| **초급** (기본 사용) | OpenClaw 단독 또는 SendToTodoist | 클릭으로 실행, 복잡도 낮음 |
| **중급** (워크플로우 필요) | n8n + OpenClaw 또는 Make (Lite) | n8n/Make 기본 사용법 |
| **고급** (전문 개발) | 커스텀 봇 개발 또는 Todoist API 직접 | Python/Node.js, 서버 운영 |

### 7.3 최종 추천 요약

```
┌─────────────────────────────────────────────┐
│              추천 옵션                │
└───────────────┬─────────────────────────┘
                │
        ┌───────┼───────┬───────┐
        ↓       ↓       ↓       ↓
    초급   중급   고급   무료
    ↓       ↓       ↓       ↓
OpenClaw  n8n     커스텀  SendToTodoist
단독   +OC     봇      공식
```

---

*다음 파일로 계속: 05-skill-builder-design.md*
