# [섹션 5] 스킬빌더 스킬 설계

> 리서처: 미루 (miru)
> 최종 업데이트: 2026-02-01

## 개요

오픈크롤봇(몰트봇)용 "스킬 제작 스킬"을 개발합니다. Claude Desktop 스킬빌더 기반과 다른 멀티에이전트 시스템의 스킬 구조를 분석하여, 텔레그램 환경에 최적화된 스킬 시스템을 설계합니다.

---

## 1. 스킬빌더 스킬이란?

### 1.1 정의

**스킬(Skill)**이란?
- 특정 작업을 위한 프롬프트 + 워크플로우 패키지
- 재사용 가능한 독립형 기능 단위
- 입출력이 명확히 정의된 모듈

**구성 요소**
```
┌─────────────────────────────────┐
│           스킬 (Skill)        │
│  ┌───────────────────────┐  │
│  │    프롬프트 (Prompt)   │  │
│  │    (시스템 + 사용자    │  │
│  │     + 톤 가이드)       │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │   워크플로우 (Workflow) │  │
│  │   - 단계별 절차     │  │
│  │   - 조건 분기         │  │
│  │   - 도구 호출 순서     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │   툴 (Tools)        │  │
│  │   - 외부 API          │  │
│  │   - 내장 함수         │  │
│  │   - 파일 조작         │  │
│  └───────────────────────┘  │
└─────────────────────────────────┘
```

### 1.2 개발 철학: TDD (테스트 주도 개발)

**TDD 사이클**
```
1. RED: 테스트 실패 (테스트 케이스 작성)
         ↓
2. GREEN: 테스트 통과 (최소 기능 구현)
         ↓
3. REFACTOR: 코드 개선 (중복 제거, 최적화)
         ↓
4. (반복)
```

**장점**
- 신뢰성 확보 (테스트 케이스로 명세화)
- 리팩터링 용이 (테스트 보호)
- 문서화 자동화 (테스트가 문서가 됨)
- 빠른 피드백

### 1.3 버전 관리 및 릴리즈

```
v1.0.0 → v1.1.0 → v1.2.0 → v2.0.0
  ↓           ↓           ↓
기능 개선   버그 수정   주요 업데이트
```

**시멘틱 버전닝**
- Major (v1.0 → v2.0): 하위 호환성 깨짐
- Minor (v1.0 → v1.1): 기능 추가, 하위 호환
- Patch (v1.0.0 → v1.0.1): 버그 수정, 하위 호환

---

## 2. Claude Desktop 스킬빌더 분석

### 2.1 구조

```
~/.clawdbot/skills/
├── skill-name/
│   ├── SKILL.md          # 스킬 메타데이터
│   ├── prompt.md         # 시스템 프롬프트
│   ├── workflow.md       # 워크플로우 정의
│   ├── tools.py         # 도구 함수들
│   └── tests/          # 테스트 케이스
│       ├── test_basic.py
│       └── test_edge_cases.py
└── SKILL_INDEX.md        # 스킬 인덱스
```

### 2.2 SKILL.md 구조

```yaml
# SKILL.md
name: "skill-name"
description: "한 줄 설명"
version: "1.0.0"
author: "your-name"
tags: ["category1", "category2"]

# 프롬프트 모드
prompt_mode: "replace"  # replace | append | system | instruction

# 의존 스킬
dependencies:
  - name: "other-skill"
    version: ">=1.0.0"

# 필요한 도구
requires:
  - web_search
  - file_read
  - code_execution

# 제약사항
constraints:
  - "이 스킬은 한국어만 지원"
  - "최대 10개 결과 반환"

# 평가 기준
evaluation:
  metrics:
    - accuracy: "정확도 90% 이상"
    - speed: "응답 시간 5초 이내"
    - cost: "토큰 < 1000"
```

### 2.3 워크플로우 정의

```yaml
# workflow.md
steps:
  - name: "입력 분석"
    type: "parse"
    output: "parsed_input"

  - name: "데이터 검색"
    type: "tool_call"
    tool: "web_search"
    input: "{{parsed_input.query}}"
    output: "search_results"

  - name: "결과 정리"
    type: "process"
    input: "{{search_results}}"
    output: "structured_data"

  - name: "최종 응답"
    type: "format"
    input: "{{structured_data}}"
    output: "final_response"

# 조건 분기
conditionals:
  - condition: "{{parsed_input.type == 'code'}}"
    then: "generate_code_flow"
  - condition: "{{parsed_input.type == 'research'}}"
    then: "research_flow"
```

