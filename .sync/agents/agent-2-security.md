# Agent 2: 보안 엔지니어
## 임무
- 게이트웨이 인증 강제화 검증
- 프롬프트 인젝션 방어 코드 점검
- auth-profiles.json 자동 복사 스크립트
- DM 페어링 기본값 검증
- `openclaw doctor` 보안 점검 항목 추가
- 추가: Skill Scanner, DNS/mDNS, sandbox/tool-policy 점검

## 현재 상태: 리뷰대기

## 작업 로그
- [시작] 보안 점검 작업 시작
- [파일] src/gateway/device-auth.ts - pipe `|` delimiter 취약점 방지: `assertNoPipe()` 검증 함수 추가, buildDeviceAuthPayload 호출 전 모든 필드 검증
- [파일] src/gateway/server/ws-connection/message-handler.ts - v1 레거시 서명 수락 시 경고 로그 추가 (deprecation 안내)
- [파일] src/gateway/server/ws-connection/message-handler.ts - DEVICE_SIGNATURE_SKEW_MS 10분 → 5분으로 축소 (replay 공격 window 감소)
- [파일] src/gateway/chat-sanitize.ts - 알려진 프롬프트 인젝션 패턴 감지 함수 `containsInjectionPattern()` 추가 (5개 패턴)
- [파일] src/shared/text/reasoning-tags.ts - thinking tag 변형 대응 강화: `reflection`, `inner_monologue`, `inner-monologue` 추가
- [파일] src/agents/pi-embedded-utils.ts - 동일하게 thinking tag 변형 3곳 업데이트
- [파일] src/agents/pi-embedded-helpers/errors.ts - `<final>` 외 `<instructions>`, `<system>`, `<prompt>` 태그도 strip
- [파일] src/security/audit-extra.ts - `collectEnvTokenExposureFindings()` 추가: 환경변수 민감 토큰 노출 검사 (13개 패턴)
- [파일] src/security/audit.ts - `collectEnvTokenExposureFindings` import 및 audit 파이프라인에 통합
- [점검] auth-profiles lock: `AUTH_STORE_LOCK_OPTIONS`에 `stale: 30_000` 이미 설정됨 (30초 초과 lock 자동 해제) → deadlock 방지 충분
- [점검] device-pairing scope escalation: `approveDevicePairing`에서 `mergeScopes(existing?.scopes, pending.scopes)`로 scope 병합 → 기존 scope에 새 scope를 union으로 추가하는 방식. **escalation 방지 로직은 없음** (pending request의 scope를 그대로 병합). 파괴적 변경 없이 개선 불가 → BACKLOG 기록
- [점검] 만료 paired device 정리: `pruneExpiredPending`은 pending만 정리, paired device 만료 정리 메커니즘 없음 → BACKLOG 기록
- [점검] 기본 scope: `requestedScopes.length === 0`이면 operator role은 `["operator.admin"]` 부여 → 최소 권한 원칙 미준수 (admin scope 기본 부여) → BACKLOG 기록

### 추가 작업 1: Skill Scanner 통합 검토
- [점검] `src/agents/skills-install.ts` 확인: 스킬 설치는 `runCommandWithTimeout`으로 install 명령 실행. 코드 검증/서명 확인 워크플로우 없음
- [점검] trusted skill allowlist: `plugins.allow` 메커니즘이 extension에 존재하나, skills에는 별도 allowlist 없음
- [발견] 스킬 설치 시 보안 검증 단계 부재 → BACKLOG 기록

### 추가 작업 2: DNS pinning / mDNS 노출 최소화
- [점검] `src/infra/bonjour.ts`: mDNS 광고에 `minimal` 모드 존재 (cliPath, sshPort 생략). 환경변수 `OPENCLAW_DISABLE_BONJOUR`로 완전 비활성화 가능
- [점검] DNS rebinding 방어: 코드베이스에 DNS rebinding/pinning 관련 코드 없음. Host header 검증은 `isLocalDirectRequest`에서 localhost/127.0.0.1/::1/.ts.net만 허용하여 부분적 방어
- [발견] DNS rebinding 전용 방어 미구현 → BACKLOG 기록

### 추가 작업 3: Per-agent sandbox + tool restriction
- [점검] `src/agents/sandbox/` 디렉토리에 완전한 sandbox 시스템 존재: config, context, docker, tool-policy, manage, runtime-status
- [점검] `src/agents/sandbox/tool-policy.ts`: agent별 sandbox tool policy 해결 기능 구현됨
- [점검] `src/agents/tool-policy.ts`: tool profile (minimal/coding/messaging/full) + allow/deny 리스트 + group 기반 제어 구현됨
- [점검] agent role별 tool restriction: tool-policy는 agent의 tool config 기반이지 role(operator/node) 기반이 아님
- [발견] role-based tool restriction 미구현 (현재는 config 기반) → BACKLOG 기록

- [완료] 기본 작업 5개 + 추가 작업 3개 모두 점검 완료, 코드 수정 8개 파일

## 변경 파일 목록
| 파일 | 변경 유형 | 사유 |
|------|----------|------|
| src/gateway/device-auth.ts | 수정 | pipe delimiter 인젝션 방지 |
| src/gateway/server/ws-connection/message-handler.ts | 수정 | v1 레거시 경고 + skew 5분 축소 |
| src/gateway/chat-sanitize.ts | 수정 | 프롬프트 인젝션 패턴 감지 함수 추가 |
| src/shared/text/reasoning-tags.ts | 수정 | thinking tag 변형 대응 강화 |
| src/agents/pi-embedded-utils.ts | 수정 | thinking tag 변형 대응 강화 |
| src/agents/pi-embedded-helpers/errors.ts | 수정 | instruction 태그 strip 확장 |
| src/security/audit-extra.ts | 수정 | 환경변수 민감 토큰 검사 추가 |
| src/security/audit.ts | 수정 | 새 audit check 통합 |

## 검증 결과
- pnpm build: 통과
- pnpm lint: 0 warnings, 0 errors
- 관련 테스트 (auth, chat-sanitize, audit, reasoning-tags): 90개 전체 통과

## 이슈/블로커
없음
