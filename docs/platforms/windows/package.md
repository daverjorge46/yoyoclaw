---
summary: "Building and packaging Moltbot for Windows distribution"
read_when:
  - Building Windows packages
  - Testing Windows installers
  - Setting up Windows CI/CD
---

# Windows Package Build

This guide covers building and packaging Moltbot for Windows distribution.

## Current Status

**Available:**
- npm package (works on Windows)
- PowerShell installer script (`install.ps1`)
- GitHub Actions workflow for automated builds

**Coming Soon:**
- Native Windows companion app (WPF/.NET MAUI)
- MSI installer with WiX Toolset
- Auto-update support (Squirrel.Windows)

## Prerequisites

### Local Development

- **Node.js 22+** (install from [nodejs.org](https://nodejs.org) or via winget)
- **pnpm** (installed via corepack: `corepack enable`)
- **Git for Windows** (for git-based installs)
- **PowerShell 7+** (recommended, or Windows PowerShell 5.1)

Check versions:
```powershell
node --version    # v22.x.x or higher
pnpm --version    # 10.23.0 or higher
git --version     # Any recent version
```

### For Native App Development (Future)

- **Visual Studio 2022** (with .NET Desktop Development workload)
- **.NET SDK 8.0+**
- **WiX Toolset v5** (for MSI installers)

## Building the npm Package

### Using the Build Script

```powershell
# Build release package
.\scripts\package-windows.ps1

# Build debug package
.\scripts\package-windows.ps1 -BuildConfig Debug

# Skip tests (faster iteration)
.\scripts\package-windows.ps1 -SkipTests

# Only create npm tarball (no other steps)
.\scripts\package-windows.ps1 -PackageOnly
```

The script will:
1. Install dependencies with pnpm
2. Bundle A2UI assets (if present)
3. Run tests (unless `-SkipTests`)
4. Build TypeScript to `dist/`
5. Create npm tarball in `artifacts/`

### Manual Build Steps

```powershell
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Bundle A2UI (if needed)
pnpm canvas:a2ui:bundle

# 3. Build TypeScript
pnpm build

# 4. Create package tarball
npm pack --pack-destination ./artifacts
```

### Build Outputs

```
artifacts/
└── moltbot-2026.1.26.tgz    # npm package tarball

dist/
├── entry.js                  # CLI entry point
├── index.js                  # Main export
├── build-info.json           # Build metadata
├── cli/                      # CLI commands
├── gateway/                  # Gateway server
├── providers/                # LLM providers
└── ...                       # Other modules
```

## Testing the Package

### Using the Test Script

```powershell
# Test all installation methods
.\scripts\test-windows-install.ps1

# Test npm install only
.\scripts\test-windows-install.ps1 -TestMethod npm

# Test with clean install (removes existing first)
.\scripts\test-windows-install.ps1 -CleanInstall

# Test specific tarball
.\scripts\test-windows-install.ps1 -PackagePath .\artifacts\moltbot-2026.1.26.tgz
```

### Manual Testing

```powershell
# Install from local tarball
npm install -g .\artifacts\moltbot-2026.1.26.tgz

# Verify installation
moltbot --version
moltbot --help

# Test basic commands
moltbot config get gateway.mode
moltbot channels status

# Uninstall
npm uninstall -g moltbot
```

## GitHub Actions Workflow

The `.github/workflows/windows-package.yml` workflow runs on:
- Push to `main` or `dev` branches
- Pull requests
- Version tags (`v*`)
- Manual trigger via `workflow_dispatch`

### Workflow Jobs

**1. build-npm-package**
- Builds npm package on Windows runner
- Creates tarball artifact
- Uploads to GitHub Actions artifacts

**2. test-installer-script**
- Tests PowerShell installer (if available)
- Validates installation methods

**3. build-windows-app** (disabled, placeholder)
- Will build native Windows app when ready
- Includes MSI installer creation

**4. release-windows** (tags only)
- Creates GitHub release with Windows assets
- Generates release notes
- Uploads npm tarball

### Triggering Manual Builds

```bash
# Via GitHub CLI
gh workflow run windows-package.yml -f build_type=release

# Via web UI
# 1. Go to Actions tab
# 2. Select "Windows Package Build"
# 3. Click "Run workflow"
```

## Distribution Methods

### 1. NPM Registry (Current)

Publish to npm:
```powershell
# Login to npm (one-time)
npm login

# Publish from tarball
npm publish .\artifacts\moltbot-2026.1.26.tgz --access public

# Or publish directly
npm publish --access public
```

Users install via:
```powershell
npm install -g moltbot
```

### 2. PowerShell Installer (Current)

The installer script lives in the sibling `molt.bot` repo at `public/install.ps1`.

Users install via:
```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

The installer:
- Ensures Node.js 22+ is installed
- Installs moltbot via npm or git
- Runs `moltbot doctor` for upgrades

### 3. GitHub Releases (Current)

Attach npm tarball to GitHub releases:
```powershell
# Create release with gh CLI
gh release create v2026.1.26 `
  --title "moltbot 2026.1.26" `
  --notes-file CHANGELOG.md `
  .\artifacts\moltbot-2026.1.26.tgz
```

Users install via:
```powershell
# Download tarball
curl -LO https://github.com/moltbot/moltbot/releases/download/v2026.1.26/moltbot-2026.1.26.tgz

# Install
npm install -g .\moltbot-2026.1.26.tgz
```

### 4. MSI Installer (Future)

When the native Windows app is ready:
- Build with WiX Toolset
- Code sign with Authenticode certificate
- Upload MSI to GitHub releases
- Support silent install: `msiexec /i Moltbot-2026.1.26.msi /quiet`

### 5. Microsoft Store (Future)

When MSIX packaging is implemented:
- Submit to Microsoft Store
- Auto-updates via Store
- Sandboxed installation

## Code Signing (Future)

For native Windows apps and installers, you'll need an Authenticode certificate.

### Certificate Options

1. **Commercial CA** (DigiCert, Sectigo, etc.)
   - $300-500/year
   - Trusted by Windows SmartScreen immediately
   - Requires company validation

2. **Azure Code Signing**
   - Store certificate in Azure Key Vault
   - Hardware-backed security
   - Pay-as-you-go pricing

3. **Self-signed** (dev only)
   - Free but not trusted by default
   - Users see security warnings
   - OK for internal testing

### Signing Process

```powershell
# Sign executable
signtool sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /f certificate.pfx `
  /p <password> `
  Moltbot.exe

# Sign MSI installer
signtool sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /f certificate.pfx `
  /p <password> `
  Moltbot-2026.1.26.msi
```

## Auto-Updates (Future)

### Squirrel.Windows

Popular choice for Electron and .NET apps:

```powershell
# Install Squirrel.Windows
dotnet add package Squirrel.Windows

# Create release
Squirrel --releasify Moltbot-2026.1.26.nupkg --releaseDir releases
```

Features:
- Delta updates (only download changed files)
- Rollback support
- Silent background updates
- GitHub releases integration

### WinSparkle

Windows port of Sparkle (used by macOS app):

```csharp
// Initialize auto-updater
var updater = new WinSparkle();
updater.SetAppcastUrl("https://raw.githubusercontent.com/moltbot/moltbot/main/appcast-windows.xml");
updater.Initialize();
```

Features:
- Appcast XML feed (compatible with macOS Sparkle)
- Code signature verification
- User-controlled updates

## Troubleshooting

### npm install fails with EACCES

Windows npm usually doesn't need prefix changes, but if you hit permission errors:

```powershell
# Set npm prefix to user directory
npm config set prefix "$env:APPDATA\npm"

# Add to PATH (if not already)
$npmPath = "$env:APPDATA\npm"
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$npmPath", "User")
```

### moltbot command not found after install

1. **Check npm global bin is in PATH:**
   ```powershell
   npm config get prefix
   # Should return something like C:\Users\YourName\AppData\Roaming\npm
   ```

2. **Add to PATH if missing:**
   ```powershell
   $npmPath = npm config get prefix
   [Environment]::SetEnvironmentVariable("Path", "$env:Path;$npmPath", "User")
   ```

3. **Restart PowerShell/Terminal** to pick up PATH changes

### PowerShell script execution blocked

If you see "cannot be loaded because running scripts is disabled":

```powershell
# Check current policy
Get-ExecutionPolicy

# Allow local scripts (one-time, as Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Build fails with "sharp" errors

The `sharp` native module can be problematic on Windows:

```powershell
# Clean and rebuild
Remove-Item node_modules\sharp -Recurse -Force
pnpm install --force

# Or set sharp to ignore global libvips
$env:SHARP_IGNORE_GLOBAL_LIBVIPS = "1"
pnpm install
```

## Next Steps

To implement native Windows app:

1. **Create app structure:**
   ```
   mkdir apps\windows
   cd apps\windows
   dotnet new wpf -n Moltbot.Windows
   ```

2. **Add WiX installer:**
   ```
   mkdir apps\windows\installer\wix
   # Create Product.wxs, UI fragments, etc.
   ```

3. **Update build script:**
   Edit `scripts\package-windows.ps1` to build the .NET app

4. **Enable CI workflow:**
   Edit `.github\workflows\windows-package.yml` and set `if: true` on `build-windows-app` job

5. **Configure auto-updates:**
   Add Squirrel.Windows or WinSparkle to the project

6. **Code signing:**
   Obtain certificate and add signing to build pipeline

See the [Windows native app design doc](/platforms/windows/design) for architectural details.
