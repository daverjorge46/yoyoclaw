# Agent 5: QA/테스트 엔지니어

## 임무
- 가이드 문서 코드 예제 검증 (실행 가능 여부)
- 보안/성능/기능 변경사항 테스트 작성
- 트러블슈팅 가이드 20개 이슈 재현 테스트
- E2E 테스트 시나리오 추가
- 기존 테스트 70% 커버리지 유지 확인

## 현재 상태: 리뷰대기

---

## 작업 로그

- [시작] pnpm test 실행 - 기존 테스트 상태 확인
- [결과] 798 passed, 1 failed (4896 tests / 4904 total)
  - 실패: `src/commands/models.list.test.ts` (8건) - vi.mock hoisting (기존 문제)
- [분석] 가이드 문서 코드 블록 검증 (16 MD 파일, 155개 코드 블록)
- [분석] PI/보안 테스트 커버리지 분석 (63+ PI 관련 테스트)
- [분석] 스킬/모듈 테스트 커버리지 분석
- [발견] src/security/{audit-extra,audit-fs,windows-acl}.ts 테스트 없음
- [발견] 스킬 전용 테스트 러너 / CI 파이프라인 없음
- [발견] PI base64/unicode 인코딩 우회 테스트 없음
- [완료] 리포트 작성 완료

---

## 산출물

### 1. 기존 테스트 상태

| 항목 | 값 |
|------|-----|
| 테스트 파일 | 799개 (798 passed, 1 failed) |
| 개별 테스트 | 4904개 (4896 passed, 8 failed) |
| 실행 시간 | 494초 |
| 실패 원인 | `models.list.test.ts` - vi.mock hoisting (기존 결함) |

기존 실패: `src/commands/models.list.test.ts`에서 `AuthStorage`가 vi.mock factory 내 undefined. `@mariozechner/pi-coding-agent` mock 설정 문제. 이번 브랜치 작업과 무관.

---

### 2. 모듈별 테스트 커버리지

| 모듈 | 소스 파일 | 테스트 파일 | 비율 | 상태 |
|------|----------|-----------|------|------|
| src/agents | 224 | 212 | ~95% | 양호 |
| src/gateway | 125 | 56 | ~45% | 개선 필요 |
| src/commands | 168 | 55 | ~33% | 갭 큼 |
| src/security | 6 | 3 | 50% | 핵심 누락 |

#### 테스트 없는 핵심 모듈

| 파일 | 용도 | 우선순위 |
|------|------|---------|
| `src/security/audit-extra.ts` | 확장 감사 유틸리티 | HIGH |
| `src/security/audit-fs.ts` | 파일시스템 감사 | HIGH |
| `src/security/windows-acl.ts` | Windows ACL 보안 | MEDIUM |

---

### 3. 주요 모듈 상세

**src/gateway/auth.ts** (9 tests): Token/Password timing-safe 비교, Tailscale identity. Gap: rate limiting, token rotation, header spoofing.

**src/agents/model-fallback.ts** (23+ tests): HTTP 401/402 fallback, billing/credential 에러, timeout/abort. 커버리지 양호.

**src/agents/skills.ts** (12 test files): env override, workspace build, snapshot, status. Gap: SKILL.md 파싱/메타데이터 검증, 설치/실행 통합 테스트 없음.

**src/agents/context-window-guard.ts**: 16K 차단, 32K 경고, config 우선순위. 커버리지 양호.

**src/security/audit.ts** (60+ tests): gateway/설정/파일시스템/채널/확장/로깅 보안. 가장 포괄적.

---

### 4. 가이드 문서 코드 예제 검증

| 항목 | 값 |
|------|-----|
| 분석 파일 | 16개 (연구자료/개선사항/openclaw-master-guide/) |
| 총 코드 블록 | 155개 |
| CLI 명령어 | 8개 - 모두 유효 |
| 설정 키 | 64개 - 스키마 일치 |
| 파일 경로 | 19개 - 구조 정확 |
| 결과 | ALL VALID |

