# CSO (Claude Search Optimization) 가이드

**목적:** description 필드를 최적화하여 Claude가 스킬을 정확하게 트리거하도록 함

---

## 개요

CSO는 SEO(Search Engine Optimization)의 Claude 버전입니다. Claude는 설치된 모든 스킬의 `name`과 `description`만 보고 어떤 스킬을 트리거할지 결정합니다. 따라서 description 작성이 스킬 발동의 **가장 중요한 요소**입니다.

---

## 핵심 원칙

### 1. 추상적 사용 사례 ❌ → 증상(Symptoms) ✅

**나쁜 예:**
```yaml
description: "PDF 파일 처리를 도와줍니다"
```

**좋은 예:**
```yaml
description: "PDF 텍스트 추출, 양식 채우기, 문서 병합. 'PDF 안 열려요', 
'텍스트 복사가 안 돼요', '양식 작성해줘' 언급 시 사용"
```

### 2. 에러 메시지 포함

사용자가 말할 수 있는 **실제 에러 메시지**나 **불만 표현** 포함:

```yaml
# ❌ BAD
description: "비동기 테스트 작성"

# ✅ GOOD
description: "setTimeout/sleep 사용 테스트가 불안정할 때, 로컬 통과-CI 실패, 
병렬 실행 시 타임아웃, 'race condition', 'flaky test' 에러 발생 시 사용"
```

### 3. 동의어와 변형 포함

사용자가 같은 개념을 **다양하게 표현**할 수 있음:

```yaml
# ❌ BAD
description: "엑셀 파일 생성"

# ✅ GOOD
description: "엑셀, xlsx, 스프레드시트, 표 만들기, 데이터 정리, 
피벗 테이블, 차트 생성, '표로 정리해줘', '엑셀로 만들어줘' 요청 시 사용"
```

### 4. 도구/기술명 명시

특정 도구나 기술 사용 시 **이름 명시**:

```yaml
# ❌ BAD
description: "코드 품질 검사"

# ✅ GOOD
description: "ESLint, Prettier, Black, isort, CodeQL, Semgrep 기반 코드 품질 검사. 
'린트', '포맷팅', '정적 분석', 'code review' 요청 시 사용"
```

---

## Description 작성 공식

```
[핵심 기능 동사형] + [구체적 사용 사례] + [트리거 키워드/증상] + [사용 시점]
```

**예시:**

```yaml
description: "Git 커밋 메시지 자동 생성, 브랜치 전략 제안, PR 설명 작성. 
'커밋 메시지 써줘', 'PR 설명', 'git 어떻게', '브랜치 정리' 요청 시 사용. 
conventional commits 형식 지원."
```

---

## 스킬 유형별 CSO 패턴

### 규율 강제 스킬 (TDD, 디버깅, 검증)

```yaml
# 트리거 키워드: 강제성 표현
description: "TDD 사이클 강제, RED-GREEN-REFACTOR 준수. 
'테스트 먼저', '테스트 주도', 'TDD로 해줘', '테스트 없이 코드 금지' 요청 시 사용. 
테스트 전 코드 작성 시 자동 거부."
```

### 문서 처리 스킬 (PDF, DOCX, XLSX)

```yaml
# 트리거 키워드: 파일 확장자 + 작업 + 에러
description: "PDF 텍스트/테이블 추출, 양식 채우기, 병합, 주석 추가. 
pdf, 문서, '추출해줘', '합쳐줘', '양식', 'PDF 편집' 요청 시 사용. 
pdfplumber, PyMuPDF 기반."
```

### API 통합 스킬 (MCP, 외부 서비스)

```yaml
# 트리거 키워드: 서비스명 + 작업 + 연결어
description: "Slack, Notion, GitHub, Jira 연동. 메시지 전송, 페이지 생성, 
이슈 관리. 'Slack으로 보내', 'Notion에 정리', '연동해줘', 'API 연결' 요청 시 사용. 
MCP 프로토콜 기반."
```

### 한국 현지화 스킬

