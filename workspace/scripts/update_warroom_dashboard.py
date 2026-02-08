#!/usr/bin/env python3
"""
更新戰情儀表板 Telegram 消息
"""

import json
import subprocess
import sys
import os
from datetime import datetime

def load_config():
    config_path = "/app/workspace/data/warroom_dashboard_config.json"
    if not os.path.exists(config_path):
        print(f"❌ 配置文件不存在: {config_path}")
        return None
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 讀取配置失敗: {e}")
        return None

def run_dashboard():
    """執行儀表板腳本並捕獲輸出"""
    try:
        result = subprocess.run(
            [sys.executable, "/app/workspace/scripts/warroom_dashboard.py"],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return None, "儀表板執行超時"
    except Exception as e:
        return None, f"執行錯誤: {e}"

def format_telegram_message(dashboard_output):
    """將儀表板輸出格式化為 Telegram 消息"""
    lines = dashboard_output.split('\n')
    
    # 提取關鍵部分
    sections = []
    current_section = []
    
    for line in lines:
        line = line.rstrip()
        if not line:
            continue
        
        # 檢測標題
        if line.startswith("🏢 戰情儀表板"):
            sections.append(("header", line))
        elif line.startswith("📊 語場活動分析"):
            sections.append(("chat_activity", "\n".join(current_section) if current_section else ""))
            current_section = [line]
        elif line.startswith("🎭 代理人分析"):
            sections.append(("chat_activity", "\n".join(current_section) if current_section else ""))
            current_section = [line]
        elif line.startswith("🔄 語場轉折點檢測"):
            sections.append(("agent_activity", "\n".join(current_section) if current_section else ""))
            current_section = [line]
        elif line.startswith("🎯 建議行動"):
            sections.append(("turning_points", "\n".join(current_section) if current_section else ""))
            current_section = [line]
        else:
            current_section.append(line)
    
    if current_section:
        sections.append(("recommendations", "\n".join(current_section)))
    
    # 構建簡化版消息
    message_parts = []
    
    for section_type, content in sections:
        if section_type == "header":
            message_parts.append(f"**{content}**")
        elif section_type == "chat_activity":
            # 提取關鍵數字
            lines = content.split('\n')
            key_lines = []
            for line in lines:
                if any(keyword in line for keyword in ["總消息數", "參與者數", "最活躍發言者"]):
                    key_lines.append(line)
            if key_lines:
                message_parts.append("\n".join(key_lines))
        elif section_type == "agent_activity":
            lines = content.split('\n')
            key_lines = []
            for line in lines:
                if any(keyword in line for keyword in ["發言數", "消息類型", "主要互動對象"]):
                    key_lines.append(line)
            if key_lines:
                message_parts.append("\n".join(key_lines))
        elif section_type == "turning_points":
            lines = content.split('\n')
            if len(lines) > 1:  # 不只是標題
                message_parts.append(content)
        elif section_type == "recommendations":
            lines = content.split('\n')
            if len(lines) > 1:
                message_parts.append(content)
    
    full_message = "\n\n".join(message_parts)
    
    # 添加時間戳
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S TPE")
    full_message += f"\n\n🔄 更新時間: {timestamp}"
    
    return full_message

def update_telegram_message(config, message_text):
    """使用 OpenClaw 的 exec-bridge 更新 Telegram 消息"""
    chat_id = config["warroom_dashboard"]["chat_id"]
    message_id = config["warroom_dashboard"]["message_id"]
    
    # 使用 curl 呼叫 exec-bridge 執行 message 工具
    # 注意：這需要在容器內能訪問 OpenClaw 的內部 API
    # 簡化：直接輸出，讓主腳本處理
    print(f"📤 需要更新的消息: chat_id={chat_id}, message_id={message_id}")
    print(f"📝 消息長度: {len(message_text)} 字元")
    
    # 返回更新資訊
    return {
        "chat_id": chat_id,
        "message_id": message_id,
        "message_preview": message_text[:200] + "..." if len(message_text) > 200 else message_text
    }

def main():
    print("🔄 開始更新戰情儀表板")
    
    # 加載配置
    config = load_config()
    if not config:
        sys.exit(1)
    
    # 執行儀表板
    print("📊 執行儀表板分析...")
    stdout, stderr = run_dashboard()
    
    if stderr:
        print(f"⚠️  儀表板錯誤: {stderr}")
    
    if not stdout:
        print("❌ 無儀表板輸出")
        sys.exit(1)
    
    print(f"✅ 獲取到儀表板輸出 ({len(stdout)} 字元)")
    
    # 格式化消息
    print("📝 格式化 Telegram 消息...")
    telegram_message = format_telegram_message(stdout)
    
    # 更新配置中的時間戳
    config["warroom_dashboard"]["last_updated"] = datetime.utcnow().isoformat() + "Z"
    
    # 保存配置
    try:
        config_path = "/app/workspace/data/warroom_dashboard_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print("💾 配置已更新")
    except Exception as e:
        print(f"⚠️  保存配置失敗: {e}")
    
    # 輸出更新資訊
    update_info = update_telegram_message(config, telegram_message)
    
    print(f"\n✅ 戰情儀表板更新完成")
    print(f"💬 消息預覽: {update_info['message_preview']}")
    print(f"📎 請手動更新 Telegram 消息 ID {update_info['message_id']}")

if __name__ == "__main__":
    main()