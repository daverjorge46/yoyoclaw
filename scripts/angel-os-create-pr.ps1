# Create Angel OS alignment PR: The-Angel-OS/openclaw -> openclaw/openclaw (base main).
# Requires: branch angel-os/alignment-docs pushed to The-Angel-OS/openclaw.
# Body: docs/ANGEL_OS_PR_BODY.md (CONTRIBUTING-compliant).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$bodyFile = Join-Path $repoRoot "docs\ANGEL_OS_PR_BODY.md"

if (-not (Test-Path $bodyFile)) {
  Write-Error "Body file not found: $bodyFile"
}

gh pr create -R openclaw/openclaw --base main --head "The-Angel-OS:angel-os/alignment-docs" `
  --title "docs: Add Angel OS alignment and strategy context" `
  --body-file $bodyFile

Write-Host "PR created. See: https://github.com/openclaw/openclaw/pulls"
