Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# نافذة مركز الأتمتة المستمرة
$form = New-Object System.Windows.Forms.Form
$form.Text = "بوابة صوت مصر 24 | مركز الأتمتة الإخبارية المستمرة 24/7"
$form.Size = New-Object System.Drawing.Size(730, 660)
$form.MinimumSize = New-Object System.Drawing.Size(730, 660)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.RightToLeft = [System.Windows.Forms.RightToLeft]::Yes
$form.RightToLeftLayout = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)

# الشريط العلوي (Header Panel)
$pnlHeader = New-Object System.Windows.Forms.Panel
$pnlHeader.Dock = [System.Windows.Forms.DockStyle]::Top
$pnlHeader.Height = 85
$pnlHeader.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "⚡ صوت مصر 24 — الأتمتة الإخبارية المستمرة (24/7)"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 13.5, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::White
$lblTitle.Location = New-Object System.Drawing.Point(20, 15)
$lblTitle.AutoSize = $true
$pnlHeader.Controls.Add($lblTitle)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = "محرك النشر الذاتي الدائم (رصد ونشر مقالين مصورين وتصنيفهما كل 3 ساعات تلقائياً)"
$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$lblSub.Location = New-Object System.Drawing.Point(20, 48)
$lblSub.AutoSize = $true
$pnlHeader.Controls.Add($lblSub)

$form.Controls.Add($pnlHeader)

# بطاقة مؤشر الحالة والتحكم (Status Card)
$pnlCard = New-Object System.Windows.Forms.Panel
$pnlCard.Location = New-Object System.Drawing.Point(20, 100)
$pnlCard.Size = New-Object System.Drawing.Size(675, 110)
$pnlCard.BackColor = [System.Drawing.Color]::White
$pnlCard.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "🟢 حالة المحرك: الأتمتة الذاتية نشطة وتعمل الآن"
$lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$lblStatus.Location = New-Object System.Drawing.Point(15, 12)
$lblStatus.AutoSize = $true
$pnlCard.Controls.Add($lblStatus)

$lblCountdown = New-Object System.Windows.Forms.Label
$lblCountdown.Text = "⏱ الدورة القادمة بعد: جاري التحضير..."
$lblCountdown.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$lblCountdown.ForeColor = [System.Drawing.Color]::FromArgb(51, 65, 85)
$lblCountdown.Location = New-Object System.Drawing.Point(15, 40)
$lblCountdown.AutoSize = $true
$pnlCard.Controls.Add($lblCountdown)

$btnRunNow = New-Object System.Windows.Forms.Button
$btnRunNow.Location = New-Object System.Drawing.Point(360, 20)
$btnRunNow.Size = New-Object System.Drawing.Size(180, 36)
$btnRunNow.Text = "⚡ نشر دورة فورية الآن"
$btnRunNow.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$btnRunNow.BackColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
$btnRunNow.ForeColor = [System.Drawing.Color]::White
$btnRunNow.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnRunNow.FlatAppearance.BorderSize = 0
$btnRunNow.Cursor = [System.Windows.Forms.Cursors]::Hand
$pnlCard.Controls.Add($btnRunNow)

$btnPause = New-Object System.Windows.Forms.Button
$btnPause.Location = New-Object System.Drawing.Point(550, 20)
$btnPause.Size = New-Object System.Drawing.Size(110, 36)
$btnPause.Text = "⏸ إيقاف مؤقت"
$btnPause.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnPause.BackColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$btnPause.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$btnPause.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnPause.FlatAppearance.BorderSize = 0
$btnPause.Cursor = [System.Windows.Forms.Cursors]::Hand
$pnlCard.Controls.Add($btnPause)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text = "💡 يمكنك تصغير هذه النافذة وتركها تعمل في الخلفية بأمان، وسيستمر النشر كل 3 ساعات بدقة."
$lblHint.Font = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular)
$lblHint.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$lblHint.Location = New-Object System.Drawing.Point(15, 78)
$lblHint.AutoSize = $true
$pnlCard.Controls.Add($lblHint)

$form.Controls.Add($pnlCard)

