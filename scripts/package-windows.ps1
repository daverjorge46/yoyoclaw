#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and package Moltbot for Windows distribution

.DESCRIPTION
    This script builds the Moltbot CLI package and prepares it for Windows distribution.
    It handles TypeScript compilation, npm packaging, and artifact preparation.

.PARAMETER BuildConfig
    Build configuration: Debug or Release (default: Release)

.PARAMETER SkipTests
    Skip running tests before packaging

.PARAMETER SkipInstaller
    Skip creating installer artifacts

.PARAMETER OutputDir
    Output directory for build artifacts (default: dist/)

.PARAMETER PackageOnly
    Only create the npm package, skip other steps

.EXAMPLE
    .\scripts\package-windows.ps1
    Build with default settings (Release configuration)

.EXAMPLE
    .\scripts\package-windows.ps1 -BuildConfig Debug -SkipTests
    Build debug version without running tests

.EXAMPLE
    .\scripts\package-windows.ps1 -PackageOnly
    Only create the npm package tarball
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Debug", "Release")]
    [string]$BuildConfig = "Release",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory=$false)]
    [switch]$SkipInstaller = $false,

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory=$false)]
    [switch]$PackageOnly = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Step {
    param([string]$Message)
    Write-Host "📦 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Yellow
}

# Determine root directory
$RootDir = Split-Path -Parent $PSScriptRoot
if (-not $OutputDir) {
    $OutputDir = Join-Path $RootDir "dist"
}

$ArtifactsDir = Join-Path $RootDir "artifacts"

Write-Step "Moltbot Windows Package Builder"
Write-Info "Root: $RootDir"
Write-Info "Config: $BuildConfig"
Write-Info "Output: $OutputDir"

# Verify Node.js and pnpm
Write-Step "Checking runtime requirements..."

try {
    $nodeVersion = node --version
    Write-Success "Node.js: $nodeVersion"
} catch {
    Write-Error-Custom "Node.js not found. Please install Node.js 22+ from https://nodejs.org"
    exit 1
}

try {
    $pnpmVersion = pnpm --version
    Write-Success "pnpm: v$pnpmVersion"
} catch {
    Write-Info "pnpm not found. Installing via corepack..."
    corepack enable
    corepack prepare pnpm@10.23.0 --activate
    $pnpmVersion = pnpm --version
    Write-Success "pnpm: v$pnpmVersion (installed)"
}

# Get package version
Push-Location $RootDir
try {
    $PackageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $PackageVersion = $PackageJson.version
    $PackageName = $PackageJson.name
    Write-Info "Package: $PackageName@$PackageVersion"
} catch {
    Write-Error-Custom "Failed to read package.json"
    exit 1
}

# Install dependencies
if (-not $PackageOnly) {
    Write-Step "Installing dependencies..."
    pnpm install --frozen-lockfile --config.engine-strict=false
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Dependency installation failed"
        exit 1
    }
    Write-Success "Dependencies installed"
}

# Bundle A2UI if needed
if (-not $PackageOnly -and (Test-Path "src/canvas-host/a2ui")) {
    Write-Step "Bundling A2UI..."
    try {
        pnpm canvas:a2ui:bundle
        Write-Success "A2UI bundled"
    } catch {
        Write-Info "A2UI bundle skipped or failed (non-critical)"
    }
}

# Run tests
if (-not $SkipTests -and -not $PackageOnly) {
    Write-Step "Running tests..."
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    pnpm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Tests failed"
        exit 1
    }
    Write-Success "Tests passed"
}

# Build TypeScript
Write-Step "Building TypeScript..."
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Build failed"
    exit 1
}
Write-Success "Build completed"

# Verify build outputs
Write-Step "Verifying build outputs..."
$requiredFiles = @(
    "dist/entry.js",
    "dist/index.js",
    "dist/build-info.json"
)

foreach ($file in $requiredFiles) {
    $filePath = Join-Path $RootDir $file
    if (-not (Test-Path $filePath)) {
        Write-Error-Custom "Required file not found: $file"
        exit 1
    }
}
Write-Success "Build verification passed"

# Create artifacts directory
if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

# Create npm package tarball
Write-Step "Creating npm package tarball..."
npm pack --pack-destination $ArtifactsDir
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm pack failed"
    exit 1
}

$TarballName = "$PackageName-$PackageVersion.tgz"
$TarballPath = Join-Path $ArtifactsDir $TarballName
Write-Success "Package created: $TarballName"

# Display tarball info
if (Test-Path $TarballPath) {
    $tarballSize = (Get-Item $TarballPath).Length / 1MB
    Write-Info "Tarball size: $([math]::Round($tarballSize, 2)) MB"
}

# Future: Create installer (when Windows app exists)
if (-not $SkipInstaller -and (Test-Path "apps/windows")) {
    Write-Step "Building Windows installer..."
    Write-Info "Windows app detected - installer creation would happen here"
    # TODO: Add WiX/NSIS installer creation
} else {
    Write-Info "Windows app not found (apps/windows/) - skipping installer creation"
    Write-Info "For now, distribution is via npm package only"
}

# Summary
Write-Step "Build Summary"
Write-Host ""
Write-Success "Package: $PackageName@$PackageVersion"
Write-Success "Tarball: $TarballPath"
Write-Success "Build configuration: $BuildConfig"
Write-Host ""
Write-Info "To test the package locally:"
Write-Host "  npm install -g `"$TarballPath`"" -ForegroundColor White
Write-Host ""
Write-Info "To publish to npm:"
Write-Host "  npm publish `"$TarballPath`" --access public" -ForegroundColor White
Write-Host ""

# Create installer instructions
if (-not (Test-Path "apps/windows")) {
    Write-Info "Next steps for native Windows app:"
    Write-Host "  1. Create apps/windows/ directory with .NET/WPF app" -ForegroundColor White
    Write-Host "  2. Add WiX installer project to apps/windows/installer/" -ForegroundColor White
    Write-Host "  3. Configure code signing with Authenticode certificate" -ForegroundColor White
    Write-Host "  4. Set up auto-update with Squirrel.Windows" -ForegroundColor White
    Write-Host ""
}

Pop-Location
Write-Success "Windows package build completed!"
exit 0
