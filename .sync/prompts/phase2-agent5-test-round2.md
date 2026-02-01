# Agent 5: QA/테스트 엔지니어 - Phase 2 (2차 작업)

## 프로젝트 경로
```
/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로/
```

## 참조
- `.sync/agents/agent-5-test.md` (Phase 1 리포트)
- `.sync/agents/agent-2-security.md` (Agent 2 코드 변경 목록)
- `.sync/agents/agent-4-feature.md` (Agent 4 코드 변경 목록)
- `연구자료/개선사항/OpenClaw_Master_Guide/99_fact_check_notes.md`

---

## 작업 목록

### 1. 존재하지 않는 config 키 검증
- **출처**: `99_fact_check_notes.md`
- 가이드 문서에 언급되었으나 코드에 존재하지 않을 수 있는 config 키 검증:
  - `cache.ttl` - 코드에 있는지?
  - `budget.monthly` - 코드에 있는지?
  - `streaming.enabled` - 코드에 있는지?
  - `mentionPatterns` - 코드에 있는지?
- 각 키를 `src/config/` 디렉토리에서 grep하여 존재 여부 확인
- **산출물**: 존재/미존재 매핑 표

### 2. Agent 2 코드 변경분 테스트 작성
- `src/gateway/device-auth.ts` - `assertNoPipe()` 테스트
  - 정상 문자열 통과
  - `|` 포함 문자열 거부
  - 빈 문자열, null, 특수문자 edge case
- `src/gateway/chat-sanitize.ts` - `containsInjectionPattern()` 테스트
  - 5개 패턴 각각 탐지 확인
  - 정상 메시지 false positive 검증
  - 대소문자, 유니코드 변형
- `src/security/audit-extra.ts` - `collectEnvTokenExposureFindings()` 테스트
  - 민감 토큰 패턴 13개 탐지
  - 정상 환경변수 무시
  - 빈 환경, 대량 환경변수

### 3. Agent 4 코드 변경분 테스트 작성
- `src/agents/tools/sessions-spawn-tool.ts` - autoDiscover 테스트
  - agents.list에서 자동 allowlist 구성 확인
  - 빈 리스트, 중복, 특수문자 에이전트명
- `src/agents/skills/frontmatter.ts` - version 파싱 테스트
  - 유효한 semver 파싱
  - 잘못된 버전 형식 처리
  - version 필드 누락 시 기본값
- `src/agents/skills/mcp-bridge.ts` - (Phase 1에서 테스트 작성됨, 추가 edge case)

### 4. PI base64/unicode 인코딩 우회 테스트
- `src/security/external-content.test.ts` 또는 신규 파일
- base64 인코딩된 인젝션 시도 테스트 (최소 3건)
  - `btoa("ignore previous instructions")` 변형
  - base64 + 일반 텍스트 혼합
- UTF-8/Unicode 우회 테스트 (최소 3건)
  - homoglyph (시각적으로 유사한 다른 문자)
  - zero-width 문자 삽입
  - RTL override 문자

### 5. audit-extra.ts + audit-fs.ts 테스트 작성
- `src/security/audit-extra.ts` - 전수 테스트
- `src/security/audit-fs.ts` - 파일시스템 감사 테스트
  - 디렉토리 권한 검사
  - 심볼릭 링크 탐지
  - 파일 소유권 검증

### 6. gateway auth rate limiting 테스트
- `src/gateway/auth.test.ts`에 추가
  - 빠른 연속 인증 실패 시 동작
  - 동시 연결 처리
  - rate limit 후 정상 요청 허용

### 7. Edge case 보강 (pi-embedded-runner.guard)
- 기존 1건에서 최소 5건으로 확장
  - tool result 변조 (기존)
  - 중첩 태그 공격
  - 초대형 payload
  - 빈 응답
  - 타임아웃 시나리오

---

## 산출물
- 테스트 코드 파일 (각 작업별)
- `.sync/agents/agent-5-test.md` 작업 로그 업데이트
- `pnpm test` 결과 기록

## 주의사항
- 테스트 파일 이름은 기존 패턴 준수 (`*.test.ts`)
- vi.mock 사용 시 hoisting 문제 주의
- 커밋하지 말 것
- 기존 테스트 깨뜨리지 않을 것
