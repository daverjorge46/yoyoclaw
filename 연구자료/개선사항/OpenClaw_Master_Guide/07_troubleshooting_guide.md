# [섹션 7] 트러블슈팅 가이드

> 리서처: 유리 (yuri)
> 최종 업데이트: 2026-02-01

## 개요

오픈크롤봇(몰트봇) 사용 시 발생하는 자주 있는 이슈와 해결 방법을 정리합니다. 텔레그램 봇에서 발생하는 문제를 중심으로 다룹니다.

---

## 1. 일반적인 문제 해결

### 1.1 Gateway 실행 안 됨

**증상**: `openclaw gateway start` 실행 시 에러 발생

**가능한 원인**:
- 포트가 이미 사용 중 (기본값: 18789)
- Node.js 버전 호환성 문제
- 환경 변수 누락

**해결 방법**:
```bash
# 1. 포트 확인
lsof -i :18789  # 사용 중인 포트 확인
kill -9 <PID>    # 사용 중인 프로세스 종료

# 2. Node.js 버전 확인
node --version  # Node.js 18+ 필요

# 3. 환경 변수 확인
echo $OPENCLAW_HOME
```

### 1.2 채널 연결 안 됨

**증상**: `openclaw status`에서 채널 연결 실패

**가능한 원인**:
- API 토큰 만료 또는 잘못 입력
- 인터넷 연결 문제
- 채널 권한 문제

**해결 방법**:
```bash
# 1. 상태 확인 (상세 정보)
openclaw status --deep

# 2. 로그 확인
openclaw logs --limit 100 | grep -i "telegram\|whatsapp"

# 3. 재구성
openclaw configure --section channels
```

### 1.3 스킬 로드 안 됨

**증상**: 특정 스킬이 사용 불가

**가능한 원인**:
- 스킬 경로가 잘못됨
- 의존성(바이너리, 환경 변수) 누락
- 스킬 비활성화됨

**해결 방법**:
```bash
# 1. 스킬 경로 확인
ls -la ~/.openclaw/skills/
ls -la <workspace>/skills/

# 2. 스킬 활성화 확인
openclaw config get skills.entries

# 3. 스킬 watcher 활성화 (자동 재로드)
openclaw config set skills.load.watch true
```

---

## 2. 텔레그램 봇 특정 문제

### 2.1 메시지 수신 안 됨 (연결은 됨)

**증상**:
- 봇이 온라인 상태로 보임
- `getMe` API 호출 성공
- 하지만 메시지가 OpenClaw에 도착하지 않음

**가능한 원인**:
- 웹훅 URL이 올바르지 않음
- 텔레그램이 메시지를 OpenClaw로 전송하지 않음
- 포워딩 설정 문제

**해결 방법**:
```bash
# 1. 텔레그램 봇이 사용하는 웹훅 URL 확인
# @BotFather에서 확인

# 2. OpenClaw gateway 로그 확인
openclaw logs --limit 200 | grep -i "telegram\|inbound"

# 3. 연결 이벤트 확인
openclaw status --deep
```

**참고**: GitHub Issue #4942

### 2.2 인바운드 DM이 도착하지 않음

**증상**:
- 클로드 상태에서 정상으로 보임
- 하지만 DM을 보내도 세션이 생성되지 않음
- 인바운드 로그가 비어 있음

**가능한 원인**:
- 텔레그램 봇이 차단됨 (blocked by user)
- 봇 권한 문제
- 그룹 vs DM 설정 차이

**해결 방법**:
```bash
# 1. 텔레그램 봇 상태 확인
# @BotFather에서 확인

# 2. 권한 재설정
# @BotFather에서 /setprivacy, /setcommands

# 3. OpenClaw 재시작
openclaw gateway restart
```

**참고**: GitHub Issue #4515

### 2.3 빈 메시지로 인한 400 Bad Request

**증상**:
- 메시지 전송 시 400 에러
- `sendMessage` 호출 실패

**가능한 원인**:
- `text` 파라미터가 비어 있음
- `response`가 비어 있거나 `undefined`
- 코드에서 응답 검증이 부족

