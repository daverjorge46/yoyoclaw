import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import crypto from 'crypto';

export interface LaunchConfig {
  userId: string;
  env: Record<string, string>;
  openclawConfig: any; // openclaw.json content
}

export class DockerManager {
  private static instance: DockerManager;
  private docker: Docker | null = null;
  private isMock: boolean = false;

  private constructor() {
    try {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
      // We can't easily sync check connection here, but dockerode usually doesn't throw on new()
      // We will handle errors in methods.
    } catch (e) {
      console.warn("Failed to initialize Docker client, falling back to Local Process Mode:", e);
      this.isMock = true;
    }
  }

  public static getInstance(): DockerManager {
    if (!DockerManager.instance) {
      DockerManager.instance = new DockerManager();
    }
    return DockerManager.instance;
  }

  async launchInstance(config: LaunchConfig): Promise<string> {
    const { userId, env, openclawConfig } = config;
    
    // Prepare volume path for config
    const projectRoot = process.cwd(); 
    // We go up two levels from apps/studio/src/lib/docker-manager.ts? No, process.cwd() is apps/studio when running 'pnpm dev'.
    // BUT the user is running 'pnpm dev' inside 'apps/studio'. 
    // OpenClaw root is one level up from 'apps/studio'? No, two levels up: apps/studio -> apps -> root.
    // Let's verify process.cwd(). 
    // If I run 'pnpm dev' in 'apps/studio', cwd is '.../openclaw/apps/studio'.
    // The openclaw source is in '.../openclaw'.
    // So project root is path.resolve(process.cwd(), '../../').
    
    const studioRoot = process.cwd();
    const repoRoot = path.resolve(studioRoot, '../../');
    
    // We store config in the Studio's local volume dir for simplicity, 
    // OR we should put it in the repo root?
    // Let's put it in studioRoot/volumes for now.
    
    const userConfigDir = path.join(studioRoot, 'volumes', userId, 'config');
    fs.mkdirSync(userConfigDir, { recursive: true });
    
    // Write SOUL.md (System Prompt)
    fs.writeFileSync(
      path.join(userConfigDir, 'SOUL.md'), 
      "You are a helpful assistant managed by OpenClaw Studio."
    );

    // Generate auth-profiles.json from env keys
    const authStore = {
      version: 1,
      profiles: {} as Record<string, any>
    };

    if (env.OPENAI_API_KEY) {
      authStore.profiles["openai:default"] = { type: "api_key", provider: "openai", key: env.OPENAI_API_KEY };
    }
    if (env.ANTHROPIC_API_KEY) {
      authStore.profiles["anthropic:default"] = { type: "api_key", provider: "anthropic", key: env.ANTHROPIC_API_KEY };
    }
    if (env.GEMINI_API_KEY) {
      authStore.profiles["google:default"] = { type: "api_key", provider: "google", key: env.GEMINI_API_KEY };
    }

    const agentAuthDir = path.join(userConfigDir, 'agents', 'main', 'agent');
    fs.mkdirSync(agentAuthDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentAuthDir, 'auth-profiles.json'),
      JSON.stringify(authStore, null, 2)
    );

    // Update config to point to this workspace and set gateway mode/auth
    if (!openclawConfig.agents) {openclawConfig.agents = {};}
    if (!openclawConfig.agents.defaults) {openclawConfig.agents.defaults = {};}
    openclawConfig.agents.defaults.workspace = userConfigDir;
    
    if (!openclawConfig.gateway) {openclawConfig.gateway = {};}
    openclawConfig.gateway.mode = "local";
    
    // Generate secure token
    const gatewayToken = crypto.randomUUID();
    openclawConfig.gateway.auth = {
      mode: "token",
      token: gatewayToken
    };

    const configPath = path.join(userConfigDir, 'openclaw.json');
    
    fs.writeFileSync(
      configPath,
      JSON.stringify(openclawConfig, null, 2)
    );

    if (this.isMock || !this.docker) {
        console.warn("⚠️ [LOCAL MODE] Docker is not available. Spawning local OpenClaw process.");
        
        // Spawn real OpenClaw process
        const scriptPath = path.join(repoRoot, 'scripts', 'run-node.mjs');
        
        try {
          // We spawn 'node scripts/run-node.mjs gateway'
          // We must set CWD to repoRoot so it finds package.json, etc.
          const child = spawn('node', [scriptPath, 'gateway'], {
            cwd: repoRoot,
            env: {
              ...process.env,
              ...env, // User provided keys (OPENAI_API_KEY etc)
              STUDIO_URL: `ws://localhost:3000/ws`,
              AGENT_ID: userId,
              OPENCLAW_CONFIG_PATH: configPath,
              OPENCLAW_STATE_DIR: userConfigDir,
              OPENCLAW_GATEWAY_TOKEN: gatewayToken, // Pass token to process env
              // Force color for better logs if we capture them
              FORCE_COLOR: '1'
            },
            stdio: 'inherit', // Show logs in studio console
            detached: false   // Keep attached for dev visibility
          });
          
          // child.unref(); // Keep ref so we can see it running
          
          console.log(`[LOCAL] Started OpenClaw Gateway (PID: ${child.pid}) using config: ${configPath}`);
          return `local-process-${child.pid}`;
        } catch (e) {
          console.error("Failed to spawn local agent:", e);
          throw e;
        }
    }

    const containerName = `openclaw-agent-${userId}-${Date.now()}`;
    // Docker logic remains (assuming running from repo root context if docker was available, but here we are in studio)
    // If docker was available, we'd need to be careful about paths too.
    // For now, focusing on fixing the "Local Process" fallback.

    const hostIp = process.platform === 'linux' ? '172.17.0.1' : 'host.docker.internal';

    // Build env vars
    const containerEnv = [
      `STUDIO_URL=http://${hostIp}:3000/ws`, 
      `AGENT_ID=${userId}`,
      ...Object.entries(env).map(([k, v]) => `${k}=${v}`)
    ];

    try {
        const container = await this.docker.createContainer({
        Image: 'openclaw-agent:latest',
        name: containerName,
        Env: containerEnv,
        HostConfig: {
            Binds: [
            `${userConfigDir}:/app/config:ro`
            ],
            AutoRemove: true, 
        },
        });

        await container.start();
        return container.id;
    } catch (error: any) {
        if (error.code === 'ENOENT' || error.message.includes('connect ENOENT')) {
            console.warn("⚠️ Docker socket not found. Switching to Local Process Mode for this request.");
            this.isMock = true;
            this.docker = null;
            return this.launchInstance(config); // Retry in local mode
        }
        throw error;
    }
  }

  async listInstances() {
    if (this.isMock || !this.docker) {
        return [];
    }
    try {
        return await this.docker.listContainers({
        filters: {
            ancestor: ['openclaw-agent:latest'],
            status: ['running']
        }
        });
    } catch (e) {
        return [];
    }
  }

  async stopInstance(containerId: string) {
    if (this.isMock || !this.docker) {
        console.log(`[LOCAL] Cannot stop local process ${containerId} remotely (yet).`);
        // We could store PIDs and kill them if we tracked them.
        return;
    }
    const container = this.docker.getContainer(containerId);
    return container.stop();
  }
}

