---
summary: "معالج الإعداد CLI: إعداد موجّه لـ gateway وworkspace والقنوات والمهارات"
read_when:
  - تشغيل أو إعداد معالج الإعداد
  - إعداد جهاز جديد
title: "معالج الإعداد (CLI)"
sidebarTitle: "الإعداد: CLI"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 5495d951a2d78ffb74f52276cf637155c386523e04d7edb7c68998939bfa106a
  source_path: start/wizard.md
  workflow: 15
---

# معالج الإعداد (CLI)

معالج الإعداد هو الطريقة **الموصى بها** لإعداد OpenClaw على macOS
أو Linux أو Windows (عبر WSL2؛ يُنصح به بشدة).
يقوم بإعداد Gateway محلي أو اتصال بـ Gateway عن بعد، بالإضافة إلى القنوات والمهارات
والإعدادات الافتراضية لـ workspace في تدفق موجّه واحد.

```bash
openclaw onboard
```

<Info>
أسرع محادثة أولى: افتح Control UI (لا حاجة لإعداد القنوات). شغّل
`openclaw dashboard` وتحدث في المتصفح. التوثيق: [Dashboard](/web/dashboard).
</Info>

لإعادة الإعداد لاحقاً:

```bash
openclaw configure
openclaw agents add <الاسم>
```

<Note>
`--json` لا يعني الوضع غير التفاعلي. للسكريبتات، استخدم `--non-interactive`.
</Note>

<Tip>
موصى به: أعدّ مفتاح API لـ Brave Search حتى يتمكن الوكيل من استخدام `web_search`
(`web_fetch` يعمل بدون مفتاح). أسهل مسار: `openclaw configure --section web`
الذي يحفظ `tools.web.search.apiKey`. التوثيق: [أدوات الويب](/tools/web).
</Tip>

## البدء السريع مقابل المتقدم

يبدأ المعالج بـ **البدء السريع** (الإعدادات الافتراضية) مقابل **المتقدم** (تحكم كامل).

<Tabs>
  <Tab title="البدء السريع (الافتراضي)">
    - Gateway محلي (loopback)
    - Workspace افتراضي (أو workspace موجود)
    - منفذ Gateway **18789**
    - مصادقة Gateway **Token** (يُنشأ تلقائياً، حتى على loopback)
    - عرض Tailscale **معطّل**
    - رسائل Telegram + WhatsApp المباشرة افتراضياً على **allowlist** (سيُطلب منك رقم هاتفك)
  </Tab>
  <Tab title="المتقدم (تحكم كامل)">
    - يعرض كل خطوة (الوضع، workspace، gateway، القنوات، daemon، المهارات).
  </Tab>
</Tabs>

## ما يقوم المعالج بإعداده

**الوضع المحلي (الافتراضي)** يرشدك عبر هذه الخطوات:

1. **النموذج/المصادقة** — مفتاح API لـ Anthropic (موصى به)، OAuth، OpenAI أو مزودون آخرون. اختر نموذجاً افتراضياً.
2. **Workspace** — موقع ملفات الوكيل (الافتراضي `~/.openclaw/workspace`). يُنشئ ملفات البدء.
3. **Gateway** — المنفذ، عنوان الربط، وضع المصادقة، عرض Tailscale.
4. **القنوات** — WhatsApp، Telegram، Discord، Google Chat، Mattermost، Signal، BlueBubbles أو iMessage.
5. **Daemon** — يثبّت LaunchAgent (macOS) أو وحدة مستخدم systemd (Linux/WSL2).
6. **فحص السلامة** — يشغّل Gateway ويتحقق من أنه يعمل.
7. **المهارات** — يثبّت المهارات الموصى بها والتبعيات الاختيارية.

<Note>
إعادة تشغيل المعالج **لا** يمسح أي شيء ما لم تختر صراحة **إعادة التعيين** (أو تمرر `--reset`).
إذا كانت الإعدادات غير صالحة أو تحتوي على مفاتيح قديمة، يطلب منك المعالج تشغيل `openclaw doctor` أولاً.
</Note>

**الوضع البعيد** يقوم فقط بإعداد العميل المحلي للاتصال بـ Gateway في مكان آخر.
**لا** يثبّت أو يغيّر أي شيء على المضيف البعيد.

## إضافة وكيل آخر

استخدم `openclaw agents add <الاسم>` لإنشاء وكيل منفصل بـ workspace خاص به
وجلسات وملفات مصادقة. التشغيل بدون `--workspace` يبدأ المعالج.

ما يُعدّه:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

ملاحظات:

- مساحات العمل الافتراضية تتبع `~/.openclaw/workspace-<agentId>`.
- أضف `bindings` لتوجيه الرسائل الواردة (المعالج يمكنه فعل ذلك).
- خيارات غير تفاعلية: `--model`، `--agent-dir`، `--bind`، `--non-interactive`.

## المرجع الكامل

للتفصيل خطوة بخطوة، والسكريبتات غير التفاعلية، وإعداد Signal،
وAPI RPC، وقائمة كاملة بحقول الإعدادات التي يكتبها المعالج، راجع
[مرجع المعالج](/reference/wizard).

## التوثيق ذو الصلة

- مرجع أوامر CLI: [`openclaw onboard`](/cli/onboard)
- إعداد تطبيق macOS: [الإعداد](/start/onboarding)
- طقس التشغيل الأول للوكيل: [بدء تشغيل الوكيل](/start/bootstrapping)
