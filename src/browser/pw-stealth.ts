/**
 * Stealth mode support via playwright-extra + puppeteer-extra-plugin-stealth.
 * Falls back to vanilla playwright-core if optional deps not installed.
 */

import type { BrowserType, Browser } from "playwright-core";
import { chromium as vanillaChromium } from "playwright-core";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("browser").child("stealth");

let stealthEnabled = false;
let stealthChromium: BrowserType<Browser> | null = null;
let initializationAttempted = false;

/** Call before any browser connections. */
export function configureStealthMode(enabled: boolean): void {
  stealthEnabled = enabled;
  if (!enabled) {
    stealthChromium = null;
    initializationAttempted = false;
  }
}

export function isStealthModeEnabled(): boolean {
  return stealthEnabled;
}

export async function getChromium(): Promise<BrowserType<Browser>> {
  if (!stealthEnabled) {
    return vanillaChromium;
  }

  if (stealthChromium) {
    return stealthChromium;
  }

  if (initializationAttempted) {
    return vanillaChromium;
  }

  initializationAttempted = true;

  try {
    // Dynamic import so these optional deps aren't required at load time.
    // String concat prevents TS from resolving them at compile time.
    const playwrightExtraName = ["playwright", "extra"].join("-");
    const stealthPluginName = ["puppeteer", "extra", "plugin", "stealth"].join("-");

    const playwrightExtra = (await import(playwrightExtraName)) as {
      chromium: BrowserType<Browser> & { use: (plugin: unknown) => void };
    };

    const stealthPluginModule = (await import(stealthPluginName)) as
      | { default?: () => unknown }
      | (() => unknown);

    // Handle ESM default export vs CommonJS module.exports
    const StealthPlugin =
      typeof stealthPluginModule === "function"
        ? stealthPluginModule
        : typeof (stealthPluginModule as { default?: () => unknown }).default === "function"
          ? (stealthPluginModule as { default: () => unknown }).default
          : null;

    if (!StealthPlugin) {
      throw new Error("Could not resolve stealth plugin export");
    }

    const chromium = playwrightExtra.chromium;
    chromium.use(StealthPlugin());

    stealthChromium = chromium as BrowserType<Browser>;
    log.info("stealth mode enabled (playwright-extra + stealth plugin)");
    return stealthChromium;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Cannot find package") || message.includes("MODULE_NOT_FOUND")) {
      log.warn(
        "stealth mode requested but optional dependencies not installed. " +
          "Install with: pnpm add playwright-extra puppeteer-extra-plugin-stealth",
      );
    } else {
      log.warn(`failed to initialize stealth mode: ${message}`);
    }
    return vanillaChromium;
  }
}
