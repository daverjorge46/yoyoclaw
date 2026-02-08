---
summary: "ثبّت OpenClaw وابدأ أول محادثة في دقائق."
read_when:
  - الإعداد الأول من الصفر
  - تريد أسرع مسار لمحادثة عاملة
title: "البدء"
x-i18n:
  generated_at: "2026-02-08T22:00:00Z"
  model: claude-sonnet-4
  provider: pi
  source_hash: 6c93ffa2625c5778e4d8534284eadac80d8d052bab0333185cce495d2acecf01
  source_path: start/getting-started.md
  workflow: 15
---

# البدء

الهدف: الانتقال من الصفر إلى أول محادثة عاملة بأقل إعداد ممكن.

<Info>
أسرع محادثة: افتح Control UI (لا حاجة لإعداد القنوات). شغّل `openclaw dashboard`
وتحدث في المتصفح، أو افتح `http://127.0.0.1:18789/` على
<Tooltip headline="مضيف Gateway" tip="الجهاز الذي يشغّل خدمة gateway في OpenClaw.">مضيف Gateway</Tooltip>.
التوثيق: [Dashboard](/web/dashboard) و[Control UI](/web/control-ui).
</Info>

## المتطلبات الأساسية

- Node 22 أو أحدث

<Tip>
تحقق من إصدار Node لديك بأمر `node --version` إذا لم تكن متأكداً.
</Tip>

## الإعداد السريع (CLI)

<Steps>
  <Step title="تثبيت OpenClaw (موصى به)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    طرق تثبيت أخرى والمتطلبات: [التثبيت](/install).
    </Note>

  </Step>
  <Step title="تشغيل معالج الإعداد">
    ```bash
    openclaw onboard --install-daemon
    ```

    يقوم المعالج بإعداد المصادقة وإعدادات Gateway والقنوات الاختيارية.
    راجع [معالج الإعداد](/start/wizard) للتفاصيل.

  </Step>
  <Step title="التحقق من Gateway">
    إذا ثبّتَ الخدمة، فيجب أن تكون قيد التشغيل بالفعل:

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="فتح Control UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
إذا تم تحميل Control UI، فإن Gateway جاهز للاستخدام.
</Check>

## فحوصات اختيارية وإضافات

<AccordionGroup>
  <Accordion title="تشغيل Gateway في المقدمة">
    مفيد للاختبارات السريعة أو استكشاف الأخطاء.

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="إرسال رسالة اختبارية">
    يتطلب قناة مُعدّة.

    ```bash
    openclaw message send --target +15555550123 --message "مرحباً من OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## متغيرات البيئة المفيدة

إذا كنت تشغّل OpenClaw كحساب خدمة أو تريد مسارات مخصصة للإعدادات/الحالة:

- `OPENCLAW_HOME` يحدد مجلد المنزل المستخدم لتحليل المسارات الداخلية.
- `OPENCLAW_STATE_DIR` يتجاوز مجلد الحالة.
- `OPENCLAW_CONFIG_PATH` يتجاوز مسار ملف الإعدادات.

مرجع كامل لمتغيرات البيئة: [متغيرات البيئة](/help/environment).

## تعمّق أكثر

<Columns>
  <Card title="معالج الإعداد (تفاصيل)" href="/start/wizard">
    مرجع كامل لمعالج CLI والخيارات المتقدمة.
  </Card>
  <Card title="إعداد تطبيق macOS" href="/start/onboarding">
    تدفق التشغيل الأول لتطبيق macOS.
  </Card>
</Columns>

## ما ستحصل عليه

- Gateway قيد التشغيل
- مصادقة مُعدّة
- وصول إلى Control UI أو قناة متصلة

## الخطوات التالية

- أمان الرسائل المباشرة والموافقات: [الاقتران](/channels/pairing)
- ربط المزيد من القنوات: [القنوات](/channels)
- سير عمل متقدم ومن الكود المصدري: [الإعداد](/start/setup)
