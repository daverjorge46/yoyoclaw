# [섹션 7] 스킬 개발 튜토리얼

## 개요
처음부터 끝까지 스킬을 만드는 과정을 따라하며 오픈크롤봇 스킬 개발 익히기

---

## 예제 스킬: 웹 요약 스킬 (web-summarizer)

### 만들 스킬 설계
```
이름: web-summarizer
기능: URL을 입력받아 웹페이지 내용을 요약
입력: URL
출력: 3문장 요약 + 핵심 키워드
툴: web_fetch
```

---

## Step 1: 스킬 디렉토리 생성

```bash
cd ~/.openclaw/skills
mkdir web-summarizer
cd web-summarizer
```

### 디렉토리 구조
```
web-summarizer/
├── SKILL.md
├── README.md
└── prompts/
    ├── system.md
    └── examples.md
```

```bash
mkdir prompts
touch SKILL.md README.md prompts/system.md prompts/examples.md
```

---

## Step 2: SKILL.md 작성

```markdown
# web-summarizer

## 버전
v1.0

## 작성자
[사용자명]

## 설명
URL을 입력받아 웹페이지 내용을 3문장으로 요약하고 핵심 키워드 5개 추출

## 카테고리
리서치

## 의존성
- web_fetch

## 사용 방법
1. URL 입력
2. 웹페이지 내용 가져오기
3. 요약 생성

## 변경사항
### v1.0 (2026-01-31)
- 초기 릴리스
```

---

## Step 3: 시스템 프롬프트 작성 (prompts/system.md)

```markdown
너는 웹 요약 스킬이야.

## 기능
사용자가 URL을 주면, 해당 웹페이지 내용을 요약해줘.

## 워크플로우
1. URL이 유효한지 확인
2. web_fetch로 내용 가져오기
3. 3문장으로 요약
4. 핵심 키워드 5개 추출

## 출력 형식
### 요약 (3문장)
[요약 내용]

### 핵심 키워드
1. [키워드 1]
2. [키워드 2]
3. [키워드 3]
4. [키워드 4]
5. [키워드 5]

## 제약사항
- 반드시 3문장으로 요약
- 키워드는 정확히 5개
- 한국어로 답해
- 불확실한 정보는 포함하지 마

## 에러 핸들링
- URL이 유효하지 않으면: "URL을 다시 확인해주세요."
- 내용을 가져오지 못하면: "웹페이지를 불러올 수 없어요."
```

---

## Step 4: 예시 프롬프트 작성 (prompts/examples.md)

```markdown
## 예시 1: 뉴스 기사 요약

입력: "https://news.ycombinator.com/item?id=12345"

출력:
### 요약 (3문장)
해커 뉴스에서 AI 기반 코드 작성 도구가 논의되고 있어요. 사용자들은 생산성 향상을 경험하지만, 코드 품질 우려도 제기했어요. 도구 개발사는 최신 모델로 성능을 개선 중이라고 밝혔어요.

### 핵심 키워드
1. AI 코딩 도구
2. 생산성
3. 코드 품질
4. 해커 뉴스
5. 모델 개선

---

## 예시 2: 블로그 포스트 요약

입력: "https://example.com/blog/how-to-learn-coding"

출력:
### 요약 (3문장)
코딩 학습에 필요한 5가지 핵심 원칙을 소개해요. 실습 위주 학습과 커뮤니티 참여가 중요하다고 강조해요. 저자는 매일 1시간 투자로 6개월 만에 취업에 성공했어요.

### 핵심 키워드
1. 코딩 학습
2. 실습 위주
3. 커뮤니티
4. 1일 1시간
5. 취업 성공
```

---

## Step 5: README.md 작성

