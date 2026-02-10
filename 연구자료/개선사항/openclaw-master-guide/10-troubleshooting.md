# 부록 10: 트러블슈팅 가이드

## 텔레그램 관련 이슈

### 1. 봇이 그룹 메시지에 반응하지 않음
**원인**: Privacy Mode 활성화 (기본값)
**해결**:
- `@BotFather → /setprivacy → Disable` 후 봇을 그룹에서 제거 → 재추가
- 또는 봇을 그룹 관리자로 설정 (관리자는 모든 메시지 수신)

### 2. 봇이 멘션에만 반응하지 않음
**원인**: `requireMention` 설정 문제
**해결**:
```json
{
  "channels": {
    "telegram": {
      "groups": {
        "<chatId>": { "requireMention": true }
      }
    }
  }
}
```

### 3. 페어링 코드가 오지 않음
**원인**: `dmPolicy`가 `"open"`이거나 이미 페어링됨
**해결**: `openclaw pairing list telegram`으로 확인

### 4. `setMyCommands failed` 에러
**원인**: api.telegram.org에 대한 HTTPS/DNS 차단
**해결**: 네트워크 설정 확인, IPv6 라우팅 점검

### 5. 메시지가 잘려서 전송됨
**원인**: `textChunkLimit` 초과 (기본 4000자)
**해결**: `channels.telegram.textChunkLimit` 값 조정 또는 `chunkMode: "newline"` 설정

### 6. 미디어 파일 전송 실패
**원인**: `mediaMaxMb` 초과 (기본 5MB)
**해결**: `channels.telegram.mediaMaxMb` 값 증가 또는 파일 압축

---

## 멀티에이전트 관련 이슈

### 7. 에이전트 간 sessions_send 실패
**원인**: 대상 에이전트가 비활성 또는 잘못된 agentId
**해결**:
- `agents_list`로 사용 가능한 에이전트 확인
- 에이전트 라우팅 설정 확인
- 게이트웨이 재시작 시도

### 8. 그룹에서 특정 에이전트만 반응
**원인**: 멘션 패턴이 다른 에이전트를 포함하지 않음
**해결**: `agents.list[].groupChat.mentionPatterns` 설정 확인

### 9. 에이전트 간 컨텍스트 공유 안 됨
**원인**: 각 에이전트가 독립 세션에서 실행
**해결**:
- 공유 워크스페이스 파일 활용 (MEMORY.md)
- sessions_send로 명시적 컨텍스트 전달
- 공유 스킬 폴더 설정 (`~/.openclaw/skills`)

### 10. 토론 라운드가 끝나지 않음
**원인**: 합의 조건 미설정
**해결**: SOUL.md에 "최대 3라운드" 규칙 명시, 오케스트레이터가 합의 선언

---

## 비용 관련 이슈

### 11. 예상보다 비용이 높음
**원인**: 모든 작업에 고급 모델 사용, 히스토리 무제한
**해결**:
1. 모델 라우팅 설정 (간단한 작업 → Haiku/Mini)
2. `historyLimit: 50` 설정
3. 불필요한 스킬 비활성화
4. SOUL.md에 출력 간결화 지시

### 12. 토큰 사용량 급증
**원인**: 스킬 수가 많아 시스템 프롬프트 비대
**해결**:
- 활성 스킬 20개 이하로 유지
- `allowBundled`로 번들 스킬 제한
- 스킬 토큰 공식: `195 + Σ(97 + name + description + location)` 문자

### 13. API 호출 한도 초과
**원인**: 동시 처리 수 무제한, 빈번한 웹 검색
**해결**: `maxConcurrent` 설정, 웹 검색 캐시 활용

---

## 설정/설치 관련 이슈

### 14. `openclaw health` — "no auth configured"
**원인**: OAuth/API 키 미설정
**해결**: `openclaw onboard` 재실행 또는 수동으로 인증 설정

### 15. WhatsApp/Telegram에서 Bun 런타임 오류
**원인**: Bun이 이 채널들과 호환되지 않음
**해결**: Node.js로 전환 (Node >=22 권장)

### 16. 스킬이 로드되지 않음
**원인**: SKILL.md 프론트매터 오류, 바이너리/환경변수 미충족
**해결**:
- `openclaw status --all`로 스킬 상태 확인
- `requires.bins` 바이너리 설치 확인
- `requires.env` 환경변수 설정 확인
- YAML 프론트매터 유효성 검증

### 17. 게이트웨이 시작 실패
**원인**: 포트 충돌, Node 버전 낮음, 설정 파일 오류
**해결**:
- `lsof -i :18789`로 포트 확인
- `node -v`로 Node 버전 확인 (>=22)
- `openclaw doctor`로 설정 진단

### 18. 샌드박스에서 도구 실행 실패
**원인**: Docker 컨테이너에 바이너리 미설치
**해결**: `agents.defaults.sandbox.docker.setupCommand`로 설치 명령어 추가

### 19. MEMORY.md가 업데이트되지 않음
**원인**: 에이전트가 파일 쓰기 권한이 없거나 경로 오류
**해결**: 워크스페이스 경로 확인, 파일 권한 확인

### 20. 드래프트 스트리밍이 안 됨
**원인**: Threaded Mode 미활성화 또는 그룹 채팅
**해결**: @BotFather에서 Threaded Mode 활성화 (DM 전용)