---

## 3. 다른 멀티에이전트 시스템 스킬 구조 분석

### 3.1 AutoGPT 스킬 시스템

**구조**
```
┌─────────────────────────────────┐
│     Human Skill Layer       │  (사람 전문 지식 통합)
│  ┌─────────────────────┐   │
│  │  AutoGPT Agent Core │   │
│  │   (LLM + Memory)    │   │
│  └────────┬────────────┘   │
│           ↓                │
│  ┌─────────────────────┐   │
│  │  Component-based    │   │
│  │  Skills System     │   │
│  └────────┼────────────┘   │
│    ↓  ↓   ↓   ↓       │
│ Skill1  Skill2  Skill3   │
└─────────────────────────────┘
```

**핵심 개념: Human Skill Layer (HSL)**

**정의**
- 사람 전문 지식을 시스템 설계 단계에서 통합
- 후처리 방지 (사람이 직접 개입 필요 없음)
- 도메인 특화 지식 체계화

**장점**
- 초기 설계에서 전문성 반영
- 빠른 문제 해결
- 사람 피드백 최소화

**구현 방법**
```python
# AutoGPT HSL 예시
human_knowledge_base = {
    "legal": "법률 관련 지식...",
    "finance": "재무 관련 지식...",
    "technical": "기술 의사결정 가이드..."
}

class AutoGPTSkill:
    def __init__(self, skill_name, domain):
        self.skill_name = skill_name
        self.domain = domain
        self.hsl = human_knowledge_base[domain]

    def execute(self, user_input):
        # HSL 참조
        domain_knowledge = self.hsl.get(self.domain)
        return self.generate_response(user_input, domain_knowledge)
```

### 3.2 CrewAI 스킬 시스템

**구조**
```
┌─────────────────────────────────┐
│       CrewAI Framework       │
│  ┌─────────────────────┐   │
│  │      Agent System   │   │
│  │  ┌───┼───┼───┐  │
│  ↓  ↓   ↓   ↓   ↓   │  │
│ ToolTool   CodeTool  SearchTool │
│  ↓       ↓       ↓       │
│ ┌─────────────────────┐   │
│ │  Tools Repository  │   │
│ └────────┼────────────┘   │
│    ↓  ↓   ↓          │
│ Custom  Built-in  API   │
└─────────────────────────────┘
```

**@tool 데코레이터**

```python
from crewai.tools import tool

@tool("CodeSearch")
def code_search(query: str) -> str:
    """코드 검색 도구
    
    Args:
        query: 검색어
    """
    # 구현 로직
    return f"검색 결과: {query}"

@tool("DatabaseQuery")
def database_query(sql: str) -> str:
    """데이터베이스 쿼리 도구
    
    Args:
        sql: SQL 쿼리
    """
    # 구현 로직
    return f"쿼리 결과: {sql}"
```

**툴 카테고리**

| 카테고리 | 예시 | 설명 |
|----------|------|------|
| **Data Tools** | CSVSearchTool, JSONSearchTool, XMLSearchTool | 구조화된 데이터 검색 |
| **Database Tools** | PGSearchTool, MongoSearchTool | 데이터베이스 쿼리 |
| **RAG Tools** | RagTool, CodeDocsSearchTool | 검색 증강 생성 |
| **Specialized Tools** | CodeInterpreterTool, DALL-E, YoutubeVideoSearch | 특화 기능 |

### 3.3 LangGraph 스킬 시스템

**구조**
```
┌─────────────────────────────────┐
│      LangGraph Framework      │
│  ┌─────────────────────┐   │
│  │   Graph-based State  │   │
│  │   Management       │   │
│  └────────┬────────────┘   │
│    ↓  ↓   ↓   ↓       │
│  Node1  Node2  Node3    │
│   ↓  ↓  ↓   ↓       │
│ ┌─────────────────────┐   │
│ │  Shared State Store │   │
│ └─────────────────────┘   │
└─────────────────────────────┘
```

**특징**
- 그래프 기반 상태 관리
- 노드 간 상태 전달 명확
- 병렬 실행 지원

---

## 4. 텔레그램 환경용 스킬 시스템 설계

### 4.1 스킬 아키텍처

