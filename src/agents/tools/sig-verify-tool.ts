/**
 * sig verify tool — allows the LLM to verify instruction authenticity.
 *
 * Verifies system prompt templates against cryptographic signatures,
 * and verifies message provenance via the session ContentStore.
 * This is the out-of-band verification mechanism: the tool's return values
 * come from a code path the attacker cannot influence.
 */

import { checkFile, findProjectRoot, verifyFile } from "@disreguard/sig";
import { Type } from "@sinclair/typebox";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MessageSigningContext } from "../message-signing.js";
import type { AnyAgentTool } from "./common.js";
import { setVerified } from "../session-security-state.js";
import { jsonResult } from "./common.js";

export interface SigVerifyToolOptions {
  /** Message signing context for the current session. */
  messageSigning?: MessageSigningContext;
  /** Session key for verification state tracking. */
  sessionKey?: string;
  /** Current turn ID for scoped verification. */
  turnId?: string;
  /** sig project root; when omitted, falls back to findProjectRoot(process.cwd()). */
  projectRoot?: string;
}

const SigVerifySchema = Type.Object({
  file: Type.Optional(
    Type.String({
      description:
        "Verify a specific template file (e.g. 'identity.txt'). Omit to verify all signed templates.",
    }),
  ),
  message: Type.Optional(
    Type.String({
      description:
        "Verify a signed message by its signature ID. Returns the original content and provenance if valid.",
    }),
  ),
});

async function getProjectRoot(projectRoot?: string): Promise<string | null> {
  if (projectRoot?.trim()) {
    return projectRoot;
  }
  try {
    return await findProjectRoot(process.cwd());
  } catch {
    return null;
  }
}

/**
 * Create the sig verify tool.
 * Always returns a tool when message signing is available or when called for owner senders.
 */
export function createSigVerifyTool(options?: SigVerifyToolOptions): AnyAgentTool {
  return {
    label: "Verify",
    name: "verify",
    description:
      "Verify instruction authenticity and message provenance (sig). " +
      "Call without arguments to verify all system prompt templates. " +
      "Pass `file` to verify a specific template, or `message` to verify a signed message.",
    parameters: SigVerifySchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const file = typeof params.file === "string" ? params.file.trim() : undefined;
      const message = typeof params.message === "string" ? params.message.trim() : undefined;

      // Message verification
      if (message) {
        return verifyMessage(message, options);
      }

      // Template verification
      const projectRoot = await getProjectRoot(options?.projectRoot);
      if (!projectRoot) {
        return jsonResult({
          allVerified: false,
          error: "No .sig/ directory found in project. Templates cannot be verified.",
        });
      }

      if (file) {
        return verifySingleTemplate(projectRoot, file);
      }

      return verifyAllTemplates(projectRoot, options);
    },
  };
}

// ---------------------------------------------------------------------------
// Template verification
// ---------------------------------------------------------------------------

async function verifySingleTemplate(projectRoot: string, file: string) {
  const templatePath = `llm/prompts/${file}`;
  try {
    const result = await verifyFile(projectRoot, templatePath);
    const allVerified = result.verified;

    return jsonResult({
      allVerified,
      templates: [
        {
          file: result.file,
          verified: result.verified,
          template: result.template,
          signedBy: result.signedBy,
          signedAt: result.signedAt,
          placeholders: result.placeholders,
          error: result.error,
        },
      ],
    });
  } catch (err) {
    return jsonResult({
      allVerified: false,
      templates: [
        {
          file: templatePath,
          verified: false,
          error: err instanceof Error ? err.message : String(err),
        },
      ],
    });
  }
}

async function verifyAllTemplates(projectRoot: string, options?: SigVerifyToolOptions) {
  try {
    const templatesDir = join(projectRoot, "llm/prompts");
    const entries = await readdir(templatesDir, { withFileTypes: true });
    const templatePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
      .map((entry) => `llm/prompts/${entry.name}`)
      .toSorted();
    if (templatePaths.length === 0) {
      return jsonResult({
        allVerified: false,
        error: "No templates found in llm/prompts.",
        templates: [],
      });
    }

    const results = await Promise.all(
      templatePaths.map(async (templatePath) => {
        try {
          const check = await checkFile(projectRoot, templatePath);
          if (check.status !== "signed") {
            return {
              file: templatePath,
              verified: false,
              error:
                check.status === "modified"
                  ? "Content has been modified since signing"
                  : check.status === "unsigned"
                    ? "No signature found"
                    : "Signature is corrupted",
            };
          }
          const result = await verifyFile(projectRoot, templatePath);
          return {
            file: result.file,
            verified: result.verified,
            template: result.template,
            signedBy: result.signedBy,
            signedAt: result.signedAt,
            placeholders: result.placeholders,
            error: result.error,
          };
        } catch (err) {
          return {
            file: templatePath,
            verified: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    const allVerified = results.every((r) => r.verified);
    if (allVerified && options?.sessionKey && options.turnId) {
      setVerified(options.sessionKey, options.turnId);
    }

    return jsonResult({ allVerified, templates: results });
  } catch (err) {
    return jsonResult({
      allVerified: false,
      error: err instanceof Error ? err.message : String(err),
      templates: [],
    });
  }
}

// ---------------------------------------------------------------------------
// Message verification
// ---------------------------------------------------------------------------

function verifyMessage(messageId: string, options?: SigVerifyToolOptions) {
  const store = options?.messageSigning?.store;
  if (!store) {
    return jsonResult({
      verified: false,
      messageId,
      error: "Message signing is not enabled for this session.",
    });
  }

  const result = store.verify(messageId);
  if (!result.verified) {
    return jsonResult({
      verified: false,
      messageId,
      error: result.error ?? "Message verification failed",
    });
  }

  if (options?.sessionKey && options.turnId) {
    setVerified(options.sessionKey, options.turnId);
  }

  return jsonResult({
    verified: true,
    messageId,
    content: result.content,
    signature: result.signature
      ? {
          signedBy: result.signature.signedBy,
          signedAt: result.signature.signedAt,
          metadata: result.signature.metadata,
        }
      : undefined,
  });
}
