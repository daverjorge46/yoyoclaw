/**
 * Node-RED Built-in Node Catalog
 * Information about core Node-RED nodes for agent reference.
 */

export type NodeTypeInfo = {
  type: string;
  category: string;
  description: string;
  inputs: number;
  outputs: number;
  properties: string[];
  usage: string;
};

export const NODE_CATALOG: Record<string, NodeTypeInfo> = {
  // ============================================================================
  // Common
  // ============================================================================
  inject: {
    type: "inject",
    category: "common",
    description: "타임스탬프나 메시지를 주기적으로 또는 수동으로 주입",
    inputs: 0,
    outputs: 1,
    properties: ["payload", "payloadType", "topic", "repeat", "crontab", "once"],
    usage: "시작점으로 사용. 타이머, 스케줄러, 수동 트리거 용도",
  },
  debug: {
    type: "debug",
    category: "common",
    description: "메시지를 사이드바 디버그 패널에 표시",
    inputs: 1,
    outputs: 0,
    properties: ["active", "tosidebar", "console", "complete", "targetType"],
    usage: "흐름 끝에서 결과 확인용. 개발/디버깅에 필수",
  },
  complete: {
    type: "complete",
    category: "common",
    description: "다른 노드의 작업 완료 시 메시지 수신",
    inputs: 0,
    outputs: 1,
    properties: ["scope"],
    usage: "특정 노드 완료 후 후속 작업 실행",
  },
  catch: {
    type: "catch",
    category: "common",
    description: "다른 노드에서 발생한 에러를 캐치",
    inputs: 0,
    outputs: 1,
    properties: ["scope", "uncaught"],
    usage: "에러 핸들링. 로깅이나 알림에 연결",
  },
  status: {
    type: "status",
    category: "common",
    description: "다른 노드의 상태 변경을 감지",
    inputs: 0,
    outputs: 1,
    properties: ["scope"],
    usage: "노드 상태 모니터링",
  },
  "link in": {
    type: "link in",
    category: "common",
    description: "link out 노드에서 메시지를 수신",
    inputs: 0,
    outputs: 1,
    properties: ["links"],
    usage: "플로우 간 연결점. 서브루틴처럼 사용",
  },
  "link out": {
    type: "link out",
    category: "common",
    description: "link in 노드로 메시지를 전송",
    inputs: 1,
    outputs: 0,
    properties: ["mode", "links"],
    usage: "다른 플로우나 재사용 가능한 로직 호출",
  },
  "link call": {
    type: "link call",
    category: "common",
    description: "link in을 호출하고 응답을 기다림",
    inputs: 1,
    outputs: 1,
    properties: ["links", "timeout"],
    usage: "동기식 서브루틴 호출",
  },
  comment: {
    type: "comment",
    category: "common",
    description: "플로우에 주석 추가",
    inputs: 0,
    outputs: 0,
    properties: ["info"],
    usage: "문서화 목적의 주석",
  },
  unknown: {
    type: "unknown",
    category: "common",
    description: "알 수 없는 노드 타입 (플레이스홀더)",
    inputs: 1,
    outputs: 1,
    properties: [],
    usage: "누락된 노드 타입을 표시",
  },

  // ============================================================================
  // Function
  // ============================================================================
  function: {
    type: "function",
    category: "function",
    description: "JavaScript 코드로 메시지 처리",
    inputs: 1,
    outputs: 1, // 가변적
    properties: ["func", "outputs", "timeout", "initialize", "finalize"],
    usage: "복잡한 로직 처리. 여러 출력을 가질 수 있음",
  },
  change: {
    type: "change",
    category: "function",
    description: "메시지 속성을 설정, 변경, 삭제",
    inputs: 1,
    outputs: 1,
    properties: ["rules"],
    usage: "간단한 데이터 변환. function보다 가벼움",
  },
  switch: {
    type: "switch",
    category: "function",
    description: "조건에 따라 메시지를 다른 출력으로 라우팅",
    inputs: 1,
    outputs: 2, // 가변적
    properties: ["property", "rules", "checkall", "repair"],
    usage: "조건 분기. if/else/switch 역할",
  },
  range: {
    type: "range",
    category: "function",
    description: "숫자 값을 다른 범위로 변환",
    inputs: 1,
    outputs: 1,
    properties: ["minin", "maxin", "minout", "maxout", "action", "round"],
    usage: "센서 값 스케일링 등에 사용",
  },
  template: {
    type: "template",
    category: "function",
    description: "템플릿 기반으로 텍스트 생성",
    inputs: 1,
    outputs: 1,
    properties: ["template", "format", "syntax", "field", "output"],
    usage: "Mustache 템플릿으로 HTML, JSON, 텍스트 생성",
  },
  delay: {
    type: "delay",
    category: "function",
    description: "메시지를 지연시키거나 속도 제한",
    inputs: 1,
    outputs: 1,
    properties: ["pauseType", "timeout", "rate", "drop"],
    usage: "타이밍 제어, 레이트 리밋팅",
  },
  trigger: {
    type: "trigger",
    category: "function",
    description: "메시지를 받으면 특정 동작 트리거",
    inputs: 1,
    outputs: 1,
    properties: ["op1", "op2", "duration", "extend", "units"],
    usage: "특정 시간 후 값 전송, 리셋 패턴",
  },
  exec: {
    type: "exec",
    category: "function",
    description: "시스템 명령 실행",
    inputs: 1,
    outputs: 3,
    properties: ["command", "addpay", "append", "useSpawn", "timer"],
    usage: "쉘 명령 실행. 출력: stdout, stderr, return code",
  },
  rbe: {
    type: "rbe",
    category: "function",
    description: "값이 변경될 때만 메시지 전달 (Report by Exception)",
    inputs: 1,
    outputs: 1,
    properties: ["func", "gap", "start"],
    usage: "중복 메시지 필터링, 변화 감지",
  },

  // ============================================================================
  // Network
  // ============================================================================
  "http in": {
    type: "http in",
    category: "network",
    description: "HTTP 엔드포인트 생성",
    inputs: 0,
    outputs: 1,
    properties: ["url", "method", "upload", "swaggerDoc"],
    usage: "REST API 엔드포인트 생성. http response와 쌍으로 사용",
  },
  "http response": {
    type: "http response",
    category: "network",
    description: "HTTP 응답 전송",
    inputs: 1,
    outputs: 0,
    properties: ["statusCode", "headers"],
    usage: "http in의 응답 전송. msg.payload가 응답 본문",
  },
  "http request": {
    type: "http request",
    category: "network",
    description: "HTTP 요청 실행",
    inputs: 1,
    outputs: 1,
    properties: ["method", "url", "ret", "headers", "authType"],
    usage: "외부 API 호출. REST 클라이언트",
  },
  websocket_in: {
    type: "websocket in",
    category: "network",
    description: "WebSocket 메시지 수신",
    inputs: 0,
    outputs: 1,
    properties: ["server", "client"],
    usage: "WebSocket 서버 또는 클라이언트로 메시지 수신",
  },
  websocket_out: {
    type: "websocket out",
    category: "network",
    description: "WebSocket 메시지 송신",
    inputs: 1,
    outputs: 0,
    properties: ["server", "client"],
    usage: "WebSocket을 통해 메시지 전송",
  },
  "tcp in": {
    type: "tcp in",
    category: "network",
    description: "TCP 연결에서 데이터 수신",
    inputs: 0,
    outputs: 1,
    properties: ["server", "host", "port", "datamode"],
    usage: "TCP 서버 또는 클라이언트 입력",
  },
  "tcp out": {
    type: "tcp out",
    category: "network",
    description: "TCP 연결로 데이터 송신",
    inputs: 1,
    outputs: 0,
    properties: ["host", "port", "beserver"],
    usage: "TCP를 통해 데이터 전송",
  },
  "udp in": {
    type: "udp in",
    category: "network",
    description: "UDP 패킷 수신",
    inputs: 0,
    outputs: 1,
    properties: ["port", "multicast"],
    usage: "UDP 서버로 패킷 수신",
  },
  "udp out": {
    type: "udp out",
    category: "network",
    description: "UDP 패킷 송신",
    inputs: 1,
    outputs: 0,
    properties: ["addr", "port", "multicast"],
    usage: "UDP 패킷 전송",
  },
  "mqtt in": {
    type: "mqtt in",
    category: "network",
    description: "MQTT 토픽 구독",
    inputs: 0,
    outputs: 1,
    properties: ["topic", "qos", "broker", "datatype"],
    usage: "MQTT 브로커에서 메시지 수신. IoT에 필수",
  },
  "mqtt out": {
    type: "mqtt out",
    category: "network",
    description: "MQTT 토픽에 발행",
    inputs: 1,
    outputs: 0,
    properties: ["topic", "qos", "retain", "broker"],
    usage: "MQTT 브로커로 메시지 발행",
  },

  // ============================================================================
  // Sequence
  // ============================================================================
  split: {
    type: "split",
    category: "sequence",
    description: "메시지를 여러 개로 분할",
    inputs: 1,
    outputs: 1,
    properties: ["splt", "spltType", "arraySplt", "stream"],
    usage: "배열이나 문자열을 개별 메시지로 분할",
  },
  join: {
    type: "join",
    category: "sequence",
    description: "메시지 시퀀스를 하나로 결합",
    inputs: 1,
    outputs: 1,
    properties: ["mode", "build", "count", "timeout"],
    usage: "분할된 메시지들을 다시 합침",
  },
  sort: {
    type: "sort",
    category: "sequence",
    description: "메시지 시퀀스 정렬",
    inputs: 1,
    outputs: 1,
    properties: ["target", "targetType", "order"],
    usage: "메시지를 특정 속성 기준으로 정렬",
  },
  batch: {
    type: "batch",
    category: "sequence",
    description: "메시지를 배치로 그룹화",
    inputs: 1,
    outputs: 1,
    properties: ["mode", "count", "overlap", "interval"],
    usage: "여러 메시지를 모아서 배치 처리",
  },

  // ============================================================================
  // Parser
  // ============================================================================
  csv: {
    type: "csv",
    category: "parser",
    description: "CSV 파싱 및 생성",
    inputs: 1,
    outputs: 1,
    properties: ["sep", "hdrin", "hdrout", "ret"],
    usage: "CSV 텍스트를 객체로, 객체를 CSV로 변환",
  },
  html: {
    type: "html",
    category: "parser",
    description: "HTML에서 요소 추출",
    inputs: 1,
    outputs: 1,
    properties: ["tag", "ret", "as"],
    usage: "CSS 선택자로 HTML 요소 추출. 웹 스크래핑",
  },
  json: {
    type: "json",
    category: "parser",
    description: "JSON 문자열과 객체 간 변환",
    inputs: 1,
    outputs: 1,
    properties: ["action", "property"],
    usage: "JSON 파싱 및 문자열화",
  },
  xml: {
    type: "xml",
    category: "parser",
    description: "XML과 JavaScript 객체 간 변환",
    inputs: 1,
    outputs: 1,
    properties: ["property", "attr"],
    usage: "XML 파싱 및 생성",
  },
  yaml: {
    type: "yaml",
    category: "parser",
    description: "YAML과 JavaScript 객체 간 변환",
    inputs: 1,
    outputs: 1,
    properties: ["property"],
    usage: "YAML 설정 파일 처리",
  },

  // ============================================================================
  // Storage
  // ============================================================================
  file: {
    type: "file",
    category: "storage",
    description: "파일에 데이터 쓰기",
    inputs: 1,
    outputs: 1,
    properties: ["filename", "appendNewline", "createDir", "overwriteFile"],
    usage: "로컬 파일 시스템에 데이터 저장",
  },
  "file in": {
    type: "file in",
    category: "storage",
    description: "파일에서 데이터 읽기",
    inputs: 1,
    outputs: 1,
    properties: ["filename", "format", "encoding"],
    usage: "로컬 파일 읽기",
  },
  watch: {
    type: "watch",
    category: "storage",
    description: "디렉토리나 파일 변경 감시",
    inputs: 0,
    outputs: 1,
    properties: ["files", "recursive"],
    usage: "파일 시스템 변경 모니터링",
  },
};

