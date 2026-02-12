/**
 * Integration test for PenPot Design Bridge.
 *
 * Tests the full flow:
 * 1. Verify auth (get-profile)
 * 2. List teams/projects
 * 3. Create a file
 * 4. Add a page
 * 5. Design a login UI (batch)
 * 6. Add library colors/typography
 * 7. Inspect the file to verify
 */

import type { ShapeInput } from "./src/changes.js";
import { ChangesBuilder } from "./src/changes.js";
import { PenpotClient } from "./src/client.js";
import { generateUuid } from "./src/uuid.js";

const BASE_URL = process.env.PENPOT_BASE_URL ?? "http://localhost:9001";
const ACCESS_TOKEN = process.env.PENPOT_ACCESS_TOKEN!;

if (!ACCESS_TOKEN) {
  console.error("ERROR: PENPOT_ACCESS_TOKEN not set");
  process.exit(1);
}

const client = new PenpotClient({ baseUrl: BASE_URL, accessToken: ACCESS_TOKEN });

let passed = 0;
let failed = 0;

function ok(label: string, detail?: string) {
  passed++;
  console.log(`  ✓ ${label}${detail ? ` (${detail})` : ""}`);
}

function fail(label: string, err: unknown) {
  failed++;
  console.log(`  ✗ ${label}: ${err}`);
}

