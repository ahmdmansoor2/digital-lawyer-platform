# Launch-LawyerPlatform.ps1
# تشغيل منصة المحامي الرقمية مع تجاوز Windows SmartScreen

$ErrorActionPreference = "Stop"

$exePath = Join-Path $PSScriptRoot "منصة المحامي الرقمية 2.9.10.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "File not found: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "Checking file..." -ForegroundColor Cyan

try {
    Unblock-File -Path $exePath -ErrorAction Stop
    Write-Host "Unblocked" -ForegroundColor Green
} catch {
    Write-Host "Unblock failed: $_" -ForegroundColor Yellow
}

$desktopPath = [Environment]::GetFolderPath('Desktop')
try {
    Add-MpPreference -ExclusionPath $desktopPath -ErrorAction SilentlyContinue
    Write-Host "Defender exclusion added" -ForegroundColor Green
} catch {
    Write-Host "Defender exclusion failed: $_" -ForegroundColor Yellow
}

$signature = Get-AuthenticodeSignature $exePath
Write-Host "Signature: $($signature.Status)" -ForegroundColor Yellow

Write-Host ""
Write-Host "Launching..." -ForegroundColor Green
try {
    Start-Process -FilePath $exePath -ErrorAction Stop
    Write-Host "Started!" -ForegroundColor Green
} catch {
    Write-Host "Launch failed: $_" -ForegroundColor Red
    Write-Host "Try: right-click > Run as Administrator" -ForegroundColor Yellow
    exit 1
}
