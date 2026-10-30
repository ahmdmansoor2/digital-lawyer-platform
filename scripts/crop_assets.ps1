Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$img1 = [System.Drawing.Image]::FromFile((Join-Path $scriptDir "extracted_img_1.jpg"))

# Precise crop for top-left prosecution emblem:
# The emblem is around x=180, y=165, w=230, h=165
$rectLogo = New-Object System.Drawing.Rectangle(180, 165, 235, 160)
$cropLogo = New-Object System.Drawing.Bitmap($rectLogo.Width, $rectLogo.Height)
$g1 = [System.Drawing.Graphics]::FromImage($cropLogo)
$g1.DrawImage($img1, 0, 0, $rectLogo, [System.Drawing.GraphicsUnit]::Pixel)
$cropLogo.Save((Join-Path $scriptDir "logo_prosecution.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$cropLogo.Dispose()
$img1.Dispose()

# Now from page 3: large central circular seal
$img3 = [System.Drawing.Image]::FromFile((Join-Path $scriptDir "extracted_img_3.jpg"))
# Center watermark is around x=600, y=1400, w=1280, h=1100
$rectWatermark = New-Object System.Drawing.Rectangle(620, 1400, 1240, 1080)
$cropWm = New-Object System.Drawing.Bitmap($rectWatermark.Width, $rectWatermark.Height)
$g3 = [System.Drawing.Graphics]::FromImage($cropWm)
$g3.DrawImage($img3, 0, 0, $rectWatermark, [System.Drawing.GraphicsUnit]::Pixel)
$cropWm.Save((Join-Path $scriptDir "watermark_seal.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$cropWm.Dispose()
$img3.Dispose()

Write-Host "Both logo and watermark cropped successfully"