# بطاقة سجل الأتمتة المباشر (Log Card)
$grpLog = New-Object System.Windows.Forms.GroupBox
$grpLog.Text = " سجل دورات الأتمتة المباشر "
$grpLog.Location = New-Object System.Drawing.Point(20, 222)
$grpLog.Size = New-Object System.Drawing.Size(675, 315)
$grpLog.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$grpLog.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = [System.Windows.Forms.ScrollBars]::Both
$txtLog.Location = New-Object System.Drawing.Point(15, 25)
$txtLog.Size = New-Object System.Drawing.Size(645, 275)
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(241, 245, 249)
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9.5, [System.Drawing.FontStyle]::Regular)
$txtLog.RightToLeft = [System.Windows.Forms.RightToLeft]::Yes
$txtLog.Text = "[$(Get-Date -Format 'yyyy/MM/dd hh:mm tt')] تم تشغيل مركز الأتمتة المستمرة 24/7 بنجاح.`r`n"
$grpLog.Controls.Add($txtLog)

$form.Controls.Add($grpLog)

# الأزرار السفلية
$pnlBottom = New-Object System.Windows.Forms.Panel
$pnlBottom.Location = New-Object System.Drawing.Point(20, 550)
$pnlBottom.Size = New-Object System.Drawing.Size(675, 50)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Location = New-Object System.Drawing.Point(0, 5)
$btnBrowse.Size = New-Object System.Drawing.Size(200, 36)
$btnBrowse.Text = "🌐 فتح بوابة صوت مصر 24"
$btnBrowse.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$btnBrowse.BackColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$btnBrowse.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$btnBrowse.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnBrowse.FlatAppearance.BorderSize = 0
$btnBrowse.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnBrowse.Add_Click({
    [System.Diagnostics.Process]::Start("https://fazlkanews.blogspot.com/")
})
$pnlBottom.Controls.Add($btnBrowse)

$btnFolder = New-Object System.Windows.Forms.Button
$btnFolder.Location = New-Object System.Drawing.Point(210, 5)
$btnFolder.Size = New-Object System.Drawing.Size(160, 36)
$btnFolder.Text = "📁 مجلد المقالات"
$btnFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnFolder.BackColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$btnFolder.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$btnFolder.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnFolder.FlatAppearance.BorderSize = 0
$btnFolder.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnFolder.Add_Click({
    $articlesDir = "d:\قانوني 7\fazlka-news\output\articles"
    if (Test-Path $articlesDir) {
        [System.Diagnostics.Process]::Start("explorer.exe", $articlesDir)
    }
})
$pnlBottom.Controls.Add($btnFolder)

$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Location = New-Object System.Drawing.Point(555, 5)
$btnClose.Size = New-Object System.Drawing.Size(120, 36)
$btnClose.Text = "✖ إغلاق الأتمتة"
$btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$btnClose.BackColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$btnClose.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$btnClose.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnClose.FlatAppearance.BorderSize = 0
$btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnClose.Add_Click({
    $form.Close()
})
$pnlBottom.Controls.Add($btnClose)

$form.Controls.Add($pnlBottom)

# متغيرات التوقيت والأتمتة
$script:INTERVAL_SECONDS = 60 * 60 # دورة كل ساعة
$script:remainingSeconds = $script:INTERVAL_SECONDS
$script:isPaused = $false
$script:isRunningCycle = $false