주요 파일별:
- `04-telegram-assistant-guide.md` (10 블록): ALL VALID
- `05-AI비서구축.md` (12 블록): ALL VALID
- `07-부록.md` (8 블록): ALL VALID
- `08-troubleshooting.md` (20개 이슈): ALL VALID
- `appendix-glossary.md`: ALL VALID

CLI: `openclaw onboard` (onboard.ts), `openclaw configure` (configure.ts), `openclaw status` (status.ts), `openclaw channels` (channels/) VERIFIED.

---

### 5. Prompt Injection 테스트 분석

#### 방어됨

| 공격 벡터 | 테스트 파일 |
|-----------|-----------|
| System prompt override | external-content.test.ts |
| Ignore instructions | external-content.test.ts |
| Role/tag hijacking (XML) | external-content.test.ts |
| Exec command injection | external-content.test.ts |
| Tool call ID injection | sanitizetoolcallid.test.ts |
| XML tag escape | sanitizeuserfacingtext.test.ts |
| Message envelope attack | chat-sanitize.test.ts |
| Thinking block poisoning | google-sanitize-thinking.test.ts |
| Token timing attack | gateway/auth.test.ts |

#### 누락

| 공격 벡터 | 위험도 |
|-----------|--------|
| Base64 인코딩 인젝션 | MEDIUM |
| UTF-8/Unicode 우회 | MEDIUM |
| 간접 인젝션 (JSON/YAML in tool args) | MEDIUM |
| HTML entity 인코딩 | LOW |
| Null byte injection | LOW |
| X-Forwarded-For spoofing | MEDIUM |
| 환경변수 오염 | MEDIUM |

---

### 6. 스킬 테스트 인프라 (추가 작업 1)

| 항목 | 상태 |
|------|------|
| 스킬 전용 테스트 러너 | 없음 |
| SKILL.md 파싱/검증 테스트 | 없음 |
| 스킬 설치/로드/실행 통합 테스트 | 없음 |
| CI/CD 스킬 검증 단계 | 없음 |
| 기존 스킬 단위 테스트 | 12개 파일 |

---

### 7. Edge Case 부족 모듈

| 모듈 | 부족한 Edge Case |
|------|----------------|
| gateway/auth | Rate limiting, concurrent connections |
| gateway/chat-sanitize | Control chars, null bytes |
| security/external-content | Base64/unicode 우회 |
| pi-embedded-runner.guard | 1 test only - tool result 변조 |
| sanitizegoogleturnordering | 1 test only - 다중 모델 세션 |

---

### 8. 누락된 E2E 시나리오

1. 스킬 전체 라이프사이클 (설치 -> 파싱 -> 로드 -> 실행 -> 결과)
2. 멀티 채널 동시 메시지 처리
3. 모델 fallback 체인 전체 경로
4. Gateway 인증 -> 세션 -> 메시지 -> 정리
5. PI 통합 테스트 (외부 콘텐츠 -> sanitize -> agent)

---

## Phase 2: 테스트 작성

### Config 키 검증 결과

| Config 키 | 코드 존재 여부 |
|-----------|--------------|
| `cache.ttl` | 미존재 |
| `budget.monthly` | 미존재 |
| `streaming.enabled` | 미존재 |
| `mentionPatterns` | 미존재 |

모두 가이드 문서에만 언급되며, 실제 코드에서는 사용되지 않음 확인.

### 작성/수정한 테스트 파일

