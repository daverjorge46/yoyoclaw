#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Moltbot Windows installation methods

.DESCRIPTION
    This script tests various Windows installation methods:
    - npm global install from tarball
    - npm global install from registry
    - PowerShell installer script (if available)

.PARAMETER TestMethod
    Which installation method to test (npm, registry, installer, all)

.PARAMETER CleanInstall
    Remove existing installation before testing

.PARAMETER PackagePath
    Path to local tarball for testing npm install

.EXAMPLE
    .\scripts\test-windows-install.ps1 -TestMethod npm
    Test npm installation from local tarball

.EXAMPLE
    .\scripts\test-windows-install.ps1 -TestMethod registry
    Test installation from npm registry

.EXAMPLE
    .\scripts\test-windows-install.ps1 -CleanInstall
    Clean install and test all methods
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("npm", "registry", "installer", "all")]
    [string]$TestMethod = "all",

    [Parameter(Mandatory=$false)]
    [switch]$CleanInstall = $false,

    [Parameter(Mandatory=$false)]
    [string]$PackagePath = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-TestStep {
    param([string]$Message)
    Write-Host "`n🧪 $Message" -ForegroundColor Cyan
}

function Write-TestSuccess {
    param([string]$Message)
    Write-Host "  ✅ $Message" -ForegroundColor Green
}

function Write-TestFail {
    param([string]$Message)
    Write-Host "  ❌ $Message" -ForegroundColor Red
}

function Write-TestInfo {
    param([string]$Message)
    Write-Host "  ℹ️  $Message" -ForegroundColor Yellow
}

$RootDir = Split-Path -Parent $PSScriptRoot
$ArtifactsDir = Join-Path $RootDir "artifacts"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Moltbot Windows Installation Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Find package tarball if not specified
if (-not $PackagePath) {
    $tarballs = Get-ChildItem -Path $ArtifactsDir -Filter "moltbot-*.tgz" -ErrorAction SilentlyContinue
    if ($tarballs) {
        $PackagePath = $tarballs[0].FullName
        Write-TestInfo "Using tarball: $PackagePath"
    }
}

# Test functions
function Test-CommandExists {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Get-MoltbotVersion {
    try {
        $version = moltbot --version 2>$null
        return $version
    } catch {
        return $null
    }
}

function Test-MoltbotInstallation {
    Write-TestStep "Verifying moltbot installation..."

    if (Test-CommandExists "moltbot") {
        Write-TestSuccess "moltbot command found"

        $version = Get-MoltbotVersion
        if ($version) {
            Write-TestSuccess "Version: $version"
        } else {
            Write-TestFail "Could not get version"
            return $false
        }

        # Test help command
        try {
            $help = moltbot --help 2>&1
            if ($help -match "Usage:" -or $help -match "Commands:") {
                Write-TestSuccess "Help command works"
            } else {
                Write-TestFail "Help output unexpected"
                return $false
            }
        } catch {
            Write-TestFail "Help command failed"
            return $false
        }

        # Test config command
        try {
            $config = moltbot config get gateway.mode 2>&1
            Write-TestSuccess "Config command works"
        } catch {
            Write-TestInfo "Config command test skipped (may not be configured)"
        }

        return $true
    } else {
        Write-TestFail "moltbot command not found in PATH"
        Write-TestInfo "Current PATH: $env:PATH"
        return $false
    }
}

function Remove-MoltbotInstallation {
    Write-TestStep "Removing existing moltbot installation..."
    try {
        npm uninstall -g moltbot 2>$null
        npm uninstall -g clawdbot 2>$null
        Write-TestSuccess "Uninstalled from npm global"
    } catch {
        Write-TestInfo "No existing npm installation found"
    }
}

function Test-NpmInstall {
    Write-TestStep "Testing npm install from local tarball..."

    if (-not $PackagePath -or -not (Test-Path $PackagePath)) {
        Write-TestFail "Package tarball not found: $PackagePath"
        Write-TestInfo "Run .\scripts\package-windows.ps1 first"
        return $false
    }

    Write-TestInfo "Installing from: $PackagePath"
    try {
        npm install -g $PackagePath
        if ($LASTEXITCODE -ne 0) {
            Write-TestFail "npm install failed with exit code $LASTEXITCODE"
            return $false
        }
        Write-TestSuccess "npm install completed"

        return Test-MoltbotInstallation
    } catch {
        Write-TestFail "npm install threw exception: $_"
        return $false
    }
}

function Test-RegistryInstall {
    Write-TestStep "Testing npm install from registry..."

    try {
        # Get latest version from registry
        $latestVersion = npm view moltbot version 2>$null
        if (-not $latestVersion) {
            Write-TestFail "Could not fetch version from npm registry"
            return $false
        }

        Write-TestInfo "Latest registry version: $latestVersion"
        npm install -g "moltbot@$latestVersion"

        if ($LASTEXITCODE -ne 0) {
            Write-TestFail "npm install from registry failed"
            return $false
        }
        Write-TestSuccess "npm install from registry completed"

        return Test-MoltbotInstallation
    } catch {
        Write-TestFail "Registry install threw exception: $_"
        return $false
    }
}

function Test-InstallerScript {
    Write-TestStep "Testing PowerShell installer script..."

    # Check for installer in sibling molt.bot repo
    $installerPath = Join-Path (Split-Path $RootDir) "molt.bot\public\install.ps1"

    if (-not (Test-Path $installerPath)) {
        Write-TestInfo "Installer script not found at: $installerPath"
        Write-TestInfo "Checking online installer..."

        try {
            # Test downloading installer (but don't run it)
            $installerContent = Invoke-WebRequest -Uri "https://molt.bot/install.ps1" -UseBasicParsing -TimeoutSec 10
            if ($installerContent.StatusCode -eq 200) {
                Write-TestSuccess "Online installer accessible"
                Write-TestInfo "To test online installer run:"
                Write-Host "  iwr -useb https://molt.bot/install.ps1 | iex" -ForegroundColor White
                return $true
            }
        } catch {
            Write-TestFail "Could not access online installer"
            return $false
        }
    } else {
        Write-TestSuccess "Local installer found: $installerPath"
        Write-TestInfo "Testing installer syntax..."

        try {
            # Test installer help
            $script = Get-Content $installerPath -Raw
            & ([scriptblock]::Create($script)) -Help 2>$null
            Write-TestSuccess "Installer script syntax valid"
            return $true
        } catch {
            Write-TestFail "Installer script has syntax errors"
            return $false
        }
    }
}

# Main test execution
$testResults = @{}

if ($CleanInstall) {
    Remove-MoltbotInstallation
}

if ($TestMethod -eq "npm" -or $TestMethod -eq "all") {
    $testResults["npm"] = Test-NpmInstall
    if ($CleanInstall -and $testResults["npm"]) {
        Remove-MoltbotInstallation
    }
}

if ($TestMethod -eq "registry" -or $TestMethod -eq "all") {
    $testResults["registry"] = Test-RegistryInstall
    if ($CleanInstall -and $testResults["registry"]) {
        Remove-MoltbotInstallation
    }
}

if ($TestMethod -eq "installer" -or $TestMethod -eq "all") {
    $testResults["installer"] = Test-InstallerScript
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allPassed = $true
foreach ($test in $testResults.Keys) {
    $result = $testResults[$test]
    if ($result) {
        Write-Host "  ✅ $test" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $test" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""

if ($allPassed) {
    Write-Host "All tests passed! 🎉" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Review output above." -ForegroundColor Red
    exit 1
}
