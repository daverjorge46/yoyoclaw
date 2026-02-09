import { chromium } from "playwright-core";

const CDP_URL = "http://127.0.0.1:18800";

async function test() {
  console.log("Connecting to chromium...");
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
  const contexts = browser.contexts();
  const pages = contexts.flatMap((c) => c.pages());

  console.log(`Found ${pages.length} pages`);

  // Navigate to a test page
  let page = pages[0];
  if (!page) {
    page = await contexts[0].newPage();
  }
  await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("Navigated to example.com");

  // Test 1: Short evaluate (should work)
  console.log("\n--- Test 1: Short evaluate (should succeed) ---");
  try {
    const result = await page.evaluate(() => document.title, { timeout: 5000 });
    console.log("✅ Short evaluate result:", result);
  } catch (e) {
    console.log("❌ Short evaluate failed:", e.message);
  }

  // Test 2: Long evaluate WITH timeout (simulates our fix)
  console.log("\n--- Test 2: Long evaluate WITH Playwright timeout (5s) ---");
  try {
    const result = await page.evaluate(
      async () => {
        // This takes 30 seconds — but timeout should kill it at 5s
        await new Promise((r) => setTimeout(r, 30000));
        return "should not reach here";
      },
      { timeout: 5000 },
    );
    console.log("❌ Should have timed out, got:", result);
  } catch (e) {
    console.log("✅ Correctly timed out:", e.message.slice(0, 100));
  }

  // Test 3: After timeout, can we still use the page?
  console.log("\n--- Test 3: Page still usable after timeout? ---");
  try {
    const result = await page.evaluate(() => document.title, { timeout: 5000 });
    console.log("✅ Page still works! Title:", result);
  } catch (e) {
    console.log("❌ Page is stuck:", e.message.slice(0, 100));
  }

  // Test 4: Navigate after timeout
  console.log("\n--- Test 4: Navigate after timeout? ---");
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 10000 });
    console.log("✅ Navigate still works!");
  } catch (e) {
    console.log("❌ Navigate stuck:", e.message.slice(0, 100));
  }

  await browser.close();
  console.log("\nDone!");
}

test().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
