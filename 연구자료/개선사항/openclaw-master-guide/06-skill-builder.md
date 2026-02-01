# 섹션 6: 스킬빌더 스킬 설계

## 개요
OpenClaw 스킬은 **SKILL.md + YAML 프론트매터 + 지시문**으로 구성된 모듈이다. 이 섹션에서는 "스킬을 만드는 스킬" — 즉, 사용자의 요청을 받아 새로운 스킬을 자동 생성하는 메타 스킬을 설계한다.

---

## OpenClaw 스킬 구조 (기본)

```
skills/
└── my-skill/
    ├── SKILL.md          # 메인 (프론트매터 + 지시문)
    ├── references/        # 참고 파일 (선택)
    │   ├── api-docs.md
    │   └── examples.md
    └── scripts/          # 실행 스크립트 (선택)
        └── setup.sh
```

### SKILL.md 필수 구조
```yaml
---
name: skill-name
description: 스킬 설명 (한 줄)
metadata:
  {
    "openclaw":
      {
        "emoji": "🔧",
        "requires": { "bins": ["tool-name"], "env": ["API_KEY"] },
        "primaryEnv": "API_KEY",
        "install": [{ "id": "brew", "kind": "brew", "formula": "tool-name", "bins": ["tool-name"] }],
      },
  }
---

## 사용법
{baseDir} 경로에서 참조 파일을 읽을 수 있다.

### 명령어
- `tool-name action` — 설명

### 예시
...
```

---

## 스킬빌더 스킬 v1.0

### SKILL.md

```yaml
---
name: skill-builder
description: 사용자 요청을 받아 OpenClaw 스킬을 자동 생성하는 메타 스킬
metadata:
  {
    "openclaw":
      {
        "emoji": "🏗️",
        "always": true,
      },
  }
---

## 스킬 빌더 (Skill Builder)

사용자가 "XX 스킬 만들어줘"라고 요청하면, 다음 워크플로우로 스킬을 생성한다.

### 워크플로우

#### 1단계: 요구사항 수집
사용자에게 다음을 확인한다:
- **스킬 이름**: 영문 케밥케이스 (예: `my-skill`)
- **목적**: 이 스킬이 무엇을 하는가
- **필요 도구**: CLI 도구, API, 바이너리
- **환경변수**: API 키 등
- **OS 제한**: macOS/Linux/Windows
- **참고 자료**: API 문서 URL, 예시

#### 2단계: 스킬 구조 생성
```bash
mkdir -p <workspace>/skills/<skill-name>
```

SKILL.md를 다음 구조로 생성:
```yaml
---
name: <skill-name>
description: <한 줄 설명>
metadata:
  {
    "openclaw":
      {
        "emoji": "<적절한 이모지>",
        "requires": { "bins": [<필요 바이너리>], "env": [<필요 환경변수>] },
        "primaryEnv": "<주요 환경변수>",
        "install": [<인스톨러 스펙>]
      }
  }
---

## <스킬 이름>

### 용도
<목적 설명>

### 명령어
<사용법>

### 예시
<구체적 사용 예시>

### 주의사항
<제약조건, 에러 핸들링>
```

#### 3단계: 테스트
- 스킬 폴더 생성 확인
- SKILL.md 프론트매터 유효성 검증
- 필요 바이너리/환경변수 존재 확인
- 간단한 실행 테스트

#### 4단계: 등록
- 스킬 워처가 자동 감지 (watch: true)
- 또는 게이트웨이 재시작으로 로드

### 스킬 품질 기준
- [ ] name: 영문 케밥케이스
- [ ] description: 한 줄, 명확
- [ ] metadata: JSON 유효
- [ ] requires: 정확한 의존성
- [ ] 지시문: 구체적 사용법 + 예시
- [ ] 에러 핸들링 포함
- [ ] 보안 고려 (API 키 노출 방지)

### 기존 스킬 참고
ClawHub에서 유사 스킬 검색: https://clawhub.com
700+ 스킬 목록: https://github.com/VoltAgent/awesome-openclaw-skills
```

---

## 스킬 생성 워크플로우

