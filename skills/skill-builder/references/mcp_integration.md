# MCP Integration Guide v5.0

**버전**: 5.0 | **목적**: Claude Agent Skill과 MCP 서버의 통합 가이드

---

## 1. 개요: Skills vs MCP

### 상호보완적 관계

| 구분 | Skills | MCP |
|------|--------|-----|
| **역할** | "HOW" - 절차적 지식 | "WHAT" - 도구 접근 |
| **범위** | 워크플로우, 도메인 가이드 | 외부 시스템 연결 |
| **상태** | Stateless 지침 | Stateful 연결 |
| **프로토콜** | 파일 기반 | JSON-RPC 2.0 |

### 언제 MCP가 필요한가?

```markdown
✅ MCP 필요:
- 외부 API/서비스 연동 (Slack, Notion, Google Drive 등)
- 데이터베이스 접근 (BigQuery, PostgreSQL)
- 파일 시스템 조작 (로컬/클라우드)
- 실시간 데이터 동기화

❌ MCP 불필요:
- 텍스트 처리/생성
- 로컬 계산/분석
- 정적 지식 참조
- 단순 포맷 변환
```

---

## 2. 전송 프로토콜 비교 분석

### 2.1 세 가지 전송 방식

| 비교 항목 | **stdio** | **HTTP + SSE** (Legacy) | **Streamable HTTP** (권장) |
|----------|-----------|------------------------|---------------------------|
| **통신 매체** | OS Pipe (stdin/stdout) | HTTP (GET+POST 분리) | HTTP (POST, 선택적 스트리밍) |
| **네트워크** | 로컬만 | 필수 (영속 연결) | 필수 (표준 HTTP) |
| **상태 관리** | 프로세스 수명 기반 | 연결 수명 기반 | 요청 기반 (Stateless 가능) |
| **보안** | 로컬 사용자 권한 | 토큰/헤더 인증 | OAuth, Bearer, mTLS |
| **확장성** | 수직적 (단일 머신) | 제한적 (연결 수 한계) | 수평적 (로드밸런서 친화) |
| **복잡도** | 매우 낮음 | 높음 (이중 채널) | 중간 (표준 웹 패턴) |

### 2.2 전송 방식 자동 선택 로직

```python
def recommend_transport(requirements: dict) -> str:
    """요구사항에 따른 전송 방식 권장"""
    
    # stdio 권장 조건
    if requirements.get("local_only"):
        return "stdio"
    if requirements.get("ide_plugin"):
        return "stdio"
    if requirements.get("sensitive_data") and not requirements.get("network_required"):
        return "stdio"
    
    # Streamable HTTP 권장 (기본값)
    if requirements.get("team_shared"):
        return "streamable_http"
    if requirements.get("cloud_saas"):
        return "streamable_http"
    if requirements.get("horizontal_scaling"):
        return "streamable_http"
    
    # SSE는 레거시 호환성 필요 시에만
    if requirements.get("legacy_mcp_server"):
        return "sse"
    
    return "streamable_http"  # 기본값
```

### 2.3 시나리오별 권장

| 시나리오 | 권장 방식 | 이유 |
|---------|----------|------|
| IDE 플러그인 (Cursor, VSCode) | **stdio** | 로컬 프로세스, 낮은 지연 |
| 개인 개발 도구 | **stdio** | 단순 설정, 보안 |
| 팀 공유 서비스 | **Streamable HTTP** | 수평 확장, 표준 인증 |
| 클라우드 SaaS 연동 | **Streamable HTTP** | API Gateway 호환 |
| 레거시 MCP 서버 | **SSE** | 하위 호환성 |

---

## 3. 한국 기업 MCP 서버 카탈로그

### 3.1 협업 도구