# دالة تنفيذ دورة النشر
$runPublishCycle = {
    param($reason = "الدورية")
    if ($script:isRunningCycle) { return }
    $script:isRunningCycle = $true

    $btnRunNow.Enabled = $false
    $btnRunNow.Text = "⏳ جاري النشر..."
    $lblStatus.Text = "🔄 جاري تنفيذ دورة النشر ($reason)..."
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(37, 99, 235)

    $timeStr = Get-Date -Format "hh:mm tt"
    $txtLog.AppendText("`r`n========================================================`r`n")
    $txtLog.AppendText("[$timeStr] 🚀 بدء تنفيذ دورة نشر ($reason) لمقال مصور جديد...`r`n")
    $txtLog.AppendText("========================================================`r`n")
    $txtLog.SelectionStart = $txtLog.Text.Length
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()

    $scriptPath = "d:\قانوني 7\fazlka-news\scripts\news-engine.cjs"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node.exe"
    $psi.Arguments = "`"$scriptPath`" 1"
    $psi.WorkingDirectory = "d:\قانوني 7"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

    try {
        $proc = [System.Diagnostics.Process]::Start($psi)
        while (-not $proc.HasExited) {
            while (-not $proc.StandardOutput.EndOfStream) {
                $line = $proc.StandardOutput.ReadLine()
                if ($line) {
                    $txtLog.AppendText("$line`r`n")
                    $txtLog.SelectionStart = $txtLog.Text.Length
                    $txtLog.ScrollToCaret()
                    [System.Windows.Forms.Application]::DoEvents()
                }
            }
            Start-Sleep -Milliseconds 100
            [System.Windows.Forms.Application]::DoEvents()
        }

        while (-not $proc.StandardOutput.EndOfStream) {
            $line = $proc.StandardOutput.ReadLine()
            if ($line) { $txtLog.AppendText("$line`r`n") }
        }

        $nextTime = (Get-Date).AddSeconds($script:INTERVAL_SECONDS).ToString("hh:mm tt")
        $txtLog.AppendText("`r`n[$((Get-Date).ToString('hh:mm tt'))] ✅ اكتملت دورة النشر بنجاح! الدورة التالية: $nextTime`r`n")
        $txtLog.SelectionStart = $txtLog.Text.Length
        $txtLog.ScrollToCaret()

        $script:remainingSeconds = $script:INTERVAL_SECONDS
        try { [System.Media.SystemSounds]::Asterisk.Play() } catch {}
    } catch {
        $txtLog.AppendText("❌ خطأ أثناء تنفيذ الدورة: $($_.Exception.Message)`r`n")
    }

    $script:isRunningCycle = $false
    $btnRunNow.Enabled = $true
    $btnRunNow.Text = "⚡ نشر دورة فورية الآن"
    if (-not $script:isPaused) {
        $lblStatus.Text = "🟢 حالة المحرك: الأتمتة الذاتية نشطة وتعمل الآن"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
    }
}

# زر تشغيل دورة فورية
$btnRunNow.Add_Click({
    & $runPublishCycle "فورية بطلب المستخدم"
})

# زر إيقاف مؤقت واستئناف
$btnPause.Add_Click({
    $script:isPaused = -not $script:isPaused
    if ($script:isPaused) {
        $btnPause.Text = "▶ استئناف"
        $lblStatus.Text = "⏸ حالة المحرك: متوقف مؤقتاً"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(217, 119, 6)
        $lblCountdown.Text = "الأتمتة متوقفة مؤقتاً... اضغط [استئناف] للعودة للجدول الزمني."
        $txtLog.AppendText("`r`n[$(Get-Date -Format 'hh:mm tt')] ⏸ تم إيقاف الأتمتة مؤقتاً.`r`n")
    } else {
        $btnPause.Text = "⏸ إيقاف مؤقت"
        $lblStatus.Text = "🟢 حالة المحرك: الأتمتة الذاتية نشطة وتعمل الآن"
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
        $txtLog.AppendText("`r`n[$(Get-Date -Format 'hh:mm tt')] ▶ تم استئناف الأتمتة التلقائية.`r`n")
    }
})

# مؤقت الثواني لتحديث العداد وتنفيذ الدورات
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000 # كل ثانية
$timer.Add_Tick({
    if ($script:isPaused -or $script:isRunningCycle) { return }

    $script:remainingSeconds--
    if ($script:remainingSeconds -le 0) {
        & $runPublishCycle "الدورية المجدولة"
    } else {
        $ts = [TimeSpan]::FromSeconds($script:remainingSeconds)
        $hrs = $ts.Hours
        $mins = $ts.Minutes
        $secs = $ts.Seconds
        $lblCountdown.Text = "⏱ الدورة القادمة بعد: $hrs ساعة و $mins دقيقة و $secs ثانية"
    }
})
$timer.Start()

# تشغيل الدورة الأولى عند الفتح مباشرة
$form.Add_Shown({
    $lblCountdown.Text = "⏱ جاري بدء الدورة الأولى الآن..."
    [System.Windows.Forms.Application]::DoEvents()
    & $runPublishCycle "الدورة الافتتاحية الأولى"
})

# إيقاف المؤقت عند الإغلاق
$form.Add_FormClosing({
    $timer.Stop()
})

# عرض النافذة
[void]$form.ShowDialog()
