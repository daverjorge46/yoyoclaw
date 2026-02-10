# Agent 01: 린 (편집자) - 버그 수정

status: completed
priority: 1 (최우선 실행)
target: 연구자료/개선사항/OpenClaw_Master_Guide/오픈크롤봇_마스터_가이드_완성본.md

## 작업 목록

1. **번호 체계 정리**: 섹션 2 전체. 2.1(1-7) 다음 2.2가 11부터, 2.3이 21부터 등 번호 불연속 -> 연속 번호로 재정렬 + 서브섹션 헤더 괄호도 맞추기
2. **LangGraph 코드 오류 (line 299)**: `workflow.add_edge("reviewer", review_node)` -> `workflow.add_node("reviewer", review_node)` + edge 연결 추가:
   ```python
   workflow.add_edge("researcher", "writer")
   workflow.add_edge("writer", "reviewer")
   workflow.set_entry_point("researcher")
   ```
3. **방안2 코드블록 (line 523-527)**: line 522 다음에 ``` 닫고, 525-526 "장점/단점"을 일반 텍스트로, 527의 불필요한 ``` 제거
4. **표 5.1 열 수 불일치 (line 414)**: "커스텀 봇 개발" 행 9열 -> 8열로: `| **커스텀 봇 개발** | ⭐⭐⭐⭐ | $20-50+ | 무제한 | 최고 | 높음 | 구현 필요 | 고급 |`
5. **일본어 혼입 (line 552)**: "スキ 구조 강화" -> "스킬 구조 강화"
6. **제품명 통일 (line 30)**: "오픈크롤봇(Moltbot)의" -> "OpenClaw(오픈크롤봇)의"

## 완료 조건

- 위 6개 항목 모두 수정
- 다른 섹션 내용은 절대 건드리지 않음
- 완료 후 이 파일의 status를 completed로 변경
