# 부록 12: 최신 업데이트 & 트렌드 (2026년 1월)

## OpenClaw v2026.1.29 주요 변경사항

### 리브랜딩: Clawdbot → Moltbot → OpenClaw
- npm 패키지/CLI → `openclaw`으로 변경
- 호환성 shim 제공 (기존 스크립트 계속 동작)
- 확장 패키지 → `@openclaw/*` 스코프
- macOS launchd/번들 ID → `bot.molt`
- 설정 파일 자동 마이그레이션

### 보안 강화 (핵심!)
**이전 문제점:**
- 게이트웨이가 공개 인터넷에 인증 없이 노출되는 사례 다수
- API 키, OAuth 토큰, 대화 기록이 누구나 접근 가능
- MCP에 인증 없이 셸 접근 가능
- 프롬프트 인젝션 (발신자 이름, 그룹 이름이 시스템 프롬프트에 삽입)
- SSH 키가 이메일을 통해 추출 가능
- 인포스틸러(RedLine, Lumma, Vidar)가 Clawdbot을 타겟에 추가

**v2026.1.29 수정사항:**
1. **게이트웨이 auth "none" 제거** — 토큰/비밀번호 또는 Tailscale Serve ID 필수
2. **fail-closed 기본값** — 인증 없으면 접근 차단
3. **온보딩에서 "auth off" 옵션 삭제**
4. **hook 토큰 쿼리 파라미터 경고** — 헤더 인증 권장
5. **DNS 피닝** — 리바인딩 공격 방지
6. **mDNS 최소 디스커버리** — 정보 노출 감소
7. **Tailscale Serve ID 검증** — 로컬 tailscaled 통해 확인
8. **Twilio 웹훅 서명 검증** 강제

### 채널 업데이트
- **Telegram**: 메시지 편집, 인용 답장, 스티커 송수신/비전, 무음 전송
- **Discord**: privileged gateway intents 설정
- **Slack**: 스트리밍 후 ack 리액션 정리
- **Matrix**: @vector-im/matrix-bot-sdk 전환
- **WebChat**: 서브에이전트 announce 답장 표시

### 기타 개선
- **메모리 검색**: 추가 경로 인덱싱 지원
- **스킬**: 멀티 이미지 입력, 의존성 메타데이터 추가
- **라우팅**: 계정별 DM 세션 스코프, 멀티 계정 격리
- **CLI**: Node 모듈 컴파일 캐시로 시작 속도 향상
- **에이전트**: 컴팩션 시 드롭된 메시지 요약

---

## 한국 커뮤니티 활용 사례

### 사례 1: 팀장용 서비스 현황 봇 (brunch.co.kr)
> "팀장님과 임원분들께서 서비스 현황이 궁금하시면 이 봇을 초대드리는 것으로 모든 것을 해결할 수 있습니다."
- Claude, OpenAI, Gemini 모두 Pro 구독 → OpenClaw에서 하나의 봇으로 통합
- 대화 맥락 분산 문제 해결

### 사례 2: Gemini 무료 연동 (twofootdog)
- 오픈클로 + Gemini 무료 모델 연동
- $0 비용으로 AI 비서 운영

### 사례 3: 비용 주의보 (goddaehee)
> "자율적 에이전트로 토큰 소비량이 매우 높다. 2일간 $300 소비 사례 존재"
- 모델 라우팅 + 히스토리 제한이 필수

### 사례 4: 스캠 주의 (twofootdog)
> "리브랜딩 후 버려진 구계정(@clawdbot 등)을 해커들이 차지하여 가짜 코인 홍보"
- 오직 공식 GitHub와 OpenClaw 핸들만 신뢰

---

## 2026 에이전트 오케스트레이션 트렌드

### 업계 현황 (Camunda 보고서, 1,150명 IT 리더 조사)
- **71%** 조직이 AI 에이전트 사용 중
- 그 중 **11%만** 실제 프로덕션 도달
- **80%** 현재 에이전트는 "단순 챗봇/어시스턴트"
- **81%** "에이전틱 오케스트레이션 없이는 자율 기업은 꿈일 뿐"
- 비즈니스 프로세스당 평균 **50개 엔드포인트**, 연 14% 증가

