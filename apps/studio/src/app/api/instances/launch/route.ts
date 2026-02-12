import { NextRequest, NextResponse } from "next/server";
import { DockerManager } from "../../../../lib/docker-manager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, env, openclawConfig } = body;

    if (!userId || !openclawConfig) {
      return NextResponse.json({ error: "userId and openclawConfig are required" }, { status: 400 });
    }

    const manager = DockerManager.getInstance();
    const containerId = await manager.launchInstance({
      userId,
      env: env || {},
      openclawConfig
    });

    return NextResponse.json({ success: true, containerId });
  } catch (e: any) {
    console.error("Failed to launch instance:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
