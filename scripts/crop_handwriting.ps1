Add-Type -AssemblyName System.Drawing
$imgPath = Join-Path $env:USERPROFILE ".gemini\antigravity\brain\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\.user_uploaded\media_1792943579195_5718f4e4.jpg"
$img = [System.Drawing.Image]::FromFile($imgPath)
Write-Host "Image size: $($img.Width) x $($img.Height)"

# Crop handwritten text area
$rect = New-Object System.Drawing.Rectangle([int]($img.Width*0.08), [int]($img.Height*0.18), [int]($img.Width*0.84), [int]($img.Height*0.35))
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Save("d:\قانوني 7\scripts\crop_handwriting.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)

# Also crop the date and stamp area at bottom
$rectBottom = New-Object System.Drawing.Rectangle([int]($img.Width*0.1), [int]($img.Height*0.65), [int]($img.Width*0.8), [int]($img.Height*0.25))
$cropBottom = New-Object System.Drawing.Bitmap($rectBottom.Width, $rectBottom.Height)
$g2 = [System.Drawing.Graphics]::FromImage($cropBottom)
$g2.DrawImage($img, 0, 0, $rectBottom, [System.Drawing.GraphicsUnit]::Pixel)
$cropBottom.Save("d:\قانوني 7\scripts\crop_bottom.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)

$g.Dispose()
$g2.Dispose()
$crop.Dispose()
$cropBottom.Dispose()
$img.Dispose()
Write-Host "Cropped sections saved!"
