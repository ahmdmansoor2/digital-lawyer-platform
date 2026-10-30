Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$img1 = [System.Drawing.Image]::FromFile((Join-Path $scriptDir "extracted_img_1.jpg"))

$rect = New-Object System.Drawing.Rectangle(190, 160, 225, 160)
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($img1, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Save((Join-Path $scriptDir "logo_final.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$crop.Dispose()
$img1.Dispose()
Write-Host "logo_final saved!"
