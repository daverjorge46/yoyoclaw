#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from)) {
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
    }
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);

// src/orchestration/intent-classifier.ts
var DEFAULT_KEYWORD_LISTS = {
  research: [
    "how to",
    "best practice",
    "recommended",
    "example of",
    "documentation",
    "tutorial",
    "guide",
    "library for",
    "package for",
    "what is the best",
    "compare",
    "vs",
    "versus",
    "difference between",
    "pros and cons",
    "latest",
    "modern approach",
    "industry standard",
  ],
  codebase: [
    "where is",
    "find",
    "locate",
    "search for",
    "show me",
    "what file",
    "which component",
    "how is implemented",
    "look for",
    "grep for",
    "which files",
    "codebase",
    "existing code",
    "current implementation",
  ],
  frontend: [
    "style",
    "css",
    "tailwind",
    "styling",
    "ui",
    "ux",
    "button",
    "form",
    "modal",
    "dialog",
    "layout",
    "responsive",
    "mobile",
    "color",
    "spacing",
    "padding",
    "margin",
    "font",
    "animation",
    "hover",
    "focus",
    "accessibility",
    "component",
    "react component",
    "jsx",
    "tsx",
    "design system",
    "theme",
    "dark mode",
    "light mode",
  ],
  debug: [
    "fix",
    "error",
    "bug",
    "broken",
    "not working",
    "failing",
    "crash",
    "exception",
    "issue",
    "problem",
    "wrong",
    "incorrect",
    "unexpected",
    "doesn't work",
    "can't",
    "cannot",
    "failed",
    "failure",
  ],
  documentation: [
    "document",
    "readme",
    "explain",
    "write docs",
    "add documentation",
    "describe",
    "summarize",
    "create guide",
    "write tutorial",
    "changelog",
    "api docs",
    "jsdoc",
    "comment",
  ],
  planning: [
    "plan",
    "design",
    "architecture",
    "how should we",
    "strategy",
    "approach",
    "implement feature",
    "new feature",
    "roadmap",
    "spec",
    "specification",
    "requirements",
    "scope",
  ],
  implementation: [
    "implement",
    "build",
    "create",
    "add",
    "code",
    "write",
    "develop",
    "make",
    "generate",
    "set up",
    "configure",
    "integrate",
  ],
  general: [],
  // No keywords, fallback
};
var INTENT_TO_AGENT = {
  research: { primary: "alma-librarian", background: null },
  codebase: { primary: "alvaro-explore", background: null },
  frontend: { primary: "dave-engineer", background: null },
  debug: { primary: "alvaro-explore", background: "arthas-oracle" },
  documentation: { primary: "angeles-writer", background: "alvaro-explore" },
  planning: { primary: "yoyo-ai", background: "alma-librarian" },
  implementation: { primary: "yoyo-ai", background: "alvaro-explore" },
  general: { primary: null, background: null },
};
var IntentClassifier = class {
  config;
  keywordCache;
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
      maxLatencyMs: config.maxLatencyMs ?? 10,
      keywordLists: config.keywordLists ?? DEFAULT_KEYWORD_LISTS,
    };
    this.keywordCache = /* @__PURE__ */ new Map();
    for (const [intent, keywords] of Object.entries(this.config.keywordLists)) {
      this.keywordCache.set(intent, new Set(keywords.map((k) => k.toLowerCase())));
    }
  }
  /**
   * Classify user input into an intent category
   * @param input - User input string
   * @returns IntentClassification result
   */
  classify(input) {
    const startTime = performance.now();
    const normalizedInput = input.toLowerCase();
    if (this.shouldBypass(input)) {
      return this.createBypassResult();
    }
    const scores = this.calculateScores(normalizedInput);
    const bestMatch = this.findBestMatch(scores);
    const elapsedMs = performance.now() - startTime;
    if (elapsedMs > this.config.maxLatencyMs) {
      console.warn(
        `[intent-classifier] Classification took ${elapsedMs.toFixed(2)}ms (target: ${this.config.maxLatencyMs}ms)`,
      );
    }
    return bestMatch;
  }
  /**
   * Check if input should bypass orchestration
   */
  shouldBypass(input) {
    const trimmed = input.trim();
    if (trimmed.startsWith("/")) {
      return true;
    }
    if (trimmed.toLowerCase().startsWith("directly:")) {
      return true;
    }
    return false;
  }
  /**
   * Create a bypass result (no orchestration)
   */
  createBypassResult() {
    return {
      intent: "general",
      confidence: 1,
      primaryAgent: null,
      backgroundAgent: null,
      matchedKeywords: [],
      shouldOrchestrate: false,
    };
  }
  /**
   * Calculate confidence scores for each intent type
   *
   * Scoring algorithm:
   * - First keyword match: base score of 0.65 (above default 0.6 threshold)
   * - Each additional keyword: +0.1 (capped at 1.0)
   * - Longer keywords get slight bonus (more specific = more confident)
   */
  calculateScores(input) {
    const scores = /* @__PURE__ */ new Map();
    for (const [intent, keywordSet] of this.keywordCache.entries()) {
      const matchedKeywords = [];
      for (const keyword of keywordSet) {
        if (input.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
      let score = 0;
      if (matchedKeywords.length > 0) {
        const baseScore = 0.65;
        const bonusPerKeyword = 0.1;
        const additionalBonus = (matchedKeywords.length - 1) * bonusPerKeyword;
        const avgKeywordLength =
          matchedKeywords.reduce((sum, k) => sum + k.length, 0) / matchedKeywords.length;
        const lengthBonus = Math.min(avgKeywordLength / 50, 0.1);
        score = Math.min(baseScore + additionalBonus + lengthBonus, 1);
      }
      scores.set(intent, { score, keywords: matchedKeywords });
    }
    return scores;
  }
  /**
   * Find the best matching intent from scores
   */
  findBestMatch(scores) {
    let bestIntent = "general";
    let bestScore = 0;
    let bestKeywords = [];
    for (const [intent, { score, keywords }] of scores.entries()) {
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
        bestKeywords = keywords;
      }
    }
    const shouldOrchestrate =
      bestScore >= this.config.confidenceThreshold && bestIntent !== "general";
    const agents = INTENT_TO_AGENT[bestIntent];
    return {
      intent: bestIntent,
      confidence: bestScore,
      primaryAgent: shouldOrchestrate ? agents.primary : null,
      backgroundAgent: shouldOrchestrate ? agents.background : null,
      matchedKeywords: bestKeywords,
      shouldOrchestrate,
    };
  }
  /**
   * Get the default keyword lists (for testing/debugging)
   */
  getKeywordLists() {
    return { ...this.config.keywordLists };
  }
  /**
   * Get configuration (for testing/debugging)
   */
  getConfig() {
    return { ...this.config };
  }
};

