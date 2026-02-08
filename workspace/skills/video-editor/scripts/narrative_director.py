#!/usr/bin/env python3
"""Narrative Director — transforms quotes into cinematic blueprints.

The blueprint drives all downstream components: TTS prosody, scene visuals,
text animation style, BGM intensity, and silence gap timing.
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
BRAND_FILE = os.path.join(SKILL_DIR, "data", "brand_profiles.json")

# Pace → SSML rate mapping
PACE_MAP = {
    "fast": "+10%",
    "normal": "+0%",
    "slow": "-10%",
    "whisper": "-15%",
}

DIRECTOR_PROMPT = """你是一個短影音敘事導演，專門製作「{brand_name}」風格的 7-15 秒 Instagram Reels。

目標觀眾：{target}
調性：{tone}

你的工作：把一段語錄拆解成電影級的敘事結構。

## 四幕結構

ACT 1 — Hook（鉤子）0-1秒
- 目的：讓拇指停下來
- 手法：猛然提問 / 刺痛的事實 / 令人不安的觀察
- 情緒強度：7-9
- 語速：normal 或 fast
- 視覺：黑暗、神秘、高對比
- 文字出現方式：flash（瞬間全部出現）

ACT 2 — Knife（刀子）1-4秒
- 目的：把刀轉一圈，讓她在不舒服中認出自己
- 手法：具體描述她的日常痛點
- 情緒強度：8-10（最高點）
- 語速：slow，每個字帶重量
- 視覺：孤獨、壓抑、灰暗，慢鏡頭
- 文字出現方式：typewriter（逐字出現）

ACT 3 — Awakening（覺醒）4-6秒
- 目的：揭示真相，那個她一直不敢承認的事
- 手法：一句話翻轉認知
- 情緒強度：6-8（釋放）
- 語速：whisper 或 slow
- 視覺：光線突破（暗→微光），轉場
- 文字出現方式：typewriter（慢速）

## 重要規則
- 語錄文字必須完整保留，不可增刪改
- 根據語意自然斷句，分配到 2-3 個 acts（不是每句一幕）
- 如果語錄很短（<15字），只用 2 幕（hook + awakening）
- visual_mood 和 visual_motion 必須是英文
- bgm_arc 的值加總不重要，代表相對強度

## 輸出格式（嚴格 JSON，不要 markdown）