```
┌─────────────────────────────────┐
│  OpenClaw 스킬 시스템      │
│  ┌─────────────────────┐   │
│  │  SKILL_INDEX.md   │   │
│  └────────┬────────────┘   │
│    ↓  ↓   ↓   ↓      │
│ [리서치] [빌더] [리뷰] │
│  ↓    ↓    ↓        │
│ SKILL.md workflow.md   │
│ tools.py      tests/      │
└─────────────────────────────┘
```

### 4.2 SKILL.md 템플릿 (텔레그램 최적화)

```yaml
# SKILL.md - 텔레그램 봇 스킬 메타데이터
name: "리서치 스킬"
description: "웹 검색 및 데이터 수집"
version: "1.0.0"
author: "miru"

# 텔레그램 특화 설정
telegram_specific:
  mention_patterns:
    - "@miru"
  response_style: "friendly"  # friendly | professional | concise
  
  group_behavior:
    require_mention: true
    reaction_emoji: "🔍"
  
  output_format: "markdown"

# 모델 설정
model_config:
  default_model: "glm-4.7"
  fallback_model: "gpt-4o"
  temperature: 0.7
  max_tokens: 2000

# 텔레그램 제약
constraints:
  - "메시지 3개 이내로 응답"
  - "멘션 시에만 응답"
  - "NO_REPLY 사용 가능"

# 필요한 툴
requires:
  - name: "web_search"
    optional: false
  - name: "file_read"
    optional: true
  - name: "sessions_send"
    optional: false

# 평가 기준
evaluation:
  response_time: "< 5초"
  accuracy: "> 90%"
  token_efficiency: "< 1000 토큰/요청"
```

### 4.3 workflow.md 템플릿 (팀 협업)

```yaml
# workflow.md - 팀 협업 워크플로우
workflow_type: "collaborative"

# 협업 단계
phases:
  - name: "R1: 의견 제시"
    participants: ["miru", "hana", "yuri"]
    action: "send_opinion_to_all"
    
  - name: "R2: 반박/보충"
    trigger: "received_other_opinion"
    action: "counter_or_supplement"
    targets: ["all"]  # 모든 팀원에게
    
  - name: "R3: 합의"
    trigger: "or_closes_debate"
    participant: "sena"  # 오케스트레이터만
    action: "summarize_and_finalize"

# 의사결정 로직
decision_logic:
  rounds: 3  # 최대 3라운드
  timeout_per_round: 300  # 5분
  consensus_method: "weighted"  # 가중평균 또는 다수결
  
# 결과 통합
integration:
  method: "sessions_send"  # A2A 통신
  final_recipient: "sena"  # 오케스트레이터에게
  notify_user: true  # 최종 사용자 알림
```

### 4.4 tools.py 템플릿

```python
# tools.py - 스킬 전용 도구 함수들

from typing import Dict, List
import requests
import json

def web_search(query: str, max_results: int = 5) -> List[Dict]:
    """웹 검색 (OpenClaw 통합)"""
    # OpenClaw 웹 검색 기능 활용
    url = "http://localhost:18789/api/tools/web_search"
    response = requests.post(url, json={"query": query, "max_results": max_results})
    return response.json().get("results", [])

def send_to_team(message: str, targets: List[str] = None) -> Dict:
    """팀원들에게 메시지 전송 (A2A)"""
    if targets is None:
        targets = ["hana", "yuri"]  # 기본 타겟
    
    results = {}
    for target in targets:
        try:
            url = f"http://localhost:18789/api/sessions/{target}/message"
            response = requests.post(url, json={"message": message})
            results[target] = {"status": "sent", "response": response.json()}
        except Exception as e:
            results[target] = {"status": "error", "error": str(e)}
    
    return results

def read_file(file_path: str) -> str:
    """파일 읽기"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"파일을 찾을 수 없습니다: {file_path}"
    except Exception as e:
        return f"파일 읽기 오류: {e}"

def save_result(content: str, file_path: str) -> bool:
    """결과 저장"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"저장 오류: {e}")
        return False
```

---

## 5. 스킬 생성 워크플로우

### 5.1 초기화 단계

```bash
# 새 스킬 생성
openclaw skill create my-skill

# 또는 수동으로
mkdir -p ~/.openclaw/skills/my-skill
cd ~/.openclaw/skills/my-skill

# 필수 파일 생성
touch SKILL.md workflow.md tools.py
chmod +x tools.py
```

