# run-daily.ps1 - task scheduler wrapper for daily blog publishing
# Derives all paths from the script location so no Arabic literals are needed.

$ErrorActionPreference = "Stop"

$publisherDir = $PSScriptRoot
$root = Split-Path -Parent $publisherDir
$logDir = Join-Path $publisherDir "runs"
$dateStamp = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "$dateStamp.log"

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

try {
    Push-Location $root
    node (Join-Path $publisherDir "daily-publish.cjs") *>&1 | Tee-Object -FilePath $logFile
    $exitCode = $LASTEXITCODE
    Pop-Location
    Write-Host "=== daily-publish finished with exit code $exitCode (log: $logFile) ==="
    exit $exitCode
} catch {
    Pop-Location
    $msg = "=== FAILED at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===`n$_"
    Add-Content -LiteralPath $logFile -Value $msg
    Write-Host $msg
    exit 1
}