{{"acts": [{{"role": "hook", "text": "...", "emotion": 8, "pace": "normal", "pitch_shift": 0, "pre_pause_ms": 0, "post_pause_ms": 400, "text_anim": "flash", "visual_mood": "dark mystery, isolation", "visual_motion": "slow push-in through darkness"}}, ...], "silence_gap_s": 2.0, "bgm_arc": [0.7, 0.4, 0.2]}}"""


def _load_brand(brand: str = "dark_awakening") -> dict:
    """Load brand profile from config."""
    with open(BRAND_FILE, "r") as f:
        profiles = json.load(f)
    if brand not in profiles:
        raise ValueError(f"Unknown brand: {brand}. Available: {list(profiles.keys())}")
    return profiles[brand]


def _get_llm_client():
    """Get LLM client (Groq primary, OpenAI fallback)."""
    from openai import OpenAI

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        return (
            OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1"),
            "llama-3.3-70b-versatile",
        )

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return OpenAI(api_key=openai_key), "gpt-4o-mini"

    return None, None


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    text = text.strip()
    # Strip markdown code blocks
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def generate_blueprint(text: str, brand: str = "dark_awakening") -> dict:
    """Analyze a quote and generate a cinematic narrative blueprint.

    Returns a dict with:
      - acts: list of act dicts (role, text, emotion, pace, etc.)
      - silence_gap_s: seconds of silence at the end
      - bgm_arc: list of relative BGM volumes per act
    """
    brand_config = _load_brand(brand)

    client, model = _get_llm_client()
    if not client:
        return _fallback_blueprint(text, brand_config)

    system = DIRECTOR_PROMPT.format(
        brand_name=brand_config["name"],
        target=brand_config["target"],
        tone=brand_config["tone"],
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"語錄：{text}"},
            ],
            temperature=0.4,
            max_tokens=1000,
        )
        raw = response.choices[0].message.content
        blueprint = _extract_json(raw)
        _validate_blueprint(blueprint, text)
        return blueprint
    except Exception as e:
        print(f"  LLM blueprint failed ({e}), using fallback")
        return _fallback_blueprint(text, brand_config)


def _validate_blueprint(bp: dict, original_text: str):
    """Ensure blueprint structure is valid."""
    assert "acts" in bp and len(bp["acts"]) >= 2, "Need at least 2 acts"
    assert "silence_gap_s" in bp, "Missing silence_gap_s"
    assert "bgm_arc" in bp, "Missing bgm_arc"

    for act in bp["acts"]:
        assert "role" in act and act["role"] in ("hook", "knife", "awakening")
        assert "text" in act and act["text"]
        act.setdefault("emotion", 7)
        act.setdefault("pace", "normal")
        act.setdefault("pitch_shift", 0)
        act.setdefault("pre_pause_ms", 0)
        act.setdefault("post_pause_ms", 300)
        act.setdefault("text_anim", "typewriter" if act["role"] != "hook" else "flash")
        act.setdefault("visual_mood", "dark cinematic atmosphere")
        act.setdefault("visual_motion", "slow zoom in")

    # Ensure bgm_arc matches act count
    while len(bp["bgm_arc"]) < len(bp["acts"]):
        bp["bgm_arc"].append(0.3)


def _fallback_blueprint(text: str, brand_config: dict) -> dict:
    """Rule-based blueprint when LLM is unavailable."""
    # Split by sentence-ending punctuation
    sentences = re.split(r"(?<=[。！？])", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    if len(sentences) <= 1:
        # Very short: 2 acts
        acts = [
            {"role": "hook", "text": text, "emotion": 8, "pace": "normal",
             "pitch_shift": 0, "pre_pause_ms": 0, "post_pause_ms": 500,
             "text_anim": "flash", "visual_mood": "dark mystery",
             "visual_motion": "slow push-in through darkness"},
            {"role": "awakening", "text": text, "emotion": 7, "pace": "whisper",
             "pitch_shift": -5, "pre_pause_ms": 0, "post_pause_ms": 0,
             "text_anim": "typewriter", "visual_mood": "soft light breaking through",
             "visual_motion": "slow pull-back revealing light"},
        ]
        return {"acts": acts[:1], "silence_gap_s": 2.0, "bgm_arc": [0.6]}

    if len(sentences) == 2:
        acts = [
            {"role": "hook", "text": sentences[0], "emotion": 8, "pace": "normal",
             "pitch_shift": 0, "pre_pause_ms": 0, "post_pause_ms": 500,
             "text_anim": "flash", "visual_mood": "dark mystery, tension",
             "visual_motion": "slow push-in through darkness"},
            {"role": "awakening", "text": sentences[1], "emotion": 7, "pace": "slow",
             "pitch_shift": -5, "pre_pause_ms": 0, "post_pause_ms": 0,
             "text_anim": "typewriter", "visual_mood": "light breaking, contemplation",
             "visual_motion": "gentle drift revealing warm light"},
        ]
        return {"acts": acts, "silence_gap_s": 2.0, "bgm_arc": [0.7, 0.3]}

    # 3+ sentences: hook + knife + awakening
    hook_text = sentences[0]
    knife_text = "".join(sentences[1:-1])
    awakening_text = sentences[-1]

    acts = [
        {"role": "hook", "text": hook_text, "emotion": 8, "pace": "normal",
         "pitch_shift": 0, "pre_pause_ms": 0, "post_pause_ms": 500,
         "text_anim": "flash", "visual_mood": "dark mystery, harsh light",
         "visual_motion": "slow push-in through darkness"},
        {"role": "knife", "text": knife_text, "emotion": 9, "pace": "slow",
         "pitch_shift": -5, "pre_pause_ms": 0, "post_pause_ms": 300,
         "text_anim": "typewriter", "visual_mood": "isolation, melancholy",
         "visual_motion": "slow drift through empty space"},
        {"role": "awakening", "text": awakening_text, "emotion": 7, "pace": "whisper",
         "pitch_shift": -10, "pre_pause_ms": 0, "post_pause_ms": 0,
         "text_anim": "typewriter", "visual_mood": "light breaking through",
         "visual_motion": "gentle pull-back revealing warm light"},
    ]
    return {"acts": acts, "silence_gap_s": 2.0, "bgm_arc": [0.7, 0.4, 0.2]}


def blueprint_to_ssml(blueprint: dict) -> str:
    """Convert blueprint to SSML for TTS, bypassing prosody director's LLM."""
    parts = []
    for act in blueprint["acts"]:
        rate = PACE_MAP.get(act["pace"], "+0%")
        pitch = f"{act['pitch_shift']:+d}Hz" if act.get("pitch_shift") else "+0Hz"
        text = act["text"]

        if act.get("pre_pause_ms", 0) > 0:
            parts.append(f'<break time="{act["pre_pause_ms"]}ms"/>')

        parts.append(f'<prosody rate="{rate}" pitch="{pitch}">{text}</prosody>')

        if act.get("post_pause_ms", 0) > 0:
            parts.append(f'<break time="{act["post_pause_ms"]}ms"/>')

    return "\n".join(parts)