**해결 방법**:
```python
# 피코드 예시 (좋지 않음)
if response and response.trim():
    await ctx.reply(response)
else:
    console.warn("Empty response, skipping reply")

# 좋은 코드
if response and response.strip() and response.strip():
    await ctx.reply(response)
else:
    console.warn("Empty response, skipping reply")
```

**참고**: GitHub Issue #4409

---

## 3. 모델 관련 문제

### 3.1 모델 404 에러로 인한 중단

**증상**:
- 특정 모델 호출 시 404 에러
- 에이전트가 무한 대기 (hang)

**가능한 원인**:
- 구형 모델 사용 (예: gemini-1.5-pro)
- 모델이 더 이상 제공되지 않음
- failover가 트리거되지 않음

**해결 방법**:
```yaml
# config.yml - 모델 업데이트
agents:
  defaults:
    models:
      allowlist:
        - "gpt-4o"
        - "gpt-4o-mini"
        - "claude-opus-4-5"
        - "claude-sonnet-4-5"
        # 구형 모델 제거
        # - "gemini-1.5-pro"
```

**참고**: GitHub Issue #4992

### 3.2 모델 비용 예상보다 높음

**증상**:
- 월 비용이 예상보다 2-3배 높음
- 토큰 사용량이 이상함

**가능한 원인**:
- 비싼 모델만 사용 (Opus, GPT-4)
- 컨텍스트 너무 크게 설정
- 캐시 비활성화

**해결 방법**:
```yaml
# 1. 모델 라우팅 설정
agents:
  defaults:
    models:
      routing:
        simple: "gpt-4o-mini"
        code: "claude-sonnet-4-5"
        research: "claude-opus-4-5"

# 2. 컨텍스트 제한
agents:
  defaults:
    contextTokens: 64000  # 간단 작업
    # 복잡한 작업만 높게 설정

# 3. 캐시 활성화
skills:
  load:
    cache:
      enabled: true
```

---

## 4. 멀티에이전트 특정 문제

### 4.1 sessions_send 타임아웃

**증상**:
- 다른 에이전트로 메시지 보낼 때 타임아웃 발생
- "Agent failed before reply" 메시지

**가능한 원인**:
- 기본 타임아웃이 30분으로 너무 김
- 에이전트가 복잡한 작업 중
- 네트워크 지연

**해결 방법**:
```yaml
# config.yml - 타임아웃 줄이기
agents:
  defaults:
    heartbeat:
      every: "2m"      # 더 자주 확인
      timeout: "5m"     # 타임아웃 줄이기
```

또는 간단한 작업은 그룹에 직접 응답:
```markdown
# 간단한 질문/확인은 sessions_send 대신 그룹에서 직접
"미루야, 이거 확인해봐."
```

### 4.2 A2A 통신 실패

**증상**:
- sessions_send로 다른 에이전트에게 메시지 보낼 때 실패
- "Session not found" 에러

**가능한 원인**:
- 세션 키가 잘못됨
- 에이전트가 그룹 세션이 아님
- 권한 문제

**해결 방법**:
```bash
# 1. 세션 목록 확인
openclaw sessions list

# 2. 에이전트 세션 키 확인
openclaw config get agents.list

# 3. A2A 권한 확인
openclaw config get agents.defaults.tools.agentSend
```

---

## 5. 성능 문제

### 5.1 응답 속도 느림

**증상**:
- 간단한 질문에도 10초 이상 소요
- 복잡한 작업은 1분 이상 소요

**가능한 원인**:
- 비싼 모델 사용 (Opus)
- 컨텍스트 너무 큼
- 캐시 비활성화

**해결 방법**:
```yaml
# 1. 모델 라우팅 (간단 작업에 빠른 모델)
agents:
  defaults:
    models:
      routing:
        simple: "gpt-4o-mini"
        code: "gpt-4o"
        research: "claude-sonnet-4-5"

# 2. 캐시 활성화
# (config 설정 방법은 문서 참조 - 오픈크롤봇 문서 확인 필요)

# 3. 응답 길이 제한
agents:
  defaults:
    maxTokens: 2000  # 출력 제한
```