| 서비스 | MCP 지원 | 구현 방식 | API 문서 | 비고 |
|--------|---------|----------|----------|------|
| **Naver Works** (LINE WORKS) | ⚠️ 커스텀 | REST API 래핑 | [developers.worksmobile.com](https://developers.worksmobile.com) | Bot API, 메시지/캘린더 |
| **KakaoWork** | ⚠️ 커스텀 | REST API 래핑 | 카카오 i 오픈빌더 | 메시지, 일정, 결재 |
| **JANDI** | ⚠️ 커스텀 | Webhook + REST | [jandi.com/apps](https://www.jandi.com/landing/en/apps/integration) | Connect 기능 활용 |
| **Dooray!** | ⚠️ 커스텀 | REST API | [dooray helpdesk](https://helpdesk.dooray.com) | 프로젝트, 메일, 캘린더 |
| **Slack Korea** | ✅ 공식 | MCP 서버 존재 | 글로벌과 동일 | 완전 지원 |

### 3.2 클라우드/인프라

| 서비스 | MCP 지원 | 구현 방식 | 비고 |
|--------|---------|----------|------|
| **Naver Cloud** | ⚠️ 커스텀 | REST API 래핑 | API Gateway 활용 |
| **KT Cloud** | ⚠️ 커스텀 | REST API 래핑 | |
| **AWS Korea** | ✅ 커뮤니티 | aws-mcp-server | 글로벌과 동일 |
| **GCP Korea** | ✅ 커뮤니티 | gcp-mcp-server | 글로벌과 동일 |
| **Azure Korea** | ✅ 커뮤니티 | azure-mcp-server | 글로벌과 동일 |

### 3.3 한국 서비스 MCP 래퍼 구현 예시

```python
# Naver Works MCP 래퍼 예시
from fastmcp import FastMCP
import httpx

mcp = FastMCP("naver-works-server")

# 환경변수
NAVER_WORKS_BOT_ID = os.environ.get("NAVER_WORKS_BOT_ID")
NAVER_WORKS_TOKEN = os.environ.get("NAVER_WORKS_TOKEN")
BASE_URL = "https://www.worksapis.com/v1.0"

@mcp.tool()
async def send_message(channel_id: str, content: str) -> dict:
    """Naver Works 채널에 메시지 전송"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/bots/{NAVER_WORKS_BOT_ID}/channels/{channel_id}/messages",
            headers={"Authorization": f"Bearer {NAVER_WORKS_TOKEN}"},
            json={"content": {"type": "text", "text": content}}
        )
        return response.json()

@mcp.tool()
async def list_channels() -> list:
    """Bot이 참여한 채널 목록 조회"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/bots/{NAVER_WORKS_BOT_ID}/channels",
            headers={"Authorization": f"Bearer {NAVER_WORKS_TOKEN}"}
        )
        return response.json().get("channels", [])
```

---

## 4. MCP 자동 권장 시스템

### 4.1 트리거 조건

```python
MCP_TRIGGER_KEYWORDS = {
    # 글로벌 서비스
    "high_confidence": [
        "slack", "notion", "asana", "google drive", "github", 
        "jira", "trello", "airtable", "zapier", "figma"
    ],
    # 한국 서비스
    "kr_services": [
        "naver works", "네이버웍스", "line works", "라인웍스",
        "kakaowork", "카카오워크", "jandi", "잔디",
        "dooray", "두레이", "flow", "플로우"
    ],
    # 통합 키워드
    "integration": [
        "api", "webhook", "연동", "통합", "연결", "sync", "동기화",
        "가져오기", "보내기", "전송", "수신", "호출"
    ],
    # 데이터 소스
    "data_source": [
        "database", "db", "bigquery", "postgresql", "mysql",
        "mongodb", "redis", "elasticsearch"
    ]
}

def should_recommend_mcp(request: str) -> tuple[bool, float, str]:
    """MCP 권장 여부 및 신뢰도 반환"""
    request_lower = request.lower()
    
    # 고신뢰도 서비스명 직접 언급
    for keyword in MCP_TRIGGER_KEYWORDS["high_confidence"]:
        if keyword in request_lower:
            return True, 0.95, f"'{keyword}' 서비스 감지됨"
    
    # 한국 서비스 감지
    for keyword in MCP_TRIGGER_KEYWORDS["kr_services"]:
        if keyword in request_lower:
            return True, 0.90, f"한국 서비스 '{keyword}' 감지됨"
    
    # 통합 키워드
    integration_count = sum(
        1 for k in MCP_TRIGGER_KEYWORDS["integration"] 
        if k in request_lower
    )
    if integration_count >= 2:
        return True, 0.85, "다중 통합 키워드 감지됨"
    
    # 데이터 소스
    for keyword in MCP_TRIGGER_KEYWORDS["data_source"]:
        if keyword in request_lower:
            return True, 0.90, f"데이터 소스 '{keyword}' 감지됨"
    
    return False, 0.0, ""
```

### 4.2 권장 제시 형식

```markdown
💡 **MCP 통합 권장** (신뢰도: 95%)

감지된 서비스: Slack, Notion
권장 구성:
- Slack MCP: `@anthropic/mcp-server-slack`
- Notion MCP: `notion-mcp-server`

전송 방식: Streamable HTTP (팀 공유 환경 감지)

[A] 자동 설정  [B] 수동 설정  [C] 건너뛰기
```

---

## 5. 보안 체크리스트 (10개 항목)

### 필수 점검 항목

| # | 항목 | 설명 | 심각도 |
|---|------|------|--------|
| 1 | **최소 권한 원칙** | 필요한 도구/권한만 허용 | 🔴 Critical |
| 2 | **토큰 관리** | 환경변수로 관리, 코드 미포함 | 🔴 Critical |
| 3 | **입력 검증** | 모든 사용자 입력 sanitize | 🔴 Critical |
| 4 | **출력 필터링** | PII, 민감정보 마스킹 | 🔴 Critical |
| 5 | **인증 설정** | OAuth 2.0 / Bearer 토큰 | 🟠 High |
| 6 | **TLS 강제** | HTTPS 전용 (stdio 제외) | 🟠 High |
| 7 | **Rate Limiting** | API 호출 제한 설정 | 🟡 Medium |
| 8 | **감사 로그** | 모든 MCP 호출 로깅 | 🟡 Medium |
| 9 | **타임아웃 설정** | 연결/요청 타임아웃 | 🟡 Medium |
| 10 | **샌드박싱** | 컨테이너/격리 환경 실행 | 🟢 Low |

### 보안 검증 스크립트

```python
def security_audit_mcp(skill_config: dict) -> dict:
    """MCP 보안 감사 수행"""
    
    issues = []
    
    # 1. 최소 권한 검사
    if "*" in skill_config.get("allowed-tools", ""):
        issues.append({
            "severity": "CRITICAL",
            "item": "최소 권한 원칙",
            "message": "와일드카드(*) 권한 감지됨. 구체적 도구 지정 필요."
        })
    
    # 2. 토큰 노출 검사
    skill_content = read_skill_content(skill_config["path"])
    token_patterns = [
        r"sk-[a-zA-Z0-9]{20,}",  # OpenAI
        r"xox[baprs]-[a-zA-Z0-9-]+",  # Slack
        r"ghp_[a-zA-Z0-9]{36}",  # GitHub
    ]
    for pattern in token_patterns:
        if re.search(pattern, skill_content):
            issues.append({
                "severity": "CRITICAL",
                "item": "토큰 관리",
                "message": "하드코딩된 토큰 감지됨. 환경변수 사용 필요."
            })
    
    # 3-10. 기타 검사...
    
    return {
        "passed": len([i for i in issues if i["severity"] == "CRITICAL"]) == 0,
        "issues": issues,
        "score": calculate_security_score(issues)
    }
```

---

## 6. 동적 도구 검색 (Dynamic Tool Discovery)

### 6.1 Tool Search 패턴

대규모 환경에서 모든 도구를 컨텍스트에 로드하는 것은 비효율적입니다. 동적 검색 패턴을 사용합니다.

```python
from fastmcp import FastMCP, Context
from typing import List
import numpy as np

mcp = FastMCP("Enterprise Tool Gateway")

# 도구 레지스트리 (임베딩 기반 검색)
TOOL_REGISTRY = {
    "slack_send": {
        "name": "slack_send_message",
        "description": "Slack 채널에 메시지 전송",
        "embedding": None,  # 사전 계산된 벡터
        "server": "slack-mcp"
    },
    "notion_create": {
        "name": "notion_create_page",
        "description": "Notion에 새 페이지 생성",
        "embedding": None,
        "server": "notion-mcp"
    },
    # ... 수백 개의 도구
}

@mcp.tool()
async def search_tools(query: str, top_k: int = 5) -> List[dict]:
    """
    자연어 쿼리로 사용 가능한 도구 검색
    
    Args:
        query: 검색 쿼리 (예: "슬랙에 메시지 보내기")
        top_k: 반환할 결과 수
    
    Returns:
        관련 도구 목록
    """
    # 쿼리 임베딩 생성
    query_embedding = await generate_embedding(query)
    
    # 유사도 계산
    scores = []
    for tool_id, tool in TOOL_REGISTRY.items():
        similarity = cosine_similarity(query_embedding, tool["embedding"])
        scores.append((tool_id, similarity))
    
    # 상위 K개 반환
    top_tools = sorted(scores, key=lambda x: x[1], reverse=True)[:top_k]
    
    return [
        {
            "tool_id": tool_id,
            "name": TOOL_REGISTRY[tool_id]["name"],
            "description": TOOL_REGISTRY[tool_id]["description"],
            "relevance_score": score
        }
        for tool_id, score in top_tools
    ]

@mcp.tool()
async def load_tool(tool_id: str) -> dict:
    """검색된 도구의 상세 스키마 로드"""
    if tool_id not in TOOL_REGISTRY:
        return {"error": f"Tool '{tool_id}' not found"}
    
    tool = TOOL_REGISTRY[tool_id]
    server = get_mcp_server(tool["server"])
    
    # 도구 스키마 동적 로드
    schema = await server.get_tool_schema(tool["name"])
    
    return {
        "tool_id": tool_id,
        "schema": schema,
        "usage_example": generate_usage_example(schema)
    }
```

### 6.2 MCP Gateway 패턴

```
┌─────────────────┐
│   Claude Agent  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   MCP Gateway   │────▶│ Tool Search  │
│   (중앙 집중)    │     │   Engine     │
└────────┬────────┘     └──────────────┘
         │
    ┌────┼────┬────────┐
    ▼    ▼    ▼        ▼
┌──────┐┌──────┐┌──────┐┌──────┐
│Slack ││Notion││GitHub││ ...  │
│ MCP  ││ MCP  ││ MCP  ││      │
└──────┘└──────┘└──────┘└──────┘
```

---

## 7. 에러 핸들링 및 폴백 전략

### 7.1 에러 분류 및 대응

| 에러 유형 | 원인 | 대응 전략 |
|----------|------|----------|
| `CONNECTION_ERROR` | 서버 연결 불가 | 대체 서버 시도 → 로컬 폴백 |
| `RATE_LIMIT` | API 호출 제한 | 지수 백오프 재시도 |
| `PERMISSION_DENIED` | 권한 부족 | 권한 요청 안내 → 스킬 폴백 |
| `TIMEOUT` | 응답 지연 | 타임아웃 조정 → 비동기 처리 |
| `INVALID_PARAMS` | 잘못된 인자 | 파라미터 검증 → 사용자 안내 |

### 7.2 에러 핸들링 코드

```python
import asyncio
from enum import Enum
from typing import Optional, Callable

class MCPErrorType(Enum):
    CONNECTION_ERROR = "connection_error"
    RATE_LIMIT = "rate_limit"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    INVALID_PARAMS = "invalid_params"

class MCPErrorHandler:
    """MCP 에러 처리 핸들러"""
    
    def __init__(self):
        self.max_retries = 3
        self.base_delay = 1.0
        
    async def handle_with_retry(
        self, 
        func: Callable, 
        *args, 
        fallback: Optional[Callable] = None,
        **kwargs
    ):
        """재시도 및 폴백 포함 실행"""
        
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await func(*args, **kwargs)
                
            except ConnectionError as e:
                last_error = e
                # 대체 서버 시도
                alt_server = self.get_alternate_server(kwargs.get("server"))
                if alt_server:
                    kwargs["server"] = alt_server
                    continue
                    
            except RateLimitError as e:
                last_error = e
                # 지수 백오프
                delay = self.base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
                
            except TimeoutError as e:
                last_error = e
                # 타임아웃 증가
                kwargs["timeout"] = kwargs.get("timeout", 30) * 2
                continue
                
            except PermissionError as e:
                # 권한 에러는 재시도 불가
                if fallback:
                    return await fallback(*args, **kwargs)
                raise
        
        # 모든 재시도 실패
        if fallback:
            return await fallback(*args, **kwargs)
        raise last_error
```

### 7.3 서비스별 폴백 전략

```markdown
## 폴백 패턴 가이드

### Slack 불가 시:
1. 메시지 로컬 큐에 저장 (`/tmp/slack_queue/`)
2. 이메일 대체 전송
3. 사용자에게 수동 전송 안내

### Notion 불가 시:
1. 마크다운 파일로 로컬 저장
2. Google Docs 대체 생성
3. 복구 시 동기화 예약

### GitHub 불가 시:
1. 패치 파일 생성
2. 로컬 Git 커밋 (push 보류)
3. 복구 시 자동 push

### Database 불가 시:
1. SQLite 로컬 캐시 활용
2. 캐시된 데이터로 응답 (stale 표시)
3. 쓰기 작업 큐잉
```

---

## 8. 구현 템플릿

### 8.1 Python (FastMCP)

```python
# mcp_server.py
from fastmcp import FastMCP, Context
from pydantic import BaseModel, Field
import os

mcp = FastMCP(
    name="enterprise-mcp-server",
    version="1.0.0"
)

class QueryArgs(BaseModel):
    """쿼리 인자 스키마"""
    query: str = Field(description="실행할 쿼리")
    timeout_ms: int = Field(default=30000, description="타임아웃 (밀리초)")

@mcp.tool()
async def execute_query(args: QueryArgs, ctx: Context) -> dict:
    """
    데이터베이스 쿼리 실행
    
    Args:
        args: 쿼리 인자
        ctx: MCP 컨텍스트
    
    Returns:
        쿼리 결과
    """
    # 진행률 보고
    await ctx.report_progress(10, 100)
    
    try:
        # 쿼리 실행
        result = await db.execute(args.query, timeout=args.timeout_ms)
        await ctx.report_progress(100, 100)
        
        return {
            "success": True,
            "rows": result.rows,
            "row_count": len(result.rows)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }

if __name__ == "__main__":
    # Streamable HTTP로 실행
    mcp.run(transport="http", port=8000)
```

### 8.2 TypeScript (Official SDK)

```typescript
// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ts-enterprise-server",
  version: "1.0.0",
});

// 도구 등록
server.tool(
  "send_notification",
  {
    channel: z.string().describe("알림 채널 (slack, email, sms)"),
    message: z.string().describe("알림 메시지"),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
  },
  async ({ channel, message, priority }) => {
    try {
      const result = await sendToChannel(channel, message, priority);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server failed:", error);
  process.exit(1);
});
```

---

## 9. Quick Reference

### MCP 도구 명명 규칙

```
Format: ServerName:tool_name
Examples:
- Slack:send_message
- Notion:create_page
- GitHub:create_issue
- NaverWorks:send_message
```

### allowed-tools 설정

```yaml
# 서버의 모든 도구 허용
allowed-tools: "Slack:*"

# 특정 도구만 허용
allowed-tools: "GitHub:create_issue,GitHub:list_issues"

# 일반 도구와 혼합
allowed-tools: "Read,Write,Slack:send_message"
```

### 빠른 설정 명령어

```bash
# Slack MCP 설치
npx -y @anthropic/mcp-server-slack

# GitHub MCP 설치
npx -y @modelcontextprotocol/server-github

# MCP 권장 분석 실행
python {baseDir}/scripts/mcp_recommender.py --analyze "$REQUEST"

# 보안 감사 실행
python {baseDir}/scripts/security_audit.py --mcp
```

---

## 10. 문제 해결

### MCP 연결 실패

```python
if not mcp.server_available("Slack"):
    print("Slack MCP 연결 실패")
    print("1. 서버 실행 확인: npx -y @anthropic/mcp-server-slack")
    print("2. 토큰 확인: SLACK_TOKEN 환경변수")
    print("3. 네트워크 확인: 방화벽/프록시")
```

### 권한 오류

```python
try:
    mcp.call("GitHub:create_repo", {...})
except PermissionError:
    print("GitHub 토큰에 'repo' 스코프가 없습니다")
    print("토큰 재발급 필요: https://github.com/settings/tokens")
```

### 성능 저하

```python
# MCP 호출 프로파일링
with MCPProfiler() as profiler:
    result = mcp.call("BigQuery:execute_query", {...})

print(f"소요 시간: {profiler.duration}ms")
print(f"전송 데이터: {profiler.bytes_transferred} bytes")

if profiler.duration > 5000:
    print("⚠️ 느린 쿼리 감지. 최적화 필요.")
```

---

## 참고 자료

- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io)
- [Anthropic MCP Servers GitHub](https://github.com/anthropics/mcp-servers)
- [FastMCP 문서](https://gofastmcp.com)
- [MCP 보안 베스트 프랙티스](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