def blueprint_to_scene_prompts(blueprint: dict, brand_config: dict) -> list[str]:
    """Convert blueprint visual directives to Gemini image prompts."""
    style = brand_config["visual_ip"]["style"]
    negative = brand_config["visual_ip"]["negative"]

    prompts = []
    for act in blueprint["acts"]:
        mood = act.get("visual_mood", "dark cinematic atmosphere")
        prompt = (
            f"Vertical 9:16 cinematic scene: {mood}. "
            f"{style}. "
            f"NO {negative}. "
            f"Composition: rule of thirds, negative space, atmospheric."
        )
        prompts.append(prompt)
    return prompts


def blueprint_to_motion_prompts(blueprint: dict) -> list[str]:
    """Convert blueprint to Veo motion prompts for image-to-video."""
    prompts = []
    for act in blueprint["acts"]:
        motion = act.get("visual_motion", "slow zoom in")
        mood = act.get("visual_mood", "atmospheric")
        prompt = f"{motion}, {mood}, cinematic, 9:16 vertical, no text, no faces"
        prompts.append(prompt)
    return prompts


# =====================================================================
# Dual-Voice Dialogue System
# =====================================================================

DIALOGUE_DYNAMICS = {
    "master": {
        "name": "師父 vs 徒弟",
        "a_role": "沉默寡言的師父——從不直接給答案，只用反問和沉默讓徒弟自己撞牆",
        "b_role": "嘴硬的徒弟——表面不服氣、找藉口、反駁，但每句反駁都暴露了自己的弱點",
        "tension": "師父的每句話都像丟石頭進水裡，徒弟嘴上說不是，但沉默的那幾秒就是答案",
        "arc": "徒弟反駁 → 師父一句話堵死 → 徒弟沉默 → 師父也不再說",
        "format_hint": "exchange",
        "example": """語錄「你不是善良，你只是怕被討厭」→
[B] 我只是不想讓別人不開心而已
[A] 那你讓自己不開心多久了
[B] 那不一樣...我做得到的話...
[A] 你上次拒絕人是什麼時候
[B] ...
[A] （沉默）

注意：師父從不說「你應該怎樣」，只問問題。徒弟不會一直說「我不知道」——她會找藉口、會嘴硬、會岔開話題，這才像真人。""",
    },
    "devil": {
        "name": "魔鬼 vs 天使",
        "a_role": "肩膀上的惡魔——語氣永遠是溫柔的、心疼的、像最懂你的閨蜜。用「親愛的」「寶貝」開頭，然後說出最殘忍的事實。從不質問、從不攻擊，只是輕描淡寫地說出你不敢面對的東西",
        "b_role": "肩膀上的天使——不是空泛的安慰，而是有具體內容的自我說服。會引用真實場景（「上次聚會大家不是說...」「至少工作上...」），但每一個藉口都越來越無力，連自己的聲音都在發抖",
        "tension": "惡魔越溫柔，殺傷力越大。天使越努力辯護，越暴露真相。觀眾聽完會覺得：惡魔才是真正關心你的人",
        "arc": "天使找藉口 → 惡魔溫柔拆穿 → 天使換個藉口 → 惡魔心疼地說出真相 → 天使說不出話",
        "format_hint": "exchange",
        "example": """語錄「你不是善良，你只是怕被討厭」→
[B] 上次同事說我人很好欸
[A] 親愛的，他們說的是你很好用
[B] 不是啊...大家聚會都會找我
[A] 因為你從來不說不，帶你去哪都方便
[B] 我只是不想破壞氣氛...
[A] 寶貝，你有沒有想過，你消失一個禮拜，誰會主動找你？

注意：
- 惡魔永遠不質問（不用「？」結尾的反問句），只用陳述句或溫柔的提醒
- 惡魔語氣要像心疼你的人，不像審問你的人
- 天使不結巴、不說「我不知道」，而是認真地找藉口，用真實場景反駁，但藉口一個比一個薄弱
- 最後一句惡魔的話要讓人「楞住」——不是因為攻擊性，而是因為太準了""",
    },
    "narrator": {
        "name": "旁白 vs 當事人",
        "a_role": "冷眼紀錄片旁白——上帝視角，用第三人稱描述「她」，不帶感情但每句都精準到殘忍",
        "b_role": "當事人的內心獨白——第一人稱，正在經歷、正在騙自己、正在崩潰",
        "tension": "旁白在拆穿，當事人在自欺。觀眾同時看到真相和謊言的並列",
        "arc": "旁白描述場景 → 當事人自我辯護 → 旁白揭示真相 → 當事人沉默",
        "format_hint": "exchange",
        "example": """語錄「你不是放不下，是不甘心」→
[A] 她又打開了那個對話框，往上滑了三十秒
[B] 我只是看看而已
[A] 螢幕亮度調到最低，怕室友發現她在哭
[B] 我沒有在哭
[A] 她刪掉了打好的那行字，第四次了
[B] 我只是...還沒想好要說什麼

注意：旁白只描述「動作」和「畫面」，不描述情緒、不評價。當事人不承認旁白說的，但每句否認都在證實。""",
    },
}