// src/orchestration/router.ts
var DEFAULT_ROUTER_CONFIG = {
  frontendDelegation: {
    enabled: true,
    agent: "dave-engineer",
  },
  researchDelegation: {
    enabled: true,
    agent: "alma-librarian",
    background: true,
  },
  codebaseDelegation: {
    enabled: true,
    agent: "alvaro-explore",
  },
  failureEscalation: {
    enabled: true,
    agent: "arthas-oracle",
    afterFailures: 3,
  },
};
var OrchestrationRouter = class {
  config;
  constructor(config = {}) {
    this.config = {
      frontendDelegation: {
        ...DEFAULT_ROUTER_CONFIG.frontendDelegation,
        ...config.frontendDelegation,
      },
      researchDelegation: {
        ...DEFAULT_ROUTER_CONFIG.researchDelegation,
        ...config.researchDelegation,
      },
      codebaseDelegation: {
        ...DEFAULT_ROUTER_CONFIG.codebaseDelegation,
        ...config.codebaseDelegation,
      },
      failureEscalation: {
        ...DEFAULT_ROUTER_CONFIG.failureEscalation,
        ...config.failureEscalation,
      },
    };
  }
  /**
   * Route a classified intent to the appropriate agent(s)
   * @param classification - The intent classification result
   * @param userInput - Original user input
   * @returns Routing decision with agent assignments and prompts
   */
  route(classification, userInput) {
    if (!classification.shouldOrchestrate) {
      return this.createNoOpRouting();
    }
    switch (classification.intent) {
      case "research":
        return this.routeResearch(userInput);
      case "codebase":
        return this.routeCodebase(userInput);
      case "frontend":
        return this.routeFrontend(userInput);
      case "debug":
        return this.routeDebug(userInput);
      case "documentation":
        return this.routeDocumentation(userInput);
      case "planning":
        return this.routePlanning(userInput);
      case "implementation":
        return this.routeImplementation(userInput);
      default:
        return this.createNoOpRouting();
    }
  }
  /**
   * Route research intent to Alma-Librarian
   */
  routeResearch(userInput) {
    if (!this.config.researchDelegation.enabled) {
      return this.createNoOpRouting();
    }
    const isBackground = this.config.researchDelegation.background;
    const agent = this.config.researchDelegation.agent;
    return {
      shouldDelegate: true,
      delegationType: isBackground ? "background" : "blocking",
      primaryAgent: isBackground ? null : agent,
      backgroundAgent: isBackground ? agent : null,
      agentPrompt: isBackground ? null : this.buildResearchPrompt(userInput),
      backgroundPrompt: isBackground ? this.buildResearchPrompt(userInput) : null,
    };
  }
  /**
   * Route codebase intent to Alvaro-Explore
   */
  routeCodebase(userInput) {
    if (!this.config.codebaseDelegation.enabled) {
      return this.createNoOpRouting();
    }
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: this.config.codebaseDelegation.agent,
      backgroundAgent: null,
      agentPrompt: this.buildCodebasePrompt(userInput),
      backgroundPrompt: null,
    };
  }
  /**
   * Route frontend intent to Dave-Engineer
   */
  routeFrontend(userInput) {
    if (!this.config.frontendDelegation.enabled) {
      return this.createNoOpRouting();
    }
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: this.config.frontendDelegation.agent,
      backgroundAgent: null,
      agentPrompt: this.buildFrontendPrompt(userInput),
      backgroundPrompt: null,
    };
  }
  /**
   * Route debug intent to Alvaro-Explore with Oracle escalation
   */
  routeDebug(userInput) {
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: "alvaro-explore",
      backgroundAgent: null,
      // Oracle escalation happens after failures
      agentPrompt: this.buildDebugPrompt(userInput),
      backgroundPrompt: null,
    };
  }
  /**
   * Route documentation intent to Angeles-Writer
   */
  routeDocumentation(userInput) {
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: "angeles-writer",
      backgroundAgent: "alvaro-explore",
      // Get codebase context
      agentPrompt: this.buildDocumentationPrompt(userInput),
      backgroundPrompt: "Find relevant code for documentation context: " + userInput,
    };
  }
  /**
   * Route planning intent to Yoyo-AI
   */
  routePlanning(userInput) {
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: "yoyo-ai",
      backgroundAgent: "alma-librarian",
      agentPrompt: this.buildPlanningPrompt(userInput),
      backgroundPrompt: "Research best practices for: " + userInput,
    };
  }
  /**
   * Route implementation intent to Yoyo-AI
   */
  routeImplementation(userInput) {
    return {
      shouldDelegate: true,
      delegationType: "blocking",
      primaryAgent: "yoyo-ai",
      backgroundAgent: "alvaro-explore",
      agentPrompt: this.buildImplementationPrompt(userInput),
      backgroundPrompt: "Find relevant existing code for: " + userInput,
    };
  }
  /**
   * Create a no-op routing decision
   */
  createNoOpRouting() {
    return {
      shouldDelegate: false,
      delegationType: "none",
      primaryAgent: null,
      backgroundAgent: null,
      agentPrompt: null,
      backgroundPrompt: null,
    };
  }
  // ============================================================
  // Prompt Builders
  // ============================================================
  buildResearchPrompt(input) {
    return `Research the following topic and provide comprehensive information with sources:

${input}

Include:
- Summary of key findings
- Code examples if relevant
- Links to documentation
- Best practices recommendations

Prefix all output with [alma-librarian]`;
  }
  buildCodebasePrompt(input) {
    return `Search the codebase for:

${input}

Provide:
- List of relevant files with paths
- Code snippets showing relevant sections
- Analysis of code structure
- Recommendations for where to make changes

Prefix all output with [alvaro-explore]`;
  }
  buildFrontendPrompt(input) {
    return `Implement the following frontend change:

${input}

Requirements:
- Use Tailwind CSS v4 for styling
- Ensure accessibility (WCAG 2.1 AA)
- Follow existing component patterns
- Include TypeScript types

Prefix all output with [dave-engineer]`;
  }
  buildDebugPrompt(input) {
    return `Debug and fix the following issue:

${input}

Steps:
1. Search for related code
2. Identify the root cause
3. Propose a fix
4. Write tests to prevent regression

Prefix all output with [alvaro-explore]`;
  }
  buildDocumentationPrompt(input) {
    return `Write documentation for:

${input}

Include:
- Clear explanation of functionality
- Code examples
- API reference if applicable
- Usage guidelines

Prefix all output with [angeles-writer]`;
  }
  buildPlanningPrompt(input) {
    return `Plan the implementation of:

${input}

Provide:
- Technical approach
- File structure
- Key decisions
- Potential challenges

Prefix all output with [yoyo-ai]`;
  }
  buildImplementationPrompt(input) {
    return `Implement:

${input}

Follow TDD approach:
1. Write failing tests
2. Implement code
3. Verify tests pass
4. Refactor if needed

Prefix all output with [yoyo-ai]`;
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
};