```
사용자: "XX 스킬 만들어줘"
    │
    ▼
[1] 요구사항 수집
    - 이름, 목적, 도구, 환경변수, OS
    │
    ▼
[2] 유사 스킬 검색
    - ClawHub에서 기존 스킬 확인
    - 재사용 가능한 것 있으면 커스텀
    │
    ▼
[3] SKILL.md 생성
    - 프론트매터 + 지시문
    - references/ 폴더 (필요시)
    │
    ▼
[4] 테스트
    - 프론트매터 파싱 확인
    - 바이너리/환경변수 확인
    - 실행 테스트
    │
    ▼
[5] 등록 & 확인
    - 스킬 워처 자동 감지
    - `openclaw status`에서 확인
    │
    ▼
[6] 사용자에게 보고
    - 스킬 사용법 안내
    - 테스트 결과 공유
```

---

## 스킬 테스트 방법

### 1. 프론트매터 유효성
```bash
# SKILL.md의 YAML 프론트매터가 올바른지 확인
head -20 skills/<name>/SKILL.md
```

### 2. 의존성 확인
```bash
# 바이너리 존재 확인
which <binary-name>

# 환경변수 확인
echo $API_KEY
```

### 3. 로드 확인
```bash
# 게이트웨이 재시작 후 스킬 목록 확인
openclaw status --all
```

### 4. 실행 테스트
- 텔레그램/CLI에서 스킬 관련 질문을 던져서 반응 확인
- 에러 발생 시 로그 확인: `openclaw logs --follow`

---

## 스킬 저장/배포 방식

### 로컬 전용
```
<workspace>/skills/<name>/SKILL.md
```
- 해당 에이전트만 사용
- 백업: Git으로 관리 권장

### 전체 에이전트 공유
```
~/.openclaw/skills/<name>/SKILL.md
```
- 모든 에이전트가 사용
- 멀티에이전트 환경에 적합

### ClawHub 배포
```bash
clawhub sync --all
```
- 공개 배포
- 커뮤니티 검토 후 등록

---

## 다른 시스템의 스킬 구조 비교

| 항목 | OpenClaw | CrewAI | AutoGPT | Claude Desktop |
|------|---------|--------|---------|---------------|
| **스킬 정의** | SKILL.md (YAML + 마크다운) | Python 클래스 (YAML 설정) | JSON 매니페스트 | SKILL.md |
| **역할 정의** | SOUL.md + AGENTS.md | YAML (role, goal, backstory) | JSON config | System Prompt |
| **도구 연결** | requires.bins/env | @tool 데코레이터 | Plugin 시스템 | Tool use |
| **작업 위임** | sessions_send | allow_delegation | Agent Manager | N/A |
| **설치** | clawhub install | pip install | Plugin install | 수동 복사 |
| **테스트** | 수동 (실행 테스트) | pytest | 수동 | 수동 |
| **배포** | ClawHub | PyPI/GitHub | GitHub | GitHub |

---

## Claude Desktop 스킬 → OpenClaw 스킬 변환 가이드

### 공통점
- 둘 다 SKILL.md 기반 (AgentSkills 스펙)
- YAML 프론트매터 + 마크다운 지시문
- `{baseDir}` 변수 지원

### 차이점
| 항목 | Claude Desktop | OpenClaw |
|------|---------------|---------|
| 메타데이터 키 | metadata.claude | metadata.openclaw |
| 게이팅 | 제한적 | bins/env/config/os |
| 인스톨러 | 없음 | brew/node/go/uv/download |
| 환경변수 주입 | 수동 | skills.entries.*.env |
| 배포 | GitHub | ClawHub |

### 변환 단계
1. `metadata.claude` → `metadata.openclaw`로 키 변경
2. 필요 바이너리를 `requires.bins`에 추가
3. 환경변수를 `requires.env`에 추가
4. 인스톨러 스펙 추가 (선택)
5. `{baseDir}` 경로 확인
6. OpenClaw 스킬 폴더에 복사
7. 테스트

---

## 개선 제안 리스트

1. **스킬 템플릿 자동 생성**: `openclaw skill create <name>` CLI 명령어
2. **스킬 테스트 프레임워크**: 자동화된 테스트 러너
3. **스킬 버전 관리**: SKILL.md에 version 필드 추가
4. **스킬 의존성**: 스킬 간 의존성 정의 (requires.skills)
5. **스킬 조합**: 여러 스킬을 조합하는 메타 스킬 패턴
6. **스킬 마켓플레이스**: ClawHub 검색 + 평점 시스템
7. **스킬 분석**: 스킬 사용 빈도/성능 추적
8. **스킬 롤백**: 이전 버전으로 복원
9. **스킬 포크**: 기존 스킬 수정 + 재배포
10. **스킬 공유 그룹**: 팀 내 스킬 공유 + 동기화