DIALOGUE_PROMPT = """你是一個短影音敘事導演。你製作的不是雞湯，是讓人在凌晨三點存檔的短劇。

## 你的角色動態：{dynamic_name}

- A —— {a_role}
- B —— {b_role}

**核心張力：** {tension}
**敘事弧線：** {arc}

## 示範（學習風格，不要照抄）

{example}

## 禁止清單（違反任何一條 = 垃圾內容）

❌ 「為自己而活」「做自己」「你值得更好的」——爛大街，刪
❌ 「因為你太善良了」「你不是軟弱」——廉價安慰，刪
❌ 任何一句在小紅書刷到 100 次以上的話——刪
❌ 直接給答案、給建議、給方向——觀眾不需要你教
❌ 上帝視角的俯瞰同情——「你辛苦了」「你已經很棒了」——噁心，刪

## 必須做到

✅ 用具體畫面取代抽象概念——不說「你很累」，說「你在廁所哭完還會補妝」
✅ 用問題取代答案——不說「你該放手」，說「你上一次覺得輕鬆是什麼時候？」
✅ 讓觀眾自己得出結論——你只負責把鏡子舉到她面前
✅ 對話要像真人在講話——有口語、有停頓、有沒說完的半句話
✅ 每段結尾不要收得太滿——留白比金句更致命

## 視角引擎（從以下手法中選擇 1-2 個）

1. **顯微鏡** — 放大一個極度具體的日常細節（「你回覆訊息前會先等兩分鐘」）
2. **反轉鏡** — 把公認的優點翻成缺點（「你的體貼是一種控制」）
3. **X光** — 拆穿行為背後的真實動機（「你不是捨不得他，你是捨不得你投入的時間」）
4. **慢動作** — 把一個瞬間拉成慢鏡頭（「你笑著說沒事的那 0.5 秒，眼睛是空的」）
5. **第三者** — 從旁觀者角度描述（「你朋友其實都看得出來，只是不敢跟你說」）

## 輸出格式（嚴格 JSON，不要 markdown）

{{"format": "exchange", "dynamic": "{dynamic_key}", "context": "一句話場景（具體時間地點，如：週三晚上十一點的客廳，電視開著但沒人在看）", "lines": [{{"char": "A", "text": "台詞", "emotion": 1-10, "pause_after_ms": 300-1200, "visual_mood": "英文視覺描述"}}, ...], "silence_gap_s": 2.0, "bgm_arc": [每段 BGM 相對音量 0.0-1.0]}}

## 禁止句型（出現 = 立刻重寫）

- 「我不知道」— 真人不會連續說三次我不知道。用具體動作代替：沉默、岔開話題、反問、找藉口
- 「...」作為完整台詞 — 省略號不是台詞，要嘛說半句話斷掉，要嘛用具體的小動作
- 任何形式的「你已經很棒了」「你辛苦了」「你值得更好的」
- 連續兩個問句 — 一個問題就夠了，多了像審訊
- B 的每句話都以「我只是...」開頭 — 要有變化：嘴硬、反駁、岔開、裝沒事

## 規則

- 語錄的核心意思必須保留，但你必須改寫、拆解、重新包裝——不能原封不動照搬
- 每段台詞 5-20 字，口語化，像真人在說話
- 總共 4-8 段台詞，A/B 交替
- pause_after_ms：短停（300ms）= 緊湊，長停（800-1200ms）= 沉重
- visual_mood 反映角色處境（英文），要具體不要抽象
- bgm_arc 長度 = lines 長度
- 每句台詞必須和前一句不同句式——不能連續用問句、連續用「我只是」、連續用否認"""