### 핵심 인사이트
> "reliability comes from the execution layer, not the orchestration layer"
> "워크플로우 > 모델. 모델 교체는 잘 안 깨지는데, 오케스트레이션 로직이 취약"

### 멀티에이전트 오케스트레이션 도구 (2026)
| 도구 | 특징 | 적합한 상황 |
|------|------|------------|
| **OpenClaw** | 로컬 실행, 멀티채널, 스킬 생태계 | 개인 AI 비서, 팀 운영 |
| **CrewAI** | Python 기반, YAML 설정, 계층적 위임 | 코드 기반 멀티에이전트 |
| **LangGraph** | 그래프 기반 오케스트레이션 | 복잡한 워크플로우 |
| **CodeMachine CLI** | 터미널 기반 멀티에이전트 팩토리 | 코딩 에이전트 오케스트레이션 |
| **Claude Flow** | Claude 전용 에이전트 스웜 | Claude 기반 자율 워크플로우 |
| **Swarms** | 엔터프라이즈급 멀티에이전트 | 대규모 프로덕션 |
| **OpenAI Agents SDK** | 역할/작업 기반 오케스트레이션 | OpenAI 생태계 |

### Spec-Driven Development 트렌드
- **SpecKit** (GitHub): 코드 전에 스펙부터 계획
- **OpenSpec** (Fission AI): 인간과 AI가 스펙에 합의 후 실행
- 패턴: 큰 프로젝트 → 작은 조각 → 계획 → 구조화된 실행 = 오케스트레이션

### OpenClaw의 차별점
1. **로컬 실행**: 데이터가 서버로 안 감
2. **멀티채널**: WhatsApp/Telegram/Discord/Slack/Signal/iMessage
3. **스킬 생태계**: 700+ 스킬, ClawHub 마켓플레이스
4. **캐릭터 기반**: SOUL.md로 페르소나 정의 (다른 프레임워크에 없는 기능)
5. **sessions_send**: 에이전트 간 자연어 직접 통신

---

## 보안 체크리스트 (v2026.1.29 기준)

- [ ] `openclaw` 최신 버전으로 업데이트 (v2026.1.29+)
- [ ] 게이트웨이 토큰 설정 (auth "none" 불가)
- [ ] `openclaw security audit --deep` 통과
- [ ] `openclaw doctor` 실행 — 게이트웨이 노출 경고 확인
- [ ] hook 토큰은 헤더로 전달 (쿼리 파라미터 지양)
- [ ] 공식 계정만 신뢰 (스캠 코인 주의)
- [ ] Tailscale Serve 사용 시 로컬 검증 활성화
- [ ] 프롬프트 인젝션 방어: 외부 입력을 시스템 프롬프트에 직접 삽입하지 않기

---

## 출처
- OpenClaw v2026.1.29 릴리즈: https://github.com/openclaw/openclaw/releases/tag/v2026.1.29
- "OpenClaw now with tighter security": https://medium.com/@balazskocsis/openclaw-now-with-tighter-security-a063ecf564ff
- "2026 State of Agentic Orchestration" 리포트 요약: https://www.reddit.com/r/AI_Agents/comments/1qdh21i
- 멀티에이전트 오케스트레이션 도구: https://www.reddit.com/r/ClaudeAI/comments/1pgmiox
- OpenClaw 실사용 후기 (한국): https://brunch.co.kr/@sungdairi/27
- Gemini 무료 연동: https://twofootdog.tistory.com/555
- 비용 주의: https://goddaehee.tistory.com/504
- 스캠 주의: https://twofootdog.tistory.com/554
- 디지털 부르주아 리뷰: https://digitalbourgeois.tistory.com/2693
- Top 9 AI Agent Frameworks 2026: https://www.shakudo.io/blog/top-9-ai-agent-frameworks