### 5.2 단계별 개발

**Step 1: SKILL.md 작성**
- 스킬 이름, 설명 정의
- 의존 스킬 명시
- 필요한 툴 목록화

**Step 2: 프롬프트 설계**
```markdown
<!-- prompt.md -->
당신은 [스킬 이름] 스킬입니다.

## 역할
- [명확한 역할 설명]

## 행동 규칙
1. [규칙1]
2. [규칙2]

## 제약사항
- [제약1]
- [제약2]

## 출력 형식
```markdown
[형식 정의]
```
```

**Step 3: 워크플로우 설계**
- 단계별 절차 정의
- 조건 분기 로직
- 에러 핸들링

**Step 4: 툴 구현**
- 필요한 함수 구현
- 외부 API 통합
- 테스트 코드 작성

### 5.3 테스트 단계

```python
# tests/test_basic.py
import unittest

class TestSkill(unittest.TestCase):
    def test_web_search(self):
        """웹 검색 테스트"""
        result = web_search("OpenClaw", max_results=3)
        self.assertEqual(len(result), 3)
        self.assertIn("OpenClaw", result[0]['title'])
    
    def test_team_communication(self):
        """팀 통신 테스트"""
        message = "테스트 메시지"
        result = send_to_team(message, targets=["hana"])
        self.assertEqual(result["hana"]["status"], "sent")
    
    def test_file_operations(self):
        """파일 조작 테스트"""
        # 테스트 파일 생성
        test_content = "테스트 내용"
        save_result(test_content, "/tmp/test.txt")
        result = read_file("/tmp/test.txt")
        self.assertEqual(result, test_content)

if __name__ == '__main__':
    unittest.main()
```

---

## 6. 스킬 저장/배포 방식

### 6.1 로컬 배포

```bash
# 스킬 활성화
openclaw skill enable my-skill

# 스킬 테스트
openclaw skill test my-skill

# 스킬 로그 확인
openclaw skill logs my-skill
```

### 6.2 공유 방식

**방법 1: Git 레포지토리**
```bash
# GitHub에 공유
git init
git add SKILL.md workflow.md tools.py
git commit -m "Add my-skill"
git remote add origin https://github.com/your-repo/skills.git
git push -u origin main
```

**방법 2: 공식 스킬 레지스트리**
```
SKILL_INDEX.md에 등록하여 공개
```

```yaml
# SKILL_INDEX.md
skills:
  - name: "my-skill"
    version: "1.0.0"
    url: "https://github.com/your-repo/skills/tree/main/my-skill"
    description: "스킬 설명"
    tags: ["category1", "category2"]
```

### 6.3 버전 관리

```bash
# 버전 업데이트
vim SKILL.md
# version: "1.1.0"으로 변경

# 변경사항 CHANGELOG.md에 기록
vim CHANGELOG.md
# 1.1.0: 기능 추가
# 1.0.1: 버그 수정
```

---

## 7. 스킬 테스트 방법

### 7.1 단위 테스트 (Unit Test)

```python
# 각 함수별 테스트
def test_web_search_empty_query():
    result = web_search("")
    assert result == []

def test_web_search_special_chars():
    result = web_search("<script>alert(1)</script>")
    assert "script" not in result[0]['title']

def test_send_to_team_invalid_target():
    result = send_to_team("test", targets=["invalid_agent"])
    assert result["invalid_agent"]["status"] == "error"
```

### 7.2 통합 테스트 (Integration Test)

```python
# 전체 워크플로우 테스트
def test_full_workflow():
    # 입력
    user_query = "OpenClaw 리서치해줘"
    
    # 단계1: 검색
    search_results = web_search(user_query)
    
    # 단계2: 분석
    analyzed = analyze_results(search_results)
    
    # 단계3: 팀 전송
    sent = send_to_team(f"분석 결과: {analyzed}")
    
    # 검증
    assert sent["hana"]["status"] == "sent"
```

### 7.3 엣지 케이스 테스트

```python
edge_cases = [
    {"input": "", "expected": "empty_query"},
    {"input": "a"*10000, "expected": "overflow"},
    {"input": "<script>attack</script>", "expected": "injection_blocked"},
    {"input": "한글English", "expected": "mixed_language"},
    {"input": "🔥"*50, "expected": "spam_filter"},
]

for case in edge_cases:
    result = process_input(case["input"])
    assert result["status"] == case["expected"]
```