DIALOGUE_VOICE_A = "7f92f8afb8ec43bf81429cc1c9199cb1"  # AD学姐 — deep cinematic
DIALOGUE_VOICE_B = "59cb5986671546eaa6ca8ae6f29f6d22"  # 央视配音 — clear authoritative


def _pick_dynamic(client, model, text: str) -> str:
    """Quick LLM call to pick the best dynamic for a given quote."""
    options = "\n".join(
        f"- {k}: {v['name']}（{v['tension']}）"
        for k, v in DIALOGUE_DYNAMICS.items()
    )
    try:
        r = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": f"根據語錄內容，選擇最適合的角色動態。只回覆 key（master/devil/narrator）。\n\n{options}"},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=20,
        )
        pick = r.choices[0].message.content.strip().lower()
        for k in DIALOGUE_DYNAMICS:
            if k in pick:
                return k
    except Exception:
        pass
    return "master"


def generate_dialogue_blueprint(
    text: str, brand: str = "dark_awakening", dynamic: str = "auto",
) -> dict:
    """Generate a dual-voice dialogue blueprint from a quote/theme.

    dynamic: "master", "devil", "narrator", or "auto" (LLM picks best fit).
    """
    brand_config = _load_brand(brand)

    client, model = _get_llm_client()
    if not client:
        return _fallback_dialogue(text)

    # Pick dynamic
    if dynamic == "auto":
        # Let the LLM decide — use a quick pre-call
        dyn_key = _pick_dynamic(client, model, text)
    elif dynamic in DIALOGUE_DYNAMICS:
        dyn_key = dynamic
    else:
        dyn_key = "master"

    dyn = DIALOGUE_DYNAMICS[dyn_key]
    system = DIALOGUE_PROMPT.format(
        dynamic_name=dyn["name"],
        a_role=dyn["a_role"],
        b_role=dyn["b_role"],
        tension=dyn["tension"],
        arc=dyn["arc"],
        dynamic_key=dyn_key,
        example=dyn["example"],
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"語錄：{text}"},
            ],
            temperature=0.85,
            max_tokens=1500,
        )
        raw = response.choices[0].message.content
        bp = _extract_json(raw)
        _validate_dialogue(bp)
        _scrub_dialogue(bp)
        # Inject voice IDs
        bp["voices"] = {"A": DIALOGUE_VOICE_A, "B": DIALOGUE_VOICE_B}
        return bp
    except Exception as e:
        print(f"  LLM dialogue failed ({e}), using fallback")
        return _fallback_dialogue(text)


