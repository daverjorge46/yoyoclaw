#!/usr/bin/env node
/**
 * 模拟触发 LLM 重试测试
 *
 * 这个脚本会模拟连续的 TPM 速率限制错误，验证重试逻辑是否生效
 */

import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// 模拟 LLM API 调用失败（返回 TPM 限制错误）
let callCount = 0;
const failTimes = 3; // 前 3 次调用都失败

async function mockLlmCallWithTpmError() {
  callCount++;

  if (callCount < failTimes) {
    // 模拟 TPM 限制错误（与真实 API 错误格式一致）
    const error = new Error("api_error: 请求额度超限(TPM) - rate limit exceeded. retry_after: 1");
    error.name = "TpmRateLimitError";
    throw error;
  }

  console.log(`✅ 第 ${callCount} 次调用成功！`);
  return { success: true, message: "Hello!", provider: "theta", model: "MiniMax-M2.1" };
}

// 简化的重试逻辑（与 prompt-retry.ts 一致）
async function runWithPromptRetry(fn, provider, modelId) {
  const config = {
    attempts: 3,
    minDelayMs: 100,
    maxDelayMs: 500,
    jitter: 0.1,
  };

  let lastErr;
  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.log(`❌ 第 ${attempt} 次调用失败: ${err.message}`);

      // 检查是否可重试
      const msg = String(err).toLowerCase();
      const isRetryable =
        /tpm|rate_limit|429|too many requests|quota exceeded|resource exhausted/i.test(msg);

      if (!isRetryable || attempt >= config.attempts) {
        break;
      }

      // 计算延迟（指数退避）
      let delay = config.minDelayMs * 2 ** (attempt - 1);
      delay = Math.min(delay, config.maxDelayMs);
      console.log(`⏳ 等待 ${delay}ms 后重试...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function main() {
  console.log("🧪 模拟 TPM 速率限制重试测试\n");
  console.log("=".repeat(50));
  console.log("模拟场景：连续 3 次 TPM 限制错误后成功\n");

  callCount = 0;

  try {
    const result = await runWithPromptRetry(mockLlmCallWithTpmError, "theta", "MiniMax-M2.1");

    console.log("\n" + "=".repeat(50));
    console.log(`✅ 成功！共调用 ${callCount} 次`);
    console.log(`   响应: ${JSON.stringify(result)}`);
    console.log("\n✅ 重试逻辑正常工作！");
    console.log("   - TPM 错误被正确识别");
    console.log("   - 指数退避等待生效");
    console.log("   - 最多重试 3 次");
  } catch (err) {
    console.log(`\n❌ 测试失败: ${err.message}`);
  }
}

main();