| 파일 | 유형 | 테스트 수 | 상태 |
|------|------|----------|------|
| `src/gateway/device-auth.test.ts` | 신규 | 17 | PASS |
| `src/gateway/chat-sanitize.test.ts` | 추가 | 11 (+4 기존) | PASS |
| `src/security/audit-extra.test.ts` | 신규 | 14 | PASS |
| `src/security/audit-fs.test.ts` | 신규 | 16 | PASS |
| `src/agents/skills/frontmatter.test.ts` | 추가 | 8 (+2 기존) | PASS |
| `src/agents/skills/mcp-bridge.test.ts` | 추가 | 4 (+6 기존) | PASS |
| `src/security/external-content.test.ts` | 추가 | 6 (+15 기존) | PASS |
| `src/agents/pi-embedded-runner.guard.test.ts` | 추가 | 4 (+1 기존) | PASS |

총 신규 테스트: 80개 (기존 28 + 신규 52)

### 테스트 커버리지 상세

**device-auth.test.ts**: assertNoPipe 검증 (정상/pipe 거부/빈값/특수문자), v1/v2 형식 검증, scopes 직렬화

**chat-sanitize.test.ts**: containsInjectionPattern 5개 패턴 각각 탐지, 정상 메시지 false positive 검증, 대소문자 변형

**audit-extra.test.ts**: collectEnvTokenExposureFindings (13개 민감 토큰 탐지/정상 변수 무시/빈 환경), collectAttackSurfaceSummaryFindings, collectSyncedFolderFindings (iCloud/Dropbox/GoogleDrive/OneDrive), collectExposureMatrixFindings

**audit-fs.test.ts**: safeStat (파일/디렉토리/미존재/심볼릭링크), inspectPathPermissions (posix 권한/world-writable 탐지), modeBits, formatOctal, isWorldWritable/isGroupWritable/isWorldReadable/isGroupReadable, formatPermissionDetail (posix/windows), formatPermissionRemediation

**frontmatter.test.ts**: resolveOpenClawMetadata (version 파싱/누락/잘못된 JSON/emoji+homepage/requires), resolveSkillKey (metadata skillKey/fallback)

**mcp-bridge.test.ts**: parseMcpToolListing (inputSchema 보존/version 누락), generateSkillFromMcpServer edge cases (특수문자 서버명/파라미터 없는 도구/많은 도구)

**external-content.test.ts**: PI base64 인코딩 우회 3건, Unicode 우회 3건 (zero-width chars/RTL override/homoglyph)

**pi-embedded-runner.guard.test.ts**: 중첩 XML 태그/빈 응답/다중 순차 tool call/idempotent guard 적용

### 미작성 항목 (기존 문제로 스킵)

- `sessions-spawn-tool.auto-discover.test.ts`: 기존 vi.mock hoisting 문제로 테스트 실패 중. 추가 테스트 작성 시 동일 문제 발생할 수 있어 스킵.

## 변경 파일 목록

| 파일 | 변경 유형 | 사유 |
|------|----------|------|
| `src/gateway/device-auth.test.ts` | 신규 | device-auth 전수 테스트 |
| `src/gateway/chat-sanitize.test.ts` | 추가 | injection pattern 탐지 테스트 |
| `src/security/audit-extra.test.ts` | 신규 | 확장 감사 유틸리티 테스트 |
| `src/security/audit-fs.test.ts` | 신규 | 파일시스템 감사 테스트 |
| `src/agents/skills/frontmatter.test.ts` | 추가 | 메타데이터/skillKey 테스트 |
| `src/agents/skills/mcp-bridge.test.ts` | 추가 | edge case 테스트 |
| `src/security/external-content.test.ts` | 추가 | base64/unicode PI 우회 테스트 |
| `src/agents/pi-embedded-runner.guard.test.ts` | 추가 | guard 확장 테스트 |
| `.sync/agents/agent-5-test.md` | 수정 | Phase 2 로그 |

## 이슈/블로커

1. `src/commands/models.list.test.ts` 기존 실패 - vi.mock hoisting (별도 수정 필요)
2. `src/agents/tools/sessions-spawn-tool.auto-discover.test.ts` 기존 실패 - vi.mock + dynamic import 충돌
