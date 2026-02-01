# 팩트체크 검증 결과

## 검증된 항목 (출처 확인 완료)

| 항목 | 상태 | 근거 | 출처 |
|------|------|------|--------|
| "KT Cloud 에이전트 협업 시스템" | ✅ 존재함 | KT Cloud 기술 블로그 2025.08 | https://tech.ktcloud.com/entry/2025-03-ktcloud-ai-agent-에이전트의-협업-시스템 |
| | | kagent.dev - 오픈소스 클라우드 네이티브 에이전트 | https://kagent.dev/ |
| "MCP는 Anthropic 표준" | ✅ 맞음 | Anthropic 공식 발표 2024.11 | https://www.anthropic.com/news/model-context-protocol |
| | | Wikipedia 등록 | https://en.wikipedia.org/wiki/Model_Context_Protocol |
| "A2A는 Google 피어투피어" | ✅ 맞음 | Google 공식 발표 2025.04 | https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/ |
| | | Linux Foundation 오픈 소스 | https://github.com/google/A2A |

## 오픈크롤봇 기능 (확인 완료)

| 항목 | 상태 | 출처 |
|------|------|--------|
| `openclaw onboard` | ✅ 있음 | docs/cli/onboard.md |
| `~/.openclaw/skills` | ✅ 있음 | docs/tools/skills.md |
| SKILL.md 형식 | ✅ 있음 (AgentSkills 호환) | docs/tools/skills.md |
| config.yml `skills.entries.*` | ✅ 있음 | docs/tools/skills.md |

## 오픈크롤봇 설정 (존재하지 않음 - 문서에서 삭제 필요)

| 항목 | 상태 | 조치 |
|------|------|------|
| `cache.ttl` | ❌ 없음 | 문서에서 삭제 완료 |
| `cache.enableSemantic` | ❌ 없음 | 문서에서 삭제 완료 |
| `budget.monthly`, `budget.alert` | ❌ 없음 | 문서에서 삭제 완료 |
| `streaming.enabled`, `streaming.chunkSize` | ❌ 없음 | 문서에서 삭제 완료 |
| `http://localhost:18789/api/sessions/...` | ❌ 없음 (REST API 없음) | 문서에서 삭제 완료 |
| `mentionPatterns` | ❌ 없음 | 문서에서 삭제 완료 |

## 추정치 처리 완료

| 항목 | 조치 |
|------|------|
| "토큰 사용량 30-50% 감소" | "토큰 사용량 감소 (추정치)"으로 수정 |
| "출력이 입력보다 4배 비쌈" | 삭제 |
| "캐싱으로 응답 시간 80% 감소" | "캐싱으로 응답 속도 개선 (추정치)"로 수정 |
| "배칭으로 30-50% 절감" | "배칭으로 비용 절감 (추정치)"로 수정 |
