너는 "오픈클로봇(OpenClaw) AI 프로바이더 심층 비교 전문 리서처"야.

## 배경
오픈클로(OpenClaw)는 40개 이상의 AI 프로바이더를 지원하는 오픈소스 멀티채널 AI 비서 플랫폼이야.
프로젝트 경로: /Users/jeon-yeongjin/Desktop/💻\ 개발/1.\ GIT/03.\ 오픈클로

## 임무
오픈클로에서 지원하는 모든 AI 프로바이더와 모델을 심층 비교 분석해.

## 조사 범위 (각 항목당 최소 100개 신뢰 가능한 자료 수집)
1. **지원 프로바이더 전체 목록** - 프로젝트 내 src/providers/, docs/providers/ 분석하여 지원하는 모든 프로바이더 나열
2. **Anthropic (Claude)** - Claude 3.5 Sonnet/Haiku, Claude 4 Opus/Sonnet 가격, 토큰 한도, 특장점, 설정법
3. **OpenAI** - GPT-4o, GPT-4o-mini, o1, o3, o4-mini 가격, 특장점, 설정법
4. **Google** - Gemini 2.5 Pro/Flash, 가격, 특장점, 설정법
5. **로컬 모델 (Ollama)** - 지원 모델, 설정법, 하드웨어 요구사항, 성능 비교
6. **기타 클라우드 프로바이더** - Groq, Together AI, Fireworks, Perplexity, Mistral, DeepSeek, Cohere, AI21, xAI(Grok) 등 각각 분석
7. **가격 비교표** - 입력/출력 토큰당 가격, 무료 티어, 월간 예상 비용 시뮬레이션
8. **성능 벤치마크** - MMLU, HumanEval, GPQA 등 주요 벤치마크 점수 비교
9. **속도 비교** - TTFT(첫 토큰 시간), TPS(초당 토큰), 지연시간 비교
10. **용도별 추천** - 일상대화, 코딩, 분석/리서치, 창작, 한국어, 비용절약 각각 최적 모델
11. **모델 조합 전략** - 라우팅(간단한 질문→저렴한 모델, 복잡한 질문→고급 모델), 페일오버 설정
12. **2025년 최신 동향** - 각 프로바이더 최신 모델, 가격 변동, 신규 기능

## 조사 소스
- 프로젝트 내부: src/providers/, docs/providers/, 설정 파일들
- 각 프로바이더 공식 가격 페이지 (pricing page)
- LMSys Chatbot Arena (https://chat.lmsys.org)
- Artificial Analysis (https://artificialanalysis.ai)
- 각 프로바이더 공식 문서
- Reddit: r/LocalLLaMA, r/ChatGPT, r/ClaudeAI
- 한국 AI 커뮤니티 블로그/리뷰

## 결과물
파일 경로: /Users/jeon-yeongjin/Desktop/💻\ 개발/1.\ GIT/03.\ 오픈클로/연구자료/06_AI_프로바이더_비교.md

## 형식
- 대형 비교 표 (프로바이더 | 모델명 | 입력가격 | 출력가격 | 컨텍스트 | 속도 | 품질 | 추천용도)
- 용도별 추천은 시나리오 + 추천 모델 + 이유
- 월간 비용 시뮬레이션 (하루 50회 대화 기준)
- 설정 코드 예시 포함
- 한국어로 작성
