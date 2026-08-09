# install-task.ps1 — تثبيت Windows Task Scheduler للنشر الدوري على Facebook
#
# الاستخدام (PowerShell كـ Admin):
#   powershell -ExecutionPolicy Bypass -File install-task.ps1
#
# أو لتعديل التوقيت:
#   powershell -ExecutionPolicy Bypass -File install-task.ps1 -Time "10:00"
#   powershell -ExecutionPolicy Bypass -File install-task.ps1 -Time "20:00" -Frequency Daily

param(
    [string]$Time = "10:00",
    [ValidateSet("Daily", "Weekly")]
    [string]$Frequency = "Daily",
    [string]$DaysOfWeek = "SUN,MON,TUE,WED,THU,FRI,SAT"
)

$TaskName = "FacebookReelsPublisher"
$ScriptPath = Join-Path $PSScriptRoot "reels-publish.cjs"
$NodePath = (Get-Command node.exe).Source
$WorkingDir = $PSScriptRoot
$LogPath = Join-Path $PSScriptRoot "reels-task.log"

if (-not (Test-Path $NodePath)) {
    Write-Error "node.exe مش موجود في PATH. ثبّت Node.js أولاً."
    exit 1
}

# إزالة task قديم بنفس الاسم (لو موجود)
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Task قديم موجود. جاري الحذف..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# بناء الـ Action
$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptPath`" --latest-article" `
    -WorkingDirectory $WorkingDir

# Trigger
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
if ($Frequency -eq "Weekly") {
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DaysOfWeek -At $Time
}

# Settings: يعمل حتى لو الجهاز على battery
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "ينشر Reel من مقال المدونة الأخير على Facebook كل $Frequency الساعة $Time" `
    -User $env:USERNAME `
    -RunLevel Highest | Out-Null

Write-Host "✓ تم تثبيت Task: $TaskName" -ForegroundColor Green
Write-Host "   التوقيت: $Frequency في $Time"
Write-Host "   السكربت: $ScriptPath"
Write-Host "   اللوج: $LogPath"
Write-Host ""
Write-Host "لإلغاء التثبيت:" -ForegroundColor Yellow
Write-Host "   Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
Write-Host ""
Write-Host "لتجربة فورية:" -ForegroundColor Cyan
Write-Host "   node `"$ScriptPath`" --latest-article --dry-run"