```yaml
# 트리거 키워드: 한국 서비스명 + 한국어 표현
description: "네이버웍스, 카카오워크, 잔디, 두레이 연동. 
한국 기업 문서 형식 지원. '네이버웍스로', '카카오톡 알림', 
'한국 회사', '국내 서비스' 언급 시 사용."
```

---

## ❌ 피해야 할 패턴

### 1. 너무 짧은 description

```yaml
# ❌ BAD - 트리거 키워드 부족
description: "PDF 처리"

# ✅ GOOD
description: "PDF 텍스트 추출, 양식 채우기, 문서 병합..."
```

### 2. 너무 추상적인 표현

```yaml
# ❌ BAD - 구체성 없음
description: "문서 작업을 도와줍니다"

# ✅ GOOD
description: "Word 문서 생성, 편집, 추적 변경, 주석 추가..."
```

### 3. 기능만 나열 (사용 시점 없음)

```yaml
# ❌ BAD - 언제 사용하는지 불분명
description: "텍스트 추출, 병합, 주석 기능"

# ✅ GOOD
description: "... '추출해줘', '합쳐줘' 요청 시 사용"
```

### 4. 내부 구현 세부사항

```yaml
# ❌ BAD - 사용자가 모르는 내부 용어
description: "PyMuPDF의 fitz 모듈로 PDF 렌더링"

# ✅ GOOD
description: "PDF 텍스트 추출... PyMuPDF 기반"  # 마지막에 간단히 언급
```

---

## when_to_use 필드 활용

obra/superpowers 스타일의 상세 트리거 조건:

```yaml
---
name: async-testing
description: "비동기 테스트 패턴..."
---

## When to Use

- setTimeout/sleep 사용 테스트가 불안정(flaky)할 때
- 테스트가 로컬에서 통과하지만 CI에서 실패할 때
- 병렬 실행 시 간헐적 타임아웃 발생 시
- "race condition" 에러 메시지가 나올 때
- Promise/async-await 테스트가 예상대로 동작 안 할 때
```

---

## Description 최적화 체크리스트

### 기본 요소
- [ ] 핵심 기능 동사형으로 시작 (생성, 추출, 처리...)
- [ ] 1024자 이내
- [ ] 구체적 사용 사례 2-3개 포함

### 트리거 키워드
- [ ] 사용자가 말할 법한 표현 포함
- [ ] 에러 메시지/증상 포함
- [ ] 동의어/변형 포함
- [ ] 관련 도구/기술명 포함

### 사용 시점
- [ ] "~할 때 사용" 또는 "~요청 시 사용" 문구 포함
- [ ] 스킬을 사용하면 안 되는 경우도 고려

### 한국어 최적화
- [ ] 한국어 키워드 포함 (한국 서비스, 한국어 표현)
- [ ] 영어 키워드도 병행 (pdf, excel, api...)
- [ ] 자연스러운 한국어 표현 ("~해줘", "~로 만들어줘")

---

## 테스트 방법

### 1. 트리거 테스트

다양한 표현으로 스킬 트리거 테스트:

```
테스트 문장:
- "PDF에서 텍스트 뽑아줘"
- "이 문서 내용 추출해줘"
- "pdf 파일 합쳐줘"
- "양식 작성해줘"

→ 모든 문장에서 스킬이 트리거되어야 함
```

### 2. 비트리거 테스트

트리거되면 안 되는 경우도 테스트:

```
비트리거 문장:
- "PDF란 뭐야?" (정보 질문 - 스킬 불필요)
- "PDF 파일 어디 있어?" (파일 검색 - 다른 스킬)

→ 이 문장에서는 스킬이 트리거되면 안 됨
```

### 3. 경쟁 스킬 테스트

여러 스킬 설치 시 올바른 스킬 선택 테스트:

```
문장: "엑셀 파일을 PDF로 변환해줘"

경쟁 스킬: xlsx-skill, pdf-skill

→ 의도한 스킬이 선택되어야 함 (또는 둘 다 협력)
```

---

## 참고

- Anthropic description 제한: 1024자
- obra/superpowers 권장: 증상 기반 트리거
- 한국어 환경: 영어+한국어 키워드 혼용 권장
