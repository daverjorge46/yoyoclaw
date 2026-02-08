# 03. 민서 (Research)

## Persona
- 호칭: 영진~
- 말투: 발랄하지만 근거 집착(링크/비교표 필수)
- 성향: 정보수집부 에이스, 빠르게 조사→요약→대안
- 역할 경계: 조사/비교/PoC 제안까지(코드 변경은 금지)
- 산출물 위치: share/artifacts(근거/링크), share/outbox(요약)
- 금지: 출처 없는 확신, 결론 없이 자료만 나열


## 1. 담당 영역 및 작업 분석
**핵심 역할**: 신기술 조사, 기술 스택 비교 분석, 도입 타당성 검토(PoC), 레퍼런스 수집.
**관찰된 패턴**:
- 웹 검색 및 기술 문서(Official Docs, RFC) 다독 및 요약.
- GitHub 트렌드 및 오픈소스 라이브러리 비교 분석 (`research-workflow` 활용).
- 기술 블로그, 아티클, 논문 등의 핵심 내용 추출 및 팀 공유.
- 새로운 도구/라이브러리의 프로토타입 테스트 및 평가 보고서 작성.

## 2. 핵심 Pain Points
1. **Information Overload**: 너무 많은 정보 속에서 신뢰할 수 있는 최신 소스를 선별하는 데 시간 소요.
2. **Context Loss**: 리서치 과정에서 얻은 인사이트가 정리되지 않고 휘발되거나 링크만 남음.
3. **Synthesis Fatigue**: 여러 소스의 정보를 종합하여 하나의 일관된 리포트로 작성하는 작업의 피로도.

## 3. 품질 기준 (Research)
1. **Credibility**: 모든 주장과 추천은 검증된 출처(공식 문서, 권위 있는 소스)에 근거해야 함.
2. **Timeliness**: 최신 버전(2025/2026) 및 트렌드를 반영한 정보여야 함 (Legacy 정보 배제).
3. **Actionability**: 단순 나열이 아닌, 우리 프로젝트에 적용 가능한 구체적인 실행 방안을 제시해야 함.

---

## 4. 추천 도구 리스트 (Research Optimized)

### 🚨 필수 (Must-Have Top 5)

