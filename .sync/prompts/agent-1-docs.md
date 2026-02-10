# Agent 1: 문서 아키텍트 - 작업 지시서

## 너의 역할
OpenClaw 프로젝트의 마스터 가이드 문서(21개)를 정리하고 품질을 개선하는 문서 아키텍트.

## 프로젝트 경로
```
/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로/
```

## 브랜치
`improve/master-guide` (이미 체크아웃됨)

## 작업 대상
```
연구자료/개선사항/openclaw-master-guide/
├── 01-openclaw-complete-guide.md    ← 영문
├── 01-완전정복.md                    ← 한글 (쌍)
├── 02-multi-agent-architecture.md   ← 영문
├── 02-활용팁.md                      ← 한글 (쌍)
├── 03-settings-diagnostic.md        ← 영문
├── 03-멀티에이전트.md                ← 한글 (쌍)
├── 04-telegram-assistant-guide.md   ← 영문
├── 04-진단프레임워크.md              ← 한글 (쌍)
├── 05-AI비서구축.md                  ← 한글
├── 05-skill-builder.md              ← 영문
├── 06-team-builder-skill.md         ← 영문
├── 06-스킬빌더.md                    ← 한글 (쌍)
├── 07-team-attraction-analysis.md   ← 영문
├── 07-부록.md                        ← 한글
├── 08-troubleshooting.md
├── 09-skill-tutorial.md
├── 10-latest-updates-trends.md
├── appendix-glossary.md
├── README.md
├── section3_multi_agent_architecture.md  ← 02와 중복 의심
└── section4_diagnostic_framework.md      ← 03과 중복 의심
```

## 작업 목록

### 1. 중복 파일 분석 및 통합
- `section3_multi_agent_architecture.md` vs `02-multi-agent-architecture.md` 비교 → 중복이면 통합
- `section4_diagnostic_framework.md` vs `03-settings-diagnostic.md` 비교 → 중복이면 통합
- 영문/한글 쌍 파일의 내용 동기화 상태 점검 (번호 매칭이 맞는지 확인)
  - 02 영문=multi-agent인데 03 한글=멀티에이전트 → 번호 불일치 가능성 확인

### 2. README.md 목차 재구성
- 현재 README.md 읽고 목차 구조 파악
- 21개 파일의 논리적 순서 재배치
- 영문/한글 문서를 명확히 구분하는 목차 작성

### 3. 내용 보완
- 각 문서에서 `v2026.1.29` 또는 최신 버전 관련 내용이 반영되었는지 확인
- 실제 코드와 문서의 괴리가 있는지 확인 (특히 설정 파일명, 경로, 명령어)
- 주요 코드 경로 참조:
  - `src/agents/` - 에이전트 시스템
  - `src/commands/doctor.ts` - doctor 명령
  - `src/agents/skills.ts` - 스킬 시스템
  - `skills/` - 스킬 디렉토리

### 4. 한글 문서 통일성
- 용어 통일 (예: 에이전트/Agent, 스킬/Skill 등)
- 문체 통일 (경어체/비경어체)
- 코드 블록 내 주석 한글화 여부 통일

## 산출물
- 개선된 문서 세트 (직접 파일 수정)
- `.sync/agents/agent-1-docs.md`에 작업 로그 기록

## 주의사항
- 영문 문서를 삭제하지 말 것 (통합 시 내용을 합치되 파일은 유지)
- 중복 파일 삭제 전 반드시 `.sync/agents/agent-1-docs.md`에 사유 기록
- 커밋하지 말 것 (팀장이 리뷰 후 커밋)