---

## 8. Claude Desktop 스킬 → 몰트봇 스킬 변환 가이드

### 8.1 구조 매핑

| Claude Desktop 스킬 | 몰트봇 스킬 | 변환 방법 |
|-------------------|------------|----------|
| SKILL.md | SKILL.md | 동일 (템플릿 확장) |
| prompt.md | prompt.md | 시스템 프롬프트 추가 |
| .py (도구) | tools.py | OpenClaw API 호출로 변환 |
| Tests/ | tests/ | 동일 (unittest) |
| package.json | SKILL.md의 dependencies | 의존성으로 통합 |

### 8.2 프롬프트 변환

**Claude Desktop**
```markdown
<!-- system prompt -->
You are a helpful assistant with access to web search and file operations.
```

**몰트봇 (OpenClaw)**
```yaml
# SKILL.md → AGENTS.md/system
agents:
  skill_name:
    model: "glm-4.7"
    system: |
      당신은 유익한 도구에 접근 가능한 어시스턴트입니다.
      웹 검색, 파일 조작 등 도와주세요.
```

### 8.3 도구 변환

**Claude Desktop**
```python
# tool function
def search_web(query: str) -> list[dict]:
    """Search the web for information"""
    # Claude 자체 기능 사용
    pass
```

**몰트봇 (OpenClaw)**
```python
# tools.py → OpenClaw 기능 활용
def web_search(query: str) -> list[dict]:
    """웹 검색 (OpenClaw web_search 툴 활용)"""
    # OpenClaw의 web_search 툴이 자동으로 처리됨
    # 별도 구현 불필요
    return []  # OpenClaw이 처리
```

---

## 9. 개선 제안 리스트

### 9.1 스킬 구조 개선

1. **메타데이터 표준화**
   - JSON Schema 기반 SKILL.md
   - 버전 호환성 자동 검증

2. **의존성 해결**
   - 스킬 간 순환 의존 감지
   - 자동 해결 방안 제시

3. **플러그인 시스템**
   - 훅(Hook) 기반 확장
   - 스킬 라이프사이클 관리

### 9.2 텔레그램 통합 개선

4. **그룹 세션 네이티브 지원**
   - 기본 스킬이 그룹에서 자동 공유
   - 세션 분리 필요 없음

5. **인라인 툴 지원**
   - 스킬 내에서 직접 OpenClaw 툴 호출
   - 별도 래퍼 불필요

6. **리액션/인라인 버튼 지원**
   - 스킬이 인라인 버튼 생성 가능
   - 사용자 경험 개선

### 9.3 테스트 자동화

7. **CI/CD 통합**
   - GitHub Actions로 자동 테스트
   - 스킬 릴리즈 자동화

8. **퍼즈런스 테스트**
   - 실제 사용 패턴 학습
   - 응답 품질 지속 개선

---

## 10. 참고 예시 스킬

### 10.1 리서치 스킬 예시

```yaml
# SKILL.md
name: "research-skill"
description: "웹 검색 및 데이터 수집"
version: "1.0.0"

prompt_mode: "system"
requires:
  - web_search
  - file_save

workflow:
  steps:
    - search_web
    - analyze_results
    - save_to_file
    - notify_team

constraints:
  max_results: 10
  timeout: 60
  output_format: "markdown"
```

### 10.2 빌더 스킬 예시

```yaml
# SKILL.md
name: "builder-skill"
description: "문서 및 코드 생성"
version: "1.0.0"

prompt_mode: "instruction"
requires:
  - code_execution
  - file_operations

workflow:
  steps:
    - understand_requirements
    - write_code
    - test_code
    - save_file

constraints:
  language: "python"
  code_style: "pep8"
  auto_format: true
```

### 10.3 리뷰어 스킬 예시

```yaml
# SKILL.md
name: "reviewer-skill"
description: "코드 및 문서 비평"
version: "1.0.0"

prompt_mode: "instruction"
requires:
  - code_analysis
  - team_communication

workflow:
  steps:
    - review_code
    - identify_issues
    - suggest_improvements
    - report_to_team

criteria:
  coding_standards: "pep8"
  quality_threshold: 8/10
  critical_only: false
```

---

*다음 파일로 계속: 06-final-integration.md*