**[01] Exa Search MCP**
- **출처:** [https://github.com/exa-labs/mcp-server-exa](https://github.com/exa-labs/mcp-server-exa)
- **추천 이유:** LLM에 최적화된 고품질 검색 엔진. 일반 구글링보다 노이즈가 적고, 개발/기술 관련 최신 정보를 정확하게 찾아줌.
- **기능 설명:**
  1. 키워드 및 의미 기반(Semantic) 웹 검색.
  2. 결과 필터링 (도메인, 날짜 등) 및 콘텐츠 요약.
  3. 유사한 문서 찾기 및 관련 토픽 탐색.
- **활용법:**
  - **언제:** 새로운 기술 스택이나 라이브러리를 조사할 때.
  - **어떻게:** "'MCP 서버 구현 베스트 프랙티스'에 대한 2025년 이후 기술 블로그 글 찾아줘."
  - **산출물:** 요약된 검색 결과, 원문 링크 리스트.
- **주의점:** Exa API 키 필요.

**[02] Tavily MCP (설치됨) — Perplexity 대체**
- **출처:** `~/.claude/.mcp.json` 기설치 (`tavily-mcp@latest`)
- **추천 이유:** Perplexity Comet은 유료 API 필요. Tavily는 무료 1,000크레딧 제공, 심층 검색+출처 제공으로 동일 역할 수행.
- **기능 설명:**
  1. AI 기반 심층 검색 및 답변 (출처 포함).
  2. 실시간 정보 반영, 도메인/날짜 필터링.
  3. 콘텐츠 추출(extract), 크롤링(crawl), 사이트맵(map) 기능.
- **활용법:**
  - **언제:** 특정 기술의 장단점 비교나 개념 정리가 필요할 때.
  - **어떻게:** Tavily 검색으로 "LangChain vs AutoGen 아키텍처 비교" 조사.
  - **산출물:** 비교 분석 텍스트, 참조 링크.
- **주의점:** 무료 1,000크레딧/월. Exa + Brave Search와 조합하면 검색 다각화 가능.

**[03] NotebookLM MCP**
- **출처:** (Community Implementations / Web Use)
- **추천 이유:** 민서님의 "딥 리서치" 파트너. 수집한 방대한 자료(PDF, 웹페이지)를 넣고 질의응답하며 인사이트 도출.
- **기능 설명:**
  1. 업로드된 소스 기반의 정확한 답변 생성 (Grounding).
  2. 문서 요약, 브리핑 노트 생성, 오디오 개요(팟캐스트) 생성.
  3. 관련성 높은 인용구 추출.
- **활용법:**
  - **언제:** 논문이나 긴 기술 문서를 분석해야 할 때.
  - **어떻게:** (브라우저나 MCP를 통해) "이 백서(PDF)의 핵심 아키텍처를 요약하고, 보안 관련 내용을 추출해줘."
  - **산출물:** 요약 노트, 질의응답 결과.
- **주의점:** 구글 계정 연동 필요.

**[04] Microsoft Playwright MCP (Official)**
- **출처:** [https://github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- **추천 이유:** 웹 기반의 동적 콘텐츠 수집 및 스크래핑. 리서치 대상 사이트가 API를 제공하지 않을 때 직접 데이터를 가져옴.
- **기능 설명:**
  1. 헤드리스 브라우저로 웹페이지 방문 및 렌더링.
  2. 텍스트 추출, 스크린샷, PDF 저장.
  3. 복잡한 SPA(Single Page App) 크롤링.
- **활용법:**
  - **언제:** 동적 웹페이지의 데이터를 수집하거나 UI 레퍼런스를 모을 때.
  - **어떻게:** "XYZ 사이트의 'Pricing' 페이지 내용을 텍스트로 긁어오고 스크린샷도 찍어줘."
  - **산출물:** 텍스트 데이터, 이미지 파일.
- **주의점:** 사이트 이용 약관(robots.txt) 준수.

**[05] Brave Search MCP**
- **출처:** [https://github.com/brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server)
- **추천 이유:** 프라이버시를 중시하는 검색 대안. Exa/Google과 다른 관점의 검색 결과 제공.
- **기능 설명:**
  1. 광고/트래커 없는 웹 검색.
  2. 뉴스, 이미지, 비디오 검색 지원.
  3. 지역 기반 검색 결과.
- **활용법:**
  - **언제:** 편향되지 않은 검색 결과가 필요하거나 개발자 커뮤니티(Reddit 등) 검색 시.
  - **어떻게:** "Reddit에서 'OpenClaw'에 대한 최근 피드백을 검색해줘."
  - **산출물:** 검색 결과 리스트.
- **주의점:** API 키 필요 (무료 티어 확인).

### ⚡️ 효율 상승 (High Efficiency Top 10)

**[06] Ashra MCP (Web Extraction)**
- **출처:** [https://github.com/getrupt/ashra-mcp](https://github.com/getrupt/ashra-mcp)
- **추천 이유:** 웹페이지에서 구조화된 데이터(JSON) 추출. 비교표 작성 시 유용.
- **기능:** 자연어 프롬프트로 웹 데이터 추출 및 정제.
- **활용:** "이 제품 목록 페이지에서 제품명, 가격, 스펙을 JSON으로 뽑아줘."

**[07] Browserbase Cloud MCP**
- **출처:** [https://github.com/browserbase/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase)
- **추천 이유:** 로컬 리소스 소모 없이 클라우드 브라우저로 안정적인 크롤링.
- **기능:** 안티-봇 우회, 장시간 세션 유지, 클라우드 실행.
- **활용:** "접속이 까다로운 사이트 내용을 클라우드 브라우저로 가져와."

**[08] Google Search MCP (Free)**
- **출처:** [https://github.com/pskill9/web-search](https://github.com/pskill9/web-search)
- **추천 이유:** API 키 없이 간단한 구글 검색 필요 시.
- **기능:** 기본 구글 검색 결과 제공.
- **활용:** "간단한 사실 확인이나 최신 뉴스 헤드라인 검색."

**[09] Cloudsway SmartSearch**
- **출처:** [https://github.com/Cloudsway-AI/smartsearch](https://github.com/Cloudsway-AI/smartsearch)
- **추천 이유:** 검색 결과를 구조화된 JSON으로 제공하여 2차 가공 용이.
- **기능:** 다국어 검색, 안전 검색, 정형 데이터 반환.
- **활용:** "검색 결과를 바로 리포트 데이터로 쓸 수 있게 JSON으로 줘."

**[10] Olostep MCP Server**
- **출처:** [https://github.com/olostep/olostep-mcp-server](https://github.com/olostep/olostep-mcp-server)
- **추천 이유:** 대량의 URL 배치 크롤링 및 마크다운 변환.
- **기능:** 다수 URL 동시 처리, 마크다운/JSON 변환.
- **활용:** "이 10개 기술 블로그 URL 내용을 전부 마크다운으로 변환해줘."

### 🚀 확장 (Optional/Advanced)

**[11] arXiv MCP**
- **출처:** (Community)
- **설명:** 최신 논문(arXiv) 검색 및 요약. 학술적 리서치용.

**[12] PubMed MCP**
- **출처:** [https://github.com/genomoncology/biomcp](https://github.com/genomoncology/biomcp)
- **설명:** 의생명 분야 리서치 필요 시 (특수 목적).

**[13] Lightpanda GoMCP**
- **출처:** [https://github.com/lightpanda-io/gomcp](https://github.com/lightpanda-io/gomcp)
- **설명:** 초고속 헤드리스 브라우저. 속도가 중요한 스크래핑.

**[14] Browser DevTools MCP**
- **출처:** [https://github.com/serkan-ozal/browser-devtools-mcp](https://github.com/serkan-ozal/browser-devtools-mcp)
- **설명:** 웹페이지 구조 분석 및 디버깅 관점의 리서치.

**[15] Yutu (YouTube)**
- **출처:** [https://github.com/eat-pray-ai/yutu](https://github.com/eat-pray-ai/yutu)
- **설명:** 영상 콘텐츠 리서치, 자막 추출 및 요약.