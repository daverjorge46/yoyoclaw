import { describe, expect, it } from "vitest";
import { buildHomeTabBlocks } from "./home.js";

describe("buildHomeTabBlocks", () => {
  it("returns blocks with header, version, and bot mention", () => {
    const blocks = buildHomeTabBlocks({ botUserId: "U12345" });

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0]).toMatchObject({ type: "header" });

    // Section with fields containing bot user and version
    const section = blocks[1];
    expect(section).toMatchObject({ type: "section" });
    expect("fields" in section && section.fields).toBeTruthy();
    const fieldsText = JSON.stringify(section);
    expect(fieldsText).toContain("U12345");
    expect(fieldsText).toContain("Version");
  });

  it("uses default /openclaw slash command when none provided", () => {
    const blocks = buildHomeTabBlocks({ botUserId: "U99" });
    const slashBlock = blocks.find(
      (b) => b.type === "section" && "text" in b && b.text?.text?.includes("Slash Commands"),
    );
    expect(slashBlock).toBeDefined();
    const text = slashBlock && "text" in slashBlock ? (slashBlock.text?.text ?? "") : "";
    expect(text).toContain("`/openclaw`");
  });

  it("uses custom slash command when provided", () => {
    const blocks = buildHomeTabBlocks({ botUserId: "U99", slashCommand: "/mybot" });
    const slashBlock = blocks.find(
      (b) => b.type === "section" && "text" in b && b.text?.text?.includes("Slash Commands"),
    );
    expect(slashBlock).toBeDefined();
    const text = slashBlock && "text" in slashBlock ? (slashBlock.text?.text ?? "") : "";
    expect(text).toContain("`/mybot`");
    expect(text).not.toContain("/openclaw");
  });

  it("includes docs/github/community links in context block", () => {
    const blocks = buildHomeTabBlocks({ botUserId: "U99" });
    const contextBlock = blocks.find((b) => b.type === "context");
    expect(contextBlock).toBeDefined();
    const contextText = JSON.stringify(contextBlock);
    expect(contextText).toContain("docs.openclaw.ai");
    expect(contextText).toContain("github.com");
    expect(contextText).toContain("discord.com");
  });
});
