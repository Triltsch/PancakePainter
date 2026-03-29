#Requires -Version 5.0
<#
.SYNOPSIS
    Automated startup smoke check for PancakePainter.

.DESCRIPTION
    Launches PancakePainter via `npm start`, waits for the configured startup
    window, and verifies the process tree is still alive — confirming that the
    application did not crash immediately on startup.

    The process tree is terminated cleanly after verification.

    Exit codes:
        0  PASS — application started and remained alive for the full check window
        1  FAIL — application exited before the check window elapsed, or could
                  not be started at all

.PARAMETER WaitSeconds
    Number of seconds to wait after launch before evaluating process health.
    Increase this value on slow machines if startup takes longer than the
    default 10-second window.
    Default: 10

.EXAMPLE
    # Run from the repository root:
    .\scripts\smoke-test.ps1

.EXAMPLE
    # Extend the check window to 20 seconds:
    .\scripts\smoke-test.ps1 -WaitSeconds 20

.NOTES
    Prerequisites:
    - Node.js (npm) must be available on PATH.
    - Dependencies must be installed: run `npm install` before this script.
    - The application requires an active graphical session (display) to launch
      the Electron renderer process. This script is intended for local
      development use. It is not suitable for headless CI environments unless
      a virtual display (e.g. Xvfb on Linux) is configured.
#>
param(
    [int]$WaitSeconds = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve the repository root from the script's own location (scripts/).
$repoRoot = Split-Path -Parent $PSScriptRoot

# --- Pre-flight checks -------------------------------------------------------

if (-not (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue)) {
    Write-Error 'npm.cmd not found on PATH. Ensure Node.js is installed and on PATH.'
    exit 1
}

$nodeModulesPath = Join-Path $repoRoot 'node_modules'
if (-not (Test-Path $nodeModulesPath)) {
    Write-Error "node_modules not found at '$nodeModulesPath'. Run 'npm install' first."
    exit 1
}

# --- Launch ------------------------------------------------------------------

Write-Host '=== PancakePainter Startup Smoke Check ==='
Write-Host "Repository root : $repoRoot"
Write-Host "Check window    : $WaitSeconds second(s)"
Write-Host ''

$npmProcess = $null
$passed = $false
$failReason = ''

try {
    $npmProcess = Start-Process `
        -FilePath 'npm.cmd' `
        -ArgumentList 'start' `
        -WorkingDirectory $repoRoot `
        -PassThru

    if ($null -eq $npmProcess) {
        $failReason = 'Start-Process returned null; the npm process could not be created.'
    } else {
        Write-Host "Application launched (npm PID: $($npmProcess.Id))."
        Write-Host "Watching process for $WaitSeconds second(s)..."

        $elapsed = 0
        while ($elapsed -lt $WaitSeconds) {
            Start-Sleep -Seconds 1
            $elapsed++
            $npmProcess.Refresh()
            if ($npmProcess.HasExited) {
                $failReason = (
                    "Process exited after $elapsed second(s) " +
                    "(exit code: $($npmProcess.ExitCode))."
                )
                break
            }
        }

        if (-not $npmProcess.HasExited) {
            $passed = $true
        }
    }
} catch {
    $failReason = "Unexpected error during smoke check: $($_.Exception.Message)"
} finally {
    # Always terminate the running process tree so no orphan Electron window
    # is left open after the script finishes.
    if ($null -ne $npmProcess -and -not $npmProcess.HasExited) {
        Write-Host ''
        Write-Host "Terminating process tree (PID: $($npmProcess.Id))..."
        & taskkill /F /T /PID $npmProcess.Id 2>$null | Out-Null
    }
}

# --- Result ------------------------------------------------------------------

Write-Host ''
if ($passed) {
    Write-Host "PASS: Application remained alive for $WaitSeconds second(s)."
    exit 0
} else {
    Write-Error "FAIL: $failReason"
    exit 1
}