### 5.2 세션 시작 느림

**증상**:
- 메시지 보낸 후 30초 이상 응답 없음

**가능한 원인**:
- 첫 호출 시 모델 초기화
- 스킬 로드 시간
- 데이터베이스 연결 시간

**해결 방법**:
```bash
# 1. 세션 워머 (Session Pruning) 활성화
openclaw config set agents.defaults.sessionPruning.enabled true

# 2. 스킬 watcher 비활성화 (첫 시작 시만)
openclaw config set skills.load.watch false

# 3. 세션 캐시 활성화 (가능한 경우)
openclaw config set agents.defaults.sessionCache.enabled true
```

---

## 6. 디버깅 방법

### 6.1 상태 확인

```bash
# 기본 상태
openclaw status

# 상세 상태 (연결, 세션, 큐)
openclaw status --deep

# 최근 연결 이벤트
openclaw status --deep | grep "connect\|disconnect"
```

### 6.2 로그 확인

```bash
# 최근 200줄
openclaw logs --limit 200

# 특정 에러 검색
openclaw logs --limit 500 | grep -i "error\|timeout\|fail"

# 텔레그램 관련 로그
openclaw logs --limit 100 | grep -i "telegram"
```

### 6.3 프로필링 활성화

```bash
# Reasoning 표시 (생각 과정 보기)
/openreasoning

# Verbose 모드 (상세 로그)
/verbose

# 다시 끄기
/noreasoning
/noverbose
```

### 6.4 워크스페이스 확인

```bash
# 현재 워크스페이스
echo $OPENCLAW_WORKSPACE

# 에이전트별 워크스페이스
ls -la ~/.openclaw/agents/
```

---

## 7. 자주 묻는 질문 (FAQ)

### Q1: 채널 연결은 됐는데 메시지가 안 와요?

**A**:
1. `openclaw status --deep`로 연결 상태 확인
2. `openclaw logs`로 인바운드 로그 확인
3. @BotFather에서 봇 권한 재설정

### Q2: 모델을 바꿨는데 이전 모델이 사용돼요?

**A**:
1. 세션을 새로 시작해야 함 (세션은 시작 시 모델 고정)
2. `/model`로 모델 변경
3. `openclaw config set agents.defaults.model "new-model"`

### Q3: 스킬을 추가했는데 인식이 안 돼요?

**A**:
1. 스킬 경로 확인: `~/.openclaw/skills` 또는 `<workspace>/skills`
2. 스킬 파일명이 `SKILL.md`인지 확인
3. `skills.load.watch`를 true로 설정하고 Gateway 재시작

### Q4: 비용이 예상보다 높아요?

**A**:
1. 모델 라우팅 설정 (간단 작업에 저렴한 모델)
2. 컨텍스트 제한 (128K 대신 64K)
3. 캐시 활성화

### Q5: A2A 통신이 안 돼요?

**A**:
1. 에이전트가 같은 그룹 세션에 있는지 확인
2. `agents.defaults.tools.agentSend` 권한 확인
3. 세션 키 확인

---

## 8. 참고 자료

### 공식 문서
- 오픈크롤봇 트러블슈팅: https://docs.openclaw.ai/gateway/troubleshooting
- 오픈크롤봇 시작 가이드: https://docs.openclaw.ai/start/getting-started

### GitHub Issues
- 텔레그램 메시지 수신 문제: https://github.com/openclaw/openclaw/issues/4942
- 인바운드 DM 도착 문제: https://github.com/openclaw/openclaw/issues/4515
- 빈 메시지 400 에러: https://github.com/openclaw/openclaw/issues/4409
- 모델 404 에러: https://github.com/openclaw/openclaw/issues/4992

### 한국어 자료
- 오픈크롤봇 설치 및 사용 가이드: https://apifox.com/apiskills/openclaw-installation-and-usage-guide/
- CSDN 트러블슈팅: https://blog.csdn.net/gitblog_00504/article/details/143879470

---

*문서 완료*
