Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# نافذة التطبيق الرئيسية
$form = New-Object System.Windows.Forms.Form
$form.Text = "بوابة صوت مصر 24 | محرك النشر الإخباري التلقائي"
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
$pnlHeader.BackColor = [System.Drawing.Color]::FromArgb(30, 58, 138)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = "📰 بوابة صوت مصر 24 — النشر الإخباري التلقائي"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::White
$lblTitle.Location = New-Object System.Drawing.Point(20, 15)
$lblTitle.AutoSize = $true
$pnlHeader.Controls.Add($lblTitle)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = "النظام الذكي لرصد الأخبار وصياغتها وتصنيفها آلياً مع الصور المعتمدة ووحدات الإعلانات"
$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(191, 219, 254)
$lblSub.Location = New-Object System.Drawing.Point(20, 48)
$lblSub.AutoSize = $true
$pnlHeader.Controls.Add($lblSub)

$form.Controls.Add($pnlHeader)

# بطاقة الخيارات والتحكم (Options Card)
$pnlCard = New-Object System.Windows.Forms.Panel
$pnlCard.Location = New-Object System.Drawing.Point(20, 100)
$pnlCard.Size = New-Object System.Drawing.Size(675, 105)
$pnlCard.BackColor = [System.Drawing.Color]::White
$pnlCard.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

$lblPrompt = New-Object System.Windows.Forms.Label
$lblPrompt.Text = "حدد عدد الأخبار المطلوب نشرها في هذه الدورة:"
$lblPrompt.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$lblPrompt.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$lblPrompt.Location = New-Object System.Drawing.Point(15, 12)
$lblPrompt.AutoSize = $true
$pnlCard.Controls.Add($lblPrompt)

$comboCount = New-Object System.Windows.Forms.ComboBox
$comboCount.Location = New-Object System.Drawing.Point(15, 38)
$comboCount.Size = New-Object System.Drawing.Size(370, 30)
$comboCount.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
$comboCount.Font = New-Object System.Drawing.Font("Segoe UI", 10)
[void]$comboCount.Items.Add("3 أخبار (الموصى به - تغطية متوازنة لجميع الأقسام)")
[void]$comboCount.Items.Add("5 أخبار (تغطية موسعة لكافة الأقسام الستة)")
[void]$comboCount.Items.Add("1 خبر عاجل (نشر فوري سريع)")
[void]$comboCount.Items.Add("10 أخبار (تغذية إخبارية مكثفة)")
$comboCount.SelectedIndex = 0
$pnlCard.Controls.Add($comboCount)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location = New-Object System.Drawing.Point(400, 34)
$btnStart.Size = New-Object System.Drawing.Size(255, 38)
$btnStart.Text = "🚀 بدء النشر التلقائي الآن"
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.Cursor = [System.Windows.Forms.Cursors]::Hand
$pnlCard.Controls.Add($btnStart)

$lblHint = New-Object System.Windows.Forms.Label
$lblHint.Text = "💡 يتم جلب الصور 16:9 تلقائياً، تضمين إعلانات أدسنس، وتصنيف المقالات ونشرها فوراً على بلوجر وتليجرام."
$lblHint.Font = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular)
$lblHint.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$lblHint.Location = New-Object System.Drawing.Point(15, 78)
$lblHint.AutoSize = $true
$pnlCard.Controls.Add($lblHint)

$form.Controls.Add($pnlCard)

# بطاقة سجل العمليات (Live Log Card)
$grpLog = New-Object System.Windows.Forms.GroupBox
$grpLog.Text = " سجل العمليات والنشر المباشر "
$grpLog.Location = New-Object System.Drawing.Point(20, 218)
$grpLog.Size = New-Object System.Drawing.Size(675, 320)
$grpLog.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$grpLog.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = [System.Windows.Forms.ScrollBars]::Both
$txtLog.Location = New-Object System.Drawing.Point(15, 25)
$txtLog.Size = New-Object System.Drawing.Size(645, 280)
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(241, 245, 249)
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9.5, [System.Drawing.FontStyle]::Regular)
$txtLog.RightToLeft = [System.Windows.Forms.RightToLeft]::Yes
$txtLog.Text = "جاهز لبدء دورة النشر... حدد عدد الأخبار واضغط على [بدء النشر التلقائي الآن].`r`n"
$grpLog.Controls.Add($txtLog)

$form.Controls.Add($grpLog)

# أزرار الإجراءات السفلية
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
$btnClose.Text = "✖ إغلاق"
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

# حدث الضغط على زر بدء النشر
$btnStart.Add_Click({
    $btnStart.Enabled = $false
    $btnStart.Text = "⏳ جاري الرصد والنشر..."
    $btnStart.BackColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
    
    $countMap = @{ 0 = 3; 1 = 5; 2 = 1; 3 = 10 }
    $selCount = $countMap[$comboCount.SelectedIndex]
    if (-not $selCount) { $selCount = 3 }
    
    $txtLog.AppendText("`r`n========================================================`r`n")
    $txtLog.AppendText("🚀 تم بدء دورة نشر $selCount أخبار لبوابة صوت مصر 24...`r`n")
    $txtLog.AppendText("========================================================`r`n")
    $txtLog.SelectionStart = $txtLog.Text.Length
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()

    $scriptPath = "d:\قانوني 7\fazlka-news\scripts\news-engine.cjs"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node.exe"
    $psi.Arguments = "`"$scriptPath`" $selCount"
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
            if ($line) {
                $txtLog.AppendText("$line`r`n")
            }
        }
        $err = $proc.StandardError.ReadToEnd()
        if ($err) {
            $txtLog.AppendText("⚠️ $err`r`n")
        }

        $txtLog.AppendText("`r`n========================================================`r`n")
        $txtLog.AppendText("🎉 اكتملت عملية النشر بنجاح! تم التحديث على الموقع وتليجرام.`r`n")
        $txtLog.AppendText("========================================================`r`n")
        $txtLog.SelectionStart = $txtLog.Text.Length
        $txtLog.ScrollToCaret()

        try { [System.Media.SystemSounds]::Asterisk.Play() } catch {}
    } catch {
        $txtLog.AppendText("❌ خطأ أثناء التشغيل: $($_.Exception.Message)`r`n")
    }

    $btnStart.Enabled = $true
    $btnStart.Text = "🔄 نشر دورة جديدة"
    $btnStart.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
})

# عرض النافذة
[void]$form.ShowDialog()
