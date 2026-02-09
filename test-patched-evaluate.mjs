// Test the patched evaluateViaPlaywright by importing the built code
import { chromium } from "playwright-core";

const CDP_URL = "http://127.0.0.1:18800";

// Simulate what the patched evaluateViaPlaywright does
async function patchedEvaluate(page, fnText, timeoutMs = 30000) {
  const browserEvaluator = new Function(
    "args",
    `
    "use strict";
    var fnBody = args.fnBody, timeoutMs = args.timeoutMs;
    try {
      var candidate = eval("(" + fnBody + ")");
      var result = typeof candidate === "function" ? candidate() : candidate;
      if (result && typeof result.then === "function") {
        return Promise.race([
          result,
          new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error("evaluate timed out after " + timeoutMs + "ms")); }, timeoutMs);
          })
        ]);
      }
      return result;
    } catch (err) {
      throw new Error("Invalid evaluate function: " + (err && err.message ? err.message : String(err)));
    }
    `,
  );
  return await page.evaluate(browserEvaluator, { fnBody: fnText, timeoutMs });
}

async function test() {
  console.log("Connecting to chromium...");
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
  const page = browser.contexts().flatMap((c) => c.pages())[0];
  await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 15000 });

  // Test 1: Sync evaluate
  console.log("\n--- Test 1: Sync evaluate ---");
  const t1 = Date.now();
  try {
    const r = await patchedEvaluate(page, "() => document.title", 5000);
    console.log(`✅ (${Date.now() - t1}ms) Result:`, r);
  } catch (e) {
    console.log(`❌ (${Date.now() - t1}ms)`, e.message.slice(0, 100));
  }

  // Test 2: Short async evaluate
  console.log("\n--- Test 2: Short async (1s, timeout 5s) ---");
  const t2 = Date.now();
  try {
    const r = await patchedEvaluate(
      page,
      "async () => { await new Promise(r => setTimeout(r, 1000)); return 'fast'; }",
      5000,
    );
    console.log(`✅ (${Date.now() - t2}ms) Result:`, r);
  } catch (e) {
    console.log(`❌ (${Date.now() - t2}ms)`, e.message.slice(0, 100));
  }

  // Test 3: Long async evaluate (30s, timeout 5s) — THIS IS THE BUG SCENARIO
  console.log("\n--- Test 3: Long async (30s, timeout 5s) — the bug scenario ---");
  const t3 = Date.now();
  try {
    const r = await patchedEvaluate(
      page,
      "async () => { await new Promise(r => setTimeout(r, 30000)); return 'too slow'; }",
      5000,
    );
    console.log(`❌ (${Date.now() - t3}ms) Should have timed out, got:`, r);
  } catch (e) {
    console.log(`✅ (${Date.now() - t3}ms) Correctly timed out:`, e.message.slice(0, 100));
  }

  // Test 4: Page still works after timeout?
  console.log("\n--- Test 4: Page still usable after timeout? ---");
  const t4 = Date.now();
  try {
    const r = await patchedEvaluate(page, "() => document.title", 5000);
    console.log(`✅ (${Date.now() - t4}ms) Page works! Title:`, r);
  } catch (e) {
    console.log(`❌ (${Date.now() - t4}ms) Page stuck:`, e.message.slice(0, 100));
  }

  // Test 5: Navigate after timeout?
  console.log("\n--- Test 5: Navigate after timeout? ---");
  const t5 = Date.now();
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 10000 });
    console.log(`✅ (${Date.now() - t5}ms) Navigate works!`);
  } catch (e) {
    console.log(`❌ (${Date.now() - t5}ms) Navigate stuck:`, e.message.slice(0, 100));
  }

  // Test 6: Scroll-style evaluate (what triggered the original bug)
  console.log("\n--- Test 6: Scroll loop (10 iterations, 500ms each = 5s, timeout 3s) ---");
  const t6 = Date.now();
  try {
    const r = await patchedEvaluate(
      page,
      `async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 100);
        await new Promise(r => setTimeout(r, 500));
      }
      return 'scrolled';
    }`,
      3000,
    );
    console.log(`❌ (${Date.now() - t6}ms) Should have timed out, got:`, r);
  } catch (e) {
    console.log(`✅ (${Date.now() - t6}ms) Correctly timed out:`, e.message.slice(0, 100));
  }

  // Test 7: Page still works after scroll timeout?
  console.log("\n--- Test 7: Page still usable after scroll timeout? ---");
  const t7 = Date.now();
  try {
    const r = await patchedEvaluate(page, "() => document.title", 5000);
    console.log(`✅ (${Date.now() - t7}ms) Page works! Title:`, r);
  } catch (e) {
    console.log(`❌ (${Date.now() - t7}ms) Page stuck:`, e.message.slice(0, 100));
  }

  await browser.close();
  console.log("\n🎉 All tests complete!");
}

test().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
