import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execAsync = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const studioRoot = process.cwd();
    const repoRoot = path.resolve(studioRoot, '../../');
    const scriptPath = path.join(repoRoot, 'scripts', 'run-node.mjs');
    
    // We need to point to the correct config for the agent
    // Since we are running "agent" command (ephemeral client), it needs to know where the gateway is.
    // The gateway is running on default port 18789.
    // The "agent" command acts as a client.
    // We also need to make sure it uses the same "home" or config if auth is needed.
    // But for local loopback with default config, it should work.
    
    const command = `node ${scriptPath} agent --to +15555550123 --message "${message.replace(/"/g, '\\"')}" --json`;
    const agentId = userId || 'agent-001';
    const userConfigDir = path.join(studioRoot, 'volumes', agentId, 'config');
    const configPath = path.join(userConfigDir, 'openclaw.json');
    
    // Env vars: We might need to pass OPENCLAW_CONFIG_PATH if the gateway uses a non-standard one
    // and we need to match it. But 'agent' command connects via port.
    // Assuming default port 18789.
    
    const { stdout, stderr } = await execAsync(command, {
        cwd: repoRoot,
        env: { 
            ...process.env, 
            FORCE_COLOR: '0',
            OPENCLAW_CONFIG_PATH: configPath,
            OPENCLAW_STATE_DIR: userConfigDir,
        }
    });

    let result;
    try {
        // Find the JSON object in stdout (it might have logs before it)
        // We look for the last JSON object which should be the command result
        const matches = stdout.match(/\{[\s\S]*\}/g);
        if (matches && matches.length > 0) {
            const lastJson = matches[matches.length - 1];
            result = JSON.parse(lastJson);
        } else {
            result = { raw: stdout };
        }
    } catch (e) {
        result = { raw: stdout, error: "Failed to parse agent output" };
    }

    console.log("[Ping] stdout:", stdout);
    if (stderr) {console.error("[Ping] stderr:", stderr);}

    // Merge the parsed result into the response top-level for easier access
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error("Ping failed:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
