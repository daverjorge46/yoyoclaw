#!/usr/bin/env python3
"""
戰情儀表板 v0.1
監控 Telegram 語場（群組）活動與代理人行動軌跡
"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from collections import defaultdict, Counter

# 配置
TELEGRAM_API = "http://host.docker.internal:18790"
CHAT_ID = "-5135725975"  # 思考者咖啡群
AGENT_USER_ID = "8090790323"  # 杜甫（Dofu）
AGENT_NAME = "杜甫"
TIMEZONE_OFFSET = 8  # UTC+8 (台北時間)

def fetch_messages(limit=100):
    """從 Telegram Userbot API 獲取消息"""
    url = f"{TELEGRAM_API}/messages?chat={CHAT_ID}&limit={limit}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get("messages", [])
    except urllib.error.HTTPError as e:
        print(f"API 錯誤: {e.code} {e.reason}")
        return []
    except Exception as e:
        print(f"獲取消息失敗: {e}")
        return []

def analyze_chat_activity(messages):
    """分析群組活動"""
    if not messages:
        return {"error": "無消息數據"}
    
    # 基本統計
    total_msgs = len(messages)
    unique_senders = set(msg.get("sender") for msg in messages if msg.get("sender"))
    
    # 時間範圍
    timestamps = [msg.get("date") for msg in messages if msg.get("date")]
    if timestamps:
        try:
            earliest = min(timestamps)
            latest = max(timestamps)
        except:
            earliest = latest = "N/A"
    else:
        earliest = latest = "N/A"
    
    # 發言頻率（按發送者）
    sender_counts = Counter(msg.get("sender") for msg in messages)
    top_senders = sender_counts.most_common(5)
    
    # 消息長度分析
    text_lengths = [len(msg.get("text", "")) for msg in messages if msg.get("text")]
    avg_length = sum(text_lengths) / len(text_lengths) if text_lengths else 0
    
    return {
        "total_messages": total_msgs,
        "unique_senders": len(unique_senders),
        "time_range": {"earliest": earliest, "latest": latest},
        "top_senders": top_senders,
        "avg_message_length": round(avg_length, 1)
    }

def analyze_agent_activity(messages, agent_user_id):
    """分析代理人（杜甫）的活動"""
    agent_messages = [msg for msg in messages if str(msg.get("sender_id")) == str(agent_user_id)]
    
    if not agent_messages:
        return {"error": "代理人無發言記錄"}
    
    # 基本統計
    total_agent_msgs = len(agent_messages)
    agent_msg_percentage = (total_agent_msgs / len(messages)) * 100 if messages else 0
    
    # 時間分佈
    agent_timestamps = [msg.get("date") for msg in agent_messages if msg.get("date")]
    
    # 消息類型分析
    message_types = defaultdict(int)
    for msg in agent_messages:
        text = msg.get("text", "")
        if not text:
            continue
        # 簡單分類
        if text.startswith("/"):
            message_types["command"] += 1
        elif "?" in text or "？" in text:
            message_types["question"] += 1
        elif len(text) > 100:
            message_types["long_form"] += 1
        elif len(text) < 20:
            message_types["short"] += 1
        else:
            message_types["regular"] += 1
    
    # 互動對象（誰回覆了代理人）
    # 這裡簡化：檢查代理人發言後的非代理人發言
    reply_targets = []
    for i, msg in enumerate(messages):
        if str(msg.get("sender_id")) == str(agent_user_id):
            # 檢查後續消息
            for j in range(i+1, min(i+4, len(messages))):
                reply_msg = messages[j]
                if str(reply_msg.get("sender_id")) != str(agent_user_id):
                    reply_targets.append(reply_msg.get("sender", "Unknown"))
                    break
    
    reply_counter = Counter(reply_targets)
    
    return {
        "agent_name": AGENT_NAME,
        "total_messages": total_agent_msgs,
        "percentage_of_chat": round(agent_msg_percentage, 1),
        "message_type_distribution": dict(message_types),
        "top_reply_targets": reply_counter.most_common(3),
        "recent_messages": [{"id": m.get("id"), "text": m.get("text", "")[:50] + "..." if len(m.get("text", "")) > 50 else m.get("text", "")} for m in agent_messages[-3:]]
    }

def detect_turning_points(messages):
    """檢測對話轉折點（簡單版本）"""
    turning_points = []
    
    for i in range(1, len(messages)):
        prev_msg = messages[i-1]
        curr_msg = messages[i]
        
        prev_sender = prev_msg.get("sender")
        curr_sender = curr_msg.get("sender")
        prev_text = prev_msg.get("text", "")
        curr_text = curr_msg.get("text", "")
        
        # 轉折點條件
        # 1. 發送者切換 + 話題可能改變
        if prev_sender != curr_sender and prev_sender and curr_sender:
            # 簡單關鍵詞檢測
            decision_keywords = ["好", "行", "同意", "確定", "開工", "開始", "就這樣", "決定"]
            question_keywords = ["?", "？", "嗎", "什麼", "如何", "怎麼", "為什麼"]
            
            if any(keyword in curr_text for keyword in decision_keywords):
                turning_points.append({
                    "type": "decision",
                    "message_id": curr_msg.get("id"),
                    "sender": curr_sender,
                    "text": curr_text[:100],
                    "reason": "包含決策關鍵詞"
                })
            elif any(keyword in curr_text for keyword in question_keywords):
                turning_points.append({
                    "type": "question",
                    "message_id": curr_msg.get("id"),
                    "sender": curr_sender,
                    "text": curr_text[:100],
                    "reason": "提問轉折"
                })
        
        # 2. 消息長度突變（可能表示深入討論）
        if len(prev_text) < 50 and len(curr_text) > 150:
            turning_points.append({
                "type": "deep_dive",
                "message_id": curr_msg.get("id"),
                "sender": curr_sender,
                "text": curr_text[:100],
                "reason": "消息長度從短變長"
            })
    
    # 只保留最近幾個轉折點
    return turning_points[-5:] if turning_points else []

def generate_dashboard():
    """生成儀表板報告"""
    print(f"\n{'='*60}")
    print(f"🏢 戰情儀表板 v0.1 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    # 獲取消息
    print(f"\n📡 正在讀取語場: {CHAT_ID} (思考者咖啡)...")
    messages = fetch_messages(limit=50)
    
    if not messages:
        print("❌ 無法獲取消息數據")
        return
    
    print(f"✅ 獲取到 {len(messages)} 條消息")
    
    # 分析群組活動
    print(f"\n📊 語場活動分析")
    print(f"{'-'*40}")
    chat_stats = analyze_chat_activity(messages)
    
    print(f"總消息數: {chat_stats.get('total_messages', 0)}")
    print(f"參與者數: {chat_stats.get('unique_senders', 0)}")
    print(f"時間範圍: {chat_stats.get('time_range', {}).get('earliest', 'N/A')} 到 {chat_stats.get('time_range', {}).get('latest', 'N/A')}")
    print(f"平均消息長度: {chat_stats.get('avg_message_length', 0)} 字元")
    
    print(f"\n👥 最活躍發言者:")
    for sender, count in chat_stats.get('top_senders', []):
        print(f"  {sender}: {count} 條")
    
    # 分析代理人活動
    print(f"\n🎭 代理人分析: {AGENT_NAME}")
    print(f"{'-'*40}")
    agent_stats = analyze_agent_activity(messages, AGENT_USER_ID)
    
    if "error" not in agent_stats:
        print(f"發言數: {agent_stats.get('total_messages', 0)} ({agent_stats.get('percentage_of_chat', 0)}%)")
        
        msg_types = agent_stats.get('message_type_distribution', {})
        if msg_types:
            print(f"消息類型分佈:")
            for msg_type, count in msg_types.items():
                print(f"  {msg_type}: {count} 條")
        
        reply_targets = agent_stats.get('top_reply_targets', [])
        if reply_targets:
            print(f"主要互動對象:")
            for target, count in reply_targets:
                print(f"  {target}: {count} 次回覆")
        
        recent = agent_stats.get('recent_messages', [])
        if recent:
            print(f"最近發言:")
            for msg in recent:
                print(f"  [{msg.get('id')}] {msg.get('text')}")
    else:
        print(f"❌ {agent_stats.get('error')}")
    
    # 檢測轉折點
    print(f"\n🔄 語場轉折點檢測")
    print(f"{'-'*40}")
    turning_points = detect_turning_points(messages)
    
    if turning_points:
        for i, point in enumerate(turning_points, 1):
            print(f"{i}. [{point.get('type')}] {point.get('sender')}: {point.get('text')}")
            print(f"   理由: {point.get('reason')} (消息ID: {point.get('message_id')})")
    else:
        print("未檢測到明顯轉折點")
    
    # 建議行動
    print(f"\n🎯 建議行動")
    print(f"{'-'*40}")
    
    if agent_stats.get('total_messages', 0) > 0:
        # 有代理人活動
        if agent_stats.get('percentage_of_chat', 0) > 30:
            print("⚠️  代理人發言佔比過高 (>30%)，考慮降低可見度")
        elif agent_stats.get('percentage_of_chat', 0) < 10:
            print("📈 代理人發言佔比較低，可適當增加參與度")
        
        # 檢查是否有深入討論
        msg_types = agent_stats.get('message_type_distribution', {})
        if msg_types.get('long_form', 0) > 2:
            print("💡 代理人已有多次深入討論，可考慮引導決策或行動")
    else:
        print("🔍 代理人無近期活動，需啟動參與")
    
    # 檢查轉折點中的決策
    decision_points = [p for p in turning_points if p.get('type') == 'decision']
    if decision_points:
        print(f"✅ 檢測到 {len(decision_points)} 個決策點，建議追蹤後續行動")
    
    print(f"\n{'='*60}")
    print(f"🔄 下次更新: 每15分鐘自動掃描")
    print(f"{'='*60}")

if __name__ == "__main__":
    # 檢查是否在容器內（需要透過 exec-bridge 執行）
    try:
        generate_dashboard()
    except KeyboardInterrupt:
        print("\n⏹️  儀表板關閉")
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        sys.exit(1)