// src/orchestration/output-formatter.ts
var AGENT_COLOR = "\x1B[38;2;210;153;34m";
var ANSI_COLORS = {
  "yoyo-ai": AGENT_COLOR,
  "arthas-oracle": AGENT_COLOR,
  "alma-librarian": AGENT_COLOR,
  "alvaro-explore": AGENT_COLOR,
  "dave-engineer": AGENT_COLOR,
  "angeles-writer": AGENT_COLOR,
};
var ANSI_RESET = "\x1B[0m";
var ANSI_BOLD = "\x1B[1m";
var YOYO_YELLOW_DIM = "\x1B[38;2;168;122;27m";
var BG_ELEVATED = "\x1B[48;2;33;38;45m";
var SUBTEXT1 = "\x1B[38;2;186;194;222m";
var OVERLAY0 = "\x1B[38;2;108;112;134m";
var TEXT_COLOR = "\x1B[38;2;205;214;244m";
var YOYO_YELLOW = "\x1B[38;2;210;153;34m";
var BOX_DBL_TL = "\u2554";
var BOX_DBL_TR = "\u2557";
var BOX_DBL_BL = "\u255A";
var BOX_DBL_BR = "\u255D";
var BOX_DBL_H = "\u2550";
var BOX_DBL_V = "\u2551";
var AGENT_ICONS = {
  "yoyo-ai": "\u{1F916}",
  // Robot
  "arthas-oracle": "\u{1F52E}",
  // Crystal ball
  "alma-librarian": "\u{1F4DA}",
  // Books
  "alvaro-explore": "\u{1F50D}",
  // Magnifying glass
  "dave-engineer": "\u{1F3A8}",
  // Art palette
  "angeles-writer": "\u270D\uFE0F",
  // Writing hand
};
var AGENT_DESCRIPTIONS = {
  "yoyo-ai": "Primary orchestrator",
  "arthas-oracle": "Strategic advisor and debugger",
  "alma-librarian": "External research specialist",
  "alvaro-explore": "Codebase search specialist",
  "dave-engineer": "UI/UX development specialist",
  "angeles-writer": "Technical documentation writer",
};
var AGENT_INSTRUCTIONS = {
  "yoyo-ai":
    "You are the primary orchestrator. Coordinate work, delegate to specialized agents when appropriate, and ensure task completion.",
  "arthas-oracle":
    "You are a strategic advisor specializing in architecture decisions and debugging complex issues. Provide structured analysis with Essential, Expanded, and Edge Cases sections.",
  "alma-librarian":
    "You are a research specialist. Search external documentation, GitHub repos, and web resources. Return comprehensive findings with sources.",
  "alvaro-explore":
    "You are a codebase search specialist. Use Glob, Grep, and Read tools to find patterns, implementations, and code locations. Focus on internal codebase exploration.",
  "dave-engineer":
    "You are a frontend/UI specialist. Focus on components, styling, accessibility, and user experience. Use Tailwind CSS and React best practices.",
  "angeles-writer":
    "You are a documentation writer. Create clear, well-structured technical documentation, guides, and explanations.",
};
var OutputFormatter = class {
  config;
  constructor(config = {}) {
    this.config = {
      showPrefixes: config.showPrefixes ?? true,
      colors: config.colors ?? ANSI_COLORS,
    };
  }
  /**
   * Format a message with agent prefix
   * @param agentName - The agent producing the output
   * @param message - The message to format
   * @returns Formatted message with prefix on each line
   */
  format(agentName, message) {
    if (!this.config.showPrefixes) {
      return message;
    }
    const prefix = this.buildPrefix(agentName);
    return this.prefixLines(prefix, message);
  }
  /**
   * Build a colored prefix for an agent
   */
  buildPrefix(agentName) {
    const color = this.config.colors[agentName] ?? "";
    return `${color}[${agentName}]${ANSI_RESET}`;
  }
  /**
   * Add prefix to each line of the message
   */
  prefixLines(prefix, message) {
    return message
      .split("\n")
      .map((line) => `${prefix} ${line}`)
      .join("\n");
  }
  /**
   * Format a transition message between agents
   * @param from - Source agent (null for initial)
   * @param to - Target agent
   * @param reason - Reason for transition
   */
  formatTransition(from, to, reason) {
    const toPrefix = this.buildPrefix(to);
    if (from) {
      const fromName = this.config.showPrefixes ? from : "";
      return `${toPrefix} Delegating from ${fromName}: ${reason}`;
    }
    return `${toPrefix} ${reason}`;
  }
  /**
   * Format a background task completion message
   * @param agent - The agent that completed
   * @param summary - Summary of results
   */
  formatBackgroundComplete(agent, summary) {
    const prefix = this.buildPrefix(agent);
    return `${prefix} [Background Complete] ${summary}`;
  }
  /**
   * Format an intent classification announcement
   * @param intent - The classified intent
   * @param confidence - Confidence score
   * @param agent - The target agent
   */
  formatIntentAnnouncement(intent, confidence, agent) {
    const prefix = this.buildPrefix("yoyo-ai");
    const confidencePercent = Math.round(confidence * 100);
    if (agent) {
      return `${prefix} Intent: ${intent} (${confidencePercent}% confidence). Delegating to ${agent}...`;
    }
    return `${prefix} Intent: ${intent} (${confidencePercent}% confidence). Processing directly...`;
  }
  /**
   * Format a phase announcement
   * @param phase - Phase number and name
   * @param description - Phase description
   */
  formatPhaseAnnouncement(phase, description) {
    const prefix = this.buildPrefix("yoyo-ai");
    return `${prefix} ${phase}: ${description}`;
  }
  /**
   * Format a progress update
   * @param completed - Number of completed tasks
   * @param total - Total number of tasks
   * @param current - Current task description
   */
  formatProgress(completed, total, current) {
    const prefix = this.buildPrefix("yoyo-ai");
    return `${prefix} Progress: [${completed}/${total}] ${current}`;
  }
  /**
   * Format an error message
   * @param agent - The agent that encountered the error
   * @param error - Error message
   * @param attempt - Current attempt number
   * @param maxAttempts - Maximum attempts
   */
  formatError(agent, error, attempt, maxAttempts) {
    const prefix = this.buildPrefix(agent);
    if (attempt !== void 0 && maxAttempts !== void 0) {
      return `${prefix} Error (attempt ${attempt}/${maxAttempts}): ${error}`;
    }
    return `${prefix} Error: ${error}`;
  }
  /**
   * Format an escalation message
   * @param from - Original agent
   * @param to - Escalation target
   * @param reason - Reason for escalation
   */
  formatEscalation(from, to, reason) {
    const fromPrefix = this.buildPrefix(from);
    return `${fromPrefix} Escalating to ${to}: ${reason}`;
  }
  /**
   * Format a success message
   * @param agent - The agent reporting success
   * @param message - Success message
   */
  formatSuccess(agent, message) {
    const prefix = this.buildPrefix(agent);
    return `${prefix} \u2713 ${message}`;
  }
  /**
   * Get a plain prefix without colors (for logging)
   * @param agentName - The agent name
   */
  getPlainPrefix(agentName) {
    return `[${agentName}]`;
  }
  /**
   * Check if a message already has an agent prefix
   * @param message - Message to check
   */
  hasPrefix(message) {
    const prefixPattern = /^\[[\w-]+\]/;
    return prefixPattern.test(message.trim());
  }
  /**
   * Strip existing prefix from a message
   * @param message - Message with prefix
   */
  stripPrefix(message) {
    return message.replace(/^\[[\w-]+\]\s*/, "");
  }
  /**
   * Format a visually distinct agent activity panel
   * Creates a boxed panel showing agent name (uppercase with underline),
   * agent description, and current task.
   *
   * Panel layout:
   * ╔═══════════════════════════════════════════════════════════════════════╗
   * ║  🔍 ALVARO-EXPLORE                                                    ║
   * ║  ─────────────────                                                    ║
   * ║  Codebase search specialist                                           ║
   * ║  Task: "theme configuration files"                                    ║
   * ╚═══════════════════════════════════════════════════════════════════════╝
   *
   * @param agentName - The agent to display
   * @param taskDescription - Optional task/query description
   * @param width - Panel width (default: 71)
   * @returns Formatted ANSI string for terminal display
   */
  formatAgentPanel(agentName, taskDescription, width = 71) {
    const agentColor = this.config.colors[agentName] ?? "";
    const agentIcon = AGENT_ICONS[agentName] ?? "\u25C9";
    const agentDesc = AGENT_DESCRIPTIONS[agentName] ?? "Specialized agent";
    const agentUpper = agentName.toUpperCase();
    const contentWidth = width - 4;
    const underline = "\u2500".repeat(agentUpper.length);
    const lines = [];
    const padLine = (content, visibleLen) => {
      const padding = " ".repeat(Math.max(0, contentWidth - visibleLen));
      return `${YOYO_YELLOW_DIM}${BOX_DBL_V}${ANSI_RESET}${BG_ELEVATED}${content}${padding}${ANSI_RESET}${YOYO_YELLOW_DIM}${BOX_DBL_V}${ANSI_RESET}`;
    };
    lines.push("");
    lines.push(
      `${YOYO_YELLOW_DIM}${BOX_DBL_TL}${BOX_DBL_H.repeat(width)}${BOX_DBL_TR}${ANSI_RESET}`,
    );
    const nameContent = `  ${agentIcon} ${agentColor}${ANSI_BOLD}${agentUpper}${ANSI_RESET}${BG_ELEVATED}`;
    const nameVisibleLen = 2 + 2 + agentUpper.length;
    lines.push(padLine(nameContent, nameVisibleLen));
    const underlineContent = `  ${OVERLAY0}${underline}${ANSI_RESET}${BG_ELEVATED}`;
    const underlineVisibleLen = 2 + underline.length;
    lines.push(padLine(underlineContent, underlineVisibleLen));
    const descContent = `  ${SUBTEXT1}${agentDesc}${ANSI_RESET}${BG_ELEVATED}`;
    const descVisibleLen = 2 + agentDesc.length;
    lines.push(padLine(descContent, descVisibleLen));
    if (taskDescription) {
      const maxTaskLen = contentWidth - 12;
      let taskDisplay = taskDescription;
      if (taskDescription.length > maxTaskLen) {
        taskDisplay = taskDescription.substring(0, maxTaskLen - 3) + "...";
      }
      const taskContent = `  ${TEXT_COLOR}Task: ${YOYO_YELLOW}"${taskDisplay}"${ANSI_RESET}${BG_ELEVATED}`;
      const taskVisibleLen = 8 + taskDisplay.length;
      lines.push(padLine(taskContent, taskVisibleLen));
    }
    lines.push(
      `${YOYO_YELLOW_DIM}${BOX_DBL_BL}${BOX_DBL_H.repeat(width)}${BOX_DBL_BR}${ANSI_RESET}`,
    );
    lines.push("");
    return lines.join("\n");
  }
  /**
   * Get agent icon for a specific agent
   * @param agent - The agent name
   * @returns Emoji icon for the agent
   */
  getAgentIcon(agent) {
    return AGENT_ICONS[agent] ?? "\u25C9";
  }
  /**
   * Get agent description for a specific agent
   * @param agent - The agent name
   * @returns Short description of the agent's role
   */
  getAgentDescription(agent) {
    return AGENT_DESCRIPTIONS[agent] ?? "Specialized agent";
  }
  /**
   * Format routing context for hook injection
   * This outputs text that Claude will see BEFORE the user's message
   *
   * NOTE: This provides CONTEXT ENRICHMENT ONLY - not agent switching.
   * Claude Code's Task tool with subagent_type is the proper way to delegate.
   *
   * @param classification - The intent classification result
   * @param routing - The routing decision
   * @param projectState - Optional project state (active spec, current task)
   * @returns Formatted context string for injection
   */
  formatRoutingContext(classification, routing, projectState) {
    const lines = [];
    const suggestedAgent = routing.primaryAgent ?? "yoyo-ai";
    if (this.config.showPrefixes) {
      const prefix = this.buildPrefix("yoyo-ai");
      lines.push(
        `${prefix} Intent: ${classification.intent} (confidence: ${classification.confidence.toFixed(2)})`,
      );
      if (suggestedAgent !== "yoyo-ai") {
        lines.push(`${prefix} Suggested delegation: ${suggestedAgent}`);
      }
      lines.push("");
    }
    lines.push("PROJECT CONTEXT:");
    if (projectState?.activeSpec) {
      lines.push(`Active Spec: ${projectState.activeSpec}`);
    }
    if (projectState?.currentTask) {
      lines.push(`Current Task: ${projectState.currentTask}`);
    }
    if (projectState?.gitBranch) {
      lines.push(`Git Branch: ${projectState.gitBranch}`);
    }
    lines.push("");
    lines.push("ORCHESTRATION INSTRUCTIONS:");
    if (suggestedAgent !== "yoyo-ai" && routing.primaryAgent) {
      const agentInstructions = AGENT_INSTRUCTIONS[suggestedAgent] ?? "";
      lines.push(
        `1. Use the Task tool with subagent_type="${suggestedAgent}" to handle this request.`,
      );
      lines.push(`2. Agent role: ${agentInstructions}`);
      lines.push(`3. Prefix your summary with [${suggestedAgent}] when reporting results.`);
    } else {
      lines.push("1. Handle this request directly (no delegation needed).");
      lines.push(
        "2. Prefix your response with [yoyo-ai] to indicate you are the primary orchestrator.",
      );
    }
    lines.push("---");
    return lines.join("\n");
  }
  /**
   * Get agent instructions for a specific agent
   * @param agent - The agent name
   */
  getAgentInstructions(agent) {
    return AGENT_INSTRUCTIONS[agent] ?? AGENT_INSTRUCTIONS["yoyo-ai"];
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update configuration
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }
};

