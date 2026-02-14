# Clawdbot Public Release Setup

## Overview

The clawdbot package is now configured to automatically publish public releases on every push to the `main` branch. This makes it easy to download and install the latest version without needing GitHub authentication.

## What Changed

### 1. GitHub Actions Workflow Updates

**File:** `.github/workflows/windows-package.yml`

#### Changes Made:

1. **Extended Artifact Retention**
   - Artifacts now kept for 90 days (was 7 days)
   - Added error handling if no files are found

2. **New Public Release Job** (`release-latest`)
   - Triggers on every push to `main` branch
   - Creates/updates a release tagged as `latest`
   - **Publicly accessible** without authentication
   - Includes detailed installation instructions
   - Deletes previous `latest` release to avoid clutter

3. **Release Contents**
   - NPM package tarball (`.tgz`)
   - Automated release notes with:
     - Build date and commit info
     - Installation instructions
     - Quick install PowerShell script
     - Documentation links

## Public Download URL

Once the workflow runs, the clawdbot package will be available at:

```
https://github.com/j0904/clawdbot/releases/download/latest/moltbot-[VERSION].tgz
```

**Current version:** `moltbot-0.0.27.tgz`

## Installation Methods

### Method 1: Direct Download & Install

```powershell
# Download the latest release
Invoke-WebRequest -Uri "https://github.com/j0904/clawdbot/releases/download/latest/moltbot-0.0.27.tgz" -OutFile clawdbot.tgz

# Extract and install
tar -xzf clawdbot.tgz
cd package
npm install -g .
```

### Method 2: One-Line Install

```powershell
# Download, extract, and install in one command
Invoke-WebRequest -Uri "https://github.com/j0904/clawdbot/releases/download/latest/moltbot-0.0.27.tgz" -OutFile "$env:TEMP\clawdbot.tgz"; tar -xzf "$env:TEMP\clawdbot.tgz" -C "$env:TEMP"; npm install -g "$env:TEMP\package"
```

### Method 3: Local File Install

If you already have the `.tgz` file:

```powershell
npm install -g .\moltbot-0.0.27.tgz
```

## AVD Test Integration

The AVD software installation test (`tests/avd-software-install.spec.js`) has been updated to:

1. Install Node.js LTS via Chocolatey
2. Download clawdbot from the public GitHub release
3. Extract the tarball using Windows native `tar` command
4. Install npm dependencies
5. Create desktop shortcuts

## Workflow Triggers

### Automatic Release (main branch)
- **When:** Push to `main` branch
- **Creates:** `latest` release tag (public)
- **Purpose:** Latest development build

### Versioned Release (tags)
- **When:** Push a tag starting with `v` (e.g., `v1.0.0`)
- **Creates:** Versioned release (e.g., `v1.0.0`)
- **Purpose:** Stable release versions

## Release Management

### View Releases
```bash
# List all releases
gh release list

# View specific release
gh release view latest
```

### Download Manually
```bash
# Using GitHub CLI
gh release download latest

# Using curl
curl -L https://github.com/j0904/clawdbot/releases/download/latest/moltbot-0.0.27.tgz -o clawdbot.tgz
```

### Trigger Manual Build
You can manually trigger a build via GitHub Actions UI:
1. Go to Actions → Windows Package Build
2. Click "Run workflow"
3. Select branch and build type

## Permissions

The workflow requires the following permissions:
- `contents: write` - To create and update releases

These are automatically granted via the `GITHUB_TOKEN` secret.

## Testing the Release

After pushing to `main`, check:

1. **GitHub Actions**
   - Verify the workflow completes successfully
   - Check the "Build Summary" for details

2. **Releases Page**
   - Navigate to: https://github.com/j0904/clawdbot/releases
   - Verify `latest` release exists
   - Confirm `.tgz` file is attached

3. **Download Test**
   ```powershell
   # Test public download
   Invoke-WebRequest -Uri "https://github.com/j0904/clawdbot/releases/download/latest/moltbot-0.0.27.tgz" -OutFile test.tgz

   # Verify file
   Get-FileHash test.tgz
   ```

## Troubleshooting

### Release Not Created
- Check workflow logs in GitHub Actions
- Ensure push was to `main` branch
- Verify `GITHUB_TOKEN` has `contents: write` permission

### Download Fails
- Verify release exists: https://github.com/j0904/clawdbot/releases/tag/latest
- Check if version number matches in URL
- Try using `gh release download latest` instead

### Old Release Still Visible
- The workflow deletes previous `latest` release before creating new one
- Check if workflow completed successfully
- Old tagged releases (v1.0.0, etc.) are kept intentionally

## Next Steps

1. **Push to Main Branch**
   ```bash
   cd /home/jcui/git/clawdbot
   git add .github/workflows/windows-package.yml
   git commit -m "Add public release automation for clawdbot"
   git push origin main
   ```

2. **Wait for Workflow**
   - Monitor: https://github.com/j0904/clawdbot/actions

3. **Verify Release**
   - Check: https://github.com/j0904/clawdbot/releases/tag/latest

4. **Test Download**
   - Use the download URL in your AVD test

5. **Update AVD Test**
   - Already updated in `/home/jcui/git/azure-avd/tests/avd-software-install.spec.js`
   - Test with: `npx playwright test tests/avd-software-install.spec.js --headed`

## Benefits

✅ **No Authentication Required** - Public downloads without GitHub token
✅ **Always Latest** - Automatically updates on every main branch push
✅ **Easy Integration** - Simple URL for scripts and automation
✅ **90-Day Retention** - Artifacts kept for 3 months
✅ **Detailed Release Notes** - Automatic documentation with each build
✅ **Version Tracking** - Commit info and build date included

## Support

For issues with releases:
- Check workflow logs: https://github.com/j0904/clawdbot/actions
- Open an issue: https://github.com/j0904/clawdbot/issues
- Review documentation: This file

---

**Created:** 2026-02-10
**Last Updated:** 2026-02-10
**Status:** ✅ Ready to deploy
