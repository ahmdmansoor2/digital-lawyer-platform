# install-health-monitor.ps1 — جدولة فحص يومي لصحة الموقع
#
# الاستخدام (PowerShell كـ Admin):
#   powershell -ExecutionPolicy Bypass -File scripts/seo/install-health-monitor.ps1
#
# هيشتغل يومياً 6:00 صباحاً

param(
    [string]$Time = "06:00"
)

$TaskName = "SEOHealthMonitor"
$ScriptPath = Join-Path $PSScriptRoot "health-monitor.cjs"
$NodePath = (Get-Command node.exe).Source
$LogDir = Join-Path $PSScriptRoot "logs"
$WorkingDir = $PSScriptRoot

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if (-not (Test-Path $NodePath)) {
    Write-Error "node.exe مش موجود. ثبّت Node.js أولاً."
    exit 1
}

# حذف task قديم لو موجود
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# بناء Action
$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $WorkingDir

# Trigger يومي
$trigger = New-ScheduledTaskTrigger -Daily -At $Time

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "فحص يومي لصحة منصة المحامي الرقمية (sitemap, schema, broken links)" `
    -User $env:USERNAME `
    -RunLevel Highest | Out-Null

Write-Host "✓ تم تثبيت Task: $TaskName" -ForegroundColor Green
Write-Host "   التوقيت: يومياً في $Time"
Write-Host "   اللوج: $LogDir\health-*.json"
Write-Host ""
Write-Host "للإلغاء:" -ForegroundColor Yellow
Write-Host "   Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
Write-Host ""
Write-Host "للتجربة الفورية:" -ForegroundColor Cyan
Write-Host "   node `"$ScriptPath`""