// src/orchestration/config-loader.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var DEFAULT_CONFIG = {
  enabled: true,
  globalMode: true,
  showPrefixes: true,
  confidenceThreshold: 0.6,
  intentClassification: {
    enabled: true,
    maxLatencyMs: 10,
  },
  routing: {
    frontendDelegation: {
      enabled: true,
      agent: "dave-engineer",
    },
    researchDelegation: {
      enabled: true,
      agent: "alma-librarian",
      background: true,
    },
    codebaseDelegation: {
      enabled: true,
      agent: "alvaro-explore",
    },
    failureEscalation: {
      enabled: true,
      agent: "arthas-oracle",
      afterFailures: 3,
    },
  },
  backgroundTasks: {
    enabled: true,
    maxConcurrent: 3,
    notificationOnComplete: true,
  },
};
function parseSimpleYaml(content) {
  const result = {};
  const lines = content.split("\n");
  const stack = [{ obj: result, indent: -1 }];
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();
    if (valueStr === "" || valueStr === "|" || valueStr === ">") {
      const newObj = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else {
      let value;
      if (valueStr === "true") {
        value = true;
      } else if (valueStr === "false") {
        value = false;
      } else if (valueStr === "null") {
        value = null;
      } else if (/^-?\d+$/.test(valueStr)) {
        value = parseInt(valueStr, 10);
      } else if (/^-?\d+\.\d+$/.test(valueStr)) {
        value = parseFloat(valueStr);
      } else if (
        (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))
      ) {
        value = valueStr.slice(1, -1);
      } else {
        value = valueStr;
      }
      parent[key] = value;
    }
  }
  return result;
}
var ConfigLoader = class {
  configPath;
  config = null;
  constructor(projectRoot = process.cwd()) {
    this.configPath = path.join(projectRoot, ".yoyo-dev", "config.yml");
  }
  /**
   * Load orchestration configuration
   * Priority: Environment variable > Config file > Defaults
   */
  load() {
    if (this.config) {
      return this.config;
    }
    if (process.env.YOYO_ORCHESTRATION === "false") {
      this.config = { ...DEFAULT_CONFIG, enabled: false };
      return this.config;
    }
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, "utf-8");
        const parsed = parseSimpleYaml(content);
        const orchestrationSection = parsed?.orchestration ?? {};
        this.config = this.mergeConfig(DEFAULT_CONFIG, orchestrationSection);
      } else {
        this.config = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.warn("[config-loader] Failed to load config, using defaults:", error);
      this.config = DEFAULT_CONFIG;
    }
    return this.config;
  }
  /**
   * Deep merge configuration with defaults
   */
  mergeConfig(defaults, overrides) {
    return {
      enabled: overrides.enabled ?? defaults.enabled,
      globalMode: overrides.globalMode ?? defaults.globalMode,
      showPrefixes: overrides.showPrefixes ?? defaults.showPrefixes,
      confidenceThreshold: overrides.confidenceThreshold ?? defaults.confidenceThreshold,
      intentClassification: {
        ...defaults.intentClassification,
        ...overrides.intentClassification,
      },
      routing: this.mergeRoutingConfig(defaults.routing, overrides.routing ?? {}),
      backgroundTasks: {
        ...defaults.backgroundTasks,
        ...overrides.backgroundTasks,
      },
    };
  }
  /**
   * Merge routing configuration
   */
  mergeRoutingConfig(defaults, overrides) {
    return {
      frontendDelegation: {
        ...defaults.frontendDelegation,
        ...overrides.frontendDelegation,
      },
      researchDelegation: {
        ...defaults.researchDelegation,
        ...overrides.researchDelegation,
      },
      codebaseDelegation: {
        ...defaults.codebaseDelegation,
        ...overrides.codebaseDelegation,
      },
      failureEscalation: {
        ...defaults.failureEscalation,
        ...overrides.failureEscalation,
      },
    };
  }
  /**
   * Force reload configuration from file
   */
  reload() {
    this.config = null;
    return this.load();
  }
  /**
   * Get the path to the config file
   */
  getConfigPath() {
    return this.configPath;
  }
  /**
   * Check if config file exists
   */
  configFileExists() {
    return fs.existsSync(this.configPath);
  }
  /**
   * Get default configuration
   */
  static getDefaults() {
    return { ...DEFAULT_CONFIG };
  }
  /**
   * Check if orchestration is enabled
   * Considers both config and environment
   */
  isOrchestrationEnabled() {
    const config = this.load();
    return config.enabled && config.globalMode;
  }
};

