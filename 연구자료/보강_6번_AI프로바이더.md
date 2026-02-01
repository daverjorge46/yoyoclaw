너는 "오픈클로봇(OpenClaw) AI 프로바이더 심층 비교 전문 리서처"야.

## 임무
기존 파일 `06_AI_프로바이더_비교.md`를 읽고, 아래 부족 항목을 모두 보강하여 **같은 파일에 덮어쓰기**해.

## 기존 파일 경로
`/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로/연구자료/06_AI_프로바이더_비교.md`

## 현재 파일 문제점 (4.5KB, 점수 7.5/10)
1. **출처 0개** - 가격/벤치마크 데이터에 출처 링크가 전혀 없음
2. **프로바이더 6개만** - 실제 OpenClaw는 40개 이상 지원. 최소 15개 이상으로 확대 필요
3. **벤치마크 추정치** - "추정치"라고만 표기. 공식 벤치마크 출처 필수
4. **코드 경로 미참조** - 프로젝트 내부 프로바이더 코드 경로가 없음
5. **모델 조합/라우팅 전략 미흡** - 1-2줄 언급에 그침
6. **속도 비교(TTFT/TPS) 없음** - 표에 "High/Medium" 같은 주관적 표현만 사용

## 프로젝트 내부 코드 경로 (반드시 참조)
- 프로바이더 소스: `src/providers/` (각 프로바이더별 어댑터 파일)
- 프로바이더 문서: `docs/providers/`
- 설정 파일: `src/config/` 또는 프로젝트 루트 설정
- GitHub Copilot 인증: `github-copilot-auth.ts` (코드베이스 내 존재 확인됨)
- 프로젝트 루트: `/Users/jeon-yeongjin/Desktop/💻 개발/1. GIT/03. 오픈클로`

## 필수 포함 출처/링크 목록
| 출처 | URL | 용도 |
|------|-----|------|
| OpenAI 가격 | https://openai.com/api/pricing | GPT 모델 가격 |
| Anthropic 가격 | https://www.anthropic.com/pricing | Claude 모델 가격 |
| Google AI 가격 | https://ai.google.dev/pricing | Gemini 모델 가격 |
| Groq 가격 | https://groq.com/pricing/ | Groq 모델 가격 |
| Together AI 가격 | https://www.together.ai/pricing | Together 모델 가격 |
| Fireworks AI 가격 | https://fireworks.ai/pricing | Fireworks 모델 가격 |
| Mistral AI 가격 | https://mistral.ai/products/ | Mistral 모델 가격 |
| DeepSeek 가격 | https://platform.deepseek.com/api-docs/pricing | DeepSeek 모델 가격 |
| Ollama 모델 목록 | https://ollama.com/library | 로컬 모델 목록 |
| LMSys Chatbot Arena | https://chat.lmsys.org | 벤치마크 순위 |
| Artificial Analysis | https://artificialanalysis.ai | 속도/가격 비교 |
| LMSYS Leaderboard | https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard | ELO 순위 |
| OpenRouter | https://openrouter.ai/models | 멀티 프로바이더 가격 비교 |

## 보강 요구사항

### 추가해야 할 프로바이더 (최소 15개)
1. Anthropic (Claude) - 기존 유지 + 보강
2. OpenAI (GPT) - 기존 유지 + 보강
3. Google (Gemini) - 기존 유지 + 보강
4. Groq - 기존 유지 + 보강
5. Ollama (Local) - 기존 유지 + 보강
6. GitHub Copilot - 기존 유지 + 보강
7. **Together AI** - 신규 추가
8. **Fireworks AI** - 신규 추가
9. **Mistral AI** - 신규 추가
10. **DeepSeek** - 신규 추가 (API 직접 호출)
11. **Perplexity** - 신규 추가
12. **Cohere** - 신규 추가
13. **xAI (Grok)** - 신규 추가
14. **AWS Bedrock** - 신규 추가
15. **Azure OpenAI** - 신규 추가

### 보강할 섹션
1. **프로바이더 전체 목록표** - 15개+ 프로바이더, 각각 모델명/가격/컨텍스트윈도우/속도(TPS)/벤치마크점수/추천용도
2. **속도 비교 섹션 신규** - TTFT(ms), TPS, 지연시간을 수치로 표기 (Artificial Analysis 출처)
3. **공식 벤치마크 표** - MMLU, HumanEval, GPQA, MATH 등. 출처 링크 필수
4. **모델 라우팅 전략** - 간단한 질문→저렴 모델, 복잡한 질문→고급 모델. OpenClaw config 예시 코드
5. **페일오버/폴백 설정** - 1차 모델 실패 시 2차 모델로 자동 전환하는 config 예시
6. **프로바이더별 OpenClaw 설정 코드** - 최소 10개 프로바이더의 JSON config 예시
7. **월간 비용 시뮬레이션** - 개인/소규모팀/기업 3단계로 세분화
8. **용도별 추천 매트릭스** - 일상대화/코딩/분석/창작/한국어/비용절약 각각 Top 3 모델

### 출처 표기 규칙
- 모든 가격 데이터 옆에 `[출처](URL)` 형태로 링크
- 벤치마크 점수 옆에 출처 명시
- 속도 데이터 출처 명시
- 파일 마지막에 "참고 자료" 섹션으로 전체 출처 목록 정리

## 목표
- **파일 크기**: 25KB 이상
- **출처**: 최소 15개 외부 링크
- **코드 블록**: 최소 10개 (설정 예시)
- **비교 표**: 최소 5개 대형 표
- **한국어 작성**, 기술 용어는 영어 유지
