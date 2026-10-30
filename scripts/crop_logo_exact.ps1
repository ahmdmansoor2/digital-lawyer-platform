Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcPath = Join-Path $scriptDir "logo_final.png"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

# Let's crop from 0, 0 with w=75, h=55
$rect = New-Object System.Drawing.Rectangle(0, 0, 75, 55)
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($bmp, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Save((Join-Path $scriptDir "prosecution_logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$crop.Dispose()
$bmp.Dispose()
Write-Host "prosecution_logo.png saved!"
