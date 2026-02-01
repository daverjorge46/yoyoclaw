# 오픈클로(OpenClaw) 커뮤니티 팁 & FAQ 가이드

> **작성일**: 2026-01-31
> **소스**: 공식 문서(docs/help/faq.md, troubleshooting.md, CHANGELOG.md), GitHub Issues/Discussions, Reddit, 커뮤니티 블로그
> **대상 버전**: 2026.1.29 (Latest Stable)

---

## 목차

1. [FAQ TOP 50](#1-faq-top-50)
2. [설치 트러블슈팅](#2-설치-트러블슈팅)
3. [채널 연결 오류](#3-채널-연결-오류)
4. [AI 프로바이더 오류](#4-ai-프로바이더-오류)
5. [성능 최적화](#5-성능-최적화)
6. [보안 Best Practice](#6-보안-best-practice)
7. [커뮤니티 추천 설정](#7-커뮤니티-추천-설정)
8. [마이그레이션 이슈](#8-마이그레이션-이슈)
9. [한국 사용자 특화 팁](#9-한국-사용자-특화-팁)
10. [로드맵/예정 기능](#10-로드맵예정-기능)

---

## 1. FAQ TOP 50

### 설치 & 첫 실행

| # | 질문 | 답변 |
|---|------|------|
| 1 | 가장 빠른 설치 방법은? | `curl -fsSL https://openclaw.bot/install.sh \| bash` 후 `openclaw onboard --install-daemon` |
| 2 | 설치에 얼마나 걸리나? | 설치 2~5분, 온보딩 5~15분 |
| 3 | Node.js 버전 요구사항은? | Node >= 22 필수. pnpm 권장, Bun은 비권장 (WhatsApp/Telegram 런타임 버그) |
| 4 | Raspberry Pi에서 돌릴 수 있나? | 가능. 512MB~1GB RAM, 1코어, ~500MB 디스크 |
| 5 | 대시보드에 어떻게 접근하나? | 온보딩 후 자동 열림. 이후 `openclaw dashboard`로 토큰화된 URL 획득 |
| 6 | "wake up my friend"에서 멈춤 | Gateway 재시작, status/auth 확인, `openclaw doctor` 실행 |
| 7 | Stable vs Beta 차이는? | 동일 빌드. Beta가 먼저 테스트되고 Latest로 승격 |
| 8 | Git 설치 vs npm 설치 차이? | Git = 소스 편집 가능, npm = 글로벌 CLI만 제공 |
| 9 | 온보딩 위저드가 하는 일은? | 모델/인증, 워크스페이스, Gateway, 프로바이더, 데몬, 헬스체크 설정 |
| 10 | 최신 개발 버전 사용법? | `openclaw update --channel dev` 또는 Git 설치 |

### 인증 & 모델

| # | 질문 | 답변 |
|---|------|------|
| 11 | Claude/OpenAI 구독이 필요한가? | 불필요. API 키 또는 로컬 모델 사용 가능 |
| 12 | API 키 없이 Claude 구독 인증? | `claude setup-token`으로 생성한 토큰 사용 (웹 콘솔이 아닌 CLI에서 생성) |
| 13 | HTTP 429 에러 발생 | Anthropic 쿼터 소진. 대기 또는 플랜 업그레이드 |
| 14 | AWS Bedrock 지원? | 지원. AWS 자격 증명으로 수동 설정 |
| 15 | 로컬 모델 사용해도 되나? | 가벼운 채팅에는 OK. 단, 도구 사용 시 보안 위험 존재 |
| 16 | 추천 모델은? | Opus 4.5, Sonnet 4.5, GPT-5.2 |
| 17 | 모델 즉시 전환? | `/model sonnet`, `/model opus`, `/model gpt` 등 단축키 사용 |
| 18 | "Unknown model" 에러 | 프로바이더 미설정. `models.providers`에 API 키 설정 필요 |
| 19 | 모델 별칭(alias) 지정? | `agents.defaults.models.<modelId>.alias`로 설정 |
| 20 | Failover 동작 방식? | Auth 프로필 로테이션 → 모델 fallback 순서 |

### 설정 & 저장

| # | 질문 | 답변 |
|---|------|------|
| 21 | 설정 파일 형식? | JSON5, 경로: `~/.openclaw/openclaw.json` |
| 22 | 설정 변경 후 재시작 필요? | 하이브리드 모드에서 핫리로드 지원 |
| 23 | `config.apply`가 설정 초기화함 | 전체 덮어쓰기됨. 소규모 변경은 `config set` 사용 |
| 24 | 데이터 저장 위치? | `$OPENCLAW_STATE_DIR` (기본값 `~/.openclaw`) |
| 25 | 모든 데이터가 로컬인가? | State는 로컬. 단, 외부 서비스에 보내는 데이터는 해당 서비스에 노출 |
| 26 | 백업 전략? | 워크스페이스는 Git (private), state 디렉토리는 별도 백업 |
| 27 | 완전 초기화 방법? | `openclaw reset --scope full --yes --non-interactive` |
| 28 | 환경변수 로딩 순서? | Process env → `.env` → `~/.openclaw/.env` → 인라인 config |
| 29 | 서비스 환경변수가 사라짐 | `~/.openclaw/.env`에 넣거나 shellEnv 활성화 |
| 30 | AGENTS.md 위치? | 워크스페이스 내부 (`~/.openclaw`가 아님) |

### Gateway & 네트워크

| # | 질문 | 답변 |
|---|------|------|
| 31 | Gateway 기본 포트? | 18789 (`gateway.port`로 변경) |
| 32 | Gateway 재시작 방법? | `openclaw gateway restart` |
| 33 | "Already listening" 에러 | 다른 인스턴스가 포트 점유 중. 중지하거나 `--port` 변경 |
| 34 | Gateway 실행 중인데 응답 없음 | 모델, 채널, allowlists 확인 |
| 35 | 원격 모드 설정? | `gateway.mode: "remote"` + 원격 URL 설정 |
| 36 | Tailscale 바인딩 실패 | 머신이 Tailscale에 없거나 인터페이스 다운 |
| 37 | 여러 Gateway 실행? | 프로필 또는 고유 포트/state 디렉토리 사용 |
| 38 | 로그 위치? | `/tmp/openclaw/openclaw-*.log` + 서비스 로그 |
| 39 | 상세 로그 활성화? | `--verbose` 플래그 사용 |
| 40 | Gateway 연결 끊김 | Gateway 중지, 잘못된 토큰, 또는 터널 다운 |

### 세션 & 채팅

| # | 질문 | 답변 |
|---|------|------|
| 41 | 새 대화 시작? | `/new` 또는 `/reset` 전송 |
| 42 | 자동 세션 리셋? | `session.idleMinutes` (기본 60분) 후 자동 리셋 |
| 43 | 컨텍스트가 잘림 | 파일로 요약, `/compact` 사용, 더 큰 모델 선택 |
| 44 | "LLM request rejected" | 세션 히스토리 손상. `/new`로 새 세션 시작 |
| 45 | 작업 중단 방법? | `stop`, `abort`, `esc` 등 단독 전송 |
| 46 | 하트비트 메시지? | 기본 30분. `heartbeat.every`로 조정 또는 비활성화 |
| 47 | 그룹과 DM 컨텍스트 공유? | 불가. 별도 세션 키 사용 |
| 48 | 스킬 커스터마이징? | `~/.openclaw/skills/<name>/`에 managed overrides |
| 49 | 크론/리마인더 작동 안 함 | Gateway가 24/7 실행 필요. 타임존 설정 확인 |
| 50 | 미디어 전송 안 됨 | 메시지에 `MEDIA:<path>` 라인 포함 필요 |

---

## 2. 설치 트러블슈팅

### 2.1 `openclaw: command not found`

**증상**: 설치 후 명령어를 찾을 수 없음

**원인**: Node.js/npm의 글로벌 bin 디렉토리가 PATH에 없음 (특히 Windows)

**해결**:
```bash
# PATH 확인
echo $PATH

# npm 글로벌 bin 위치 확인
npm config get prefix

# PATH에 추가 (bash)
export PATH="$(npm config get prefix)/bin:$PATH"

# 영구 적용
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
```

### 2.2 설치 실패 (일반)

**증상**: 인스톨러가 중간에 실패

**해결**:
```bash
# 상세 로그로 재실행
openclaw install --verbose

# Node 버전 확인 (22 이상 필수)
node --version
```

### 2.3 Windows 설치 문제

**증상**: Windows에서 명령어 실행 불가

**원인**: Git for Windows 미설치 또는 npm 글로벌 bin PATH 누락

**해결**:
1. [Git for Windows](https://gitforwindows.org/) 설치
2. npm 글로벌 bin을 시스템 PATH에 추가
3. WSL2 사용 시 Docker Desktop 대신 WSL 내부에 Docker 서비스 직접 설치 권장

### 2.4 docs.openclaw.ai SSL 에러

**증상**: 문서 사이트 접속 시 SSL 인증서 오류

**원인**: Xfinity Advanced Security가 차단

**해결**: Xfinity Advanced Security 비활성화 또는 VPN 사용

### 2.5 VPS 설치

**요구사항**:
- 최소: 1 vCPU, 1GB RAM
- 권장: 2GB RAM
- 지원 가이드: exe.dev, Hetzner, Fly.io

### 2.6 Gateway 서비스 vs CLI 설정 불일치

**증상**: CLI에서 변경한 설정이 서비스에 반영되지 않음

**원인**: 프로필이 다르거나 서로 다른 config 파일 편집

**해결**:
```bash
# 강제 재설치
openclaw gateway install --force

# doctor로 진단
openclaw doctor
```

---

## 3. 채널 연결 오류

### 3.1 WhatsApp

| 증상 | 원인 | 해결 |
|------|------|------|
| 연결 안 됨 | 페어링 모드 기본 활성화 | `openclaw pairing approve` 실행 |
| 그룹에서 응답 없음 | Mention gating 또는 그룹 allowlist 미등록 | 그룹을 allowlist에 추가 |
| 그룹 JID 확인 방법 | - | 로그 tail 또는 `openclaw directory groups list` |
| 봇 계정 필요? | - | 아니오, 사용자 계정으로 실행. 단, 별도 계정 권장 |
| Bun 런타임 버그 | WhatsApp 채널 호환성 문제 | Node.js (pnpm) 사용 |

### 3.2 Telegram

| 증상 | 원인 | 해결 |
|------|------|------|
| 네트워크 에러 | 아웃바운드 HTTPS, DNS 문제 | 로그 확인, 네트워크 설정 점검 |
| 페어링 코드 확인 | - | `openclaw pairing list telegram` |
| allowFrom에 @username 사용 | 잘못된 식별자 | **숫자 user ID** 사용 필수 |
| Long polling 불안정 | 알려진 이슈 (수정됨) | 최신 버전 업데이트 |
| DM 토픽 세션 | 최근 추가된 기능 | 2026.1.x 이상 필요 |

### 3.3 Discord

| 증상 | 원인 | 해결 |
|------|------|------|
| 메시지 수신 불가 | Message Content Intent 미활성화 | Discord Developer Portal에서 활성화 |
| 스레딩/멘션 문제 | 이전 버전 버그 | 최신 버전 업데이트 |
| 유저네임 디렉토리 조회 | v2026.1.29에서 수정 | 업데이트 |

### 3.4 기타 채널

| 채널 | 주요 이슈 | 참고 |
|------|----------|------|
| **Slack** | Socket Mode 또는 HTTP webhook 모드 선택 | - |
| **Signal** | signal-cli 필요, 시작 타임아웃 설정 | startup timeout 설정 |
| **iMessage** | Mac 필수. Linux에서는 SSH wrapper로 사용 | Mac Mini 또는 아무 Mac |
| **LINE** | 플러그인으로 추가 (최신) | 2026.1.x |
| **MS Teams** | 플러그인으로 분리 (Breaking) | 2026.1.15~ |

### 3.5 채널 공통 이슈

**Breaking Change (2026.1.12)**: "providers"가 "channels"로 이름 변경. 자동 마이그레이션 적용.

**Breaking Change (2026.1.16)**: 채널 인증이 환경변수보다 config 우선.

**Breaking Change (2026.1.8)**: DM이 기본적으로 잠금(pairing mode). 그룹은 allowlists 사용.

---

## 4. AI 프로바이더 오류

### 4.1 "No credentials" 에러

**진단 순서**:
1. Auth store 확인
2. 환경변수 확인
3. 에이전트별 인증 설정 확인

```bash
# 모델/인증 상태 확인
openclaw models status

# 프로바이더별 인증 프로필
# 위치: <agentDir>/auth-profiles.json
```

### 4.2 OAuth vs API Key

| 방식 | 설명 | 용도 |
|------|------|------|
| OAuth | 구독 접근 (Claude Code CLI 인증) | 구독 사용자 |
| API Key | 사용량 기반 과금 | 종량제 사용자 |

**Auth 프로필 ID 형식**: `anthropic:default`, `anthropic:<email>`, 커스텀 ID

### 4.3 Anthropic (Claude) 연결

| 증상 | 해결 |
|------|------|
| HTTP 429 Rate Limit | 쿼터 소진. 대기 또는 플랜 업그레이드 |
| setup-token 생성 | `claude setup-token` (CLI 전용, 웹 콘솔 아님) |
| OAuth 갱신 | Claude Code CLI 자격 증명에 대해 자동 갱신 |

### 4.4 OpenAI / Codex

| 증상 | 해결 |
|------|------|
| Codex 인증 | OpenAI Code OAuth via 위저드 |
| 시맨틱 검색 API 키 | Codex OAuth는 임베딩 커버하지 않음. 별도 API 키 필요 |

### 4.5 Google Gemini

| 증상 | 해결 |
|------|------|
| Gemini CLI OAuth | 플러그인 활성화 후 `openclaw models auth login` |
| Fallback 에러 | 자격 증명 없으면 fallbacks에서 제거 |

### 4.6 로컬 모델 (Ollama 등)

| 증상 | 해결 |
|------|------|
| 연결 거부 | Ollama가 `0.0.0.0`에서 리슨하도록 `OLLAMA_HOST=0.0.0.0` 설정 |
| Docker에서 연결 불가 | `http://host.docker.internal:11434` 사용 |
| 기본 컨텍스트 길이 짧음 | Ollama 기본값 2048. 모델 파라미터에서 8192+ 설정 |
| 모델 크기 추정 | 모델 디스크 크기 x 1.5 < 물리 메모리 → 실행 가능 |

### 4.7 AWS Bedrock

```json
// openclaw.json 수동 설정 필요
{
  "models": {
    "providers": {
      "bedrock": {
        "region": "us-east-1",
        "accessKeyId": "...",
        "secretAccessKey": "..."
      }
    }
  }
}
```

### 4.8 프로바이더 Cooldown

- Rate limit/실패 시 자동 backoff 적용
- Auth 프로필 로테이션 → 모델 fallback 순서로 failover 동작

---

## 5. 성능 최적화

### 5.1 긴 채팅 히스토리 문제

**증상**: 100~200+ 메시지 시 5~15분 로딩, 10~15회 프롬프트 후 눈에 띄는 지연

**해결**:
- 정기적으로 오래된 채팅 아카이브
- `/compact` 명령으로 컨텍스트 압축
- `/new`로 새 세션 시작
- `contextPruning` 설정 튜닝

### 5.2 데이터베이스 최적화

| 항목 | 권장 설정 |
|------|----------|
| DB 엔진 | SQLite → **PostgreSQL** (`DATABASE_URL` 환경변수) |
| Connection Pool | 50으로 증가 |
| 벡터 DB | 프로덕션: PGVector 또는 ChromaDB (공식 유지보수) |
| 벡터 DB 옵션 | chroma, pgvector, qdrant, milvus, elasticsearch, opensearch, pinecone (9종 지원) |

### 5.3 Nginx 리버스 프록시 최적화

```nginx
# 스트리밍 성능 최적화 필수 설정
proxy_buffering off;
proxy_cache off;
chunked_transfer_encoding off;

# WebSocket 지원 (필수)
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 5.4 Task Model 분리

**핵심 팁**: 배경 작업(자동 제목, 자동 태그 등)에는 빠르고 저렴한 모델 사용

```
Primary Chat Model: Opus 4.5 / GPT-5.2
Task Model: GPT-4o-mini / 로컬 모델
```

불필요한 기능 비활성화: auto-title, auto-tags

### 5.5 RAG 성능

| 설정 | 권장값 | 설명 |
|------|--------|------|
| 임베딩 모델 | `all-MiniLM-L6-v2` 또는 OpenAI | 고품질 모델 사용 |
| 컨텍스트 길이 | 8192+ tokens | Ollama 기본 2048은 부족 |
| Relevance Threshold | 0.2~0.3 | 기본값 0.6은 너무 높음 |
| 파일 크기 제한 | `RAG_FILE_MAX_SIZE` 환경변수 | 5MB 이상은 설정 필요 |
| KV 캐시 | `RAG_SYSTEM_CONTEXT=True` | 후속 응답 거의 즉시 |

### 5.6 하드웨어 가이드

| 환경 | CPU | RAM | 저장소 | 비고 |
|------|-----|-----|--------|------|
| 최소 (VPS) | 1 vCPU | 1GB | 500MB | 기본 기능만 |
| 권장 (VPS) | 2+ vCPU | 2GB+ | - | 안정적 운영 |
| Raspberry Pi | 1 core | 512MB~1GB | ~500MB | 가벼운 채팅용 |
| GPU (로컬 모델) | - | `모델 크기 x 1.5` | - | VRAM + 시스템 RAM |

### 5.7 ChromaDB 병목

- 컨테이너 내부 ChromaDB는 고 QPS 벡터 검색에서 병목
- 프로덕션에서는 외부 PGVector 또는 Qdrant 사용 권장
- `VECTOR_DB` 환경변수로 전환 가능

---

## 6. 보안 Best Practice

### 6.1 필수 보안 설정 체크리스트

```
[ ] WEBUI_SECRET_KEY 설정 (프로덕션 필수)
[ ] JWT 만료 시간 설정 (절대 -1 사용 금지)
[ ] HTTPS 활성화 (리버스 프록시)
[ ] 관리자 비밀번호 변경 (초기 설정 후)
[ ] 가입 비활성화 (관리자 계정 생성 후 자동)
[ ] DM 페어링 모드 확인 (2026.1.8~ 기본 활성화)
[ ] 설정 파일 퍼미션 600 확인 (doctor 자동 체크)
[ ] State 디렉토리 백업 암호화
```

### 6.2 인증 방식별 보안

| 방식 | 보안 수준 | 적합 환경 |
|------|----------|----------|
| API Key | 중 | 개인/소규모 |
| OAuth (SSO) | 상 | 기업/팀 |
| LDAP/AD | 상 | 기존 인프라 보유 |
| 토큰 인증 | 중~상 | VPS/원격 |

### 6.3 LDAP/Active Directory 설정

```bash
ENABLE_LDAP=true
LDAP_SERVER_HOST=<호스트>
LDAP_SERVER_PORT=389  # LDAPS는 636
LDAP_USE_TLS=true
LDAP_APP_DN=<바인드 계정>
LDAP_APP_PASSWORD=<비밀번호>
LDAP_SEARCH_BASE=<검색 베이스>
LDAP_ATTRIBUTE_FOR_USERNAME=<속성>

# 그룹 동기화
ENABLE_LDAP_GROUP_MANAGEMENT=true
ENABLE_LDAP_GROUP_CREATION=true
LDAP_ATTRIBUTE_FOR_GROUPS=memberOf
```

> **알려진 이슈**: Active Directory 연동 시 일부 환경에서 호환성 문제 보고됨 ([GitHub #7063](https://github.com/open-webui/open-webui/issues/7063))

### 6.4 RBAC (역할 기반 접근 제어)

| 역할 | 설명 |
|------|------|
| **Admin** | 전체 접근 권한, 사용자/시스템 관리 |
| **User** | 설정 가능한 권한 |
| **Pending** | 승인 전까지 접근 불가 |

- 첫 가입자 = **Super Admin** (변경 불가)
- 보안 모델: **가산적(Additive)** - 기본 권한 + 그룹 권한의 합집합
- 그룹별 세분화된 권한 오버라이드 가능

### 6.5 프롬프트 인젝션 방어

| 위험 상황 | 대응 |
|----------|------|
| 외부 콘텐츠 (웹, 이메일) | 신뢰할 수 없는 입력 주의 |
| 작은/양자화 모델 | 인젝션에 더 취약. 신뢰 입력에만 사용 |
| 그룹 와일드카드 `*` | 모든 그룹에 열림. 명시적 allowlist 사용 |

### 6.6 Breaking Change: 보안 강화 (2026.1.29)

- Gateway auth mode "none" **제거됨**. 토큰/비밀번호 필수
- Control UI가 보안되지 않은 HTTP 연결을 디바이스 ID 없이 거부 (2026.1.21)

---

## 7. 커뮤니티 추천 설정

### 7.1 개인 사용자 추천 구성

```json5
// ~/.openclaw/openclaw.json
{
  // 기본 모델 설정
  "agents": {
    "defaults": {
      "model": {
        "primary": "claude-opus-4-5",
        "fallbacks": ["claude-sonnet-4-5", "gpt-5.2"]
      }
    }
  },

  // 세션 관리
  "session": {
    "idleMinutes": 60
  },

  // 하트비트 (필요 시 비활성화)
  "heartbeat": {
    "every": "30m"  // 또는 비활성화
  }
}
```

### 7.2 팀/기업 추천 구성

```bash
# 프로덕션 필수 환경변수
WEBUI_SECRET_KEY=<32자리-이상-보안-키>
WEBUI_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@host:5432/openclaw
JWT_EXPIRES_IN=7d
ENABLE_PASSWORD_LOGIN=false  # SSO 설정 완료 시
VECTOR_DB=pgvector  # 프로덕션용

# UVICORN 워커 > 1 시 주의
# 마이그레이션이 단일 워커에서 먼저 실행되도록 보장
```

### 7.3 Docker Compose 추천 설정

```yaml
version: '3.8'
services:
  openclaw:
    image: openclaw/openclaw:latest
    volumes:
      - open-webui:/app/backend/data  # 필수! 없으면 데이터 유실
    environment:
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped

volumes:
  open-webui:
```

> **핵심**: `-v open-webui:/app/backend/data` 볼륨 마운트 없이 컨테이너 삭제 시 **영구 데이터 유실**

### 7.4 백업 자동화 (커뮤니티 추천)

```bash
# Docker 볼륨 백업 (cron에 등록)
docker run --rm \
  -v open-webui:/source \
  -v "$(pwd)/backup":/backup \
  alpine tar czf "/backup/$(date "+%Y-%m-%d.%H.%M")-open-webui-volume.tar.gz" -C /source .

# 백업 대상 파일
# - audit.log
# - cache/
# - uploads/
# - vector_db/
# - webui.db
```

### 7.5 Pipelines & Functions 활용

| 유형 | 실행 위치 | 패키지 설치 | 적합 용도 |
|------|----------|------------|----------|
| Functions | Open WebUI 서버 | 불가 | 프로바이더 추가, 기본 필터 |
| Pipelines | 별도 서버 | Python 패키지 자유 | 무거운 연산, 확장성 |

**Function 유형**:
- **Pipe**: 선택 가능한 모델로 표시
- **Filter**: Inlet(입력 수정) / Outlet(출력 수정) 후킹
- **Action**: 커스텀 버튼 생성

**커뮤니티 인기 Functions**:
- Anthropic/Gemini/Groq 프로바이더 통합
- Web Search, Calculator, Home Assistant 제어
- 자동 태깅, 콘텐츠 필터링

> 참고: [Open WebUI Community](https://openwebui.com/functions)

### 7.6 테마 커스터마이징

| 방법 | 라이선스 | 설명 |
|------|---------|------|
| CSS 인젝션 | 오픈소스 | Docker 이미지에 CSS 파일 주입 |
| 로고/브랜딩 변경 | Enterprise | 엔터프라이즈 라이선스 필요 |

**CSS 인젝션 팁**: 특정 버전 태그(예: `git-49a928d`) 사용. `main` 태그는 업데이트 시 깨질 수 있음.

---

## 8. 마이그레이션 이슈

### 8.1 주요 Breaking Changes 타임라인

| 버전 | 변경 사항 | 영향 |
|------|----------|------|
| 2026.1.29 | Gateway auth "none" 제거 | 토큰/비밀번호 필수 |
| 2026.1.24 | 잘못된 config 항목 거부, 시작 거부 | `openclaw doctor --fix` |
| 2026.1.21 | HTTP without device identity 거부 | HTTPS 필수화 추세 |
| 2026.1.16 | `openclaw message` 파라미터 변경 (`to` → `target`) | 스크립트 수정 필요 |
| 2026.1.16 | 채널 인증 config 우선 (환경변수보다) | 환경변수 의존 설정 확인 |
| 2026.1.16 | `openclaw hooks` → `openclaw webhooks` | 명령어 변경 |
| 2026.1.15 | MS Teams → 플러그인 분리, iOS 최소 18.0 | - |
| 2026.1.14 | Sandbox 기본 scope "agent"로 변경 | 격리 동작 변경 |
| 2026.1.12 | "providers" → "channels" (자동 마이그레이션) | 용어 변경 |
| 2026.1.8 | DM 기본 잠금 (pairing mode) | 기존 열린 DM 사용자 영향 |

### 8.2 State 디렉토리 마이그레이션

자동 마이그레이션 적용 항목:
```
세션: ~/.openclaw/sessions/ → ~/.openclaw/agents/<agentId>/sessions/
에이전트: ~/.openclaw/agent/ → ~/.openclaw/agents/<agentId>/agent/
WhatsApp: 레거시 → ~/.openclaw/credentials/whatsapp/<accountId>/
OAuth: ~/.openclaw/credentials/oauth.json → <agentDir>/auth-profiles.json (에이전트별)
```

### 8.3 Config 마이그레이션 (자동 적용)

```
routing.allowFrom → channels.whatsapp.allowFrom
routing.groupChat.* → 채널별 설정
identity → agents.list[].identity
agent.* → agents.defaults + tools.*
```

### 8.4 새 머신 이전 절차

1. `~/.openclaw` (state dir) + 워크스페이스 전체 복사
2. 퍼미션/소유권이 Gateway 사용자와 일치하는지 확인
3. `openclaw doctor` 실행
4. 동일 프로필 사용 확인

**주의사항**:
- `openclaw.json`만 복사하면 안 됨 → **전체 state dir** 필요
- 원격 모드 사용 시 Gateway 호스트를 마이그레이션 (노트북 아님)
- 부분 복사 금지: state dir + 워크스페이스 **항상 함께**

### 8.5 데이터베이스 마이그레이션 주의

- 이전 버전 DB를 신규 버전에 복원 시 스키마 변경으로 **크래시 가능**
- 마이그레이션 중간 실패 시 유일한 복구 방법: **백업에서 복원**
- `UVICORN_WORKERS > 1` 환경: 마이그레이션은 반드시 단일 워커에서 먼저 실행

### 8.6 진단 도구

```bash
# 60초 진단
openclaw status           # 로컬 요약
openclaw status --all     # 전체 보고서 (이슈 등록 시 첨부)
openclaw gateway probe    # RPC 도달성
openclaw logs --follow    # 실시간 로그
openclaw doctor           # 수리/마이그레이션
openclaw status --deep    # Gateway 헬스체크
```

---

## 9. 한국 사용자 특화 팁

### 9.1 한국어 지원 현황

- v0.6.33, v0.6.34에서 한국어 번역 강화
- 프로젝트 내 한국어 언어팩 활발히 유지보수 중
- 설정 UI 대부분 한국어 지원

### 9.2 한국 네트워크 환경 팁

| 항목 | 팁 |
|------|-----|
| **API 지연** | 한국에서 Anthropic/OpenAI API 호출 시 추가 지연. 지역 핀 엔드포인트(예: OpenRouter US) 사용 고려 |
| **VPN/프록시** | 일부 API 제공자가 한국 IP 차단 가능. 필요 시 VPN 설정 |
| **Cloudflare** | docs.openclaw.ai 접근 문제 시 DNS 변경 또는 VPN |
| **NAS 설치** | Synology/QNAP NAS에서 Docker로 구동 가능. 성능은 제한적 |

### 9.3 한국 커뮤니티 리소스

| 플랫폼 | 키워드 | 비고 |
|--------|--------|------|
| 클리앙 | "오픈웹UI", "셀프호스팅 AI" | 자작 NAS 커뮤니티 활발 |
| 기글하드웨어 | "Ollama", "로컬 LLM" | 하드웨어 최적화 논의 |
| 뽐뿌 | "AI 챗봇", "오픈소스 AI" | 설치 가이드 공유 |
| Reddit r/selfhosted | "open-webui" | 영어, 글로벌 셀프호스팅 팁 |

**한국어 가이드 블로그**:
- [Open WebUI 설치 운영 가이드](https://blog.oriang.net/69)
- [독립형 AI 서비스 손쉽게](https://hellollama.net/open-webui-%EB%8F%85%EB%A6%BD%ED%98%95-ai-%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC-%EC%86%90%EC%89%BD%EA%B2%8C/)
- [로컬 LLM 웹서비스 구축](https://www.lainyzine.com/ko/article/building-llm-web-service-with-open-webui/)

### 9.4 한국어 모델 추천

| 모델 | 한국어 성능 | 비고 |
|------|-----------|------|
| Claude Opus 4.5 | 우수 | API 키 필요 |
| GPT-5.2 | 우수 | API 키 필요 |
| Claude Sonnet 4.5 | 양호 | 비용 효율적 |
| Qwen 계열 | 양호 | 로컬 구동 가능, CJK 지원 |
| EXAONE (LG AI) | 양호 | 한국어 특화 로컬 모델 |

### 9.5 한국 기업 환경 도입 팁

- **LDAP/AD 연동**: 국내 기업 대부분 AD 사용. LDAP 설정 가이드 참조 (섹션 6.3)
- **온프레미스 배포**: 보안 규정 상 SaaS 불가 시 자체 서버 배포
- **에어갭 환경**: 인터넷 미연결 환경도 로컬 모델로 지원
- **SOC 2, ISMS-P**: Open WebUI의 RBAC + 감사 로그로 규정 준수 가능

---

## 10. 로드맵/예정 기능

### 10.1 최근 추가된 주요 기능 (2026.1.x)

| 기능 | 버전 | 설명 |
|------|------|------|
| TTS 시스템 | 최근 | Edge 폴백 포함 |
| LINE 채널 | 최근 | 플러그인으로 추가 |
| Exec 승인 시스템 | 최근 | `/approve` 명령 |
| DM 토픽 세션 (Telegram) | 최근 | 주제별 세션 분리 |
| 메모리 검색 (벡터 + BM25) | 최근 | 하이브리드 검색 |
| 브라우저 확장 릴레이 | 최근 | 브라우저 제어 |
| 플러그인 아키텍처 | 최근 | 채널, 도구, 프로바이더 플러그인화 |
| Hooks → Webhooks | 최근 | 웹훅 시스템 |
| 미디어 이해 | 최근 | 이미지/오디오/비디오 |
| Config `$include` | 최근 | 모듈식 설정 파일 |
| Node 호스트 데몬 | 최근 | 원격 실행 |
| Qwen Portal OAuth | 최근 | Qwen 인증 지원 |
| OpenAI 호환 `/v1/chat/completions` | 최근 | API 엔드포인트 |
| Voice Call 플러그인 | 최근 | Twilio/Telnyx |
| Cron Job 에이전트 타겟팅 | 최근 | 에이전트별 크론 |

### 10.2 실험적 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| `apply_patch` 도구 | 실험 | 멀티 파일 편집 |
| 세션 트랜스크립트 인덱싱 | 실험 | 메모리 검색용 |
| Lobster 워크플로우 | 실험 | 자동화 워크플로우 |
| ACP 프로토콜 | 실험 | IDE 통합 |

### 10.3 커뮤니티 요청 (진행 중)

| 요청 | 상태 | 참고 |
|------|------|------|
| 다중 워크스페이스 | 논의 중 | 관리자 전용 → 개인 워크스페이스 요청 ([Discussion #10193](https://github.com/open-webui/open-webui/discussions/10193)) |
| 내장 백업/복원 | 제안됨 | 버전 안전 + 선택적 내보내기 ([Issue #16642](https://github.com/open-webui/open-webui/issues/16642)) |
| ChromaDB 마이그레이션 | 이슈 | v0.6.27 → v0.6.28 전환 시 ([Issue #17408](https://github.com/open-webui/open-webui/issues/17408)) |
| Knowledge Base 디스크 사용 | 이슈 | 문서당 별도 ChromaDB 컬렉션 생성 ([Issue #17872](https://github.com/open-webui/open-webui/issues/17872)) |

### 10.4 알려진 버그 (2026.1 기준)

| 버그 | 상태 |
|------|------|
| pymilvus 의존성 충돌 (v0.7.2) | 보고됨 |
| Docker에서 느린 로딩 (v0.7.0) | 보고됨 |
| OpenRouter "Chunk too big" (v0.7.2) | 보고됨 |
| Think 파라미터 boolean 처리 오류 | 보고됨 |
| GLM-4.7-Flash 도구 호출 후 생성 중단 | 보고됨 |

---

## 부록: 플랫폼 비교 (Open WebUI vs 대안)

| 항목 | Open WebUI | AnythingLLM | LibreChat |
|------|-----------|-------------|-----------|
| **최적 용도** | Ollama 로컬 사용, 가벼운 채팅 | RAG/문서 Q&A, 지식 베이스 | 다중 API 프로바이더, 엔터프라이즈 |
| **설치 난이도** | 중 | 쉬움 | 중~어려움 |
| **Ollama 지원** | 우수 (네이티브) | 지원 | 미흡 |
| **RAG 성능** | 양호 | 우수 (내장 벡터 저장소+인용) | 양호 |
| **다중 프로바이더** | OpenAI 호환 위주 | 다수 지원 | 가장 많은 프로바이더 지원 |
| **인증/보안** | RBAC, LDAP, SSO | 기본 인증 | OAuth, Azure AD, AWS Cognito |
| **UI/UX** | 깔끔, ChatGPT 유사 | 기능적 | 기능적, ChatGPT 유사 |
| **DB** | SQLite/PostgreSQL | SQLite | MongoDB |
| **라이선스** | MIT | MIT | MIT |

**선택 가이드**:
- Ollama 로컬 모델 중심 → **Open WebUI**
- 문서 기반 RAG 작업 중심 → **AnythingLLM**
- 여러 API 프로바이더 + 엔터프라이즈 보안 → **LibreChat**
- 세련된 UI 선호 → **LobeChat** 고려

> 참고: [LibreChat vs Open WebUI](https://portkey.ai/blog/librechat-vs-openwebui/), [Top Open WebUI Alternatives](https://www.helicone.ai/blog/open-webui-alternatives)

---

## 참고 링크

### 공식 문서
- [Open WebUI Docs](https://docs.openwebui.com/)
- [FAQ](https://docs.openwebui.com/faq/)
- [Troubleshooting](https://docs.openwebui.com/troubleshooting/)
- [Environment Variables](https://docs.openwebui.com/getting-started/env-configuration/)
- [Features](https://docs.openwebui.com/features/)
- [Security](https://docs.openwebui.com/enterprise/security/)

### GitHub
- [open-webui/open-webui](https://github.com/open-webui/open-webui)
- [Issues](https://github.com/open-webui/open-webui/issues)
- [Discussions](https://github.com/open-webui/open-webui/discussions)
- [Releases](https://github.com/open-webui/open-webui/releases)

### 커뮤니티
- [Community Functions](https://openwebui.com/functions)
- [Pipelines](https://github.com/open-webui/pipelines)
- [Reddit r/selfhosted](https://www.reddit.com/r/selfhosted/)

### 가이드/블로그
- [10 Tips for Open WebUI](https://hostkey.com/blog/74-10-tips-for-open-webui-to-enhance-your-work-with-ai/)
- [SRE's Guide to HA Deployment](https://taylorwilsdon.medium.com/the-sres-guide-to-high-availability-open-webui-deployment-architecture-2ee42654eced)
- [OpenWebUI with Postgres and Qdrant](https://www.heyitworks.tech/blog/openwebui-with-postgres-and-qdrant-a-setup-guide/)
- [Extending OpenWebUI with Pipelines](https://zohaib.me/extending-openwebui-using-pipelines/)
- [Custom Themes Guide](https://dev.to/code42cate/how-to-build-custom-open-webui-themes-55hh)
- [Backup/Update on macOS](https://fezdez.com/posts/open-webui-backup-update/)