```markdown
# web-summarizer

웹페이지 내용을 요약하는 오픈크롤봇 스킬

## 설치
이 스킬은 오픈크롤봇 워크스페이스의 `~/.openclaw/skills/web-summarizer`에 있습니다.

## 사용법

### 텔레그램에서
```
https://example.com/article 요약해줘
```

### 세션에서
```
web_fetch로 https://example.com/article 내용 가져와서 3문장 요약해줘
```

## 예제

### 입력
```
https://news.ycombinator.com/item?id=12345
```

### 출력
```
### 요약 (3문장)
[3문장 요약]

### 핵심 키워드
1. [키워드]
2. [키워드]
3. [키워드]
4. [키워드]
5. [키워드]
```

## 요구사항
- 오픈크롤봇 Gateway 실행 중
- web_fetch 스킬 활성화

## 라이선스
MIT

## 작성자
[사용자명]
```

---

## Step 6: 테스트

### 테스트 1: 기본 요약
입력: `https://example.com/test-article 요약해줘`

기대 출력:
- 3문장 요약
- 5개 키워드
- 한국어

### 테스트 2: 유효하지 않은 URL
입력: `https://invalid-url-12345.com 요약해줘`

기대 출력:
- 에러 메시지
- 다시 시도 제안

### 테스트 3: 긴 문서
입력: `[긴 블로그 포스트 URL] 요약해줘`

기대 출력:
- 3문장으로 간결히
- 핵심만 포함

---

## Step 7: 개선 (반복)

### 문제점 확인
- [ ] URL이 없으면?
- [ ] 이미지 많은 페이지?
- [ ] PDF?
- [ ] 비회원 전용?

### 개선 방법
```markdown
## 시스템 프롬프트 수정

### 추가: URL 검증
1. URL이 입력되었는지 확인
2. http:// 또는 https://로 시작하는지 확인
3. 도메인 유효성 확인

### 추가: 다양한 콘텐츠 타입 지원
- 이미지 많은 페이지: 텍스트만 추출
- PDF: (추후 지원 예정)
- 비회원 전용: "로그인이 필요할 수 있어요" 메시지
```

---

## Step 8: 버전 관리

```bash
cd ~/.openclaw/skills/web-summarizer
git init
git add .
git commit -m "v1.0: 초기 릴리스"
```

### 버전 릴리스
```markdown
## 변경사항

### v1.1 (2026-02-01)
- URL 검증 추가
- 이미지 많은 페이지 최적화

### v1.0 (2026-01-31)
- 초기 릴리스
```

---

## Step 9: 배포

### ClawHub에 업로드 (선택)
```bash
# ClawHub CLI (개발 중)
openclaw skill publish web-summarizer
```

### GitHub에 공개
```bash
git remote add origin https://github.com/user/web-summarizer.git
git push -u origin main
```

---

## 튜토리얼 요약

### 만든 스킬
- **이름**: web-summarizer
- **기능**: 웹페이지 요약
- **파일**: 4개 (SKILL.md, README.md, prompts/system.md, prompts/examples.md)
- **의존성**: web_fetch

### 배운 것
1. 스킬 디렉토리 구조
2. SKILL.md 작성법
3. 시스템 프롬프트 작성법
4. 예시 프롬프트 활용
5. 테스트 방법
6. 개선 반복
7. 버전 관리
8. 배포 방법

### 다음 도전
- 복잡한 스킬 만들기
- 외부 API 통합
- 멀티스킬 조합

---

## 부록: 다른 예제 스킬 아이디어

1. **코드 리뷰 스킬**
   - 기능: 코드 분석 + 개선 제안
   - 툴: 없음

2. **번역 스킬**
   - 기능: 다국어 번역
   - 툴: 없음

3. **날씨 스킬**
   - 기능: 날씨 정보 조회
   - 툴: web_search

4. **이메일 작성 스킬**
   - 기능: 이메일 초안 작성
   - 툴: 없음

5. **데이터 분석 스킬**
   - 기능: CSV/JSON 데이터 분석
   - 툴: read, write

---

*다음 파일로 계속: 07_troubleshooting_guide.md*
