# BACKLOG - 범위 밖 발견 사항

| 발견자 | 항목 | 우선순위 | 출처 |
|--------|------|---------|------|
| Agent 2 | scope escalation 방지 로직 미구현 - approveDevicePairing에서 pending scope를 검증 없이 기존에 union 병합 | 중 | src/infra/device-pairing.ts |
| Agent 2 | paired device 만료 정리 메커니즘 없음 - pending만 pruneExpiredPending으로 정리 | 중 | src/infra/device-pairing.ts |
| Agent 2 | operator role 기본 scope가 admin - requestedScopes 비어있으면 ["operator.admin"] 자동 부여 | 중 | src/gateway/server/ws-connection/message-handler.ts |
| Agent 2 | 스킬 설치 시 코드 검증/서명 확인 워크플로우 없음 - trusted skill allowlist도 부재 | 상 | src/agents/skills-install.ts |
| Agent 2 | DNS rebinding 전용 방어 미구현 - Host header 부분 검증만 존재 | 중 | src/gateway/auth.ts |
| Agent 2 | role-based tool restriction 미구현 - tool-policy는 config 기반이지 role 기반이 아님 | 중 | src/agents/tool-policy.ts |
| Agent 2 | gateway auth rate limiting 미구현 - 인증 실패 시 카운터/지연 로직 없음 | 상 | src/gateway/auth.ts |
| Agent 4 | Google A2A Protocol 외부 상호운용 어댑터 구현 | 중 | section3_multi_agent_architecture.md |
| Agent 4 | `openclaw skill create` CLI 스캐폴딩 명령 구현 | 중 | 05-skill-builder.md |
| Agent 4 | `openclaw config validate` 독립 서브커맨드 분리 | 하 | 01-완전정복.md |
| Agent 4 | MCP 브릿지 CLI 통합 (`openclaw mcp bridge`) | 하 | MCP 브릿지 프로토타입 |
| Agent 4 | maxRounds 도달 시 자동 종료 + 결과 요약 로직 (run.ts 통합) | 중 | 멀티에이전트 라운드 관리 |
| Agent 4 | Agent Card 발행/수신 메커니즘 (외부 프레임워크 연동) | 하 | section3_multi_agent_architecture.md |
| Agent 4 | Multi-bot per channel 지원 (단일 채널에 복수 봇) | 하 | 12-latest-updates-trends.md |
| Agent 5 | src/security/audit-extra.ts 테스트 없음 | 상 | 테스트 커버리지 분석 |
| Agent 5 | src/security/audit-fs.ts 테스트 없음 | 상 | 테스트 커버리지 분석 |
| Agent 5 | src/security/windows-acl.ts 테스트 없음 | 중 | 테스트 커버리지 분석 |
| Agent 5 | PI base64/unicode 인코딩 우회 테스트 누락 | 중 | PI 테스트 분석 |
| Agent 5 | 스킬 전용 테스트 러너 및 CI 검증 파이프라인 없음 | 중 | 스킬 테스트 분석 |
| Agent 5 | SKILL.md 파싱/메타데이터 검증 테스트 없음 | 중 | 스킬 테스트 분석 |
| Agent 5 | gateway auth rate limiting 테스트 없음 | 중 | 보안 테스트 분석 |
| Agent 5 | pi-embedded-runner.guard 테스트 1건만 존재 | 중 | Edge case 분석 |
| Agent 4 | `agentInteraction` config 타입 미구현 (simpleResponse, shareDiscussion, timeout) - v1.1 문서에서 제안되었으나 코드에 없음 | 하 | 06_team_builder_skill_v1_1_update.md |