async function run() {
  console.log(`\nPenPot Design Bridge — Integration Test`);
  console.log(`Endpoint: ${BASE_URL}\n`);

  // ── 1. Auth / Profile ──────────────────────────────────────────────────
  console.log("1. Auth (get-profile)");
  let profile: Record<string, unknown>;
  try {
    profile = (await client.getProfile()) as Record<string, unknown>;
    ok("get-profile", `${profile.fullname} <${profile.email}>`);
  } catch (e) {
    fail("get-profile", e);
    console.log("\nAuth failed — cannot continue.\n");
    process.exit(1);
  }

  const defaultTeamId = profile["default-team-id"] as string;
  const defaultProjectId = profile["default-project-id"] as string;

  // ── 2. List Teams & Projects ───────────────────────────────────────────
  console.log("\n2. List teams & projects");
  try {
    const teams = (await client.getTeams()) as Record<string, unknown>[];
    ok("get-teams", `${teams.length} team(s)`);

    if (defaultTeamId) {
      const projects = (await client.getProjects(defaultTeamId)) as Record<string, unknown>[];
      ok("get-projects", `${projects.length} project(s) in default team`);
    }
  } catch (e) {
    fail("get-teams/projects", e);
  }

  // ── 3. Create a File ──────────────────────────────────────────────────
  console.log("\n3. Create file");
  let fileId: string | undefined;
  let revn = 0;
  let pageId: string | undefined;

  try {
    const file = (await client.createFile(
      defaultProjectId,
      "Integration Test — Login Screen",
    )) as Record<string, unknown>;
    fileId = file.id as string;
    revn = (file.revn as number) ?? 0;

    const data = file.data as Record<string, unknown> | undefined;
    const pages = (data?.pages as string[]) ?? [];
    pageId = pages[0];

    ok("create-file", `id=${fileId}, revn=${revn}, page=${pageId}`);
  } catch (e) {
    fail("create-file", e);
  }

  if (!fileId || !pageId) {
    console.log("\nFile creation failed — cannot continue.\n");
    process.exit(1);
  }

  // ── 4. Add a Page ─────────────────────────────────────────────────────
  console.log("\n4. Add page");
  let page2Id: string | undefined;
  try {
    const sessionId = generateUuid();
    page2Id = generateUuid();
    const builder = new ChangesBuilder(page2Id);
    builder.addPage(page2Id, "Settings Page");

    await client.updateFile({
      id: fileId,
      revn,
      "session-id": sessionId,
      changes: builder.getChanges() as unknown as Record<string, unknown>[],
    });
    revn++;
    ok("add-page", `id=${page2Id}`);
  } catch (e) {
    fail("add-page", e);
  }

  // ── 5. Design Login UI (batch) ────────────────────────────────────────
  console.log("\n5. Design login UI (batch shapes)");
  try {
    const sessionId = generateUuid();
    const builder = new ChangesBuilder(pageId);

    const loginTree: ShapeInput = {
      type: "frame",
      name: "Login Screen",
      x: 0,
      y: 0,
      width: 375,
      height: 812,
      fillColor: "#F9FAFB",
      layout: {
        layout: "flex",
        "layout-flex-dir": "column",
        "layout-justify-content": "center",
        "layout-align-items": "center",
        "layout-gap": { "row-gap": 16, "column-gap": 0 },
        "layout-padding": { p1: 40, p2: 24, p3: 40, p4: 24 },
      },
      children: [
        {
          type: "text",
          name: "App Title",
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          paragraphs: [
            {
              spans: [
                {
                  text: "MyApp",
                  fontSize: "32",
                  fontWeight: "700",
                  fillColor: "#1F2937",
                  fontFamily: "Inter",
                },
              ],
              textAlign: "center",
            },
          ],
        },
        {
          type: "text",
          name: "Subtitle",
          x: 0,
          y: 0,
          width: 250,
          height: 24,
          paragraphs: [
            {
              spans: [
                {
                  text: "Sign in to continue",
                  fontSize: "16",
                  fontWeight: "400",
                  fillColor: "#6B7280",
                  fontFamily: "Inter",
                },
              ],
              textAlign: "center",
            },
          ],
        },
        {
          type: "frame",
          name: "Form Container",
          x: 0,
          y: 0,
          width: 327,
          height: 200,
          fillColor: "#FFFFFF",
          layout: {
            layout: "flex",
            "layout-flex-dir": "column",
            "layout-gap": { "row-gap": 12, "column-gap": 0 },
            "layout-padding": { p1: 24, p2: 24, p3: 24, p4: 24 },
          },
          children: [
            {
              type: "rect",
              name: "Email Input",
              x: 0,
              y: 0,
              width: 279,
              height: 48,
              r1: 8,
              r2: 8,
              r3: 8,
              r4: 8,
              fills: [{ "fill-color": "#F3F4F6", "fill-opacity": 1 }],
            },
            {
              type: "rect",
              name: "Password Input",
              x: 0,
              y: 0,
              width: 279,
              height: 48,
              r1: 8,
              r2: 8,
              r3: 8,
              r4: 8,
              fills: [{ "fill-color": "#F3F4F6", "fill-opacity": 1 }],
            },
            {
              type: "rect",
              name: "Sign In Button",
              x: 0,
              y: 0,
              width: 279,
              height: 48,
              r1: 8,
              r2: 8,
              r3: 8,
              r4: 8,
              fills: [{ "fill-color": "#3B82F6", "fill-opacity": 1 }],
            },
          ],
        },
        {
          type: "text",
          name: "Forgot Password",
          x: 0,
          y: 0,
          width: 200,
          height: 20,
          paragraphs: [
            {
              spans: [
                {
                  text: "Forgot password?",
                  fontSize: "14",
                  fontWeight: "400",
                  fillColor: "#3B82F6",
                  fontFamily: "Inter",
                },
              ],
              textAlign: "center",
            },
          ],
        },
      ],
    };

    builder.addShape(loginTree);
    const changes = builder.getChanges();
    const shapeCount = changes.filter((c) => c.type === "add-obj").length;

    await client.updateFile({
      id: fileId,
      revn,
      "session-id": sessionId,
      changes: changes as unknown as Record<string, unknown>[],
    });
    revn++;
    ok("design-ui (batch)", `${shapeCount} shapes created`);
  } catch (e) {
    fail("design-ui", e);
  }

  // ── 6. Library (colors & typography) ──────────────────────────────────
  console.log("\n6. Add library items");
  try {
    const sessionId = generateUuid();
    const builder = new ChangesBuilder("00000000-0000-0000-0000-000000000000");

    builder.addColor(generateUuid(), "Primary", "#3B82F6");
    builder.addColor(generateUuid(), "Background", "#F9FAFB");
    builder.addColor(generateUuid(), "Surface", "#FFFFFF");
    builder.addColor(generateUuid(), "Text Primary", "#1F2937");
    builder.addColor(generateUuid(), "Text Secondary", "#6B7280");

    builder.addTypography(generateUuid(), "Heading", "Inter", "32", "700", { lineHeight: "1.2" });
    builder.addTypography(generateUuid(), "Body", "Inter", "16", "400", { lineHeight: "1.5" });
    builder.addTypography(generateUuid(), "Caption", "Inter", "14", "400", { lineHeight: "1.4" });

    await client.updateFile({
      id: fileId,
      revn,
      "session-id": sessionId,
      changes: builder.getChanges() as unknown as Record<string, unknown>[],
    });
    revn++;
    ok("add-library", "5 colors, 3 typographies");
  } catch (e) {
    fail("add-library", e);
  }

  // ── 7. Inspect File ───────────────────────────────────────────────────
  console.log("\n7. Inspect file (verify)");
  try {
    const file = (await client.getFile(fileId)) as Record<string, unknown>;
    const data = file.data as Record<string, unknown>;
    const pageIds = (data.pages as string[]) ?? [];
    const pagesIndex = (data["pages-index"] as Record<string, Record<string, unknown>>) ?? {};

    ok("get-file", `revn=${file.revn}, ${pageIds.length} page(s)`);

    for (const pid of pageIds) {
      const page = pagesIndex[pid];
      if (!page) continue;
      const objects = (page.objects as Record<string, unknown>) ?? {};
      const count = Object.keys(objects).length;
      ok(`  page "${page.name}"`, `${count} object(s)`);
    }
  } catch (e) {
    fail("get-file (verify)", e);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (fileId) {
    console.log(`\nOpen in PenPot: ${BASE_URL}/#/workspace/${fileId}`);
  }
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
