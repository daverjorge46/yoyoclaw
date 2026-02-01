# Agent 2: 보안 엔지니어 - Phase 2 (2차 작업)

## 작업 요약
셀프호스팅 보안 가이드 문서 작성 (09번 가이드 보강)

## 프로젝트 경로
```
/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로/
```

## 참조 문서
- `연구자료/개선사항/OpenClaw_Master_Guide/09_보안_셀프호스팅_가이드.md`

---

## 작업 목록

### 1. Nginx 리버스 프록시 보안 config 가이드
- SSL/TLS 설정 (Let's Encrypt 자동 갱신)
- Rate limiting (limit_req_zone, limit_conn_zone)
- DDoS 방어 기본 설정
- 보안 헤더 (X-Frame-Options, CSP, HSTS, X-Content-Type-Options)
- 가이드 문서에 예시 Nginx config 블록 포함

### 2. SSH hardening 가이드
- sshd_config 권장 설정 (PasswordAuthentication no, PermitRootLogin no)
- Fail2Ban 설정 (ssh jail)
- 2FA 설정 (Google Authenticator PAM)
- SSH 키 관리 best practices

### 3. Docker 보안 가이드
- non-root 유저 실행 (USER directive)
- cap_drop: ALL + cap_add: 필요한 것만
- no-new-privileges: true
- read-only filesystem (read_only: true + tmpfs)
- Docker Bench Security 도구 안내

### 4. 보안 감사 자동화 가이드
- npm audit (CI 통합)
- Trivy 컨테이너 스캔
- CrowdSec (커뮤니티 기반 방화벽)
- Watchtower (자동 이미지 업데이트)
- cron 기반 정기 스캔 예시

### 5. GDPR 체크리스트 (12항목)
- 데이터 최소화, 목적 제한, 동의 관리
- Right to erasure (shred 포함)
- DPA (Data Processing Agreement) 템플릿 포인터
- 가이드 문서에 체크리스트 표 형식으로 작성

### 6. 한국 개인정보보호법(PIPA) 체크리스트 (10항목)
- 개인정보 수집/이용 동의 (제15조)
- 제3자 제공 동의 (제17조)
- 파기 의무 (제21조)
- 안전조치 의무 (제29조)
- 조문 참조 포함

### 7. 플랫폼별 hardening 요약
- Mac mini: FileVault, Firewall, Gatekeeper
- Raspberry Pi 5: UFW, unattended-upgrades
- Synology NAS: 2FA, 자동 차단, 방화벽 규칙
- VPS: SSH hardening + UFW + Fail2Ban

### 8. 백업 암호화 가이드
- GPG 암호화 (gpg --symmetric)
- Rclone 원격 백업 (encrypted remote)
- 3-2-1 전략 설명 (3카피, 2매체, 1오프사이트)

### 9. 인시던트 대응 시나리오 (4건)
- API 키 유출 시 대응 절차
- PI(프롬프트 인젝션) 공격 감지/대응
- 게이트웨이 노출 시 긴급 대응
- 세션 하이재킹 감지/대응

---

## 산출물 형식
- `연구자료/개선사항/openclaw-master-guide/09-security-selfhosting-guide.md` 가이드 문서 (영문)
- `.sync/agents/agent-2-security.md` 작업 로그 업데이트

## 주의사항
- 실제 비밀키/토큰/IP 주소 사용 금지 - 플레이스홀더 사용
- 코드 수정 없음 (가이드 문서 작성만)
- 커밋하지 말 것