/**
 * Get node information by type.
 */
export function getNodeInfo(type: string): NodeTypeInfo | undefined {
  return NODE_CATALOG[type];
}

/**
 * List nodes by category.
 */
export function listNodesByCategory(category: string): NodeTypeInfo[] {
  return Object.values(NODE_CATALOG).filter((n) => n.category === category);
}

/**
 * Get all available categories.
 */
export function getCategories(): string[] {
  const categories = new Set(Object.values(NODE_CATALOG).map((n) => n.category));
  return Array.from(categories).sort();
}

/**
 * Search nodes by keyword.
 */
export function searchNodes(keyword: string): NodeTypeInfo[] {
  const lower = keyword.toLowerCase();
  return Object.values(NODE_CATALOG).filter(
    (n) =>
      n.type.toLowerCase().includes(lower) ||
      n.description.toLowerCase().includes(lower) ||
      n.usage.toLowerCase().includes(lower),
  );
}

/**
 * Get quick reference for a node type.
 */
export function getNodeQuickRef(type: string): string | null {
  const info = NODE_CATALOG[type];
  if (!info) return null;

  return `[${info.type}] ${info.description}
카테고리: ${info.category}
입력: ${info.inputs}, 출력: ${info.outputs}
주요 속성: ${info.properties.slice(0, 5).join(", ")}
사용법: ${info.usage}`;
}
