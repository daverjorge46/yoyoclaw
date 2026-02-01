# Agent 4: 기능 개발자
## 임무
- sessions_spawn allowlist 자동 설정 개선
- 멀티에이전트 라운드 관리 (자동 종료)
- MCP 브릿지 프로토타입 (MCP 서버 → 스킬 변환)
- 스킬 버전 관리 시스템 (SKILL.md version 필드)
- 팀 빌더 스킬 개선
- 스킬 빌더 스킬 개량 (OpenClaw 맞춤)
- A2A Protocol 지원 현황 확인
- `openclaw skill create` CLI 스캐폴딩 확인
- `openclaw config validate` 설정 검증 도구 확인
- Multi-account per channel + Forum topic session 격리

## 현재 상태: Phase 2 Round 2 완료

## 작업 로그
- [시작] 작업 시작 - 코드베이스 분석
- [파일] src/config/types.agents.ts - `autoDiscoverAgents` 필드 추가 (AgentConfig.subagents)
- [파일] src/config/types.agent-defaults.ts - `autoDiscoverAgents`, `maxRounds` 필드 추가 (AgentDefaultsConfig.subagents)
- [파일] src/agents/tools/sessions-spawn-tool.ts - auto-discover 로직 구현 (agents.list[]에서 자동 allowlist 구성)
- [파일] src/agents/subagent-registry.ts - `currentRound`, `maxRounds` 필드 추가 (SubagentRunRecord)
- [파일] src/agents/skills/types.ts - `version` 필드 추가 (OpenClawSkillMetadata)
- [파일] src/agents/skills/frontmatter.ts - version 파싱 로직 추가 (resolveOpenClawMetadata)
- [파일] src/agents/skills/mcp-bridge.ts - MCP 브릿지 프로토타입 신규 생성
- [파일] skills/team-builder/SKILL.md - 팀 빌더 스킬 신규 생성 (5단계 워크플로우, 4개 템플릿)
- [파일] skills/skill-builder/SKILL.md - 스킬 빌더 스킬 OpenClaw 맞춤 개량 (8가지 방법론 반영)
- [파일] skills/skill-builder/references/ - TDD, CSO, 소크라틱, MCP, 압박 테스팅 참조 파일 복사
- [파일] src/agents/skills/mcp-bridge.test.ts - MCP 브릿지 테스트 신규
- [파일] src/agents/tools/sessions-spawn-tool.auto-discover.test.ts - autoDiscover 테스트 신규
- [완료] 작업 10개 중 10개 완료

## 변경 파일 목록
| 파일 | 변경 유형 | 사유 |
|------|----------|------|
| src/config/types.agents.ts | 수정 | autoDiscoverAgents 필드 추가 |
| src/config/types.agent-defaults.ts | 수정 | autoDiscoverAgents, maxRounds 필드 추가 |
| src/agents/tools/sessions-spawn-tool.ts | 수정 | auto-discover allowlist 로직 |
| src/agents/subagent-registry.ts | 수정 | currentRound, maxRounds 필드 추가 |
| src/agents/skills/types.ts | 수정 | version 필드 추가 |
| src/agents/skills/frontmatter.ts | 수정 | version 파싱 로직 추가 |
| src/agents/skills/mcp-bridge.ts | 신규 | MCP 브릿지 프로토타입 |
| src/agents/skills/mcp-bridge.test.ts | 신규 | MCP 브릿지 테스트 |
| src/agents/tools/sessions-spawn-tool.auto-discover.test.ts | 신규 | autoDiscover 테스트 |
| skills/team-builder/SKILL.md | 신규 | 팀 빌더 스킬 |
| skills/skill-builder/SKILL.md | 신규 | 스킬 빌더 스킬 (OpenClaw Edition) |
| skills/skill-builder/references/*.md | 신규 | 참조 자료 5건 |

## 팩트체크 리포트 (작업 2)

| 제안 | 판정 | 근거 |
|------|------|------|
| R1→R2→R3 라운드 | 가능 | sessions_send로 구현 가능, 수동 관리. maxRounds 필드 추가 완료 |
| Redis 공유 메모리 | 불가 | 코드베이스에 Redis 직접 의존성 없음. 파일 기반(MEMORY.md) 대안 |
| 점수화 시스템 | 불필요 | 코드에 없음, 주관적 점수 실효성 없음 |
| 토론 결과 요약 공개 | 가능 | channel routing + sessions_send A2A 조합으로 구현 |

## 조사 결과 (작업 7-10)

### A2A Protocol 지원 현황
- **구현됨**: OpenClaw 내부 A2A (sessions-send-tool.a2a.ts)
- ping-pong 멀티턴 지원, A2A policy (enabled + allow 패턴), announce flow
- **미구현**: Google A2A protocol 외부 상호운용, Agent Card 발행/수신
- 현재 아키텍처에서 외부 A2A 도입은 sessions-send 위에 어댑터 레이어로 가능

### `openclaw skill create` CLI
- **미구현**: skills list/info/check만 존재 (src/cli/skills-cli.ts)
- 스킬 생성 스캐폴딩 명령 없음
- 대안: `npx clawhub` 사용 또는 skill-builder 스킬로 대체

### `openclaw config validate`
- **독립 명령 없음**: config 검증은 `openclaw doctor` 내부에 통합
- Zod 기반 스키마 검증, auth 프로필 검증, 레거시 마이그레이션 감지 등
- 별도 `config validate` 서브커맨드는 미존재

### Multi-account per channel + Forum topic session 격리
- **Multi-account**: 지원됨. Telegram accounts 설정, routing bindings에서 accountId 기반 라우팅
- **Forum topic**: 지원됨. 세션 키에 `:topic:threadId` 포함, 토픽별 skills/allowFrom/systemPrompt 설정 가능
- **Multi-bot per channel**: 단일 채널에 복수 봇은 미지원 (각 account가 별도 채널 연결)

## Phase 2 Round 2 작업 로그
- [파일] skills/team-builder/SKILL.md - v1.1 업데이트: R1/R2/R3 메시지 포맷 템플릿, sessions_send 호출 예시, 역할별 시스템 프롬프트 요약, 하트비트 설정 가이드, 팀 매력도 5차원 측정 지표, 팀 구성 JSON 템플릿, 간단 응답 가이드 추가
- [파일] .sync/BACKLOG.md - `agentInteraction` config 미구현 건 추가 (simpleResponse, shareDiscussion, timeout)
- [조사] src/plugin-sdk/index.ts - 374줄, 60+ 타입/30+ 함수 export 확인. `agentInteraction` 타입 미존재 (코드 미구현이므로 정상). SDK export 완전성 문제 없음.
- [조사] `agentInteraction.simpleResponse: "direct"` - v1.1 문서 제안 기능이며 코드 미구현. 현재 가능한 방식(그룹 직접 응답 vs sessions_send 위임)으로 가이드 작성 완료.

## 이슈/블로커
- 없음
