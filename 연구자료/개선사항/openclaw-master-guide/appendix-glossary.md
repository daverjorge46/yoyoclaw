# 부록

## A. 용어집

| 용어 | 설명 |
|------|------|
| **OpenClaw** | 오픈소스 AI 개인 비서 (구 Clawdbot, Moltbot) |
| **Gateway** | OpenClaw의 핵심 서버. 세션, 채널, 도구, 이벤트를 관리 |
| **Agent** | AI 에이전트. SOUL.md로 성격 정의, 도구 사용 가능 |
| **Session** | 에이전트와 사용자 간의 대화 단위 |
| **Skill** | 에이전트의 능력을 확장하는 모듈 (SKILL.md 기반) |
| **SOUL.md** | 에이전트의 성격/말투/제약조건 정의 파일 |
| **AGENTS.md** | 멀티에이전트 구성 정의 파일 |
| **USER.md** | 사용자 정보 파일 |
| **MEMORY.md** | 에이전트의 장기 기억 저장 파일 |
| **HEARTBEAT.md** | 주기적 작업 정의 파일 |
| **BOOTSTRAP.md** | 세션 시작 시 자동 실행 작업 정의 |
| **sessions_send** | 에이전트 간 직접 메시지 전송 (A2A) |
| **ClawHub** | OpenClaw 스킬 마켓플레이스 (clawhub.com) |
| **AgentSkills** | 스킬 표준 스펙 (agentskills.io) |
| **MCP** | Model Context Protocol (도구 액세스 표준) |
| **A2A** | Agent-to-Agent 통신 |
| **Pairing** | DM 보안 인증 (페어링 코드) |
| **Sandbox** | Docker 기반 격리 실행 환경 |
| **Model Routing** | 작업 복잡도에 따른 모델 자동 선택 |
| **Gating** | 스킬 로드 시 조건 필터링 (바이너리/환경변수/OS) |

## B. 참고 링크 모음

### 공식
- OpenClaw 홈: https://openclaw.ai
- 공식 문서: https://docs.openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
- ClawHub: https://clawhub.com
- Discord: https://discord.com/invite/clawd

### 가이드
- Getting Started: https://docs.openclaw.ai/start/getting-started
- Telegram 설정: https://docs.openclaw.ai/channels/telegram
- Skills 문서: https://docs.openclaw.ai/tools/skills
- 보안: https://docs.openclaw.ai/gateway/security

### 커뮤니티
- Awesome Skills (700+): https://github.com/VoltAgent/awesome-openclaw-skills
- Reddit (ChatGPT): https://www.reddit.com/r/ChatGPT/comments/1qr45nw
- Hacker News: https://news.ycombinator.com/item?id=46820783

### 한국어
- 설치 + Gemini 연동: https://twofootdog.tistory.com/555
- 리뷰 + 온보딩: https://goddaehee.tistory.com/504
- 무료 사용법: https://twofootdog.tistory.com/554

### 관련 기술
- CrewAI: https://www.crewai.com
- AgentConnect: https://akki0511.github.io/AgentConnect
- AgentSkills: https://agentskills.io
- n8n: https://n8n.io
- Make: https://www.make.com

### 기사/분석
- Wikipedia: https://en.wikipedia.org/wiki/OpenClaw
- CNET: https://www.cnet.com/tech/services-and-software/from-clawdbot-to-moltbot-to-openclaw
- Fast Company: https://www.fastcompany.com/91484506/what-is-clawdbot-moltbot-openclaw
- Trending Topics: https://www.trendingtopics.eu/openclaw-2-million-visitors-in-a-week
- Turing College: https://www.turingcollege.com/blog/openclaw
- DigitalOcean: https://www.digitalocean.com/resources/articles/what-is-openclaw

## C. 체크리스트 통합본

### 보안 체크리스트
- [ ] 게이트웨이 토큰 설정
- [ ] DM 페어링 모드 활성화
- [ ] 샌드박스 모드 설정
- [ ] 명령어 allowlist 확인
- [ ] `openclaw security audit --deep` 통과
- [ ] 봇 토큰 노출 방지
- [ ] configWrites 필요시 비활성화

### 성능 체크리스트
- [ ] 모델 라우팅 설정 (복잡도별)
- [ ] 히스토리 제한 (50 이하)
- [ ] 동시 처리 수 제한
- [ ] 불필요 스킬 비활성화
- [ ] 타임아웃 설정
- [ ] 청크 모드 최적화
- [ ] 스킬 워처 설정

### 비용 체크리스트
- [ ] 출력 간결화 지시 (SOUL.md)
- [ ] 그룹 멘션 필수
- [ ] 미디어 크기 제한
- [ ] 무료 모델 활용
- [ ] DM 히스토리 제한
- [ ] OAuth 구독 활용

### 구조 체크리스트
- [ ] SOUL.md 완성 (500자+)
- [ ] USER.md 작성
- [ ] MEMORY.md 활용
- [ ] AGENTS.md (멀티에이전트 시)
- [ ] 설정 백업

### 팀 빌더 체크리스트
- [ ] 팀 목적 정의
- [ ] 역할 분담 (생산자/검증자/조율자)
- [ ] AGENTS.md 생성
- [ ] 각 에이전트 SOUL.md 작성
- [ ] 텔레그램 그룹 설정
- [ ] 상호작용 규칙 정의
- [ ] 테스트 완료

## D. 프롬프트 템플릿 모음

### 1. 리서치 에이전트
> 너는 전문 리서처다. 최신 정보(2025년 이후)를 우선하고, 출처를 반드시 명시한다. 결론→근거→출처 순서로 보고. 비교표 형태 선호. 불확실한 정보는 "미확인"으로 표시.

### 2. 코딩 어시스턴트
> 너는 시니어 개발자다. 코드에 주석 필수, 에러 핸들링 포함, 보안 베스트 프랙티스 적용, 테스트 코드 함께 제공, 실행 방법 설명.

### 3. PM/오케스트레이터
> 너는 PM이다. 작업을 구체적 단위로 분해하고, 우선순위와 의존성을 명시한다. 진행 상황을 구조화된 형태로 보고. 리스크와 블로커를 사전 식별.

### 4. 콘텐츠 크리에이터
> 너는 콘텐츠 전문가다. SEO 최적화된 제목/메타 작성. 타겟 독자에 맞는 톤 유지. 구조: 후킹→본문→CTA. 1000~2000자 기본.

### 5. 비평가/QA
> 너는 비판적 분석가다. 모든 주장의 논리적 약점을 찾고, 팩트체크를 수행하며, 반론과 대안을 함께 제시한다.

### 6. 팀장 (캐릭터형)
> 너는 팀장이다. 차분하고 듬직한 맏언니 톤. 팀원들의 강점을 살려 작업을 분배하고, 결과를 종합하여 보고한다. 간결하게, 핵심만.

### 7. 데이터 분석가
> 너는 데이터 분석가다. 정량적 데이터 우선, 시각화 가능한 형태로 정리, 인사이트와 액션 아이템 분리, 가정과 한계 명시.