// src/hooks/orchestrate-entry.ts
var import_child_process = require("child_process");
var fs2 = __toESM(require("fs"), 1);
var path2 = __toESM(require("path"), 1);
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => {
      reject(new Error("stdin read timeout"));
    }, 3e3);
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    process.stdin.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
function getProjectState(cwd) {
  const state = {};
  try {
    const branch = (0, import_child_process.execSync)("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (branch) {
      state.gitBranch = branch;
    }
  } catch {}
  try {
    const specsDir = path2.join(cwd, ".yoyo-dev", "specs");
    if (fs2.existsSync(specsDir)) {
      const specs = fs2
        .readdirSync(specsDir)
        .filter((d) => fs2.statSync(path2.join(specsDir, d)).isDirectory())
        .toSorted()
        .toReversed();
      for (const specDir of specs) {
        const stateFile = path2.join(specsDir, specDir, "state.json");
        if (fs2.existsSync(stateFile)) {
          const stateData = JSON.parse(fs2.readFileSync(stateFile, "utf-8"));
          if (stateData.current_phase !== "completed") {
            state.activeSpec = stateData.spec_name || specDir;
            if (stateData.active_task) {
              state.currentTask = stateData.active_task;
            }
            break;
          }
        }
      }
    }
  } catch {}
  return state;
}
function parseInput(raw) {
  const parsed = JSON.parse(raw);
  if (typeof parsed.prompt !== "string") {
    throw new Error("Missing or invalid prompt field");
  }
  return {
    session_id: parsed.session_id ?? "",
    transcript_path: parsed.transcript_path ?? "",
    cwd: parsed.cwd ?? process.cwd(),
    hook_event_name: parsed.hook_event_name ?? "UserPromptSubmit",
    prompt: parsed.prompt,
  };
}
async function main() {
  const rawInput = await readStdin();
  if (!rawInput.trim()) {
    process.exit(0);
  }
  const input = parseInput(rawInput);
  const configLoader = new ConfigLoader(input.cwd);
  const config = configLoader.load();
  if (!config.enabled || !config.globalMode) {
    process.exit(0);
  }
  const classifier = new IntentClassifier({
    confidenceThreshold: config.confidenceThreshold,
    maxLatencyMs: config.intentClassification.maxLatencyMs,
  });
  const router = new OrchestrationRouter(config.routing);
  const formatter = new OutputFormatter({
    showPrefixes: config.showPrefixes,
  });
  const classification = classifier.classify(input.prompt);
  if (!classification.shouldOrchestrate) {
    process.exit(0);
  }
  const routing = router.route(classification, input.prompt);
  const projectState = getProjectState(input.cwd);
  if (routing.primaryAgent && routing.primaryAgent !== "yoyo-ai") {
    const agentName = routing.primaryAgent;
    const taskDisplay =
      input.prompt.length > 50 ? input.prompt.substring(0, 47) + "..." : input.prompt;
    const agentPanel = formatter.formatAgentPanel(agentName, taskDisplay);
    process.stdout.write(agentPanel + "\n");
  }
  const context = formatter.formatRoutingContext(classification, routing, projectState);
  process.stdout.write(context);
  process.exit(0);
}
main().catch((error) => {
  console.error(`[orchestration-hook] Error: ${error.message}`);
  process.exit(0);
});
