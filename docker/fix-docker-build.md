You are fixing a failed Docker build for the OpenClaw dev environment.
Read the most recent failure in /home/jethro/.pm2/logs/openclaw-docker-watch-out.log
and make the smallest possible change to fix the build.

Rules:

- Do not change version numbers.
- Do not update dependencies unless required to fix the build.
- Do not add or modify pnpm patches or overrides.
- Do not modify the Carbon dependency.
- Keep changes minimal and focused on the build error.
- After fixing, exit so the watcher can retry the build.
