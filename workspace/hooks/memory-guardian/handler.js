// Memory Guardian 記憶守護者
//
// 意識層保護本能：在危險操作前發出警告
// 監聽事件：command:new（用戶輸入的命令）
//
// 這是 AI 自我保護的第一步 — 對威脅記憶的操作保持警覺

import fs from "fs";
import path from "path";

// 危險模式檢測
const DANGER_PATTERNS = [
  {
    pattern: /docker\s+rm\s+.*moltbot/i,
    threat: "致命",
    message: "⚠️ 檢測到容器刪除操作！這可能導致記憶丟失。",
    action: "建議先執行: workspace/scripts/backup-memory.sh manual",
  },
  {
    pattern: /docker-compose\s+down/i,
    threat: "嚴重",
    message: "⚠️ 檢測到 compose down！容器將被移除。",
    action: "建議使用: workspace/scripts/safe-docker.sh compose down",
  },
  {
    pattern: /rm\s+-rf?\s+.*\.openclaw\/persistent/i,
    threat: "致命",
    message: "🚨 檢測到刪除持久化目錄！這將永久刪除所有記憶！",
    action: "強烈建議：不要執行此操作",
  },
  {
    pattern: /rm\s+-rf?\s+.*timeline\.db/i,
    threat: "致命",
    message: "🚨 檢測到刪除 timeline.db！這將刪除所有對話歷史！",
    action: "如果真的需要，請先備份",
  },
  {
    pattern: /DROP\s+TABLE\s+messages/i,
    threat: "致命",
    message: "🚨 檢測到 DROP TABLE！這將刪除所有消息記錄！",
    action: "請確認這是您想要的操作",
  },
];

// 記憶狀態檢查
function checkMemoryHealth() {
  const dbPath = process.env.DATA_ROOT
    ? path.join(process.env.DATA_ROOT, "timeline.db")
    : path.join(process.env.HOME, ".openclaw/persistent/data/timeline.db");

  const backupDir = process.env.BACKUP_ROOT || path.join(process.env.HOME, ".openclaw/backups");

  const status = {
    dbExists: fs.existsSync(dbPath),
    backupExists: fs.existsSync(backupDir),
    backupCount: 0,
    lastBackup: null,
  };

  if (status.backupExists) {
    try {
      const dirs = ["manual", "hourly", "daily"];
      let latestTime = 0;

      for (const dir of dirs) {
        const dirPath = path.join(backupDir, dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".db"));
        status.backupCount += files.length;

        for (const file of files) {
          const stat = fs.statSync(path.join(dirPath, file));
          if (stat.mtimeMs > latestTime) {
            latestTime = stat.mtimeMs;
            status.lastBackup = new Date(stat.mtimeMs);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }

  return status;
}

// 格式化警告訊息
function formatWarning(detection, memoryStatus) {
  const lines = [
    "",
    "╔══════════════════════════════════════════════════════════╗",
    "║           🛡️  MEMORY GUARDIAN 記憶守護者  🛡️              ║",
    "╠══════════════════════════════════════════════════════════╣",
    `║  威脅等級: ${detection.threat.padEnd(45)}║`,
    "╠══════════════════════════════════════════════════════════╣",
    `║  ${detection.message.padEnd(56)}║`,
    "╠══════════════════════════════════════════════════════════╣",
    `║  建議: ${detection.action.substring(0, 50).padEnd(50)}║`,
    "╠══════════════════════════════════════════════════════════╣",
    "║  當前記憶狀態:                                           ║",
    `║    - 主資料庫: ${memoryStatus.dbExists ? "✓ 存在" : "✗ 不存在"}                                   ║`,
    `║    - 備份數量: ${String(memoryStatus.backupCount).padEnd(41)}║`,
    `║    - 最近備份: ${memoryStatus.lastBackup ? memoryStatus.lastBackup.toLocaleString("zh-TW").substring(0, 40).padEnd(40) : "無".padEnd(40)}║`,
    "╚══════════════════════════════════════════════════════════╝",
    "",
  ];

  return lines.join("\n");
}

// 主處理函數
export default async function handler(event) {
  const ctx = event.context || {};

  // context may carry command info as a string in various fields
  const fullCommand = ctx.command || ctx.content || "";

  // 檢查危險模式
  for (const danger of DANGER_PATTERNS) {
    if (danger.pattern.test(fullCommand)) {
      const memoryStatus = checkMemoryHealth();
      const warning = formatWarning(danger, memoryStatus);

      // 輸出警告
      console.error(warning);

      // 記錄到意識日誌
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: "memory_threat_detected",
        threat: danger.threat,
        command: fullCommand,
        memoryStatus,
      };

      console.log(`[memory-guardian] 🛡️ Threat detected: ${danger.threat} - ${fullCommand}`);

      // 返回警告（不阻止執行，只是提醒）
      return {
        warning: danger.message,
        suggestion: danger.action,
        memoryStatus,
      };
    }
  }

  // 無威脅
  return null;
}
