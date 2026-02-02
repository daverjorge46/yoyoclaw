#!/usr/bin/env node
/* Minimal cross-platform stub for the A2UI bundler used by `pnpm build`.
   On POSIX systems the existing bash script `scripts/bundle-a2ui.sh` or a
   proper TypeScript implementation should be used to (re)build the bundle.

   This stub simply skips bundling when a prebuilt bundle and hash already
   exist (common for development on Windows). It exits successfully so the
   rest of the build (TypeScript compile, metadata tasks) can proceed.
*/
import fs from "fs";
import path from "path";

const root = process.cwd();
const hashFile = path.join(root, "src", "canvas-host", "a2ui", ".bundle.hash");
const outputFile = path.join(root, "src", "canvas-host", "a2ui", "a2ui.bundle.js");

if (fs.existsSync(hashFile) && fs.existsSync(outputFile)) {
  console.log("A2UI bundle up to date; skipping bundle step (Windows stub).");
  process.exit(0);
}

console.warn("A2UI bundle not present. To generate it on POSIX: run 'pnpm canvas:a2ui:bundle' in a bash environment (WSL or Linux/macOS).\nProceeding without A2UI rebuild.");
process.exit(0);
