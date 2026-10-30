Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$img3 = [System.Drawing.Image]::FromFile((Join-Path $scriptDir "extracted_img_3.jpg"))

$rect = New-Object System.Drawing.Rectangle(650, 1400, 1200, 1100)
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($img3, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Save((Join-Path $scriptDir "seal_watermark_clean.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$crop.Dispose()
$img3.Dispose()
Write-Host "seal_watermark_clean.png saved!"