def _validate_dialogue(bp: dict):
    """Validate dialogue blueprint structure."""
    assert "format" in bp and bp["format"] in ("exchange", "mirror", "timeline")
    assert "lines" in bp and len(bp["lines"]) >= 2
    assert "silence_gap_s" in bp
    bp.setdefault("dynamic", "master")

    for line in bp["lines"]:
        assert "char" in line and line["char"] in ("A", "B")
        assert "text" in line and line["text"]
        line.setdefault("emotion", 7)
        line.setdefault("pause_after_ms", 500)
        line.setdefault("visual_mood", "dark cinematic atmosphere")

    bp.setdefault("bgm_arc", [0.5] * len(bp["lines"]))
    bp.setdefault("context", "")
    while len(bp["bgm_arc"]) < len(bp["lines"]):
        bp["bgm_arc"].append(0.3)


# Cliché patterns to strip from dialogue lines
_CLICHE_STUBS = [
    "我不知道", "我...我不知道", "我、我不知道",
    "...", "…", "……",
]


def _scrub_dialogue(bp: dict):
    """Remove lines that are just cliché stubs (e.g. '我不知道', bare '...')."""
    cleaned = []
    for line in bp["lines"]:
        text = line["text"].strip()
        # Skip lines that are just a cliché stub
        if text in _CLICHE_STUBS or re.fullmatch(r"[.…、\s]+", text):
            continue
        # Strip trailing stutters like "我...我不知道" embedded in longer text
        text = re.sub(r"[，,]?\s*我[.…]*不知道[.…]*$", "", text).strip()
        if not text:
            continue
        line["text"] = text
        cleaned.append(line)
    # Ensure A/B still alternate — if we removed a line, merge adjacent same-char
    bp["lines"] = cleaned
    if bp.get("bgm_arc"):
        bp["bgm_arc"] = bp["bgm_arc"][:len(cleaned)]


def _fallback_dialogue(text: str) -> dict:
    """Rule-based dialogue when LLM unavailable."""
    sentences = re.split(r"(?<=[。！？])", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    lines = []
    for i, s in enumerate(sentences):
        char = "A" if i % 2 == 0 else "B"
        lines.append({
            "char": char, "text": s, "emotion": 8 - i,
            "pause_after_ms": 600, "visual_mood": "dark isolation" if char == "A" else "cold light",
        })

    return {
        "format": "exchange",
        "context": "",
        "lines": lines,
        "silence_gap_s": 2.0,
        "bgm_arc": [0.6 - i * 0.1 for i in range(len(lines))],
        "voices": {"A": DIALOGUE_VOICE_A, "B": DIALOGUE_VOICE_B},
    }


def dialogue_to_scene_prompts(bp: dict, brand_config: dict) -> list[str]:
    """Convert dialogue blueprint to scene prompts (one per line)."""
    style = brand_config["visual_ip"]["style"]
    negative = brand_config["visual_ip"]["negative"]
    prompts = []
    for line in bp["lines"]:
        mood = line.get("visual_mood", "dark cinematic atmosphere")
        prompts.append(
            f"Vertical 9:16 cinematic scene: {mood}. "
            f"{style}. NO {negative}. "
            f"Composition: rule of thirds, negative space, atmospheric."
        )
    return prompts


if __name__ == "__main__":
    import sys

    test = "你為什麼不快樂？因為你從來沒為自己考慮過，總把別人的感受放在第一位。"
    if len(sys.argv) > 1:
        test = sys.argv[1]

    print("=== Narrative Director Test ===\n")
    bp = generate_blueprint(test)
    print(json.dumps(bp, indent=2, ensure_ascii=False))

    print("\n=== SSML ===")
    print(blueprint_to_ssml(bp))

    print("\n=== Scene Prompts ===")
    brand = _load_brand()
    for i, p in enumerate(blueprint_to_scene_prompts(bp, brand)):
        print(f"  [{i}] {p[:100]}...")

    print("\n=== Motion Prompts ===")
    for i, p in enumerate(blueprint_to_motion_prompts(bp)):
        print(f"  [{i}] {p}")
