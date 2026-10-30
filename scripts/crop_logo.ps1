Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inPath = Join-Path $scriptDir "extracted_img_1.jpg"
Write-Host "Input path: $inPath"
$img = [System.Drawing.Image]::FromFile($inPath)
Write-Host "Image size: $($img.Width) x $($img.Height)"
# Page is 2479 x 3508 roughly. Let's see actual size.
# Logo is near top left inside the border.
# Let's inspect coordinates relative to width/height.
$rx = [int]($img.Width * 0.07)
$ry = [int]($img.Height * 0.045)
$rw = [int]($img.Width * 0.12)
$rh = [int]($img.Height * 0.055)
$rect = New-Object System.Drawing.Rectangle($rx, $ry, $rw, $rh)
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$outPath = Join-Path $scriptDir "logo_cropped.png"
$crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$crop.Dispose()
$img.Dispose()
Write-Host "Saved logo to: $outPath"
